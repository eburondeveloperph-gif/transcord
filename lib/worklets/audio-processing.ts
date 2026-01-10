
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

const AudioRecordingWorklet = `
class AudioProcessingWorklet extends AudioWorkletProcessor {

  // Buffer of 512 samples (~32ms at 16khz)
  buffer = new Int16Array(512);
  bufferWriteIndex = 0;
  
  // VAD & Gain State
  currentGain = 0.0;
  targetGain = 0.0;
  
  // Adaptive VAD Parameters
  noiseFloor = 0.005;
  isSpeechDetected = false;
  hangoverFrames = 0;
  
  // Constants for 16kHz (approx 125 blocks per second)
  readonly HANGOVER_MAX = 40;     // ~320ms hangover to bridge word gaps
  readonly ATTACK_BETA = 0.4;     // Fast gain attack
  readonly RELEASE_BETA = 0.1;    // Slower gain release
  readonly NOISE_ATTACK = 0.05;   // How fast noise floor follows rising energy
  readonly NOISE_DECAY = 0.0005;  // How slow noise floor recovers

  constructor() {
    super();
    this.port.onmessage = (event) => {
      // Manual gain overrides if needed
      if (event.data.targetGain !== undefined) {
        // Reserved for future manual control
      }
    };
  }

  process(inputs) {
    if (inputs[0].length) {
      const channel0 = inputs[0][0];
      this.analyzeAndProcess(channel0);
    }
    return true;
  }

  analyzeAndProcess(float32Array) {
    const l = float32Array.length;
    
    // 1. Calculate RMS for this block
    let sum = 0;
    for (let i = 0; i < l; i++) {
      sum += float32Array[i] * float32Array[i];
    }
    const rms = Math.sqrt(sum / l);

    // 2. Update Adaptive Noise Floor
    // If energy is stable and low, it's likely noise
    if (rms < this.noiseFloor * 1.2) {
      this.noiseFloor = this.noiseFloor * (1 - this.NOISE_ATTACK) + rms * this.NOISE_ATTACK;
    } else {
      this.noiseFloor += this.NOISE_DECAY;
    }

    // 3. VAD Logic (Hysteresis)
    const activeThreshold = this.noiseFloor * 2.5 + 0.008;
    const sustainThreshold = this.noiseFloor * 1.5 + 0.004;

    if (rms > activeThreshold) {
      this.isSpeechDetected = true;
      this.hangoverFrames = this.HANGOVER_MAX;
    } else if (rms < sustainThreshold) {
      if (this.hangoverFrames > 0) {
        this.hangoverFrames--;
      } else {
        this.isSpeechDetected = false;
      }
    }

    // 4. Determine Target Gain
    // When speech is detected, normalize to a healthy level (~0.7)
    // When silence, drop to 0.0 (gate closed)
    this.targetGain = this.isSpeechDetected ? Math.min(1.0, 0.7 / Math.max(rms, 0.01)) : 0.0;

    // 5. Apply Gain and Segment Buffer
    for (let i = 0; i < l; i++) {
      // Smooth gain transition (Low-pass filter on gain)
      const beta = this.targetGain > this.currentGain ? this.ATTACK_BETA : this.RELEASE_BETA;
      this.currentGain += (this.targetGain - this.currentGain) * beta;
      
      let sample = float32Array[i] * this.currentGain;
      
      // Safety soft-clipping
      if (sample > 1.0) sample = 1.0;
      if (sample < -1.0) sample = -1.0;

      // Convert to 16-bit PCM
      this.buffer[this.bufferWriteIndex++] = sample * 32767;
      
      if(this.bufferWriteIndex >= this.buffer.length) {
        this.sendAndClearBuffer();
      }
    }
  }

  sendAndClearBuffer(){
    // Only send non-silent chunks to save main-thread work and bandwidth
    // We send if currentGain is > epsilon
    if (this.currentGain > 0.001) {
      this.port.postMessage({
        event: "chunk",
        data: {
          int16arrayBuffer: this.buffer.slice(0, this.bufferWriteIndex).buffer,
        },
      });
    }
    this.bufferWriteIndex = 0;
  }
}
`;

export default AudioRecordingWorklet;
