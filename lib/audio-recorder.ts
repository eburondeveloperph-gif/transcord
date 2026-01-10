
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
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
  
  // Advanced Sensitivity Logic
  private currentGain: number = 1.0;
  private targetGain: number = 1.0;
  private noiseFloor: number = 0.001; 
  private lastVolume: number = 0;
  private volumeHistory: number[] = [];
  private readonly HISTORY_SIZE = 8; // ~200ms of history for trend analysis
  
  // Ducking Logic
  private volumeMultiplier: number = 1.0; 
  private targetVolumeMultiplier: number = 1.0; 

  // Voice Focus Logic
  public voiceFocus: boolean = false;
  private speechHoldCounter: number = 0;
  
  // Constants for VAD responsiveness
  private readonly SPEECH_HOLD_FRAMES = 24; // ~600ms to prevent cutting off sentence ends
  private readonly NOISE_FLOOR_ATTACK = 0.01; 
  private readonly NOISE_FLOOR_DECAY = 0.00005;

  constructor(public sampleRate = 16000) {}

  public setVolumeMultiplier(multiplier: number) {
    this.targetVolumeMultiplier = multiplier;
  }

  public setVoiceFocus(enabled: boolean) {
    this.voiceFocus = enabled;
  }

  private updateSensitivity(volume: number) {
    // 1. Maintain Energy History
    this.volumeHistory.push(volume);
    if (this.volumeHistory.length > this.HISTORY_SIZE) {
      this.volumeHistory.shift();
    }

    const avgVolume = this.volumeHistory.reduce((a, b) => a + b, 0) / this.volumeHistory.length;
    
    // 2. Adaptive Noise Floor Tracking
    // We update the floor when the signal is stable and low
    if (volume < this.noiseFloor) {
      this.noiseFloor = this.noiseFloor * (1 - this.NOISE_FLOOR_ATTACK) + volume * this.NOISE_FLOOR_ATTACK;
    } else {
      // Very slow drift upwards to ensure we don't clamp to silence
      this.noiseFloor += this.NOISE_FLOOR_DECAY;
    }

    // 3. Precision Gating
    const volumeDelta = volume - this.lastVolume;
    this.lastVolume = volume;

    // Use SNR (Signal-to-Noise Ratio) logic for the gate
    // Voice Focus mode significantly tightens the threshold to ignore distant talkers
    const snrMultiplier = this.voiceFocus ? 4.5 : 2.2;
    const baseOffset = this.voiceFocus ? 0.015 : 0.005;
    const dynamicThreshold = (this.noiseFloor * snrMultiplier) + baseOffset;

    // Trigger conditions:
    // A. Current volume exceeds dynamic threshold
    // B. Average volume (trend) exceeds threshold
    // C. Sharp onset detected (consonant start)
    const onsetThreshold = this.voiceFocus ? 0.01 : 0.02;
    
    let isSpeaking = false;
    if (volume > dynamicThreshold || avgVolume > dynamicThreshold || volumeDelta > onsetThreshold) {
      isSpeaking = true;
      this.speechHoldCounter = this.SPEECH_HOLD_FRAMES;
    } else if (this.speechHoldCounter > 0) {
      isSpeaking = true;
      this.speechHoldCounter--;
    }

    // 4. Intelligence-Driven Normalization
    // Target RMS level for optimal Gemini processing
    const targetLevel = this.voiceFocus ? 0.75 : 0.5; 
    const minGain = 0.1;
    const maxGain = 12.0;

    if (isSpeaking) {
      // Calculate smooth normalization gain
      const gainToTarget = targetLevel / (Math.max(avgVolume, 0.0001));
      this.targetGain = Math.max(minGain, Math.min(maxGain, gainToTarget));
    } else {
      // Hard gate to zero when silence is detected for perfectly clean transcription output
      this.targetGain = 0.0;
    }

    // 5. Asymmetrical Smoothing
    // Fast attack (to catch the very first syllable)
    // Slower release (to bridge pauses within words)
    const attackAlpha = 0.5;
    const releaseAlpha = this.voiceFocus ? 0.1 : 0.2; 
    const alpha = this.targetGain > this.currentGain ? attackAlpha : releaseAlpha;
    
    this.currentGain = this.currentGain * (1 - alpha) + this.targetGain * alpha;
    
    // Smooth ducking transition
    const duckingAlpha = 0.2;
    this.volumeMultiplier = this.volumeMultiplier * (1 - duckingAlpha) + this.targetVolumeMultiplier * duckingAlpha;

    // Final Gain Application
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
      this.speechHoldCounter = 0;
      this.lastVolume = 0;
      this.volumeHistory = [];
    };
    if (this.starting) {
      this.starting.then(handleStop).catch(handleStop);
      return;
    }
    handleStop();
  }
}
