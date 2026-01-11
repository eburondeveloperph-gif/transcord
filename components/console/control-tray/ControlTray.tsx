
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import cn from 'classnames';
import React, { memo, useEffect, useRef, useState } from 'react';
import { AudioRecorder } from '../../../lib/audio-recorder';
import { useUI, useSettings, useTools } from '../../../lib/state';
import { useLiveAPIContext } from '../../../contexts/LiveAPIContext';
import { wsService } from '../../../lib/websocket-service';

function ControlTray() {
  const [audioRecorder] = useState(() => new AudioRecorder());
  const [muted, setMuted] = useState(false);
  const [chatValue, setChatValue] = useState('');
  const connectButtonRef = useRef<HTMLButtonElement>(null);

  const { client, connected, connect, disconnect, isAiSpeaking } = useLiveAPIContext();
  const { toggleSidebar, isSidebarOpen } = useUI();
  // Fix: Remove 'mode' from useSettings as it doesn't exist there.
  const { voiceFocus, setVoiceFocus } = useSettings();
  // Fix: Extract 'template' from useTools to use as the translation mode.
  const { template } = useTools();

  useEffect(() => {
    if (!connected) {
      setMuted(false);
    }
  }, [connected]);

  // Handle Ducking: reduce mic input level to 15% when AI is speaking with smooth transitions
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
    if (!text) return;

    // Fix: Use 'template' from useTools as the translation mode for broadcasting.
    const sendPayload = { type: 'chat', text, mode: template, timestamp: Date.now() };

    if (connected) {
      client.send([{ text }], true);
      // Broadcast message to other "remote users" (tabs)
      wsService.sendPrompt(sendPayload);
      setChatValue('');
    } else {
      connect().then(() => {
        client.send([{ text }], true);
        wsService.sendPrompt(sendPayload);
        setChatValue('');
      }).catch(console.error);
    }
  };

  const inputPlaceholder = connected 
    ? 'Type a message to translate...' 
    : 'Connect to start chatting...';

  return (
    <section className="control-tray-floating">
      <div className="control-tray-content">
        <div className="chat-composer-floating">
          <input
            type="text"
            className="chat-composer-input"
            placeholder={inputPlaceholder}
            value={chatValue}
            onChange={(e) => setChatValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
          />
          <button 
            className="send-message-btn" 
            onClick={handleSendMessage}
            disabled={!chatValue.trim()}
          >
            <span className="material-symbols-outlined">send</span>
          </button>
        </div>

        <div className={cn('floating-pill', { 'focus-active': connected })}>
          <button
            className={cn('icon-button', { active: isSidebarOpen })}
            onClick={toggleSidebar}
            aria-label="Settings"
          >
            <span className="material-symbols-outlined">settings</span>
          </button>

          <button
            className={cn('icon-button', { active: voiceFocus })}
            onClick={() => setVoiceFocus(!voiceFocus)}
            aria-label={voiceFocus ? "Disable Voice Focus" : "Enable Voice Focus"}
            title="Neural Sensitivity (Voice Focus)"
          >
            <span className="material-symbols-outlined">
              {voiceFocus ? 'center_focus_strong' : 'center_focus_weak'}
            </span>
          </button>

          <button
            className={cn('icon-button', { active: !muted && connected, muted: muted && connected })}
            onClick={handleMicClick}
            aria-label={muted ? 'Unmute' : 'Mute'}
          >
            <span className={cn('material-symbols-outlined', { 'filled': !muted && connected })}>
              {muted || !connected ? 'mic_off' : 'mic'}
            </span>
          </button>

          <button
            ref={connectButtonRef}
            className={cn('icon-button main-action', { connected })}
            onClick={connected ? disconnect : connect}
            aria-label={connected ? 'Disconnect' : 'Connect'}
          >
            <span className="material-symbols-outlined filled">
              {connected ? 'stop_circle' : 'bolt'}
            </span>
          </button>
        </div>
      </div>
    </section>
  );
}

export default memo(ControlTray);
