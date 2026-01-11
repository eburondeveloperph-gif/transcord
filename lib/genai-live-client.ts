
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import {
  GoogleGenAI,
  LiveConnectConfig,
  LiveServerMessage,
  LiveServerToolCall,
  LiveClientToolResponse,
  Session,
} from '@google/genai';
import EventEmitter from 'eventemitter3';

/**
 * GenAILiveClient wraps the Gemini Live API session and provides an event-driven interface
 * for handling audio, transcriptions, and tool calls.
 */
export class GenAILiveClient {
  private sessionPromise: Promise<Session> | null = null;
  private session: Session | null = null;
  private model: string;
  private apiKey: string;
  private emitter = new EventEmitter();

  public on = this.emitter.on.bind(this.emitter);
  public off = this.emitter.off.bind(this.emitter);

  constructor(apiKey: string, model: string) {
    this.apiKey = apiKey;
    this.model = model;
  }

  /**
   * Connects to the Gemini Live API session.
   */
  async connect(config: LiveConnectConfig): Promise<boolean> {
    // Re-initialize AI instance right before connection to ensure fresh credentials
    const ai = new GoogleGenAI({ apiKey: this.apiKey });
    
    this.sessionPromise = ai.live.connect({
      model: this.model,
      config: config,
      callbacks: {
        onopen: () => {
          this.emitter.emit('open');
        },
        onmessage: (message: LiveServerMessage) => {
          if (message.serverContent) {
            this.emitter.emit('content', message.serverContent);
            
            // Extract and emit audio output
            if (message.serverContent.modelTurn) {
              const parts = message.serverContent.modelTurn.parts;
              for (const part of parts) {
                if (part.inlineData && part.inlineData.data) {
                  const base64 = part.inlineData.data;
                  const binaryString = atob(base64);
                  const bytes = new Uint8Array(binaryString.length);
                  for (let i = 0; i < binaryString.length; i++) {
                    bytes[i] = binaryString.charCodeAt(i);
                  }
                  this.emitter.emit('audio', bytes.buffer);
                }
              }
            }

            // Extract and emit transcriptions
            if (message.serverContent.inputTranscription) {
              this.emitter.emit('inputTranscription', message.serverContent.inputTranscription.text, true);
            }
            if (message.serverContent.outputTranscription) {
              this.emitter.emit('outputTranscription', message.serverContent.outputTranscription.text, true);
            }
            if (message.serverContent.turnComplete) {
              this.emitter.emit('turncomplete');
            }
            if (message.serverContent.interrupted) {
              this.emitter.emit('interrupted');
            }
          }

          // Emit tool calls for external handling
          if (message.toolCall) {
            this.emitter.emit('toolcall', message.toolCall);
          }
        },
        onerror: (error: any) => {
          this.emitter.emit('error', error);
        },
        onclose: () => {
          this.emitter.emit('close');
          this.session = null;
          this.sessionPromise = null;
        },
      },
    });

    try {
      this.session = await this.sessionPromise;
      return true;
    } catch (e) {
      console.error('Failed to establish Live session:', e);
      this.emitter.emit('error', e);
      return false;
    }
  }

  /**
   * Closes the active session.
   */
  disconnect() {
    if (this.session) {
      this.session.close();
      this.session = null;
      this.sessionPromise = null;
    }
  }

  /**
   * Sends audio chunks or other media input to the session.
   */
  sendRealtimeInput(chunks: any[]) {
    if (this.sessionPromise) {
      this.sessionPromise.then((session) => {
        for (const chunk of chunks) {
          session.sendRealtimeInput({
            media: chunk,
          });
        }
      });
    }
  }

  /**
   * Sends text or custom parts to the session via the client content interface.
   */
  send(parts: any[], turnComplete: boolean) {
    if (this.sessionPromise) {
      this.sessionPromise.then((session) => {
        session.send({
          turns: [{ parts }],
          turnComplete,
        });
      });
    }
  }

  /**
   * Responds to a model's tool call.
   */
  sendToolResponse(toolResponse: LiveClientToolResponse) {
    if (this.sessionPromise) {
      this.sessionPromise.then((session) => {
        session.sendToolResponse(toolResponse);
      });
    }
  }
}
