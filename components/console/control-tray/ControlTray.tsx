
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
  const connectButtonRef = useRef<HTMLButtonElement>(null);

  const { client, connected, connect, disconnect, isAiSpeaking } = useLiveAPIContext();
  const { toggleSidebar, isSidebarOpen } = useUI();
  const { voiceFocus, setVoiceFocus } = useSettings();

  useEffect(() => {
    if (!connected) {
      setMuted(false);
    }
  }, [connected]);

  // Handle Ducking: reduce mic input level to 15% when AI is speaking
  // Added connected and muted dependencies to ensure state is re-applied on restart
  useEffect(() => {
    if (audioRecorder && connected && !muted) {
      // If AI is speaking, duck to 15%, otherwise full 100%
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

  return (
    <section className="control-tray-floating">
      <div className={cn('floating-pill', { 'focus-active': connected })}>
        
        {/* 1. Settings */}
        <button
          className={cn('icon-button', { active: isSidebarOpen })}
          onClick={toggleSidebar}
          aria-label="Settings"
        >
          <span className="material-symbols-outlined">settings</span>
        </button>

        {/* 2. Voice Focus (Restored) */}
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

        {/* 3. Mic Toggle */}
        <button
          className={cn('icon-button', { active: !muted && connected, muted: muted && connected })}
          onClick={handleMicClick}
          aria-label={muted ? 'Unmute' : 'Mute'}
        >
          <span className={cn('material-symbols-outlined', { 'filled': !muted && connected })}>
            {muted || !connected ? 'mic_off' : 'mic'}
          </span>
        </button>

        {/* 4. Connection Manager */}
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
    </section>
  );
}

export default memo(ControlTray);
