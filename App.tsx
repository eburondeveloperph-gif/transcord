
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import Sidebar from './components/Sidebar';
import ControlTray from './components/console/control-tray/ControlTray';
import ErrorScreen from './components/demo/ErrorScreen';
import StreamingConsole from './components/demo/streaming-console/StreamingConsole';
import { LiveAPIProvider } from './contexts/LiveAPIContext';

const API_KEY = process.env.API_KEY;

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
