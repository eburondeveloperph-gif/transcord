
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useEffect, useRef, useState, memo, useMemo } from 'react';
import WelcomeScreen from '../welcome-screen/WelcomeScreen';
import { Modality, LiveServerContent, LiveConnectConfig } from '@google/genai';
import { useLiveAPIContext } from '../../../contexts/LiveAPIContext';
import { wsService } from '../../../lib/websocket-service';
import { audioContext } from '../../../lib/utils';
import {
  useSettings,
  useLogStore,
  useTools,
} from '../../../lib/state';

const PlaybackControls = memo(({ audioData }: { audioData: Uint8Array }) => {
  const [status, setStatus] = useState<'playing' | 'paused' | 'stopped'>('stopped');
  const [progress, setProgress] = useState(0);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);
  const startTimeRef = useRef(0);
  const pausedAtRef = useRef(0);
  const bufferRef = useRef<AudioBuffer | null>(null);
  const progressIntervalRef = useRef<number | null>(null);

  const duration = useMemo(() => audioData.length / 2 / 24000, [audioData]);

  const initBuffer = async () => {
    if (bufferRef.current) return bufferRef.current;
    const ctx = await audioContext({ id: 'playback' });
    const dataInt16 = new Int16Array(audioData.buffer);
    const float32 = new Float32Array(dataInt16.length);
    for (let i = 0; i < dataInt16.length; i++) {
      float32[i] = dataInt16[i] / 32768;
    }
    const buffer = ctx.createBuffer(1, float32.length, 24000);
    buffer.getChannelData(0).set(float32);
    bufferRef.current = buffer;
    return buffer;
  };

  const handlePlay = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const ctx = await audioContext({ id: 'playback' });
    if (ctx.state === 'suspended') await ctx.resume();
    const buffer = await initBuffer();
    if (status === 'playing') return;
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    const offset = status === 'paused' ? pausedAtRef.current : 0;
    source.start(0, offset);
    startTimeRef.current = ctx.currentTime - offset;
    sourceRef.current = source;
    setStatus('playing');
    progressIntervalRef.current = window.setInterval(() => {
      const current = ctx.currentTime - startTimeRef.current;
      const percent = Math.min(100, (current / duration) * 100);
      setProgress(percent);
    }, 50);
    source.onended = () => {
      if (sourceRef.current === source) {
        setStatus('stopped');
        pausedAtRef.current = 0;
        setProgress(0);
        if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
      }
    };
  };

  const handlePause = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (sourceRef.current && status === 'playing') {
      const ctx = (sourceRef.current.context as AudioContext);
      sourceRef.current.stop();
      pausedAtRef.current = ctx.currentTime - startTimeRef.current;
      sourceRef.current = null;
      setStatus('paused');
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    }
  };

  const handleStop = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (sourceRef.current) {
      sourceRef.current.stop();
      sourceRef.current = null;
    }
    pausedAtRef.current = 0;
    setProgress(0);
    setStatus('stopped');
    if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
  };

  useEffect(() => {
    return () => {
      if (sourceRef.current) sourceRef.current.stop();
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    };
  }, []);

  return (
    <div className="playback-controls-wrapper zen-mode">
      <div className="playback-controls">
        {status !== 'playing' ? (
          <button className="playback-btn" onClick={handlePlay} title="Play interpretation">
            <span className="material-symbols-outlined">play_arrow</span>
          </button>
        ) : (
          <button className="playback-btn" onClick={handlePause} title="Pause interpretation">
            <span className="material-symbols-outlined">pause</span>
          </button>
        )}
        <button className="playback-btn" onClick={handleStop} disabled={status === 'stopped'} title="Stop">
          <span className="material-symbols-outlined">stop</span>
        </button>
        <div className="playback-progress-container">
          <div className="playback-progress-track">
            <div className="playback-progress-fill" style={{ width: `${progress}%` }} />
          </div>
        </div>
      </div>
    </div>
  );
});

