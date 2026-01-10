
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { useEffect, useRef, useState } from 'react';
import PopUp from '../popup/PopUp';
import WelcomeScreen from '../welcome-screen/WelcomeScreen';
import { Modality, LiveServerContent } from '@google/genai';
import { useLiveAPIContext } from '../../../contexts/LiveAPIContext';
import { AudioRecorder } from '../../../lib/audio-recorder';
import { wsService } from '../../../lib/websocket-service';
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

const renderContent = (text: string) => {
  const boldParts = text.split(/(\*\*.*?\*\*)/g);
  return boldParts.map((boldPart, boldIndex) => {
    if (boldPart.startsWith('**') && boldPart.endsWith('**')) {
      return <strong key={boldIndex}>{boldPart.slice(2, -2)}</strong>;
    }
    return boldPart;
  });
};

export default function StreamingConsole() {
  const { client, setConfig, connected, connect } = useLiveAPIContext();
  const { systemPrompt, voice } = useSettings();
  const { tools } = useTools();
  const turns = useLogStore(state => state.turns);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showPopUp, setShowPopUp] = useState(true);
  const [audioRecorder] = useState(() => new AudioRecorder());
  const [chatValue, setChatValue] = useState('');

  const handleClosePopUp = () => {
    setShowPopUp(false);
    connect().catch(console.error);
  };

  const handleSendMessage = () => {
    if (chatValue.trim()) {
      if (connected) {
        client.send([{ text: chatValue.trim() }], true);
        setChatValue('');
      } else {
        connect().then(() => {
          client.send([{ text: chatValue.trim() }], true);
          setChatValue('');
        });
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSendMessage();
    }
  };

  // WebSocket Integration for Remote Read-Aloud
  useEffect(() => {
    if (!connected) {
      wsService.disconnect();
      return;
    }

    const handleRemoteMessage = (text: string) => {
      client.send([{ text }], true);
      
      useLogStore.getState().addTurn({
        role: 'system',
        text: `📢 WebSocket Triggered Read-Aloud: "${text}"`,
        isFinal: true
      });
    };

    wsService.on('message', handleRemoteMessage);
    wsService.connect();

    return () => {
      wsService.off('message', handleRemoteMessage);
    };
  }, [connected, client]);

  useEffect(() => {
    const onData = (base64: string) => {
      client.sendRealtimeInput([
        {
          mimeType: 'audio/pcm;rate=16000',
          data: base64,
        },
      ]);
    };
    if (connected && audioRecorder) {
      audioRecorder.on('data', onData);
      audioRecorder.start();
    } else {
      audioRecorder.stop();
    }
    return () => {
      audioRecorder.off('data', onData);
    };
  }, [connected, client, audioRecorder]);

  useEffect(() => {
    const declarations = tools
      .filter(tool => tool.isEnabled)
      .map(tool => ({
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters,
      }));

    const config: any = {
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
      systemInstruction: systemPrompt,
      thinkingConfig: { thinkingBudget: 0 },
      tools: declarations.length > 0 ? [{ functionDeclarations: declarations }] : [],
    };

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
      if (last && !last.isFinal) {
        updateLastTurn({ isFinal: true });
      }
    };

    client.on('inputTranscription', handleInputTranscription);
    client.on('outputTranscription', handleOutputTranscription);
    client.on('content', handleContent);
    client.on('turncomplete', handleTurnComplete);

    return () => {
      client.off('inputTranscription', handleInputTranscription);
      client.off('outputTranscription', handleOutputTranscription);
      client.off('content', handleContent);
      client.off('turncomplete', handleTurnComplete);
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
      {showPopUp && <PopUp onClose={handleClosePopUp} />}
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
                  {t.role === 'user' ? 'Speaker' : 'Oracle'}
                </div>
                <div className="transcription-timestamp">
                  {formatTimestamp(t.timestamp)}
                </div>
              </div>
              <div className="transcription-text-content">
                {renderContent(t.text)}
              </div>
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
            onClick={handleSendMessage}
            disabled={!chatValue.trim()}
          >
            <span className="material-symbols-outlined">send</span>
          </button>
        </div>
      )}
    </div>
  );
}
