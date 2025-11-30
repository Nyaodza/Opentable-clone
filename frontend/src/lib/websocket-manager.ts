/**
 * WebSocket Connection Manager
 * Robust WebSocket handling with heartbeat, reconnection, and connection pooling
 */

type MessageHandler = (data: any) => void;
type ConnectionHandler = () => void;
type ErrorHandler = (error: Event | Error) => void;

interface WebSocketManagerOptions {
  // WebSocket URL
  url: string;
  
  // Protocols
  protocols?: string | string[];
  
  // Reconnection options
  reconnect?: boolean;
  reconnectInterval?: number;
  reconnectAttempts?: number;
  reconnectBackoff?: 'linear' | 'exponential';
  maxReconnectInterval?: number;
  
  // Heartbeat options
  heartbeat?: boolean;
  heartbeatInterval?: number;
  heartbeatTimeout?: number;
  heartbeatMessage?: string | object;
  
  // Connection options
  connectionTimeout?: number;
  
  // Logging
  debug?: boolean;
}

interface PendingMessage {
  data: string;
  timestamp: number;
}

export enum ConnectionState {
  CONNECTING = 'CONNECTING',
  CONNECTED = 'CONNECTED',
  DISCONNECTING = 'DISCONNECTING',
  DISCONNECTED = 'DISCONNECTED',
  RECONNECTING = 'RECONNECTING',
}

const defaultOptions: Partial<WebSocketManagerOptions> = {
  reconnect: true,
  reconnectInterval: 1000,
  reconnectAttempts: 10,
  reconnectBackoff: 'exponential',
  maxReconnectInterval: 30000,
  heartbeat: true,
  heartbeatInterval: 30000,
  heartbeatTimeout: 10000,
  heartbeatMessage: { type: 'ping' },
  connectionTimeout: 10000,
  debug: false,
};

/**
 * WebSocket Connection Manager
 */
export class WebSocketManager {
  private options: Required<WebSocketManagerOptions>;
  private ws: WebSocket | null = null;
  private state: ConnectionState = ConnectionState.DISCONNECTED;
  
  // Event handlers
  private messageHandlers: Map<string, Set<MessageHandler>> = new Map();
  private connectHandlers: Set<ConnectionHandler> = new Set();
  private disconnectHandlers: Set<ConnectionHandler> = new Set();
  private errorHandlers: Set<ErrorHandler> = new Set();
  
  // Reconnection state
  private reconnectAttempts = 0;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private shouldReconnect = true;
  
  // Heartbeat state
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private heartbeatTimeoutTimer: NodeJS.Timeout | null = null;
  private lastPongTime = 0;
  
  // Message queue for offline mode
  private messageQueue: PendingMessage[] = [];
  private maxQueueSize = 100;
  
  // Connection timeout
  private connectionTimer: NodeJS.Timeout | null = null;

  constructor(options: WebSocketManagerOptions) {
    this.options = { ...defaultOptions, ...options } as Required<WebSocketManagerOptions>;
  }