export default function StreamingConsole() {
  const { client, setConfig, connected, connect, isAiSpeaking } = useLiveAPIContext();
  const { systemPrompt, voice } = useSettings();
  const { tools } = useTools();
  const turns = useLogStore(state => state.turns);
  const [chatValue, setChatValue] = useState('');
  const [activeSubtitle, setActiveSubtitle] = useState<string | null>(null);
  const currentAudioChunks = useRef<Uint8Array[]>([]);
  const subtitleTimeoutRef = useRef<number | null>(null);

  const handleSendMessage = (text?: string) => {
    const messageText = text || chatValue.trim();
    if (messageText) {
      if (connected) {
        client.send([{ text: messageText }], true);
        if (!text) setChatValue('');
      } else {
        connect().then(() => {
          client.send([{ text: messageText }], true);
          if (!text) setChatValue('');
        }).catch(console.error);
      }
    }
  };

  useEffect(() => {
    if (subtitleTimeoutRef.current) window.clearTimeout(subtitleTimeoutRef.current);
    if (!isAiSpeaking && activeSubtitle) {
      subtitleTimeoutRef.current = window.setTimeout(() => {
        setActiveSubtitle(null);
      }, 3000);
    }
  }, [isAiSpeaking, activeSubtitle]);

  useEffect(() => {
    const handleRemoteMessage = (text: string) => {
      if (text && text.trim()) {
        handleSendMessage(text.trim());
      }
    };
    wsService.on('message', handleRemoteMessage);
    wsService.connect();
    return () => wsService.off('message', handleRemoteMessage);
  }, [connected, client]);

  useEffect(() => {
    const config: LiveConnectConfig = {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName: voice },
        },
      },
      systemInstruction: { parts: [{ text: systemPrompt }] },
      tools: [{ functionDeclarations: tools.filter(t => t.isEnabled).map(t => ({
        name: t.name,
        description: t.description,
        parameters: t.parameters
      })) }]
    };
    setConfig(config);
  }, [setConfig, systemPrompt, tools, voice]);

  useEffect(() => {
    const { addTurn, updateLastTurn } = useLogStore.getState();

    const handleContent = (serverContent: LiveServerContent) => {
      const text = serverContent.modelTurn?.parts
          ?.map((p: any) => p.text)
          .filter(Boolean)
          .join(' ') ?? '';
      if (!text) return;
      setActiveSubtitle(text);
      addTurn({ role: 'agent', text, isFinal: false });
    };

    const handleTurnComplete = () => {
      const last = useLogStore.getState().turns.at(-1);
      if (last && last.role === 'agent') {
        if (currentAudioChunks.current.length > 0) {
          const totalLength = currentAudioChunks.current.reduce((acc, curr) => acc + curr.length, 0);
          const audioData = new Uint8Array(totalLength);
          let offset = 0;
          for (const chunk of currentAudioChunks.current) {
            audioData.set(chunk, offset);
            offset += chunk.length;
          }
          updateLastTurn({ audioData, isFinal: true });
          currentAudioChunks.current = [];
        } else if (!last.isFinal) {
          updateLastTurn({ isFinal: true });
        }
      }
    };

    const onAudio = (data: ArrayBuffer) => {
      currentAudioChunks.current.push(new Uint8Array(data));
    };

    client.on('content', handleContent);
    client.on('turncomplete', handleTurnComplete);
    client.on('audio', onAudio);

    return () => {
      client.off('content', handleContent);
      client.off('turncomplete', handleTurnComplete);
      client.off('audio', onAudio);
    };
  }, [client]);

  const lastAgentTurn = turns.filter(t => t.role === 'agent' && t.audioData).at(-1);

  return (
    <div className="transcription-container zen-ui">
      {turns.length === 0 && !connected ? (
        <WelcomeScreen />
      ) : (
        <div className="audio-zen-center">
          <div className={`audio-pulse ${isAiSpeaking ? 'active' : ''}`}>
            <div className="pulse-ring"></div>
            <span className="material-symbols-outlined audio-icon">
              {isAiSpeaking ? 'graphic_eq' : 'mic_none'}
            </span>
          </div>
          
          <div className={`zen-subtitle ${activeSubtitle ? 'visible' : ''}`}>
            {activeSubtitle}
          </div>

          {lastAgentTurn?.audioData && (
             <PlaybackControls audioData={lastAgentTurn.audioData} />
          )}
        </div>
      )}

      <div className="chat-composer-zen">
        <input
          type="text"
          className="chat-composer-input"
          placeholder="Input text..."
          value={chatValue}
          onChange={(e) => setChatValue(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
        />
      </div>
    </div>
  );
}
