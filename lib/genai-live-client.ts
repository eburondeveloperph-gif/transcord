
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import {
  GoogleGenAI,
  LiveCallbacks,
  LiveClientToolResponse,
  LiveConnectConfig,
  LiveServerContent,
  LiveServerMessage,
  LiveServerToolCall,
  LiveServerToolCallCancellation,
  Part,
  Session,
} from '@google/genai';
import EventEmitter from 'eventemitter3';
import { DEFAULT_LIVE_API_MODEL } from './constants';
import { difference } from 'lodash';
import { base64ToArrayBuffer } from './utils';

export interface StreamingLog {
  count?: number;
  data?: unknown;
  date: Date;
  message: string | object;
  type: string;
}

export interface LiveClientEventTypes {
  audio: (data: ArrayBuffer) => void;
  close: (event: CloseEvent) => void;
  content: (data: LiveServerContent) => void;
  error: (e: ErrorEvent) => void;
  interrupted: () => void;
  log: (log: StreamingLog) => void;
  open: () => void;
  setupcomplete: () => void;
  toolcall: (toolCall: LiveServerToolCall) => void;
  toolcallcancellation: (
    toolcallCancellation: LiveServerToolCallCancellation
  ) => void;
  turncomplete: () => void;
  inputTranscription: (text: string, isFinal: boolean) => void;
  outputTranscription: (text: string, isFinal: boolean) => void;
}

export class GenAILiveClient {
  private emitter = new EventEmitter<LiveClientEventTypes>();

  public on = this.emitter.on.bind(this.emitter);
  public off = this.emitter.off.bind(this.emitter);

  public readonly model: string = DEFAULT_LIVE_API_MODEL;

  protected readonly client: GoogleGenAI;
  protected session?: Session;

  private _status: 'connected' | 'disconnected' | 'connecting' = 'disconnected';
  public get status() {
    return this._status;
  }

  constructor(apiKey: string, model?: string) {
    if (model) this.model = model;

    this.client = new GoogleGenAI({
      apiKey: apiKey,
    });
  }

  public async connect(config: LiveConnectConfig): Promise<boolean> {
    if (this._status === 'connected' || this._status === 'connecting') {
      return true;
    }

    this._status = 'connecting';
    const callbacks: LiveCallbacks = {
      onopen: this.onOpen.bind(this),
      onmessage: this.onMessage.bind(this),
      onerror: this.onError.bind(this),
      onclose: this.onClose.bind(this),
    };

    try {
      this.session = await this.client.live.connect({
        model: this.model,
        config: {
          ...config,
        },
        callbacks,
      });
      return true;
    } catch (e: any) {
      this._status = 'disconnected';
      this.session = undefined;
      
      // Extract a meaningful error message
      let errorMsg = 'Network error: Connection failed';
      if (e instanceof Error) {
        errorMsg = e.message;
      } else if (typeof e === 'string') {
        errorMsg = e;
      } else if (e?.statusText) {
        errorMsg = `Network error: ${e.statusText} (${e.status})`;
      } else if (e?.message) {
        errorMsg = e.message;
      }

      console.error('GenAI Live Connection Error:', e);
      
      const errorEvent = new ErrorEvent('error', {
        error: e,
        message: errorMsg,
      });
      this.emitter.emit('error', errorEvent);
      throw e;
    }
  }

  public disconnect() {
    if (this.session) {
      this.session.close();
      this.session = undefined;
    }
    this._status = 'disconnected';
    this.log('client.close', `Disconnected`);
    return true;
  }

  public send(parts: Part | Part[], turnComplete: boolean = true) {
    if (this._status !== 'connected' || !this.session) {
      this.emitter.emit('error', new ErrorEvent('error', { message: 'Client not connected' }));
      return;
    }
    // Correct structure for sendClientContent is { turns: Content[], turnComplete: boolean }
    // where Content is { parts: Part[] }
    const partsArray = Array.isArray(parts) ? parts : [parts];
    this.session.sendClientContent({ 
      turns: [{ parts: partsArray }], 
      turnComplete 
    });
    this.log(`client.send`, parts);
  }

  public sendRealtimeInput(chunks: Array<{ mimeType: string; data: string }>) {
    if (this._status !== 'connected' || !this.session) return;
    
    chunks.forEach(chunk => {
      if (this.session) {
        this.session.sendRealtimeInput({ media: chunk });
      }
    });

    let message = 'media-input';
    this.log(`client.realtimeInput`, message);
  }

  public sendToolResponse(toolResponse: LiveClientToolResponse) {
    if (this._status !== 'connected' || !this.session) return;
    if (toolResponse.functionResponses?.length) {
      this.session.sendToolResponse({
        functionResponses: toolResponse.functionResponses!,
      });
    }
    this.log(`client.toolResponse`, { toolResponse });
  }

  protected onMessage(message: LiveServerMessage) {
    if (message.setupComplete) {
      this.emitter.emit('setupcomplete');
      return;
    }
    if (message.toolCall) {
      this.emitter.emit('toolcall', message.toolCall);
      return;
    }
    if (message.toolCallCancellation) {
      this.emitter.emit('toolcallcancellation', message.toolCallCancellation);
      return;
    }

    if (message.serverContent) {
      const { serverContent } = message;
      if (serverContent.interrupted) {
        this.emitter.emit('interrupted');
        return;
      }

      if (serverContent.inputTranscription) {
        this.emitter.emit(
          'inputTranscription',
          serverContent.inputTranscription.text,
          (serverContent.inputTranscription as any).isFinal ?? false,
        );
      }

      if (serverContent.outputTranscription) {
        this.emitter.emit(
          'outputTranscription',
          serverContent.outputTranscription.text,
          (serverContent.outputTranscription as any).isFinal ?? false,
        );
      }

      if (serverContent.modelTurn) {
        let parts: Part[] = serverContent.modelTurn.parts || [];
        const audioParts = parts.filter(p => p.inlineData?.mimeType?.startsWith('audio/pcm'));
        const base64s = audioParts.map(p => p.inlineData?.data);
        const otherParts = difference(parts, audioParts);

        base64s.forEach(b64 => {
          if (b64) {
            const data = base64ToArrayBuffer(b64);
            this.emitter.emit('audio', data);
          }
        });

        if (otherParts.length > 0) {
          this.emitter.emit('content', { modelTurn: { parts: otherParts } });
        }
      }

      if (serverContent.turnComplete) {
        this.emitter.emit('turncomplete');
      }
    }
  }

  protected onError(e: ErrorEvent) {
    this._status = 'disconnected';
    this.emitter.emit('error', e);
  }

  protected onOpen() {
    this._status = 'connected';
    this.emitter.emit('open');
  }

  protected onClose(e: CloseEvent) {
    this._status = 'disconnected';
    this.emitter.emit('close', e);
  }

  protected log(type: string, message: string | object) {
    this.emitter.emit('log', { type, message, date: new Date() });
  }
}
