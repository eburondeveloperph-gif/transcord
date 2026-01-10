/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { useEffect, useRef } from 'react';
import Sidebar from './components/Sidebar';
import ControlTray from './components/console/control-tray/ControlTray';
import ErrorScreen from './components/demo/ErrorScreen';
import StreamingConsole from './components/demo/streaming-console/StreamingConsole';
import { LiveAPIProvider, useLiveAPIContext } from './contexts/LiveAPIContext';

const API_KEY = process.env.API_KEY;

function ConnectionManager() {
  const { connect, connected, config } = useLiveAPIContext();
  const mounted = useRef(false);

  useEffect(() => {
    // Only attempt connection if we have a valid config and aren't already connected
    const hasConfig = config && Object.keys(config).length > 0;
    if (!connected && !mounted.current && hasConfig) {
      mounted.current = true;
      connect()?.catch(err => {
        console.error("Auto-connection failed:", err);
        mounted.current = false; // Allow retry
      });
    }
  }, [connect, connected, config]);

  return null;
}

/**
 * Main application component. 
 * Features a modern, focused translation interface with floating controls.
 */
function App() {
  if (!API_KEY) {
    return (
      <div className="error-screen">
        <div style={{ fontSize: 48 }}>⚠️</div>
        <div style={{ fontSize: 22, textAlign: 'center', opacity: 0.8 }}>
          API Key Missing<br/>
          <small style={{ fontSize: 14 }}>Please ensure process.env.API_KEY is configured.</small>
        </div>
      </div>
    );
  }

  return (
    <div className="App">
      <LiveAPIProvider apiKey={API_KEY}>
        <ConnectionManager />
        <Sidebar />
        <ErrorScreen />
        <main className="main-content">
          <StreamingConsole />
          <ControlTray />
        </main>
      </LiveAPIProvider>
    </div>
  );
}

export default App;