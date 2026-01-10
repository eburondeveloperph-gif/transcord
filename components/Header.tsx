/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { useSettings } from '../lib/state';
import { wsService } from '../lib/websocket-service';
import { useEffect, useState, useCallback } from 'react';
import cn from 'classnames';
import { useLiveAPIContext } from '../contexts/LiveAPIContext';

export default function Header() {
  const { mode, setMode } = useSettings();
  const { connected, disconnect } = useLiveAPIContext();
  
  const [wsStatus, setWsStatus] = useState(wsService.status);

  // Switching modes MUST deactivate the previous session for the current user
  const handleTabSwitch = useCallback((newMode: 'transcribe' | 'translate') => {
    if (newMode !== mode) {
      if (connected) {
        disconnect();
      }
      setMode(newMode);
    }
  }, [mode, connected, disconnect, setMode]);

  useEffect(() => {
    wsService.on('status', setWsStatus);
    return () => wsService.off('status', setWsStatus);
  }, []);

  return (
    <header className="main-header">
      <div className="header-tabs">
        <button 
          className={cn('tab-button-minimal', { active: mode === 'transcribe' })}
          onClick={() => handleTabSwitch('transcribe')}
        >
          Transcribe
        </button>
        <button 
          className={cn('tab-button-minimal', { active: mode === 'translate' })}
          onClick={() => handleTabSwitch('translate')}
        >
          Translate
        </button>
      </div>

      <div className="header-actions-area">
        <div className="header-icons-group">
          <div 
            className={cn('ws-status-dot', wsStatus)} 
            title={`Remote Stream Status: ${wsStatus}`}
          />
        </div>
      </div>
    </header>
  );
}