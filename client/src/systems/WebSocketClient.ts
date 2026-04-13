import { WS_HEARTBEAT_INTERVAL, WS_RECONNECT_DELAYS } from '@shared/constants';

type MessageHandler = (data: any) => void;

/**
 * WebSocket client with reconnection logic, offline queue, and heartbeat.
 * Implements T-1141 (architecture), T-1142 (server connection), T-1143 (client reconnection),
 * T-1215 (multiplayer sync for shared world events).
 */
export class WebSocketClient {
  private ws: WebSocket | null = null;
  private url: string;
  private token: string | null = null;
  private reconnectAttempt: number = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private offlineQueue: Array<{ type: string; data: any }> = [];
  private handlers: Map<string, MessageHandler[]> = new Map();
  private connected: boolean = false;

  constructor(url: string) {
    this.url = url;
  }

  /**
   * Connect to the WebSocket server.
   */
  connect(token: string): void {
    this.token = token;
    this.doConnect();
  }

  private doConnect(): void {
    if (!this.token) return;

    try {
      this.ws = new WebSocket(`${this.url}?token=${this.token}`);

      this.ws.onopen = () => {
        this.connected = true;
        this.reconnectAttempt = 0;
        this.startHeartbeat();
        this.flushOfflineQueue();
        this.emit('connected', {});
      };

      this.ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          this.handleMessage(message);
        } catch {
          // Invalid JSON, ignore
        }
      };

      this.ws.onclose = () => {
        this.connected = false;
        this.stopHeartbeat();
        this.emit('disconnected', {});
        this.scheduleReconnect();
      };

      this.ws.onerror = () => {
        // Error will trigger onclose
      };
    } catch {
      this.scheduleReconnect();
    }
  }

  /**
   * Disconnect from the WebSocket server.
   */
  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.stopHeartbeat();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.connected = false;
  }

  /**
   * Send a message to the server. If offline, queue it.
   */
  send(type: string, data: any): void {
    const message = JSON.stringify({ type, data });
    if (this.connected && this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(message);
    } else {
      this.offlineQueue.push({ type, data });
    }
  }

  /**
   * Register a handler for a specific message type.
   */
  on(type: string, handler: MessageHandler): void {
    if (!this.handlers.has(type)) {
      this.handlers.set(type, []);
    }
    this.handlers.get(type)!.push(handler);
  }

  /**
   * Remove a handler.
   */
  off(type: string, handler: MessageHandler): void {
    const handlers = this.handlers.get(type);
    if (handlers) {
      const idx = handlers.indexOf(handler);
      if (idx >= 0) handlers.splice(idx, 1);
    }
  }

  get isConnected(): boolean {
    return this.connected;
  }

  private handleMessage(message: { type: string; data: any }): void {
    if (message.type === 'pong') return; // Heartbeat response

    this.emit(message.type, message.data);
  }

  private emit(type: string, data: any): void {
    const handlers = this.handlers.get(type);
    if (handlers) {
      for (const handler of handlers) {
        try {
          handler(data);
        } catch {
          // Handler error, continue
        }
      }
    }
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      if (this.connected && this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'ping' }));
      }
    }, WS_HEARTBEAT_INTERVAL);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) return;

    const delay = WS_RECONNECT_DELAYS[
      Math.min(this.reconnectAttempt, WS_RECONNECT_DELAYS.length - 1)
    ];

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.reconnectAttempt++;
      this.doConnect();
    }, delay);
  }

  private flushOfflineQueue(): void {
    while (this.offlineQueue.length > 0) {
      const msg = this.offlineQueue.shift()!;
      this.send(msg.type, msg.data);
    }
  }
}

/**
 * Singleton WebSocket client instance.
 * Usage: wsClient.connect(token); wsClient.on('chat_message', handler);
 */
export const wsClient = new WebSocketClient(
  `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws`,
);
