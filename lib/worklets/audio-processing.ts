
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

const AudioRecordingWorklet = `
class AudioProcessingWorklet extends AudioWorkletProcessor {

  // Buffer of 512 samples (~32ms at 16khz)
  buffer = new Int16Array(512);
  bufferWriteIndex = 0;
  
  // Gain interpolation variables
  currentGain = 1.0;
  targetGain = 1.0;
  smoothingFactor = 0.05; // Smoothing per sample for ultra-clean transitions

  constructor() {
    super();
    this.port.onmessage = (event) => {
      if (event.data.gain !== undefined) {
        this.targetGain = event.data.gain;
      }
    };
  }

  process(inputs) {
    if (inputs[0].length) {
      const channel0 = inputs[0][0];
      this.processChunk(channel0);
    }
    return true;
  }

  sendAndClearBuffer(){
    this.port.postMessage({
      event: "chunk",
      data: {
        int16arrayBuffer: this.buffer.slice(0, this.bufferWriteIndex).buffer,
      },
    });
    this.bufferWriteIndex = 0;
  }

  processChunk(float32Array) {
    const l = float32Array.length;
    
    for (let i = 0; i < l; i++) {
      // Sample-accurate gain smoothing (low-pass filtering the gain control)
      this.currentGain += (this.targetGain - this.currentGain) * this.smoothingFactor;
      
      let sample = float32Array[i] * this.currentGain;
      
      // Safety soft-clipping
      if (sample > 1.0) sample = 1.0;
      if (sample < -1.0) sample = -1.0;

      // Convert to 16-bit PCM
      const int16Value = sample * 32768;
      this.buffer[this.bufferWriteIndex++] = int16Value;
      
      if(this.bufferWriteIndex >= this.buffer.length) {
        this.sendAndClearBuffer();
      }
    }
  }
}
`;

export default AudioRecordingWorklet;
