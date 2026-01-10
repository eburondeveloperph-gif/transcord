
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
  
  // Sensitivity Logic Variables
  private currentGain: number = 1.0;
  private targetGain: number = 1.0;
  private noiseFloor: number = 0.01;
  private volumeMultiplier: number = 1.0; // External control for ducking (1.0 = normal, 0.15 = ducked)

  constructor(public sampleRate = 16000) {}

  public setVolumeMultiplier(multiplier: number) {
    this.volumeMultiplier = multiplier;
    // Force immediate update if recording
    if (this.recordingWorklet) {
       this.recordingWorklet.port.postMessage({ gain: this.currentGain * this.volumeMultiplier });
    }
  }

  private updateSensitivity(volume: number) {
    // Volume is RMS from the VU meter
    // Improved Noise Floor Tracking
    if (volume < this.noiseFloor) {
      this.noiseFloor = this.noiseFloor * 0.95 + volume * 0.05; 
    } else if (volume > this.noiseFloor * 2) {
      // Slow rise for noise floor to adapt to changing environments
      this.noiseFloor += 0.0001; 
    }

    // Heuristic: target a comfortable peak around 0.5-0.7 RMS for the model
    const TARGET_LEVEL = 0.4;
    const MIN_GAIN = 0.5;
    const MAX_GAIN = 4.0;
    
    // NOISE GATE: If signal is very close to noise floor, squash it.
    const GATE_THRESHOLD = this.noiseFloor * 1.5;

    if (volume > GATE_THRESHOLD + 0.005) { // Active signal detection
      const adjustmentFactor = TARGET_LEVEL / (volume + 0.001);
      this.targetGain = Math.max(MIN_GAIN, Math.min(MAX_GAIN, adjustmentFactor));
    } else {
      // Below gate: aggressively reduce gain to suppress background static
      // This implements the "Very Good VAD" behavior by cleaning up silence.
      this.targetGain = 0.0;
    }

    // Smoothly transition current gain to target gain (Attack/Release)
    // Faster attack for speech, slower release for silence
    const alpha = this.targetGain > this.currentGain ? 0.2 : 0.05;
    this.currentGain = this.currentGain * (1 - alpha) + this.targetGain * alpha;
    
    // Apply external ducking multiplier (e.g. 0.15 when AI is speaking)
    const finalGain = this.currentGain * this.volumeMultiplier;

    // Send updated gain to worklet
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
            autoGainControl: true, // Native AGC
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
    };
    if (this.starting) {
      this.starting.then(handleStop).catch(handleStop);
      return;
    }
    handleStop();
  }
}
