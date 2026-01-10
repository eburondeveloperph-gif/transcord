
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

  const { client, connected, connect, disconnect } = useLiveAPIContext();
  const { voiceFocus, setVoiceFocus } = useSettings();

  useEffect(() => {
    if (!connected) {
      setMuted(false);
    }
  }, [connected]);

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
      <div className={cn('floating-pill', { 'focus-active': voiceFocus && connected })}>
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
