
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
    <header className="header-glass">
      <div className="header-left">
        <div className="logo-group">
          <span className="material-symbols-outlined logo-icon">auto_awesome</span>
          <h1>Super</h1>
        </div>
      </div>

      <div className="header-center">
        <div className="status-pill">
          <span className="status-dot"></span>
          <span className="status-text">AI Live Flow</span>
        </div>
      </div>

      <div className="header-right">
        <button
          className="settings-button"
          onClick={toggleSidebar}
          aria-label="Settings"
        >
          <span className="material-symbols-outlined">tune</span>
        </button>
      </div>
    </header>
  );
}
