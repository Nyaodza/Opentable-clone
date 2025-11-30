import React from 'react';
import { getSession } from 'next-auth/react';

export type WebSocketEventType = 
  | 'reservation_confirmed'
  | 'reservation_cancelled'
  | 'reservation_reminded'
  | 'table_ready'
  | 'order_status_update'
  | 'delivery_status_update'
  | 'driver_location_update'
  | 'message_received'
  | 'notification_received'
  | 'restaurant_status_update'
  | 'availability_update'
  | 'review_received'
  | 'promotion_available'
  | 'loyalty_points_earned'
  | 'payment_status_update';

export interface WebSocketMessage {
  type: WebSocketEventType;
  data: any;
  timestamp: string;
  userId?: string;
  restaurantId?: string;
  reservationId?: string;
  orderId?: string;
}

export interface WebSocketSubscription {
  id: string;
  type: WebSocketEventType;
  callback: (message: WebSocketMessage) => void;
  filter?: (message: WebSocketMessage) => boolean;
}

class WebSocketService {
  private ws: WebSocket | null = null;
  private subscriptions: Map<string, WebSocketSubscription> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private isConnecting = false;
  private isAuthenticated = false;
  private messageQueue: WebSocketMessage[] = [];
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private lastHeartbeat = 0;

  private readonly HEARTBEAT_INTERVAL = 30000; // 30 seconds
  private readonly RECONNECT_DELAY = 1000; // Start with 1 second

  constructor() {
    if (typeof window !== 'undefined') {
      // Automatically connect when service is instantiated
      this.connect();
      
      // Handle page visibility changes
      document.addEventListener('visibilitychange', this.handleVisibilityChange.bind(this));
      
      // Handle online/offline events
      window.addEventListener('online', this.handleOnline.bind(this));
      window.addEventListener('offline', this.handleOffline.bind(this));
    }
  }

