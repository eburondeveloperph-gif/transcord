
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import EventEmitter from 'eventemitter3';

export interface WebSocketEvents {
  message: (text: string) => void;
  status: (status: 'connected' | 'disconnected' | 'connecting') => void;
  error: (error: Error) => void;
}

export class WebSocketService {
  private ws: WebSocket | null = null;
  private emitter = new EventEmitter<WebSocketEvents>();
  private reconnectTimeout: number | null = null;
  private _status: 'connected' | 'disconnected' | 'connecting' = 'disconnected';

  public on = this.emitter.on.bind(this.emitter);
  public off = this.emitter.off.bind(this.emitter);

  constructor(private url: string = 'ws://localhost:8080/prompts') {}

  public get status() {
    return this._status;
  }

  private setStatus(newStatus: 'connected' | 'disconnected' | 'connecting') {
    this._status = newStatus;
    this.emitter.emit('status', newStatus);
  }

  public connect() {
    if (this.ws || this._status === 'connecting') return;

    this.setStatus('connecting');
    try {
      this.ws = new WebSocket(this.url);

      this.ws.onopen = () => {
        console.log('WebSocket Service: Connected');
        this.setStatus('connected');
        if (this.reconnectTimeout) {
          clearTimeout(this.reconnectTimeout);
          this.reconnectTimeout = null;
        }
      };

      this.ws.onmessage = (event) => {
        try {
          const data = event.data;
          let text = typeof data === 'string' ? data : JSON.parse(data).text;
          if (text && text.trim()) {
            this.emitter.emit('message', text.trim());
          }
        } catch (err) {
          console.error('WebSocket Service: Data Parsing Error', err);
        }
      };

      this.ws.onerror = (error) => {
        console.warn('WebSocket Service: Connection Error');
        this.emitter.emit('error', new Error('WS connection error'));
      };

      this.ws.onclose = (event) => {
        this.ws = null;
        this.setStatus('disconnected');
        if (!event.wasClean) {
          console.log('WebSocket Service: Attempting reconnect in 5s...');
          this.reconnectTimeout = window.setTimeout(() => this.connect(), 5000);
        }
      };
    } catch (err) {
      this.setStatus('disconnected');
      console.error('WebSocket Service: Initialization Error', err);
    }
  }

  public disconnect() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.setStatus('disconnected');
  }

  public sendPrompt(text: string) {
    if (this.ws && this._status === 'connected') {
      this.ws.send(JSON.stringify({ type: 'prompt', text }));
      return true;
    }
    console.warn('WebSocket Service: Cannot send prompt, socket not connected');
    return false;
  }
}

// Singleton instance
export const wsService = new WebSocketService();
