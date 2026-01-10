
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import EventEmitter from 'eventemitter3';

export interface WebSocketEvents {
  message: (text: string) => void;
  status: (status: 'connected' | 'disconnected' | 'connecting') => void;
}

export class WebSocketService {
  private ws: WebSocket | null = null;
  private emitter = new EventEmitter<WebSocketEvents>();
  private _status: 'connected' | 'disconnected' | 'connecting' = 'disconnected';

  public on = this.emitter.on.bind(this.emitter);
  public off = this.emitter.off.bind(this.emitter);

  constructor(private url: string = 'ws://localhost:8080/prompts') {}

  public get status() { return this._status; }

  private setStatus(newStatus: 'connected' | 'disconnected' | 'connecting') {
    this._status = newStatus;
    this.emitter.emit('status', newStatus);
  }

  public connect() {
    // Only attempt on localhost
    if (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && this.url.includes('localhost')) {
      return;
    }

    if (this.ws || this._status === 'connecting') return;

    this.setStatus('connecting');
    try {
      this.ws = new WebSocket(this.url);

      this.ws.onopen = () => this.setStatus('connected');
      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          const text = data.text || data;
          if (text && typeof text === 'string') this.emitter.emit('message', text.trim());
        } catch (e) {}
      };

      this.ws.onerror = () => {
        // Silent: Do not propagate to UI error handlers
        this.setStatus('disconnected');
      };

      this.ws.onclose = () => {
        this.ws = null;
        this.setStatus('disconnected');
      };
    } catch (err) {
      this.setStatus('disconnected');
    }
  }

  public sendPrompt(text: string) {
    if (this.ws && this._status === 'connected') {
      this.ws.send(JSON.stringify({ type: 'prompt', text }));
      return true;
    }
    return false;
  }
}

export const wsService = new WebSocketService();
