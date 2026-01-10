/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useEffect, useRef, useState, memo, useMemo } from 'react';
import { LiveServerContent } from '@google/genai';
import { useLiveAPIContext } from '../../../contexts/LiveAPIContext';
import { wsService } from '../../../lib/websocket-service';
import { audioContext } from '../../../lib/utils';
import {
  useSettings,
  useLogStore,
  useTools,
  Template,
} from '../../../lib/state';
import { AVAILABLE_VOICES } from '../../../lib/constants';

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
  if (!text) return null;
  const boldParts = text.split(/(\*\*.*?\*\*)/g);
  return boldParts.map((boldPart, boldIndex) => {
    if (boldPart.startsWith('**') && boldPart.endsWith('**')) {
      return <strong key={boldIndex}>{boldPart.slice(2, -2)}</strong>;
    }
    return boldPart;
  });
};

const VOICE_ALIASES: Record<string, string> = {
  'Zephyr': 'King Aeolus',
  'Puck': 'King Pan',
  'Charon': 'King Hades',
  'Kore': 'Queen Persephone',
  'Luna': 'Queen Selene',
  'Nova': 'Queen Asteria',
  'Fenrir': 'King Lycaon',
  'Leda': 'Queen Leda',
  'Orus': 'King Horus',
  'Aoede': 'Queen Aoede',
  'Callirrhoe': 'Queen Callirrhoe',
  'Autonoe': 'Queen Autonoe',
  'Enceladus': 'King Enceladus',
  'Iapetus': 'King Iapetus',
  'Umbriel': 'King Erebus',
  'Algieba': 'King Leonidas',
  'Despina': 'Queen Despina',
  'Erinome': 'Queen Erinome',
  'Algenib': 'King Bellerophon',
  'Rasalgethi': 'King Heracles',
  'Laomedeia': 'Queen Laomedeia',
  'Achernar': 'King Eridanos',
  'Alnilam': 'King Orion',
  'Schedar': 'Queen Cassiopeia',
  'Gacrux': 'King Acrux',
  'Pulcherrima': 'Queen Izar',
  'Achird': 'King Cepheus',
  'Zubenelgenubi': 'King Kiffa',
  'Vindemiatrix': 'Queen Virgo',
  'Sadachbia': 'King Aquarius',
  'Sadaltager': 'King Sadaltager',
  'Sulafat': 'Queen Lyra'
};

const getVoiceAlias = (voiceId: string) => VOICE_ALIASES[voiceId] || `Persona ${voiceId}`;

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