  /**
   * Connect to WebSocket server
   */
  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.state === ConnectionState.CONNECTED) {
        resolve();
        return;
      }

      if (this.state === ConnectionState.CONNECTING) {
        // Already connecting, wait for it
        const checkConnection = setInterval(() => {
          if (this.state === ConnectionState.CONNECTED) {
            clearInterval(checkConnection);
            resolve();
          }
        }, 100);
        return;
      }

      this.setState(ConnectionState.CONNECTING);
      this.shouldReconnect = true;
      this.log('Connecting to', this.options.url);

      try {
        this.ws = new WebSocket(this.options.url, this.options.protocols);
        
        // Connection timeout
        this.connectionTimer = setTimeout(() => {
          if (this.state === ConnectionState.CONNECTING) {
            this.log('Connection timeout');
            this.ws?.close();
            reject(new Error('Connection timeout'));
          }
        }, this.options.connectionTimeout);

        this.ws.onopen = () => {
          this.clearConnectionTimeout();
          this.onOpen();
          resolve();
        };

        this.ws.onclose = (event) => {
          this.clearConnectionTimeout();
          this.onClose(event);
        };

        this.ws.onerror = (event) => {
          this.clearConnectionTimeout();
          this.onError(event);
          if (this.state === ConnectionState.CONNECTING) {
            reject(new Error('WebSocket connection failed'));
          }
        };

        this.ws.onmessage = (event) => {
          this.onMessage(event);
        };
      } catch (error) {
        this.clearConnectionTimeout();
        this.setState(ConnectionState.DISCONNECTED);
        reject(error);
      }
    });
  }

  /**
   * Disconnect from WebSocket server
   */
  disconnect(): void {
    this.shouldReconnect = false;
    this.setState(ConnectionState.DISCONNECTING);
    
    this.clearTimers();
    
    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }
    
    this.setState(ConnectionState.DISCONNECTED);
  }

  /**
   * Send a message
   */
  send(type: string, data: any): boolean {
    const message = JSON.stringify({ type, data, timestamp: Date.now() });
    
    if (this.state === ConnectionState.CONNECTED && this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(message);
      this.log('Sent:', type, data);
      return true;
    }
    
    // Queue message for later
    if (this.messageQueue.length < this.maxQueueSize) {
      this.messageQueue.push({ data: message, timestamp: Date.now() });
      this.log('Queued message:', type);
    }
    
    return false;
  }

  /**
   * Send raw data
   */
  sendRaw(data: string | ArrayBuffer | Blob): boolean {
    if (this.state === ConnectionState.CONNECTED && this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(data);
      return true;
    }
    return false;
  }

  /**
   * Subscribe to a message type
   */
  on(type: string, handler: MessageHandler): () => void {
    if (!this.messageHandlers.has(type)) {
      this.messageHandlers.set(type, new Set());
    }
    this.messageHandlers.get(type)!.add(handler);
    
    // Return unsubscribe function
    return () => {
      this.messageHandlers.get(type)?.delete(handler);
    };
  }

  /**
   * Subscribe to connection event
   */
  onConnect(handler: ConnectionHandler): () => void {
    this.connectHandlers.add(handler);
    return () => this.connectHandlers.delete(handler);
  }

  /**
   * Subscribe to disconnection event
   */
  onDisconnect(handler: ConnectionHandler): () => void {
    this.disconnectHandlers.add(handler);
    return () => this.disconnectHandlers.delete(handler);
  }

  /**
   * Subscribe to error event
   */
  onError(handler: ErrorHandler): () => void {
    this.errorHandlers.add(handler);
    return () => this.errorHandlers.delete(handler);
  }

  /**
   * Get current connection state
   */
  getState(): ConnectionState {
    return this.state;
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.state === ConnectionState.CONNECTED;
  }

  /**
   * Get connection statistics
   */
  getStats(): {
    state: ConnectionState;
    reconnectAttempts: number;
    lastPongTime: number;
    queuedMessages: number;
  } {
    return {
      state: this.state,
      reconnectAttempts: this.reconnectAttempts,
      lastPongTime: this.lastPongTime,
      queuedMessages: this.messageQueue.length,
    };
  }

  // Private methods

  private setState(state: ConnectionState): void {
    this.state = state;
    this.log('State changed to:', state);
  }

  private onOpen(): void {
    this.log('Connected');
    this.setState(ConnectionState.CONNECTED);
    this.reconnectAttempts = 0;
    
    // Start heartbeat
    if (this.options.heartbeat) {
      this.startHeartbeat();
    }
    
    // Flush queued messages
    this.flushQueue();
    
    // Notify handlers
    this.connectHandlers.forEach(handler => {
      try {
        handler();
      } catch (e) {
        console.error('Connect handler error:', e);
      }
    });
  }

  private onClose(event: CloseEvent): void {
    this.log('Disconnected:', event.code, event.reason);
    this.setState(ConnectionState.DISCONNECTED);
    this.ws = null;
    
    this.stopHeartbeat();
    
    // Notify handlers
    this.disconnectHandlers.forEach(handler => {
      try {
        handler();
      } catch (e) {
        console.error('Disconnect handler error:', e);
      }
    });
    
    // Attempt reconnection
    if (this.shouldReconnect && this.options.reconnect) {
      this.scheduleReconnect();
    }
  }

  private onError(event: Event): void {
    this.log('Error:', event);
    
    this.errorHandlers.forEach(handler => {
      try {
        handler(event);
      } catch (e) {
        console.error('Error handler error:', e);
      }
    });
  }

  private onMessage(event: MessageEvent): void {
    try {
      const message = JSON.parse(event.data);
      
      // Handle pong
      if (message.type === 'pong') {
        this.lastPongTime = Date.now();
        this.clearHeartbeatTimeout();
        return;
      }
      
      this.log('Received:', message.type, message.data);
      
      // Dispatch to handlers
      const handlers = this.messageHandlers.get(message.type);
      if (handlers) {
        handlers.forEach(handler => {
          try {
            handler(message.data);
          } catch (e) {
            console.error('Message handler error:', e);
          }
        });
      }
      
      // Also dispatch to wildcard handlers
      const wildcardHandlers = this.messageHandlers.get('*');
      if (wildcardHandlers) {
        wildcardHandlers.forEach(handler => {
          try {
            handler(message);
          } catch (e) {
            console.error('Wildcard handler error:', e);
          }
        });
      }
    } catch (e) {
      // Not JSON, try to handle as raw message
      const rawHandlers = this.messageHandlers.get('raw');
      if (rawHandlers) {
        rawHandlers.forEach(handler => {
          try {
            handler(event.data);
          } catch (e) {
            console.error('Raw handler error:', e);
          }
        });
      }
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.options.reconnectAttempts) {
      this.log('Max reconnect attempts reached');
      return;
    }

    this.setState(ConnectionState.RECONNECTING);
    this.reconnectAttempts++;

    let delay: number;
    if (this.options.reconnectBackoff === 'exponential') {
      delay = Math.min(
        this.options.reconnectInterval * Math.pow(2, this.reconnectAttempts - 1),
        this.options.maxReconnectInterval
      );
    } else {
      delay = this.options.reconnectInterval * this.reconnectAttempts;
    }

    this.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);

    this.reconnectTimer = setTimeout(() => {
      this.connect().catch(() => {
        // Will be handled by onClose
      });
    }, delay);
  }

  private startHeartbeat(): void {
    this.heartbeatTimer = setInterval(() => {
      if (this.state === ConnectionState.CONNECTED) {
        const message = typeof this.options.heartbeatMessage === 'string'
          ? this.options.heartbeatMessage
          : JSON.stringify(this.options.heartbeatMessage);
        
        this.ws?.send(message);
        
        // Set timeout for pong
        this.heartbeatTimeoutTimer = setTimeout(() => {
          this.log('Heartbeat timeout - connection might be dead');
          // Force reconnection
          this.ws?.close();
        }, this.options.heartbeatTimeout);
      }
    }, this.options.heartbeatInterval);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
    this.clearHeartbeatTimeout();
  }

  private clearHeartbeatTimeout(): void {
    if (this.heartbeatTimeoutTimer) {
      clearTimeout(this.heartbeatTimeoutTimer);
      this.heartbeatTimeoutTimer = null;
    }
  }

  private clearConnectionTimeout(): void {
    if (this.connectionTimer) {
      clearTimeout(this.connectionTimer);
      this.connectionTimer = null;
    }
  }

  private clearTimers(): void {
    this.clearConnectionTimeout();
    this.stopHeartbeat();
    
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  private flushQueue(): void {
    const now = Date.now();
    const maxAge = 60000; // 1 minute
    
    // Filter out old messages
    this.messageQueue = this.messageQueue.filter(m => now - m.timestamp < maxAge);
    
    // Send queued messages
    while (this.messageQueue.length > 0 && this.state === ConnectionState.CONNECTED) {
      const message = this.messageQueue.shift();
      if (message) {
        this.ws?.send(message.data);
        this.log('Sent queued message');
      }
    }
  }

  private log(...args: any[]): void {
    if (this.options.debug) {
      console.log('[WebSocket]', ...args);
    }
  }
}

/**
 * Create a singleton WebSocket manager
 */
let globalManager: WebSocketManager | null = null;

export function getWebSocketManager(options?: WebSocketManagerOptions): WebSocketManager {
  if (!globalManager && options) {
    globalManager = new WebSocketManager(options);
  }
  if (!globalManager) {
    throw new Error('WebSocket manager not initialized. Provide options on first call.');
  }
  return globalManager;
}

/**
 * React hook for WebSocket
 */
export function createWebSocketHook(manager: WebSocketManager) {
  return function useWebSocket() {
    return {
      send: manager.send.bind(manager),
      on: manager.on.bind(manager),
      onConnect: manager.onConnect.bind(manager),
      onDisconnect: manager.onDisconnect.bind(manager),
      isConnected: manager.isConnected.bind(manager),
      getState: manager.getState.bind(manager),
      connect: manager.connect.bind(manager),
      disconnect: manager.disconnect.bind(manager),
    };
  };
}

export default WebSocketManager;

