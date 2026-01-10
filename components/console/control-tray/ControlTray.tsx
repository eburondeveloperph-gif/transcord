
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import cn from 'classnames';
import React, { memo, useEffect, useRef, useState } from 'react';
import { AudioRecorder } from '../../../lib/audio-recorder';
import { useUI, useSettings } from '../../../lib/state';
import { useLiveAPIContext } from '../../../contexts/LiveAPIContext';

function ControlTray() {
  const [audioRecorder] = useState(() => new AudioRecorder());
  const [muted, setMuted] = useState(false);
  const [chatValue, setChatValue] = useState('');
  const connectButtonRef = useRef<HTMLButtonElement>(null);

  const { client, connected, connect, disconnect, isAiSpeaking } = useLiveAPIContext();
  const { toggleSidebar, isSidebarOpen } = useUI();
  const { voiceFocus, setVoiceFocus } = useSettings();

  useEffect(() => {
    if (!connected) {
      setMuted(false);
    }
  }, [connected]);

  useEffect(() => {
    if (audioRecorder) {
      audioRecorder.setVoiceFocus(voiceFocus);
    }
  }, [voiceFocus, audioRecorder]);

  useEffect(() => {
    if (audioRecorder && connected && !muted) {
      audioRecorder.setVolumeMultiplier(isAiSpeaking ? 0.15 : 1.0);
    }
  }, [isAiSpeaking, audioRecorder, connected, muted]);

  useEffect(() => {
    const onData = (base64: string) => {
      client.sendRealtimeInput([
        {
          mimeType: 'audio/pcm;rate=16000',
          data: base64,
        },
      ]);
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

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSendMessage();
    }
  };

  return (
    <section className="control-tray-floating">
      <div className={cn('floating-pill', { 'connected': connected })}>
        
        <button
          className={cn('icon-button', { active: isSidebarOpen })}
          onClick={toggleSidebar}
          aria-label="Preferences"
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

        <div className="chat-input-wrapper">
          <input
            type="text"
            className="chat-input"
            placeholder="Type message..."
            value={chatValue}
            onChange={(e) => setChatValue(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <span 
            className="material-symbols-outlined chat-send-icon"
            onClick={handleSendMessage}
          >
            send
          </span>
        </div>

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
