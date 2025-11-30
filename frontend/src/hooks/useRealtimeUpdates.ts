/**
 * Real-time Updates Hook
 * Provides real-time updates for reservations, notifications, and more
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { WebSocketManager, ConnectionState, getWebSocketManager } from '../lib/websocket-manager';
import { toast } from 'react-hot-toast';

// Types
interface ReservationUpdate {
  type: 'reservation_confirmed' | 'reservation_cancelled' | 'reservation_modified' | 'table_ready';
  reservationId: string;
  data: any;
}

interface NotificationUpdate {
  type: 'notification';
  id: string;
  title: string;
  message: string;
  action?: {
    label: string;
    url: string;
  };
}

interface RestaurantUpdate {
  type: 'availability_changed' | 'menu_updated' | 'special_offer';
  restaurantId: string;
  data: any;
}

interface WaitlistUpdate {
  type: 'position_update' | 'table_available';
  waitlistId: string;
  position?: number;
  estimatedWait?: number;
}

// Configuration
const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001';

/**
 * Initialize WebSocket manager
 */
function initializeWebSocket(): WebSocketManager {
  return getWebSocketManager({
    url: WS_URL,
    reconnect: true,
    reconnectAttempts: 10,
    reconnectInterval: 1000,
    reconnectBackoff: 'exponential',
    maxReconnectInterval: 30000,
    heartbeat: true,
    heartbeatInterval: 25000,
    heartbeatTimeout: 10000,
    debug: process.env.NODE_ENV === 'development',
  });
}

/**
 * Main real-time updates hook
 */
export function useRealtimeUpdates() {
  const [connectionState, setConnectionState] = useState<ConnectionState>(
    ConnectionState.DISCONNECTED
  );
  const [isConnected, setIsConnected] = useState(false);
  const wsManager = useRef<WebSocketManager | null>(null);
  const queryClient = useQueryClient();

  // Initialize WebSocket
  useEffect(() => {
    wsManager.current = initializeWebSocket();
    
    // Set up connection handlers
    const unsubConnect = wsManager.current.onConnect(() => {
      setIsConnected(true);
      setConnectionState(ConnectionState.CONNECTED);
    });

    const unsubDisconnect = wsManager.current.onDisconnect(() => {
      setIsConnected(false);
      setConnectionState(ConnectionState.DISCONNECTED);
    });

    // Connect
    wsManager.current.connect().catch(console.error);

    // Cleanup
    return () => {
      unsubConnect();
      unsubDisconnect();
      wsManager.current?.disconnect();
    };
  }, []);

  // Subscribe to message types
  const subscribe = useCallback(<T>(type: string, handler: (data: T) => void) => {
    if (!wsManager.current) return () => {};
    return wsManager.current.on(type, handler);
  }, []);

  // Send message
  const send = useCallback((type: string, data: any) => {
    if (!wsManager.current) return false;
    return wsManager.current.send(type, data);
  }, []);

  // Get connection stats
  const getStats = useCallback(() => {
    return wsManager.current?.getStats() || null;
  }, []);

  return {
    isConnected,
    connectionState,
    subscribe,
    send,
    getStats,
  };
}

/**
 * Reservation real-time updates
 */
export function useReservationUpdates(
  reservationId?: string,
  onUpdate?: (update: ReservationUpdate) => void
) {
  const { isConnected, subscribe, send } = useRealtimeUpdates();
  const queryClient = useQueryClient();
  const [lastUpdate, setLastUpdate] = useState<ReservationUpdate | null>(null);

  useEffect(() => {
    if (!isConnected) return;

    // Subscribe to reservation updates
    const unsubConfirmed = subscribe<ReservationUpdate>('reservation_confirmed', (update) => {
      if (!reservationId || update.reservationId === reservationId) {
        setLastUpdate(update);
        onUpdate?.(update);
        
        // Invalidate queries
        queryClient.invalidateQueries({ queryKey: ['reservations'] });
        queryClient.invalidateQueries({ 
          queryKey: ['reservation', update.reservationId] 
        });

        // Show toast
        toast.success('Your reservation has been confirmed!');
      }
    });

    const unsubCancelled = subscribe<ReservationUpdate>('reservation_cancelled', (update) => {
      if (!reservationId || update.reservationId === reservationId) {
        setLastUpdate(update);
        onUpdate?.(update);
        
        queryClient.invalidateQueries({ queryKey: ['reservations'] });
        
        toast('Reservation cancelled', { icon: '❌' });
      }
    });

    const unsubModified = subscribe<ReservationUpdate>('reservation_modified', (update) => {
      if (!reservationId || update.reservationId === reservationId) {
        setLastUpdate(update);
        onUpdate?.(update);
        
        queryClient.invalidateQueries({ queryKey: ['reservations'] });
        queryClient.invalidateQueries({ 
          queryKey: ['reservation', update.reservationId] 
        });

        toast.success('Reservation updated');
      }
    });

    const unsubTableReady = subscribe<ReservationUpdate>('table_ready', (update) => {
      if (!reservationId || update.reservationId === reservationId) {
        setLastUpdate(update);
        onUpdate?.(update);

        // Show prominent notification
        toast.success('Your table is ready! 🎉', {
          duration: 10000,
        });
      }
    });

    // Join reservation room for specific updates
    if (reservationId) {
      send('join_reservation', { reservationId });
    }

    return () => {
      unsubConfirmed();
      unsubCancelled();
      unsubModified();
      unsubTableReady();
      
      if (reservationId) {
        send('leave_reservation', { reservationId });
      }
    };
  }, [isConnected, reservationId, subscribe, send, queryClient, onUpdate]);

  return {
    isConnected,
    lastUpdate,
  };
}

