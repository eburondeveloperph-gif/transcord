
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
import { logToSupabase } from '../../../lib/supabase';
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
    try {
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
    } catch (e) {
      console.error("Playback initialization failed:", e);
      return null;
    }
  };

  const handlePlay = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const ctx = await audioContext({ id: 'playback' });
    if (ctx.state === 'suspended') await ctx.resume();
    const buffer = await initBuffer();
    if (!buffer || status === 'playing') return;
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
    <div className="playback-controls-wrapper">
      <div className="playback-controls">
        {status !== 'playing' ? (
          <button className="playback-btn" onClick={handlePlay} title="Play">
            <span className="material-symbols-outlined">play_arrow</span>
          </button>
        ) : (
          <button className="playback-btn" onClick={handlePause} title="Pause">
            <span className="material-symbols-outlined">pause</span>
          </button>
        )}
        <div className="playback-progress-container">
          <div className="playback-progress-fill" style={{ width: `${progress}%` }} />
        </div>
        <button className="playback-btn" onClick={handleStop} disabled={status === 'stopped'} title="Stop">
          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>stop</span>
        </button>
      </div>
    </div>
  );
});

export default function StreamingConsole() {
  const { client, setConfig, connected, connect, isAiSpeaking } = useLiveAPIContext();
  const { systemPrompt, voice, supabaseEnabled } = useSettings();
  const { tools, template } = useTools();
  const { turns, sessionId, addTurn, updateLastTurn } = useLogStore();
  
  // Dual Stream State
  const [transcription, setTranscription] = useState<string | null>(null);
  const [translation, setTranslation] = useState<string | null>(null);
  const [isRemoteInput, setIsRemoteInput] = useState(false);
  
  const currentAudioChunks = useRef<Uint8Array[]>([]);
  const clearTimeoutsRef = useRef<{ trans?: number; input?: number }>({});
  const lastProcessedMessageRef = useRef<number>(0);
  
  // Ref to track pairing for Supabase
  const lastUserTextRef = useRef<string | null>(null);

  const handleSendMessage = (text: string, remote: boolean = false) => {
    if (!text) return;
    setIsRemoteInput(remote);
    lastUserTextRef.current = text; // Manual text entry is also a 'transcription'
    if (connected) {
      client.send([{ text }], true);
    } else {
      connect().then(() => {
        client.send([{ text }], true);
      }).catch(console.error);
    }
  };

  useEffect(() => {
    if (clearTimeoutsRef.current.trans) window.clearTimeout(clearTimeoutsRef.current.trans);
    if (!isAiSpeaking && translation) {
      clearTimeoutsRef.current.trans = window.setTimeout(() => {
        setTranslation(null);
        setIsRemoteInput(false);
      }, 5000);
    }
  }, [isAiSpeaking, translation]);

  useEffect(() => {
    const handleRemoteMessage = (data: any) => {
      if (data.timestamp && data.timestamp <= lastProcessedMessageRef.current) return;
      if (data.text) {
        lastProcessedMessageRef.current = data.timestamp || Date.now();
        handleSendMessage(data.text, true);
      }
    };
    wsService.on('message', handleRemoteMessage);
    wsService.connect();
    return () => wsService.off('message', handleRemoteMessage);
  }, [connected, client]);

  useEffect(() => {
    const config: LiveConnectConfig = {
      responseModalities: [Modality.AUDIO],
      inputAudioTranscription: {},
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
    const handleContent = (serverContent: LiveServerContent) => {
      const text = serverContent.modelTurn?.parts
          ?.map((p: any) => p.text)
          .filter(Boolean)
          .join(' ') ?? '';
      if (!text) return;
      setTranslation(text);
      addTurn({ role: 'agent', text, isFinal: false });
    };

    const handleInputTranscription = (text: string) => {
      setTranscription(text);
      lastUserTextRef.current = text;
      if (clearTimeoutsRef.current.input) window.clearTimeout(clearTimeoutsRef.current.input);
      clearTimeoutsRef.current.input = window.setTimeout(() => {
        setTranscription(null);
      }, 6000);
    };

    const handleTurnComplete = () => {
      const currentTurns = useLogStore.getState().turns;
      const last = currentTurns[currentTurns.length - 1];
      
      if (last && last.role === 'agent') {
        // Sync to Supabase if enabled
        if (supabaseEnabled && lastUserTextRef.current) {
          logToSupabase({
            session_id: sessionId,
            user_text: lastUserTextRef.current,
            agent_text: last.text,
            language: template
          });
          // Reset after sync to avoid duplicates
          lastUserTextRef.current = null;
        }

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
    client.on('inputTranscription', handleInputTranscription);
    client.on('turncomplete', handleTurnComplete);
    client.on('audio', onAudio);

    return () => {
      client.off('content', handleContent);
      client.off('inputTranscription', handleInputTranscription);
      client.off('turncomplete', handleTurnComplete);
      client.off('audio', onAudio);
    };
  }, [client, sessionId, supabaseEnabled, template, addTurn, updateLastTurn]);

  const lastAgentTurn = [...turns].reverse().find(t => t.role === 'agent' && t.audioData);

  return (
    <div className="main-content">
      {turns.length === 0 && !connected ? (
        <WelcomeScreen />
      ) : (
        <div className="audio-zen-center">
          <div className={`audio-pulse ${isAiSpeaking ? 'active' : ''}`}>
            <div className="pulse-ring"></div>
            <span className="material-symbols-outlined audio-icon">
              {isAiSpeaking ? 'graphic_eq' : 'mic'}
            </span>
          </div>
          
          <div className="subtitle-area-container">
            {/* Transcription Zone (What you said) */}
            <div className={`transcription-zone ${transcription ? 'visible' : ''}`}>
               {transcription || ""}
            </div>

            {/* Translation Zone (What they hear) */}
            <div className="translation-zone">
              {isRemoteInput && translation && <div className="remote-badge">Remote Audio Feed</div>}
              <div className={`zen-subtitle ${translation ? 'visible' : ''}`}>
                {translation || (connected ? (transcription ? "" : "Listening...") : "Standing By")}
              </div>
            </div>
          </div>

          {lastAgentTurn?.audioData && (
             <PlaybackControls audioData={lastAgentTurn.audioData} />
          )}
        </div>
      )}
    </div>
  );
}
