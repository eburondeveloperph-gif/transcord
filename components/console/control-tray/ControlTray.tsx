
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import cn from 'classnames';
import React, { memo, useEffect, useRef, useState } from 'react';
import { AudioRecorder } from '../../../lib/audio-recorder';
import { useLogStore, useUI, useSettings } from '../../../lib/state';
import { useLiveAPIContext } from '../../../contexts/LiveAPIContext';
import { wsService } from '../../../lib/websocket-service';
import { playBeep } from '../../../lib/utils';

const MAX_TURN_SECONDS = 30;

function ControlTray() {
  const [audioRecorder] = useState(() => new AudioRecorder());
  const [muted, setMuted] = useState(false);
  const [textInput, setTextInput] = useState('');
  const [wsStatus, setWsStatus] = useState(wsService.status);
  const [turnElapsed, setTurnElapsed] = useState(0);
  const connectButtonRef = useRef<HTMLButtonElement>(null);
  const beepedRef = useRef<Set<number>>(new Set());

  const { client, connected, connect, disconnect } = useLiveAPIContext();
  const { toggleSidebar } = useUI();
  const { voiceFocus, setVoiceFocus } = useSettings();

  useEffect(() => {
    wsService.on('status', setWsStatus);
    return () => wsService.off('status', setWsStatus);
  }, []);

  useEffect(() => {
    if (!connected) {
      setMuted(false);
      setTurnElapsed(0);
      beepedRef.current.clear();
    }
  }, [connected]);

  // Turn Timer Logic
  useEffect(() => {
    let interval: number;
    const isRecording = connected && !muted;

    if (isRecording) {
      const startTime = Date.now();
      interval = window.setInterval(() => {
        const elapsed = (Date.now() - startTime) / 1000;
        setTurnElapsed(elapsed);

        // Audible countdown at 27, 28, 29 seconds
        const floorElapsed = Math.floor(elapsed);
        if ([27, 28, 29].includes(floorElapsed) && !beepedRef.current.has(floorElapsed)) {
          playBeep(floorElapsed === 29 ? 1320 : 880); // Higher pitch for the last bip
          beepedRef.current.add(floorElapsed);
        }

        // Auto-Finalize at 30 seconds
        if (elapsed >= MAX_TURN_SECONDS) {
          setMuted(true);
          playBeep(440, 0.3); // Low bip to signify forced stop
          clearInterval(interval);
        }
      }, 100);
    } else {
      setTurnElapsed(0);
      beepedRef.current.clear();
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [connected, muted]);

  // Reset timer on model response completion
  useEffect(() => {
    const onTurnComplete = () => {
      // If we were muted because of the timer, we might want to stay muted 
      // or auto-unmute. For now, we just reset the local tracking.
      beepedRef.current.clear();
    };
    client.on('turncomplete', onTurnComplete);
    return () => {
      client.off('turncomplete', onTurnComplete);
    };
  }, [client]);

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

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && textInput.trim()) {
      if (connected) {
        client.send([{ text: textInput.trim() }], true);
        setTextInput('');
      } else {
        connect().then(() => {
          client.send([{ text: textInput.trim() }], true);
          setTextInput('');
        });
      }
    }
  };

  const progressPercent = Math.min(100, (turnElapsed / MAX_TURN_SECONDS) * 100);

  return (
    <section className="control-tray-floating">
      <div className={cn('floating-pill', { 'focus-active': voiceFocus && connected })}>
        
        {/* Turn Timer Progress Bar (Hidden when not recording) */}
        {connected && !muted && (
          <div className="turn-timer-bar">
            <div 
              className="turn-timer-progress" 
              style={{ width: `${progressPercent}%`, backgroundColor: progressPercent > 80 ? 'var(--danger)' : 'var(--accent)' }}
            />
          </div>
        )}

        <button
          className="icon-button"
          onClick={toggleSidebar}
          aria-label="Settings"
        >
          <span className="material-symbols-outlined">settings_suggest</span>
        </button>

        <div 
          className={cn('ws-indicator', wsStatus)} 
          aria-label={`Remote status: ${wsStatus}`}
        >
          <span className={cn('material-symbols-outlined', { 'filled': wsStatus === 'connected' })}>
            {wsStatus === 'connected' ? 'sensors' : wsStatus === 'connecting' ? 'hourglass_top' : 'sensors_off'}
          </span>
        </div>

        <input
          type="text"
          className="chat-input"
          value={textInput}
          onChange={(e) => setTextInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={connected ? 'Type to translate...' : 'Tap bolt to start...'}
          aria-label="Text to translate"
        />

        <button
          className={cn('icon-button focus-mode', { active: voiceFocus })}
          onClick={() => setVoiceFocus(!voiceFocus)}
          aria-label={voiceFocus ? "Disable Voice Focus" : "Enable Voice Focus (Neural Sensitivity)"}
          title={voiceFocus ? "Neural Sensitivity Active" : "Heighten Sensitivity"}
        >
          <span className={cn('material-symbols-outlined', { 'filled': voiceFocus })}>
            {voiceFocus ? 'track_changes' : 'filter_center_focus'}
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
    </section>
  );
}

export default memo(ControlTray);