const LANGUAGE_LABELS: Record<Template, string> = {
  'dutch': 'Dutch (Netherlands)',
  'dutch_flemish': 'Dutch (Flemish)',
  'dutch_brabantian': 'Dutch (Brabantian)',
  'dutch_limburgish': 'Dutch (Limburgish)',
  'west_flemish': 'Dutch (West Flemish)',
  'dutch_surinamese': 'Dutch (Surinamese)',
  'afrikaans': 'Afrikaans',
  'frisian': 'West Frisian',
  'medumba': 'Medumba (Cameroon)',
  'bamum': 'Bamum',
  'ewondo': 'Ewondo',
  'duala': 'Duala',
  'basaa': 'Basaa',
  'bulu': 'Bulu',
  'fulfulde_cameroon': 'Fulfulde (Cameroon)',
  'cameroonian_pidgin': 'Cameroonian Pidgin',
  'french_ivory_coast': 'French (Ivory Coast)',
  'baoule': 'Baoulé',
  'dioula': 'Dioula',
  'bete': 'Bété',
  'yoruba': 'Yoruba',
  'igbo': 'Igbo',
  'hausa': 'Hausa',
  'twi': 'Twi',
  'wolof': 'Wolof',
  'swahili': 'Swahili',
  'amharic': 'Amharic',
  'zulu': 'Zulu',
  'xhosa': 'Xhosa',
  'taglish': 'Taglish (Tagalog-English)',
  'tagalog': 'Tagalog (Formal)',
  'cebuano': 'Cebuano (Bisaya)',
  'ilocano': 'Ilocano',
  'hiligaynon': 'Hiligaynon (Ilonggo)',
  'waray': 'Waray',
  'kapampangan': 'Kapampangan',
  'bikol': 'Bikol',
  'pangasinan': 'Pangasinan',
  'chavacano': 'Chavacano',
  'english': 'English (International)',
  'spanish': 'Spanish (Neutral)',
  'spanish_mexican': 'Spanish (Mexico)',
  'spanish_argentinian': 'Spanish (Argentina)',
  'french': 'French (France)',
  'french_belgium': 'French (Belgium)',
  'german': 'German',
  'italian': 'Italian',
  'portuguese': 'Portuguese (Brazil)',
  'russian': 'Russian',
  'polish': 'Polish',
  'ukrainian': 'Ukrainian',
  'swedish': 'Swedish',
  'norwegian': 'Norwegian',
  'danish': 'Danish',
  'finnish': 'Finnish',
  'greek': 'Greek',
  'czech': 'Czech',
  'hungarian': 'Hungarian',
  'romanian': 'Romanian',
  'turkish': 'Turkish',
  'japanese': 'Japanese',
  'korean': 'Korean',
  'mandarin': 'Chinese (Mandarin)',
  'cantonese': 'Chinese (Cantonese)',
  'hokkien': 'Chinese (Hokkien)',
  'hindi': 'Hindi',
  'bengali': 'Bengali',
  'punjabi': 'Punjabi',
  'marathi': 'Marathi',
  'tamil': 'Tamil',
  'telugu': 'Telugu',
  'urdu': 'Urdu',
  'arabic': 'Arabic (Standard)',
  'arabic_egyptian': 'Arabic (Egyptian)',
  'arabic_levantine': 'Arabic (Levantine)',
  'arabic_gulf': 'Arabic (Gulf)',
  'persian': 'Persian (Farsi)',
  'hebrew': 'Hebrew',
  'vietnamese': 'Vietnamese',
  'thai': 'Thai',
  'indonesian': 'Indonesian',
  'malay': 'Malay',
};

