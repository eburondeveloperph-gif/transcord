
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
    // Only attempt if on localhost or explicitly configured, otherwise ignore to avoid CORS/Network noise
    if (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && this.url.includes('localhost')) {
      console.debug('WebSocket Service: Skipping localhost connection from non-local origin.');
      return;
    }

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
        // SILENT ERROR: Do not bubble up to global handlers to avoid "Network Error" confusion
        console.debug('WebSocket Service: Optional local connection unavailable.');
      };

      this.ws.onclose = (event) => {
        this.ws = null;
        this.setStatus('disconnected');
        // Only retry a few times then give up to avoid constant console noise
        if (!event.wasClean && this.url.includes('localhost')) {
          // No auto-reconnect for local dev sockets if they fail initially
        }
      };
    } catch (err) {
      this.setStatus('disconnected');
      console.debug('WebSocket Service: Initialization suppressed.');
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
    return false;
  }
}

// Singleton instance
export const wsService = new WebSocketService();
