/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { useEffect, useState } from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import ControlTray from './components/console/control-tray/ControlTray';
import ErrorScreen from './components/demo/ErrorScreen';
import StreamingConsole from './components/demo/streaming-console/StreamingConsole';
import WelcomeScreen from './components/demo/welcome-screen/WelcomeScreen';
import { LiveAPIProvider, useLiveAPIContext } from './contexts/LiveAPIContext';
import { useLogStore, useSettings, useTools, generatePrompt } from './lib/state';
import { Modality } from '@google/genai';

const API_KEY = process.env.API_KEY;

/**
 * Ensures the Live API configuration is synchronized with the current settings.
 */
function ConfigSynchronizer() {
  const { setConfig } = useLiveAPIContext();
  const { voice, mode, voiceFocus } = useSettings();
  const { template, tools } = useTools();

  useEffect(() => {
    const declarations = tools
      .filter(tool => tool.isEnabled)
      .map(tool => ({
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters,
      }));

    const config = {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: {
            voiceName: voice,
          },
        },
      },
      inputAudioTranscription: {},
      outputAudioTranscription: {},
      // Use string for systemInstruction as per Live API examples to avoid validation errors
      systemInstruction: generatePrompt(template, voiceFocus, mode),
      tools: declarations.length > 0 ? [{ functionDeclarations: declarations }] : undefined,
    };

    setConfig(config);
  }, [setConfig, tools, voice, template, voiceFocus, mode]);

  return null;
}

/**
 * AppContent ensures we have access to context inside the provider.
 */
function AppContent() {
  const turns = useLogStore(state => state.turns);
  const { connected } = useLiveAPIContext();
  
  const showWelcome = turns.length === 0 && !connected;

  return (
    <div className="App">
      <ConfigSynchronizer />
      <Sidebar />
      <ErrorScreen />
      <main className="main-content">
        <Header />
        <div className="transcription-container">
          {showWelcome ? <WelcomeScreen /> : <StreamingConsole />}
        </div>
        <ControlTray />
      </main>
    </div>
  );
}

/**
 * API Key Selection Component.
 * Mandatory for preview models to ensure a valid billing project is used.
 */
function ApiKeySelector({ onKeySelected }: { onKeySelected: () => void }) {
  return (
    <div className="error-screen" style={{ background: 'var(--background)' }}>
      <div className="welcome-content" style={{ maxWidth: '400px' }}>
        <span className="material-symbols-outlined welcome-icon" style={{ fontSize: '64px' }}>key</span>
        <h2 className="ready-title" style={{ fontSize: '1.5rem', marginBottom: '8px' }}>API Key Required</h2>
        <p className="welcome-description" style={{ marginBottom: '24px' }}>
          This application uses preview models that require an API key from a paid GCP project.
          Please select your API key to continue.
        </p>
        <button 
          className="launch-button" 
          onClick={async () => {
            await (window as any).aistudio.openSelectKey();
            onKeySelected();
          }}
        >
          Select API Key
        </button>
        <a 
          href="https://ai.google.dev/gemini-api/docs/billing" 
          target="_blank" 
          rel="noopener noreferrer"
          style={{ marginTop: '16px', color: 'var(--accent)', fontSize: '0.8rem', textDecoration: 'none', opacity: 0.8 }}
        >
          Learn about Billing & Projects
        </a>
      </div>
    </div>
  );
}

/**
 * Main application component. 
 */
function App() {
  const [hasKey, setHasKey] = useState<boolean | null>(null);

  useEffect(() => {
    const checkKey = async () => {
      if ((window as any).aistudio && typeof (window as any).aistudio.hasSelectedApiKey === 'function') {
        const selected = await (window as any).aistudio.hasSelectedApiKey();
        setHasKey(selected);
      } else {
        // Fallback for environments without the aistudio helper
        setHasKey(true);
      }
    };
    checkKey();
  }, []);

  if (hasKey === null) return null;

  if (!hasKey) {
    return <ApiKeySelector onKeySelected={() => setHasKey(true)} />;
  }

  if (!API_KEY) {
    return (
      <div className="error-screen">
        <div style={{ fontSize: 48 }}>⚠️</div>
        <div style={{ fontSize: 22, textAlign: 'center', opacity: 0.8 }}>
          API Key Missing<br/>
          <small style={{ fontSize: 14 }}>The environment did not provide an API key.</small>
        </div>
      </div>
    );
  }

  return (
    <LiveAPIProvider apiKey={API_KEY}>
      <AppContent />
    </LiveAPIProvider>
  );
}

export default App;
