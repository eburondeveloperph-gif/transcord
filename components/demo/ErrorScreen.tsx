
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { useLiveAPIContext } from '../../contexts/LiveAPIContext';
import React, { useEffect, useState } from 'react';

export interface ExtendedErrorType {
  code?: number;
  message?: string;
  status?: string;
}

export default function ErrorScreen() {
  const { client } = useLiveAPIContext();
  const [error, setError] = useState<{ message?: string } | null>(null);

  useEffect(() => {
    function onError(error: any) {
      console.error('Live API Error:', error);
      // Ensure we extract the message string correctly from the error event or object
      const message = error?.message || error?.error?.message || String(error);
      setError({ message });
    }

    client.on('error', onError);

    return () => {
      client.off('error', onError);
    };
  }, [client]);

  if (!error) {
    return null;
  }

  const quotaErrorMessage =
    'Gemini Live API in AI Studio has a limited free quota each day. Come back tomorrow to continue.';
  const permissionErrorMessage = 
    'Permission denied. This model requires an API key from a paid Google Cloud project with billing enabled.';

  let displayTitle = '💔 Connection Error';
  let displayDescription = 'Something went wrong. Please try again.';
  let showTryAgain = true;
  let showSwitchKey = false;

  const rawMessage = error.message || '';

  if (rawMessage.includes('RESOURCE_EXHAUSTED')) {
    displayDescription = quotaErrorMessage;
    showTryAgain = false;
  } else if (rawMessage.includes('PERMISSION_DENIED') || rawMessage.includes('403') || rawMessage.toLowerCase().includes('permission denied')) {
    displayDescription = permissionErrorMessage;
    showSwitchKey = true;
  } else if (rawMessage.includes('Requested entity was not found')) {
    displayDescription = 'Session configuration expired or invalid. Please re-select your API key.';
    showSwitchKey = true;
  }

  const handleSwitchKey = async () => {
    if ((window as any).aistudio?.openSelectKey) {
      await (window as any).aistudio.openSelectKey();
      setError(null);
      // The app will pick up the new process.env.API_KEY on the next connect attempt
    }
  };

  return (
    <div className="error-screen" style={{ zIndex: 2000 }}>
      <div style={{ fontSize: 64, marginBottom: 16 }}>⚠️</div>
      <h2 style={{ fontSize: 24, marginBottom: 8 }}>{displayTitle}</h2>
      <div
        className="error-message-container"
        style={{
          fontSize: 18,
          lineHeight: 1.4,
          opacity: 0.8,
          maxWidth: '450px',
          textAlign: 'center',
          marginBottom: 24
        }}
      >
        {displayDescription}
      </div>

      <div style={{ display: 'flex', gap: 12, flexDirection: 'column', width: '100%', alignItems: 'center' }}>
        {showSwitchKey && (
          <button
            className="launch-button"
            onClick={handleSwitchKey}
            style={{ maxWidth: '300px' }}
          >
            Switch API Key
          </button>
        )}
        
        {showTryAgain ? (
          <button
            className="close-button"
            onClick={() => setError(null)}
            style={{ 
              background: 'transparent', 
              border: '1px solid var(--border)', 
              color: 'var(--text)',
              padding: '12px 24px',
              borderRadius: '8px',
              cursor: 'pointer'
            }}
          >
            Dismiss
          </button>
        ) : null}
      </div>

      {rawMessage && !showSwitchKey && !rawMessage.includes('RESOURCE_EXHAUSTED') && (
        <div
          className="error-raw-message-container"
          style={{
            marginTop: 32,
            fontSize: 12,
            fontFamily: 'monospace',
            opacity: 0.4,
            maxWidth: '90%',
            overflow: 'hidden',
            textOverflow: 'ellipsis'
          }}
        >
          Raw Error: {rawMessage}
        </div>
      )}
      
      {showSwitchKey && (
        <a 
          href="https://ai.google.dev/gemini-api/docs/billing" 
          target="_blank" 
          rel="noopener noreferrer"
          style={{ marginTop: '24px', color: 'var(--accent)', fontSize: '0.85rem', textDecoration: 'none', opacity: 0.8 }}
        >
          Learn more about Paid Projects & Billing
        </a>
      )}
    </div>
  );
}