export default function StreamingConsole() {
  const { client, connected } = useLiveAPIContext();
  const { voice, setVoice, mode, audioSource, setAudioSource } = useSettings();
  const { template, setTemplate } = useTools();
  const turns = useLogStore(state => state.turns);
  const scrollRef = useRef<HTMLDivElement>(null);
  const transcribeScrollRef = useRef<HTMLDivElement>(null);
  
  const currentAudioChunks = useRef<Uint8Array[]>([]);

  const handleSendMessage = (text: string) => {
    if (text.trim() && connected) {
      client.send([{ text }], true);
    }
  };

  const handleBroadcast = (text: string) => {
    const success = wsService.sendPrompt(text);
    if (!success) {
      alert('WebSocket is not connected. Ensure the read-aloud system is running.');
    }
  };

  useEffect(() => {
    const handleRemoteMessage = (text: string) => {
      if (text && text.trim()) {
        if (mode === 'translate') {
          handleSendMessage(text.trim());
          useLogStore.getState().addTurn({
            role: 'system',
            text: `📡 Remote Stream: "${text}"`,
            isFinal: true
          });
        } else {
          useLogStore.getState().addTurn({
            role: 'remote',
            text: text.trim(),
            isFinal: true
          });
        }
      }
    };

    wsService.on('message', handleRemoteMessage);
    wsService.connect();

    return () => {
      wsService.off('message', handleRemoteMessage);
    };
  }, [connected, client, mode]);

  useEffect(() => {
    const { addTurn, updateLastTurn } = useLogStore.getState();

    const handleInputTranscription = (text: string, isFinal: boolean) => {
      // Note: In transcribe mode, we often prefer the model's high-fidelity scribe output (agent)
      // but we still capture input transcription for redundancy or user role display.
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

      // In Transcribe mode, the agent's content IS the transcription.
      if (last?.role === 'agent' && !last.isFinal) {
        updateLastTurn({ text: last.text + text });
      } else {
        addTurn({ role: 'agent', text, isFinal: false });
      }
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
    const activeScroll = mode === 'translate' ? scrollRef : transcribeScrollRef;
    if (activeScroll.current) {
      activeScroll.current.scrollTo({
        top: activeScroll.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [turns, mode]);

  const sortedVoices = useMemo(() => {
    return AVAILABLE_VOICES.map(v => ({
      id: v,
      alias: getVoiceAlias(v)
    })).sort((a, b) => a.alias.localeCompare(b.alias));
  }, []);

  const filteredTranscribeTurns = useMemo(() => {
    if (mode !== 'transcribe') return [];
    return turns.filter(t => {
      // In Transcribe mode, we prioritize 'agent' turns as they contain the scribe's output
      if (t.role === 'agent') return true;
      
      if (audioSource === 'both') return t.role === 'user' || t.role === 'remote';
      if (audioSource === 'mic') return t.role === 'user';
      if (audioSource === 'speaker') return t.role === 'remote';
      return false;
    });
  }, [turns, audioSource, mode]);

  return (
    <div className="transcription-container">
      {mode === 'translate' ? (
        <>
          <div className="top-controls">
            <div className="selector-group">
              <span className="selector-label">Target Language</span>
              <select 
                value={template} 
                onChange={(e) => setTemplate(e.target.value as Template)} 
                className="top-select"
                disabled={connected}
              >
                {(Object.keys(LANGUAGE_LABELS) as Template[])
                  .sort((a,b) => LANGUAGE_LABELS[a].localeCompare(LANGUAGE_LABELS[b]))
                  .map(key => (
                    <option key={key} value={key}>
                      {LANGUAGE_LABELS[key]}
                    </option>
                  ))
                }
              </select>
            </div>
            <div className="selector-group">
              <span className="selector-label">Neural Persona</span>
              <select 
                value={voice} 
                onChange={(e) => setVoice(e.target.value)} 
                className="top-select"
                disabled={connected}
              >
                {sortedVoices.map(v => (
                  <option key={v.id} value={v.id}>
                    {v.alias}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="transcription-view" ref={scrollRef}>
            {turns.length === 0 && (
              <div className="transcription-entry system">
                <div className="transcription-text-content">
                  Waiting for interpretation stream...
                </div>
              </div>
            )}
            {turns.map((t, i) => (
              <div
                key={i}
                className={`transcription-entry ${t.role} ${!t.isFinal ? 'interim' : ''}`}
              >
                <div className="transcription-header">
                  <div className="transcription-source">
                    {t.role === 'user' ? 'Speaker' : t.role === 'agent' ? 'Translator' : 'System'}
                  </div>
                  <div className="transcription-timestamp">
                    {formatTimestamp(t.timestamp)}
                  </div>
                </div>
                <div className="transcription-text-content">
                  {renderContent(t.text)}
                </div>
                
                <div className="transcription-footer-actions">
                  {t.role === 'agent' && t.audioData && (
                    <PlaybackControls audioData={t.audioData} />
                  )}
                  {(t.role === 'agent' || t.role === 'user') && (
                    <button 
                      className="broadcast-btn-mini"
                      onClick={() => handleBroadcast(t.text)}
                      title="Broadcast to External Speaker"
                    >
                      <span className="material-symbols-outlined">campaign</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        /* Transcribe Mode View */
        <>
          <div className="transcribe-view" ref={transcribeScrollRef}>
             <div className="transcribe-text-large">
               {filteredTranscribeTurns.length === 0 ? (
                 <div className="transcription-entry system">
                   Engine ready. Microphone empowered. Awaiting speech...
                 </div>
               ) : (
                 filteredTranscribeTurns.map((t, i) => (
                   <span key={i} className={`transcribe-word ${t.isFinal ? 'final' : ''} ${t.role === 'remote' ? 'remote' : ''} ${t.role === 'agent' ? 'scribe' : ''}`}>
                     {t.text}{' '}
                   </span>
                 ))
               )}
             </div>
          </div>
        </>
      )}
    </div>
  );
}
