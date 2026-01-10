
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { useUI } from '../lib/state';
import { wsService } from '../lib/websocket-service';
import { useEffect, useState } from 'react';
import cn from 'classnames';

export default function Header() {
  const { toggleSidebar } = useUI();
  const [wsStatus, setWsStatus] = useState(wsService.status);

  useEffect(() => {
    wsService.on('status', setWsStatus);
    return () => wsService.off('status', setWsStatus);
  }, []);

  return (
    <header>
      <div className="header-left">
        <h1>Super Translator</h1>
      </div>
      <div className="header-right">
        <div 
          className={cn('ws-indicator', wsStatus)} 
          aria-label={`Remote status: ${wsStatus}`}
          title={`WebSocket Status: ${wsStatus}`}
        >
          <span className={cn('material-symbols-outlined', { 'filled': wsStatus === 'connected' })}>
            {wsStatus === 'connected' ? 'sensors' : wsStatus === 'connecting' ? 'hourglass_top' : 'sensors_off'}
          </span>
        </div>
        <button
          className="settings-button"
          onClick={toggleSidebar}
          aria-label="Settings"
        >
          <span className="material-symbols-outlined">settings</span>
        </button>
      </div>
    </header>
  );
}
