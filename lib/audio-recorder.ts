
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
  private sensitivityInterval: number | null = null;

  constructor(public sampleRate = 16000) {}

  private updateSensitivity(volume: number) {
    // Volume is RMS from the VU meter
    // If volume is extremely low, it might be ambient noise
    if (volume < this.noiseFloor) {
      this.noiseFloor = this.noiseFloor * 0.95 + volume * 0.05; // Slowly track noise floor
    }

    // Heuristic: target a comfortable peak around 0.5-0.7 RMS for the model
    const TARGET_LEVEL = 0.4;
    const MIN_GAIN = 0.5;
    const MAX_GAIN = 4.0;

    if (volume > 0.005) { // Active signal detection
      const adjustmentFactor = TARGET_LEVEL / (volume + 0.001);
      this.targetGain = Math.max(MIN_GAIN, Math.min(MAX_GAIN, adjustmentFactor));
    } else {
      // Quiet room: slightly increase sensitivity if background is very low
      if (this.noiseFloor < 0.01) {
        this.targetGain = Math.min(MAX_GAIN, this.targetGain * 1.01);
      }
    }

    // Smoothly transition current gain to target gain
    this.currentGain = this.currentGain * 0.9 + this.targetGain * 0.1;
    
    // Send updated gain to worklet
    if (this.recordingWorklet) {
      this.recordingWorklet.port.postMessage({ gain: this.currentGain });
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
    };
    if (this.starting) {
      this.starting.then(handleStop).catch(handleStop);
      return;
    }
    handleStop();
  }
}
