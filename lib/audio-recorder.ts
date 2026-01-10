
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
/**
 * Copyright 2024 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { audioContext } from './utils';
import AudioRecordingWorklet from './worklets/audio-processing';
import VolMeterWorket from './worklets/vol-meter';

import { createWorketFromSrc } from './audioworklet-registry';
import EventEmitter from 'eventemitter3';

function arrayBufferToBase64(buffer: ArrayBuffer) {
  var binary = '';
  var bytes = new Uint8Array(buffer);
  var len = bytes.byteLength;
  for (var i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

export class AudioRecorder {
  private emitter = new EventEmitter();

  public on = this.emitter.on.bind(this.emitter);
  public off = this.emitter.off.bind(this.emitter);

  stream: MediaStream | undefined;
  audioContext: AudioContext | undefined;
  source: MediaStreamAudioSourceNode | undefined;
  recording: boolean = false;
  recordingWorklet: AudioWorkletNode | undefined;
  vuWorklet: AudioWorkletNode | undefined;

  private starting: Promise<void> | null = null;
  
  // Sensitivity / VAD Logic Variables
  private currentGain: number = 1.0;
  private targetGain: number = 1.0;
  private noiseFloor: number = 0.005;
  private isSpeaking: boolean = false;
  private silenceFrames: number = 0;
  
  // Ducking Logic Variables
  private volumeMultiplier: number = 1.0; 
  private targetVolumeMultiplier: number = 1.0; 

  constructor(public sampleRate = 16000) {}

  public setVolumeMultiplier(multiplier: number) {
    this.targetVolumeMultiplier = multiplier;
  }

  /**
   * Refined VAD with Hysteresis and Hold-Time.
   * Ensures accurate pause detection and prevents cutting off sentence endings.
   */
  private updateSensitivity(volume: number) {
    // 1. Adaptive Noise Floor Tracking
    // We update the noise floor slowly during perceived silence.
    if (!this.isSpeaking) {
      this.noiseFloor = this.noiseFloor * 0.98 + Math.max(0.001, volume) * 0.02;
    }

    // 2. Hysteresis Thresholds
    // Higher threshold to start speech, lower threshold to maintain it.
    const START_THRESHOLD = this.noiseFloor * 3.0 + 0.015;
    const STOP_THRESHOLD = this.noiseFloor * 1.5 + 0.005;
    
    // 3. VAD State Machine
    if (!this.isSpeaking && volume > START_THRESHOLD) {
      // Speech Detected
      this.isSpeaking = true;
      this.silenceFrames = 0;
    } else if (this.isSpeaking) {
      if (volume < STOP_THRESHOLD) {
        this.silenceFrames++;
        // HOLD TIME: 10 frames @ 25ms/frame = 250ms "hangover" 
        // This ensures breathy sentence endings aren't clipped.
        if (this.silenceFrames > 10) {
          this.isSpeaking = false;
        }
      } else {
        // Sustaining speech
        this.silenceFrames = 0;
      }
    }

    // 4. Gain Calculation
    const TARGET_LEVEL = 0.45; // Target RMS level for optimal Gemini performance
    const MIN_GAIN = 0.4;
    const MAX_GAIN = 5.0;

    if (this.isSpeaking) {
      // Normalizing gain to bring quiet speech to a consistent level
      const adjustmentFactor = TARGET_LEVEL / (Math.max(0.01, volume));
      this.targetGain = Math.max(MIN_GAIN, Math.min(MAX_GAIN, adjustmentFactor));
    } else {
      // Zero-suppression for Very Good VAD
      this.targetGain = 0.0;
    }

    // 5. Smooth Gain & Ducking Transitions
    const gainAlpha = this.targetGain > this.currentGain ? 0.25 : 0.12; // Faster attack, slower release
    this.currentGain = this.currentGain * (1 - gainAlpha) + this.targetGain * gainAlpha;
    
    const duckingAlpha = 0.15;
    this.volumeMultiplier = this.volumeMultiplier * (1 - duckingAlpha) + this.targetVolumeMultiplier * duckingAlpha;

    const finalGain = this.currentGain * this.volumeMultiplier;

    if (this.recordingWorklet) {
      this.recordingWorklet.port.postMessage({ gain: finalGain });
    }
  }

  async start() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error('Could not request user media');
    }

    this.starting = new Promise(async (resolve, reject) => {
      try {
        this.stream = await navigator.mediaDevices.getUserMedia({ 
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
            channelCount: 1,
            sampleRate: this.sampleRate
          } 
        });
        
        this.audioContext = await audioContext({ sampleRate: this.sampleRate });
        this.source = this.audioContext.createMediaStreamSource(this.stream);

        const workletName = 'audio-recorder-worklet';
        const src = createWorketFromSrc(workletName, AudioRecordingWorklet);

        await this.audioContext.audioWorklet.addModule(src);
        this.recordingWorklet = new AudioWorkletNode(
          this.audioContext,
          workletName
        );

        this.recordingWorklet.port.onmessage = async (ev: MessageEvent) => {
          const arrayBuffer = ev.data.data.int16arrayBuffer;
          if (arrayBuffer) {
            const arrayBufferString = arrayBufferToBase64(arrayBuffer);
            this.emitter.emit('data', arrayBufferString);
          }
        };
        this.source.connect(this.recordingWorklet);

        const vuWorkletName = 'vu-meter';
        await this.audioContext.audioWorklet.addModule(
          createWorketFromSrc(vuWorkletName, VolMeterWorket)
        );
        this.vuWorklet = new AudioWorkletNode(this.audioContext, vuWorkletName);
        this.vuWorklet.port.onmessage = (ev: MessageEvent) => {
          const volume = ev.data.volume;
          this.emitter.emit('volume', volume);
          this.updateSensitivity(volume);
        };

        this.source.connect(this.vuWorklet);
        this.recording = true;
        resolve();
        this.starting = null;
      } catch (err) {
        reject(err);
      }
    });
  }

  stop() {
    const handleStop = () => {
      this.source?.disconnect();
      this.stream?.getTracks().forEach(track => track.stop());
      this.stream = undefined;
      this.recordingWorklet = undefined;
      this.vuWorklet = undefined;
      this.recording = false;
      this.currentGain = 1.0;
      this.targetGain = 1.0;
      this.volumeMultiplier = 1.0;
      this.targetVolumeMultiplier = 1.0;
      this.isSpeaking = false;
      this.silenceFrames = 0;
    };
    if (this.starting) {
      this.starting.then(handleStop).catch(handleStop);
      return;
    }
    handleStop();
  }
}