  private async connect(): Promise<void> {
    if (this.isConnecting || (this.ws && this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    this.isConnecting = true;

    try {
      const session = await getSession();
      const wsUrl = this.buildWebSocketUrl(session?.accessToken);
      
      this.ws = new WebSocket(wsUrl);
      this.setupEventListeners();
      
    } catch (error) {
      console.error('Failed to establish WebSocket connection:', error);
      this.isConnecting = false;
      this.scheduleReconnect();
    }
  }

  private buildWebSocketUrl(token?: string): string {
    const baseUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3002';
    const url = new URL(baseUrl);
    
    if (token) {
      url.searchParams.set('token', token);
    }
    
    return url.toString();
  }

  private setupEventListeners(): void {
    if (!this.ws) return;

    this.ws.onopen = () => {
      console.log('WebSocket connected');
      this.isConnecting = false;
      this.reconnectAttempts = 0;
      this.isAuthenticated = true;
      
      // Start heartbeat
      this.startHeartbeat();
      
      // Process queued messages
      this.processMessageQueue();
      
      // Notify subscribers of connection
      this.notifyConnectionStatusChange(true);
    };

    this.ws.onmessage = (event) => {
      try {
        const message: WebSocketMessage = JSON.parse(event.data);
        this.handleMessage(message);
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
      }
    };

    this.ws.onclose = (event) => {
      console.log('WebSocket disconnected:', event.code, event.reason);
      this.isAuthenticated = false;
      this.stopHeartbeat();
      this.notifyConnectionStatusChange(false);
      
      // Attempt reconnection unless it was a clean close
      if (event.code !== 1000) {
        this.scheduleReconnect();
      }
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      this.isConnecting = false;
    };
  }

  private handleMessage(message: WebSocketMessage): void {
    // Handle heartbeat responses
    if (message.type === 'heartbeat' as any) {
      this.lastHeartbeat = Date.now();
      return;
    }

    // Notify all relevant subscribers
    this.subscriptions.forEach((subscription) => {
      if (subscription.type === message.type || subscription.type === 'all' as any) {
        if (!subscription.filter || subscription.filter(message)) {
          try {
            subscription.callback(message);
          } catch (error) {
            console.error('Error in WebSocket subscription callback:', error);
          }
        }
      }
    });

    // Handle specific message types
    this.handleSpecificMessage(message);
  }

  private handleSpecificMessage(message: WebSocketMessage): void {
    switch (message.type) {
      case 'reservation_confirmed':
        this.showNotification('Reservation Confirmed', {
          body: 'Your reservation has been confirmed!',
          icon: '/icons/reservation.png',
          tag: 'reservation',
        });
        break;
        
      case 'table_ready':
        this.showNotification('Table Ready', {
          body: 'Your table is ready! Please proceed to the restaurant.',
          icon: '/icons/table.png',
          tag: 'table-ready',
          requireInteraction: true,
        });
        break;
        
      case 'delivery_status_update':
        if (message.data.status === 'driver_assigned') {
          this.showNotification('Driver Assigned', {
            body: `${message.data.driverName} is now delivering your order.`,
            icon: '/icons/delivery.png',
            tag: 'delivery',
          });
        }
        break;
        
      case 'promotion_available':
        this.showNotification('Special Offer', {
          body: message.data.message,
          icon: '/icons/promotion.png',
          tag: 'promotion',
        });
        break;
    }
  }

  private showNotification(title: string, options: NotificationOptions): void {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'granted') {
        new Notification(title, {
          ...options,
          badge: '/icons/badge.png',
        });
      }
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      return;
    }

    const delay = Math.min(
      this.RECONNECT_DELAY * Math.pow(2, this.reconnectAttempts),
      30000 // Max 30 seconds
    );

    this.reconnectTimeout = setTimeout(() => {
      this.reconnectAttempts++;
      console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
      this.connect();
    }, delay);
  }

  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'heartbeat', timestamp: Date.now() }));
        
        // Check if we missed heartbeats
        if (Date.now() - this.lastHeartbeat > this.HEARTBEAT_INTERVAL * 2) {
          console.warn('Heartbeat missed, reconnecting...');
          this.disconnect();
          this.connect();
        }
      }
    }, this.HEARTBEAT_INTERVAL);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  private processMessageQueue(): void {
    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift();
      if (message) {
        this.send(message);
      }
    }
  }

  private handleVisibilityChange(): void {
    if (document.hidden) {
      // Page is hidden, we might want to reduce activity
    } else {
      // Page is visible again, ensure connection is active
      if (!this.isConnected()) {
        this.connect();
      }
    }
  }

  private handleOnline(): void {
    console.log('Network is back online');
    if (!this.isConnected()) {
      this.connect();
    }
  }

  private handleOffline(): void {
    console.log('Network is offline');
    this.disconnect();
  }

  private notifyConnectionStatusChange(isConnected: boolean): void {
    const statusEvent: WebSocketMessage = {
      type: 'connection_status_change' as any,
      data: { isConnected },
      timestamp: new Date().toISOString(),
    };
    
    this.subscriptions.forEach((subscription) => {
      if (subscription.type === 'connection_status_change' as any) {
        subscription.callback(statusEvent);
      }
    });
  }

  // Public API
  public subscribe(
    type: WebSocketEventType | 'all' | 'connection_status_change',
    callback: (message: WebSocketMessage) => void,
    filter?: (message: WebSocketMessage) => boolean
  ): string {
    const id = `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    this.subscriptions.set(id, {
      id,
      type: type as WebSocketEventType,
      callback,
      filter,
    });
    
    return id;
  }

  public unsubscribe(subscriptionId: string): void {
    this.subscriptions.delete(subscriptionId);
  }

  public send(message: Omit<WebSocketMessage, 'timestamp'>): void {
    const fullMessage: WebSocketMessage = {
      ...message,
      timestamp: new Date().toISOString(),
    };

    if (this.isConnected()) {
      this.ws!.send(JSON.stringify(fullMessage));
    } else {
      // Queue message for when connection is restored
      this.messageQueue.push(fullMessage);
      
      // Attempt to reconnect if not already connecting
      if (!this.isConnecting) {
        this.connect();
      }
    }
  }

  public isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN && this.isAuthenticated;
  }

  public disconnect(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    
    this.stopHeartbeat();
    
    if (this.ws) {
      this.ws.close(1000, 'Client disconnecting');
      this.ws = null;
    }
    
    this.isAuthenticated = false;
    this.isConnecting = false;
  }

  public getConnectionInfo(): {
    isConnected: boolean;
    reconnectAttempts: number;
    queuedMessages: number;
    subscriptions: number;
  } {
    return {
      isConnected: this.isConnected(),
      reconnectAttempts: this.reconnectAttempts,
      queuedMessages: this.messageQueue.length,
      subscriptions: this.subscriptions.size,
    };
  }

  // Utility methods for common use cases
  public subscribeToReservationUpdates(
    reservationId: string,
    callback: (message: WebSocketMessage) => void
  ): string {
    return this.subscribe(
      'all' as any,
      callback,
      (message) => message.reservationId === reservationId
    );
  }

  public subscribeToRestaurantUpdates(
    restaurantId: string,
    callback: (message: WebSocketMessage) => void
  ): string {
    return this.subscribe(
      'all' as any,
      callback,
      (message) => message.restaurantId === restaurantId
    );
  }

  public subscribeToDeliveryUpdates(
    orderId: string,
    callback: (message: WebSocketMessage) => void
  ): string {
    return this.subscribe(
      'delivery_status_update',
      callback,
      (message) => message.orderId === orderId
    );
  }

  public joinRoom(roomId: string): void {
    this.send({
      type: 'join_room' as any,
      data: { roomId },
    });
  }

  public leaveRoom(roomId: string): void {
    this.send({
      type: 'leave_room' as any,
      data: { roomId },
    });
  }
}

// Singleton instance
export const webSocketService = new WebSocketService();

// React hook for using WebSocket in components
export function useWebSocket() {
  return webSocketService;
}

// React hook for subscription management
export function useWebSocketSubscription(
  type: WebSocketEventType | 'all' | 'connection_status_change',
  callback: (message: WebSocketMessage) => void,
  filter?: (message: WebSocketMessage) => boolean,
  deps: React.DependencyList = []
): void {
  React.useEffect(() => {
    const subscriptionId = webSocketService.subscribe(type, callback, filter);
    
    return () => {
      webSocketService.unsubscribe(subscriptionId);
    };
  }, deps);
}

export default webSocketService;