/**
 * Notification real-time updates
 */
export function useNotificationUpdates(
  onNotification?: (notification: NotificationUpdate) => void
) {
  const { isConnected, subscribe } = useRealtimeUpdates();
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<NotificationUpdate[]>([]);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!isConnected) return;

    const unsub = subscribe<NotificationUpdate>('notification', (notification) => {
      setNotifications(prev => [notification, ...prev].slice(0, 50));
      setUnreadCount(prev => prev + 1);
      
      onNotification?.(notification);

      // Invalidate notifications query
      queryClient.invalidateQueries({ queryKey: ['notifications'] });

      // Show toast notification
      toast(notification.message, {
        icon: '🔔',
        duration: 5000,
      });
    });

    return unsub;
  }, [isConnected, subscribe, queryClient, onNotification]);

  const markAsRead = useCallback(() => {
    setUnreadCount(0);
  }, []);

  return {
    isConnected,
    notifications,
    unreadCount,
    markAsRead,
  };
}

/**
 * Restaurant availability real-time updates
 */
export function useRestaurantAvailability(
  restaurantId: string,
  date?: string,
  onUpdate?: (update: RestaurantUpdate) => void
) {
  const { isConnected, subscribe, send } = useRealtimeUpdates();
  const [availability, setAvailability] = useState<any>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!isConnected || !restaurantId) return;

    // Subscribe to availability changes
    const unsubAvailability = subscribe<RestaurantUpdate>('availability_changed', (update) => {
      if (update.restaurantId === restaurantId) {
        setAvailability(update.data);
        onUpdate?.(update);

        // Invalidate availability query
        queryClient.invalidateQueries({ 
          queryKey: ['availability', restaurantId, date] 
        });
      }
    });

    const unsubSpecialOffer = subscribe<RestaurantUpdate>('special_offer', (update) => {
      if (update.restaurantId === restaurantId) {
        onUpdate?.(update);
        
        toast.success(`Special offer: ${update.data.title}`, {
          duration: 8000,
        });
      }
    });

    // Subscribe to restaurant updates
    send('subscribe_restaurant', { restaurantId, date });

    return () => {
      unsubAvailability();
      unsubSpecialOffer();
      send('unsubscribe_restaurant', { restaurantId });
    };
  }, [isConnected, restaurantId, date, subscribe, send, queryClient, onUpdate]);

  return {
    isConnected,
    availability,
  };
}

/**
 * Waitlist real-time updates
 */
export function useWaitlistUpdates(
  waitlistId?: string,
  onUpdate?: (update: WaitlistUpdate) => void
) {
  const { isConnected, subscribe, send } = useRealtimeUpdates();
  const [position, setPosition] = useState<number | null>(null);
  const [estimatedWait, setEstimatedWait] = useState<number | null>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!isConnected) return;

    const unsubPosition = subscribe<WaitlistUpdate>('position_update', (update) => {
      if (!waitlistId || update.waitlistId === waitlistId) {
        setPosition(update.position ?? null);
        setEstimatedWait(update.estimatedWait ?? null);
        onUpdate?.(update);

        queryClient.invalidateQueries({ queryKey: ['waitlist'] });
      }
    });

    const unsubTableAvailable = subscribe<WaitlistUpdate>('table_available', (update) => {
      if (!waitlistId || update.waitlistId === waitlistId) {
        onUpdate?.(update);

        // Prominent notification
        toast.success('A table is available for you! 🎉', {
          duration: 15000,
        });

        queryClient.invalidateQueries({ queryKey: ['waitlist'] });
      }
    });

    if (waitlistId) {
      send('join_waitlist', { waitlistId });
    }

    return () => {
      unsubPosition();
      unsubTableAvailable();
      
      if (waitlistId) {
        send('leave_waitlist', { waitlistId });
      }
    };
  }, [isConnected, waitlistId, subscribe, send, queryClient, onUpdate]);

  return {
    isConnected,
    position,
    estimatedWait,
  };
}

/**
 * Connection status indicator hook
 */
export function useConnectionStatus() {
  const { isConnected, connectionState, getStats } = useRealtimeUpdates();
  const [showReconnecting, setShowReconnecting] = useState(false);

  useEffect(() => {
    if (connectionState === ConnectionState.RECONNECTING) {
      // Show reconnecting message after a delay
      const timer = setTimeout(() => setShowReconnecting(true), 2000);
      return () => clearTimeout(timer);
    } else {
      setShowReconnecting(false);
    }
  }, [connectionState]);

  return {
    isConnected,
    isReconnecting: connectionState === ConnectionState.RECONNECTING,
    showReconnecting,
    stats: getStats(),
  };
}

export default useRealtimeUpdates;

