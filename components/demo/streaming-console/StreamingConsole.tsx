
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

const formatTimestamp = (date: Date) => {
  const pad = (num: number, size = 2) => num.toString().padStart(size, '0');
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  return `${hours}:${minutes}`;
};

const formatDuration = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const renderContent = (text: string) => {
  const boldParts = text.split(/(\*\*.*?\*\*)/g);
  return boldParts.map((boldPart, boldIndex) => {
    if (boldPart.startsWith('**') && boldPart.endsWith('**')) {
      return <strong key={boldIndex}>{boldPart.slice(2, -2)}</strong>;
    }
    return boldPart;
  });
};

/**
 * Component for message playback controls (Play, Pause, Stop).
 * Enhanced with progress tracking and duration display.
 */
const PlaybackControls = memo(({ audioData }: { audioData: Uint8Array }) => {
  const [status, setStatus] = useState<'playing' | 'paused' | 'stopped'>('stopped');
  const [progress, setProgress] = useState(0);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);
  const startTimeRef = useRef(0);
  const pausedAtRef = useRef(0);
  const bufferRef = useRef<AudioBuffer | null>(null);
  const progressIntervalRef = useRef<number | null>(null);

  // PCM16: 2 bytes per sample, 24000 samples per second
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
    <div className="playback-controls-wrapper">
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
          <div className="playback-duration">
            {status === 'playing' || status === 'paused' 
              ? formatDuration(pausedAtRef.current || (progress / 100 * duration))
              : formatDuration(duration)}
          </div>
        </div>
      </div>
    </div>
  );
});

export default function StreamingConsole() {
  const { client, setConfig, connected, connect } = useLiveAPIContext();
  const { systemPrompt, voice } = useSettings();
  const { tools } = useTools();
  const turns = useLogStore(state => state.turns);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [chatValue, setChatValue] = useState('');
  
  // Local ref to accumulate audio chunks for the current turn
  const currentAudioChunks = useRef<Uint8Array[]>([]);

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

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSendMessage();
    }
  };

  // Database/WebSocket Integration
  useEffect(() => {
    const handleRemoteMessage = (text: string) => {
      if (text && text.trim()) {
        handleSendMessage(text.trim());
        useLogStore.getState().addTurn({
          role: 'system',
          text: `📥 Stream Input (Database): "${text}"`,
          isFinal: true
        });
      }
    };

    wsService.on('message', handleRemoteMessage);
    wsService.connect();

    return () => {
      wsService.off('message', handleRemoteMessage);
    };
  }, [connected, client]);

  useEffect(() => {
    const declarations = tools
      .filter(tool => tool.isEnabled)
      .map(tool => ({
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters,
      }));

    // Construct the config strictly according to the LiveConnectConfig interface
    // to avoid sending undefined keys or invalid structures.
    const config: LiveConnectConfig = {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: {
            voiceName: voice,
          },
        },
      },
      inputAudioTranscription: {},
      outputAudioTranscription: {},
      systemInstruction: { parts: [{ text: systemPrompt }] },
    };

    // Only add tools if there are valid declarations
    if (declarations.length > 0) {
      config.tools = [{ functionDeclarations: declarations }];
    }

    setConfig(config);
  }, [setConfig, systemPrompt, tools, voice]);

  useEffect(() => {
    const { addTurn, updateLastTurn } = useLogStore.getState();

    const handleInputTranscription = (text: string, isFinal: boolean) => {
      const turns = useLogStore.getState().turns;
      const last = turns[turns.length - 1];
      if (last && last.role === 'user' && !last.isFinal) {
        updateLastTurn({ text: text, isFinal });
      } else {
        addTurn({ role: 'user', text, isFinal });
      }
    };

    const handleOutputTranscription = (text: string, isFinal: boolean) => {
      const turns = useLogStore.getState().turns;
      const last = turns[turns.length - 1];
      if (last && last.role === 'agent' && !last.isFinal) {
        updateLastTurn({ text: text, isFinal });
      } else {
        addTurn({ role: 'agent', text, isFinal });
      }
    };

    const handleContent = (serverContent: LiveServerContent) => {
      const text =
        serverContent.modelTurn?.parts
          ?.map((p: any) => p.text)
          .filter(Boolean)
          .join(' ') ?? '';
      
      if (!text) return;

      const turns = useLogStore.getState().turns;
      const last = turns.at(-1);

      if (last?.role === 'agent' && !last.isFinal) {
        updateLastTurn({ text: last.text + text });
      } else {
        addTurn({ role: 'agent', text, isFinal: false });
      }
    };

    const handleTurnComplete = () => {
      const last = useLogStore.getState().turns.at(-1);
      if (last && last.role === 'agent') {
        // Collect current audio chunks and assign to turn
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
      } else if (last && !last.isFinal) {
        updateLastTurn({ isFinal: true });
      }
    };

    const onAudio = (data: ArrayBuffer) => {
      currentAudioChunks.current.push(new Uint8Array(data));
    };

    client.on('inputTranscription', handleInputTranscription);
    client.on('outputTranscription', handleOutputTranscription);
    client.on('content', handleContent);
    client.on('turncomplete', handleTurnComplete);
    client.on('audio', onAudio);

    return () => {
      client.off('inputTranscription', handleInputTranscription);
      client.off('outputTranscription', handleOutputTranscription);
      client.off('content', handleContent);
      client.off('turncomplete', handleTurnComplete);
      client.off('audio', onAudio);
    };
  }, [client]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [turns]);

  return (
    <div className="transcription-container">
      {turns.length === 0 ? (
        <WelcomeScreen />
      ) : (
        <div className="transcription-view" ref={scrollRef}>
          {turns.filter(t => t.role !== 'system').map((t, i) => (
            <div
              key={i}
              className={`transcription-entry ${t.role} ${!t.isFinal ? 'interim' : ''}`}
            >
              <div className="transcription-header">
                <div className="transcription-source">
                  {t.role === 'user' ? 'Speaker' : t.role === 'agent' ? 'Oracle' : 'Stream'}
                </div>
                <div className="transcription-timestamp">
                  {formatTimestamp(t.timestamp)}
                </div>
              </div>
              <div className="transcription-text-content">
                {renderContent(t.text)}
              </div>
              
              {t.role === 'agent' && t.audioData && (
                <PlaybackControls audioData={t.audioData} />
              )}
            </div>
          ))}
        </div>
      )}
      
      {turns.length > 0 && (
        <div className="chat-composer-inline">
          <input
            type="text"
            className="chat-composer-input"
            placeholder="Type your message..."
            value={chatValue}
            onChange={(e) => setChatValue(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <button 
            className="chat-composer-submit" 
            onClick={() => handleSendMessage()}
            disabled={!chatValue.trim()}
          >
            <span className="material-symbols-outlined">send</span>
          </button>
        </div>
      )}
    </div>
  );
}
