/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import cn from 'classnames';
import React, { memo, useEffect, useRef, useState } from 'react';
import { AudioRecorder } from '../../../lib/audio-recorder';
import { useUI, useSettings } from '../../../lib/state';
import { useLiveAPIContext } from '../../../contexts/LiveAPIContext';
import { wsService } from '../../../lib/websocket-service';

function ControlTray() {
  const [audioRecorder] = useState(() => new AudioRecorder());
  const [muted, setMuted] = useState(false);
  const [chatValue, setChatValue] = useState('');
  const connectButtonRef = useRef<HTMLButtonElement>(null);

  const { client, connected, connect, disconnect, isAiSpeaking } = useLiveAPIContext();
  const { toggleSidebar, isSidebarOpen } = useUI();
  const { voiceFocus, setVoiceFocus, mode } = useSettings();

  useEffect(() => {
    if (!connected) {
      setMuted(false);
    }
  }, [connected]);

  // Enforce mode-specific microphone defaults
  useEffect(() => {
    if (mode === 'translate') {
      setMuted(true);
    } else if (mode === 'transcribe') {
      setMuted(false);
    }
  }, [mode]);

  // Unified Recording Logic
  useEffect(() => {
    if (audioRecorder) {
      audioRecorder.setVoiceFocus(voiceFocus);
      audioRecorder.setMode(mode);
    }
  }, [voiceFocus, mode, audioRecorder]);

  useEffect(() => {
    if (audioRecorder && connected && !muted) {
      // Dynamic ducking
      audioRecorder.setVolumeMultiplier(isAiSpeaking ? 0.15 : 1.0);
    }
  }, [isAiSpeaking, audioRecorder, connected, muted]);

  useEffect(() => {
    const onData = (base64: string) => {
      client.sendRealtimeInput([{ mimeType: 'audio/pcm;rate=16000', data: base64 }]);
    };
    
    if (connected && !muted && audioRecorder) {
      audioRecorder.on('data', onData);
      audioRecorder.start();
    } else {
      audioRecorder.stop();
    }
    return () => {
      audioRecorder.off('data', onData);
    };
  }, [connected, client, muted, audioRecorder]);

  const handleMicClick = () => {
    if (connected) {
      setMuted(!muted);
    } else {
      connect();
    }
  };

  const handleSendMessage = () => {
    const text = chatValue.trim();
    if (text) {
      if (connected) {
        client.send([{ text }], true);
        setChatValue('');
      } else {
        connect().then(() => {
          client.send([{ text }], true);
          setChatValue('');
        }).catch(console.error);
      }
    }
  };

  const handleBroadcast = () => {
    const text = chatValue.trim();
    if (text) {
      const success = wsService.sendPrompt(text);
      if (success) {
        setChatValue('');
      } else {
        alert('WebSocket is not connected. Ensure the read-aloud system is running.');
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSendMessage();
    }
  };

  return (
    <section className="control-tray-floating">
      <div className={cn('floating-pill', { 'connected': connected, 'compact': mode === 'transcribe' })}>
        
        <button
          className={cn('icon-button', { active: isSidebarOpen })}
          onClick={toggleSidebar}
          aria-label="Settings"
          title="Linguistic Preferences"
        >
          <span className="material-symbols-outlined">settings</span>
        </button>

        <button
          className={cn('icon-button', { active: voiceFocus })}
          onClick={() => setVoiceFocus(!voiceFocus)}
          aria-label={voiceFocus ? "Disable Voice Focus" : "Enable Voice Focus"}
          title="Voice Focus"
        >
          <span className="material-symbols-outlined">
            {voiceFocus ? 'center_focus_strong' : 'center_focus_weak'}
          </span>
        </button>

        {mode === 'translate' && (
          <div className="chat-input-wrapper">
            <input
              type="text"
              className="chat-input"
              placeholder="Translate message..."
              value={chatValue}
              onChange={(e) => setChatValue(e.target.value)}
              onKeyDown={handleKeyDown}
            />
            <div className="chat-actions">
              <span 
                className="material-symbols-outlined chat-send-icon"
                onClick={handleBroadcast}
                title="Broadcast to Loudspeaker"
                style={{ color: 'var(--text-muted)' }}
              >
                campaign
              </span>
              <span 
                className="material-symbols-outlined chat-send-icon"
                onClick={handleSendMessage}
                title="Send to Translator"
              >
                send
              </span>
            </div>
          </div>
        )}

        <button
          className={cn('icon-button', { 
            active: !muted && connected, 
            muted: muted && connected 
          })}
          onClick={handleMicClick}
          aria-label={muted ? 'Unmute' : 'Mute'}
          title="Microphone"
        >
          <span className={cn('material-symbols-outlined', { 'filled': !muted && connected })}>
            {muted || !connected ? 'mic_off' : 'mic'}
          </span>
        </button>

        <button
          ref={connectButtonRef}
          className={cn('icon-button main-action', { connected })}
          onClick={connected ? disconnect : connect}
          aria-label={connected ? 'Stop' : 'Start'}
          title={connected ? "Stop Session" : "Start Session"}
        >
          <span className="material-symbols-outlined filled">
            {connected ? 'stop_circle' : 'bolt'}
          </span>
        </button>
      </div>
    </section>
  );
}

export default memo(ControlTray);
