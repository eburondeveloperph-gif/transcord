/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { GenAILiveClient } from '../../lib/genai-live-client';
import { LiveConnectConfig, LiveServerToolCall } from '@google/genai';
import { AudioStreamer } from '../../lib/audio-streamer';
import { audioContext } from '../../lib/utils';
import VolMeterWorket from '../../lib/worklets/vol-meter';
import { useLogStore, useSettings } from '../../lib/state';
import { wsService } from '../../lib/websocket-service';

export type UseLiveApiResults = {
  client: GenAILiveClient;
  setConfig: (config: LiveConnectConfig) => void;
  config: LiveConnectConfig;

  connect: () => Promise<void>;
  disconnect: () => void;
  connected: boolean;
  isAiSpeaking: boolean;
  volume: number;
};

export function useLiveApi({
  apiKey,
}: {
  apiKey: string;
}): UseLiveApiResults {
  const { model, mode } = useSettings();
  
  const client = useMemo(() => {
    // Note: The client now handles internal fresh instance creation of GoogleGenAI on connect
    return new GenAILiveClient(apiKey, model);
  }, [apiKey, model]);

  useEffect(() => {
    return () => {
      client.disconnect();
    };
  }, [client]);

  const audioStreamerRef = useRef<AudioStreamer | null>(null);
  const isConnectingRef = useRef(false);
  const connectionPromiseRef = useRef<Promise<void> | null>(null);

  const [volume, setVolume] = useState(0);
  const [connected, setConnected] = useState(false);
  const [isAiSpeaking, setIsAiSpeaking] = useState(false);
  const [config, setConfig] = useState<LiveConnectConfig>({});

  useEffect(() => {
    if (!audioStreamerRef.current) {
      audioContext({ id: 'audio-out' }).then((audioCtx: AudioContext) => {
        const streamer = new AudioStreamer(audioCtx);
        audioStreamerRef.current = streamer;
        
        streamer.onPlay = () => setIsAiSpeaking(true);
        streamer.onStop = () => setIsAiSpeaking(false);

        streamer
          .addWorklet<any>('vumeter-out', VolMeterWorket, (ev: any) => {
            setVolume(ev.data.volume);
          })
          .catch(err => {
            console.error('Error adding worklet:', err);
          });
      });
    }
  }, [audioStreamerRef]);

  useEffect(() => {
    const onOpen = () => {
      setConnected(true);
      isConnectingRef.current = false;
    };

    const onClose = () => {
      setConnected(false);
      isConnectingRef.current = false;
    };

    const onAudio = (data: ArrayBuffer) => {
      if (audioStreamerRef.current && mode !== 'transcribe') {
        audioStreamerRef.current.addPCM16(new Uint8Array(data));
      }
    };

    const onError = (e: any) => {
      setConnected(false);
      isConnectingRef.current = false;
      
      // Handle permission errors by potentially hinting to re-select key
      if (e?.message?.includes('permission') || e?.message?.includes('403')) {
        console.warn('Permission denied. Ensure your API Key is from a paid GCP project.');
      }
    };

    client.on('open', onOpen);
    client.on('close', onClose);
    client.on('error', onError);
    client.on('audio', onAudio);

    const onToolCall = (toolCall: LiveServerToolCall) => {
      const functionResponses: any[] = [];

      for (const fc of toolCall.functionCalls) {
        if (fc.name === 'broadcast_to_websocket') {
          const text = (fc.args as any).text;
          const success = wsService.sendPrompt(text);
          functionResponses.push({
            id: fc.id,
            name: fc.name,
            response: { result: success ? 'Message broadcast successfully' : 'Failed to broadcast - WS disconnected' },
          });
          continue;
        }

        const triggerMessage = `Triggering function call: **${fc.name}**\n\`\`\`json\n${JSON.stringify(fc.args, null, 2)}\n\`\`\``;
        useLogStore.getState().addTurn({
          role: 'system',
          text: triggerMessage,
          isFinal: true,
        });

        functionResponses.push({
          id: fc.id,
          name: fc.name,
          response: { result: 'ok' },
        });
      }

      client.sendToolResponse({ functionResponses: functionResponses });
    };

    client.on('toolcall', onToolCall);

    return () => {
      client.off('open', onOpen);
      client.off('close', onClose);
      client.off('error', onError);
      client.off('audio', onAudio);
      client.off('toolcall', onToolCall);
    };
  }, [client, mode]);

  const connect = useCallback(async () => {
    if (connected) return;
    
    if (isConnectingRef.current && connectionPromiseRef.current) {
      await connectionPromiseRef.current;
      return;
    }

    if (!config || Object.keys(config).length === 0) {
      console.warn('Config is empty, delaying connect');
      return;
    }

    isConnectingRef.current = true;
    
    const connectTask = async () => {
        try {
          // Use the current API_KEY from process.env right before connecting
          await client.connect(config, process.env.API_KEY || apiKey);
        } catch (e) {
          throw e;
        } finally {
          isConnectingRef.current = false;
          connectionPromiseRef.current = null;
        }
    };

    connectionPromiseRef.current = connectTask();
    
    try {
        await connectionPromiseRef.current;
    } catch (e) {
        throw e;
    }
  }, [client, config, connected, apiKey]);

  const disconnect = useCallback(async () => {
    client.disconnect();
    setConnected(false);
    isConnectingRef.current = false;
  }, [client]);

  return {
    client,
    config,
    setConfig,
    connect,
    connected,
    disconnect,
    isAiSpeaking,
    volume,
  };
}
