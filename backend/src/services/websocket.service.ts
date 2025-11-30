import { Server as SocketServer, Socket } from 'socket.io';
import { Server } from 'http';
import jwt from 'jsonwebtoken';
import { User, UserRole } from '../models/User';
import { Restaurant } from '../models/Restaurant';
import { logInfo, logError, logWarning } from '../utils/logger';
import { cache, CACHE_KEYS } from '../config/redis';
import { RateLimiterMemory } from 'rate-limiter-flexible';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  userRole?: UserRole;
  restaurantIds?: string[];
}

interface SocketRoom {
  id: string;
  type: 'restaurant' | 'user' | 'admin';
  participants: Set<string>;
}

export class WebSocketService {
  private io: SocketServer;
  private connectedUsers: Map<string, Set<string>> = new Map(); // userId -> socketIds
  private socketUsers: Map<string, string> = new Map(); // socketId -> userId
  private rooms: Map<string, SocketRoom> = new Map();
  private rateLimiter: RateLimiterMemory;

  constructor(server: Server) {
    this.io = new SocketServer(server, {
      cors: {
        origin: process.env.FRONTEND_URL,
        credentials: true
      },
      pingTimeout: 60000,
      pingInterval: 25000
    });

    // Rate limiter for messages
    this.rateLimiter = new RateLimiterMemory({
      points: 100, // Number of points
      duration: 60, // Per 60 seconds
    });

    this.setupMiddleware();
    this.setupEventHandlers();
    
    logInfo('WebSocket service initialized');
  }

  /**
   * Setup authentication middleware
   */
  private setupMiddleware(): void {
    this.io.use(async (socket: AuthenticatedSocket, next) => {
      try {
        const token = socket.handshake.auth.token;
        
        if (!token) {
          return next(new Error('Authentication required'));
        }

        // Verify JWT token
        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
        
        // Get user details
        const user = await User.findByPk(decoded.id, {
          attributes: ['id', 'role']
        });

        if (!user) {
          return next(new Error('User not found'));
        }

        // Attach user info to socket
        socket.userId = user.id;
        socket.userRole = user.role;

        // Get restaurant IDs if restaurant owner
        if (user.role === UserRole.RESTAURANT_OWNER) {
          const restaurants = await Restaurant.findAll({
            where: { ownerId: user.id },
            attributes: ['id']
          });
          socket.restaurantIds = restaurants.map(r => r.id);
        }

        next();
      } catch (error) {
        next(new Error('Invalid authentication'));
      }
    });
  }

  /**
   * Setup event handlers
   */
  private setupEventHandlers(): void {
    this.io.on('connection', async (socket: AuthenticatedSocket) => {
      logInfo('User connected', {
        socketId: socket.id,
        userId: socket.userId
      });

      // Track connected users
      this.addConnectedUser(socket.userId!, socket.id);

      // Join user's personal room
      socket.join(`user:${socket.userId}`);

      // Join restaurant rooms if owner
      if (socket.restaurantIds) {
        socket.restaurantIds.forEach(restaurantId => {
          socket.join(`restaurant:${restaurantId}`);
          socket.join(`restaurant:${restaurantId}:owner`);
        });
      }

      // Handle events
      socket.on('subscribe:restaurant', (data) => this.handleRestaurantSubscribe(socket, data));
      socket.on('unsubscribe:restaurant', (data) => this.handleRestaurantUnsubscribe(socket, data));
      socket.on('restaurant:update', (data) => this.handleRestaurantUpdate(socket, data));
      socket.on('reservation:update', (data) => this.handleReservationUpdate(socket, data));
      socket.on('table:update', (data) => this.handleTableUpdate(socket, data));
      socket.on('notification:read', (data) => this.handleNotificationRead(socket, data));
      socket.on('typing:start', (data) => this.handleTypingStart(socket, data));
      socket.on('typing:stop', (data) => this.handleTypingStop(socket, data));
      socket.on('ping', () => socket.emit('pong'));

      // Handle disconnect
      socket.on('disconnect', () => {
        logInfo('User disconnected', {
          socketId: socket.id,
          userId: socket.userId
        });
        this.removeConnectedUser(socket.userId!, socket.id);
      });
    });
  }

  /**
   * Track connected users
   */
  private addConnectedUser(userId: string, socketId: string): void {
    if (!this.connectedUsers.has(userId)) {
      this.connectedUsers.set(userId, new Set());
    }
    this.connectedUsers.get(userId)!.add(socketId);
    this.socketUsers.set(socketId, userId);

    // Emit online status
    this.io.emit('user:online', { userId });
  }

  /**
   * Remove disconnected users
   */
  private removeConnectedUser(userId: string, socketId: string): void {
    const userSockets = this.connectedUsers.get(userId);
    if (userSockets) {
      userSockets.delete(socketId);
      if (userSockets.size === 0) {
        this.connectedUsers.delete(userId);
        // Emit offline status
        this.io.emit('user:offline', { userId });
      }
    }
    this.socketUsers.delete(socketId);
  }

  /**
   * Handle restaurant subscription
   */
  private async handleRestaurantSubscribe(
    socket: AuthenticatedSocket,
    data: { restaurantId: string }
  ): Promise<void> {
    try {
      await this.rateLimiter.consume(socket.userId!);

      const { restaurantId } = data;

      // Verify restaurant exists
      const restaurant = await Restaurant.findByPk(restaurantId);
      if (!restaurant) {
        socket.emit('error', { message: 'Restaurant not found' });
        return;
      }

      // Join restaurant room
      socket.join(`restaurant:${restaurantId}:public`);
      
      logInfo('User subscribed to restaurant', {
        userId: socket.userId,
        restaurantId
      });

      // Send current restaurant status
      socket.emit('restaurant:status', {
        restaurantId,
        isOpen: await this.isRestaurantOpen(restaurantId),
        tablesAvailable: await this.getAvailableTablesCount(restaurantId)
      });
    } catch (error) {
      logError('Failed to subscribe to restaurant', error);
      socket.emit('error', { message: 'Failed to subscribe to restaurant' });
    }
  }

  /**
   * Handle restaurant unsubscribe
   */
  private handleRestaurantUnsubscribe(
    socket: AuthenticatedSocket,
    data: { restaurantId: string }
  ): void {
    const { restaurantId } = data;
    socket.leave(`restaurant:${restaurantId}:public`);
    
    logInfo('User unsubscribed from restaurant', {
      userId: socket.userId,
      restaurantId
    });
  }

  /**
   * Handle restaurant updates (owner only)
   */
  private async handleRestaurantUpdate(
    socket: AuthenticatedSocket,
    data: { restaurantId: string; update: any }
  ): Promise<void> {
    try {
      await this.rateLimiter.consume(socket.userId!);

      const { restaurantId, update } = data;

      // Verify ownership
      if (!socket.restaurantIds?.includes(restaurantId)) {
        socket.emit('error', { message: 'Unauthorized' });
        return;
      }

      // Broadcast update to public room
      this.io.to(`restaurant:${restaurantId}:public`).emit('restaurant:updated', {
        restaurantId,
        update,
        timestamp: new Date()
      });

      logInfo('Restaurant update broadcasted', {
        restaurantId,
        updateType: update.type
      });
    } catch (error) {
      logError('Failed to broadcast restaurant update', error);
      socket.emit('error', { message: 'Failed to update restaurant' });
    }
  }

  /**
   * Handle reservation updates
   */
  private async handleReservationUpdate(
    socket: AuthenticatedSocket,
    data: { reservationId: string; status: string }
  ): Promise<void> {
    try {
      await this.rateLimiter.consume(socket.userId!);

      const { reservationId, status } = data;

      // Emit to specific users and restaurant
      this.emitReservationUpdate(reservationId, {
        status,
        updatedBy: socket.userId,
        timestamp: new Date()
      });

      logInfo('Reservation update broadcasted', {
        reservationId,
        status
      });
    } catch (error) {
      logError('Failed to broadcast reservation update', error);
      socket.emit('error', { message: 'Failed to update reservation' });
    }
  }

  /**
   * Handle table updates
   */
  private async handleTableUpdate(
    socket: AuthenticatedSocket,
    data: { restaurantId: string; tableId: string; status: string }
  ): Promise<void> {
    try {
      await this.rateLimiter.consume(socket.userId!);

      const { restaurantId, tableId, status } = data;

      // Verify ownership
      if (!socket.restaurantIds?.includes(restaurantId)) {
        socket.emit('error', { message: 'Unauthorized' });
        return;
      }

      // Broadcast to restaurant staff and public
      this.io.to(`restaurant:${restaurantId}:owner`).emit('table:updated', {
        tableId,
        status,
        timestamp: new Date()
      });

      // Update availability for public
      const availableTables = await this.getAvailableTablesCount(restaurantId);
      this.io.to(`restaurant:${restaurantId}:public`).emit('availability:updated', {
        restaurantId,
        availableTables,
        timestamp: new Date()
      });

      logInfo('Table update broadcasted', {
        restaurantId,
        tableId,
        status
      });
    } catch (error) {
      logError('Failed to broadcast table update', error);
      socket.emit('error', { message: 'Failed to update table' });
    }
  }

  /**
   * Handle notification read
   */
  private handleNotificationRead(
    socket: AuthenticatedSocket,
    data: { notificationIds: string[] }
  ): void {
    // Broadcast to user's other devices
    socket.to(`user:${socket.userId}`).emit('notifications:read', {
      notificationIds: data.notificationIds,
      timestamp: new Date()
    });
  }

  /**
   * Handle typing indicators
   */
  private handleTypingStart(
    socket: AuthenticatedSocket,
    data: { conversationId: string }
  ): void {
    socket.to(`conversation:${data.conversationId}`).emit('typing:started', {
      userId: socket.userId,
      timestamp: new Date()
    });
  }

  private handleTypingStop(
    socket: AuthenticatedSocket,
    data: { conversationId: string }
  ): void {
    socket.to(`conversation:${data.conversationId}`).emit('typing:stopped', {
      userId: socket.userId,
      timestamp: new Date()
    });
  }

  // Public methods for emitting events from other services

  /**
   * Emit to specific user
   */
  emitToUser(userId: string, event: string, data: any): void {
    this.io.to(`user:${userId}`).emit(event, data);
  }

  /**
   * Emit to restaurant owner/staff
   */
  emitToRestaurant(restaurantId: string, event: string, data: any): void {
    this.io.to(`restaurant:${restaurantId}:owner`).emit(event, data);
  }

  /**
   * Emit to restaurant public subscribers
   */
  emitToRestaurantPublic(restaurantId: string, event: string, data: any): void {
    this.io.to(`restaurant:${restaurantId}:public`).emit(event, data);
  }

  /**
   * Emit reservation update to relevant parties
   */
  async emitReservationUpdate(reservationId: string, data: any): Promise<void> {
    // Get reservation details from cache or database
    const cacheKey = CACHE_KEYS.RESERVATION(reservationId);
    let reservation = await cache.get<any>(cacheKey);

    if (!reservation) {
      // Fetch from database if not in cache
      const Reservation = require('../models/Reservation').Reservation;
      reservation = await Reservation.findByPk(reservationId);
      if (reservation) {
        await cache.set(cacheKey, reservation, 300); // Cache for 5 minutes
      }
    }

    if (reservation) {
      // Emit to user
      this.emitToUser(reservation.userId, 'reservation:updated', {
        reservationId,
        ...data
      });

      // Emit to restaurant
      this.emitToRestaurant(reservation.restaurantId, 'reservation:updated', {
        reservationId,
        ...data
      });
    }
  }

  /**
   * Broadcast system announcement
   */
  broadcastAnnouncement(message: string, type: 'info' | 'warning' | 'error'): void {
    this.io.emit('system:announcement', {
      message,
      type,
      timestamp: new Date()
    });
  }

  /**
   * Get online users count
   */
  getOnlineUsersCount(): number {
    return this.connectedUsers.size;
  }

  /**
   * Get user connection status
   */
  isUserOnline(userId: string): boolean {
    return this.connectedUsers.has(userId);
  }

  /**
   * Get restaurant availability helpers
   */
  private async isRestaurantOpen(restaurantId: string): Promise<boolean> {
    // Implementation would check restaurant hours
    const RestaurantHours = require('../models/RestaurantHours').RestaurantHours;
    const now = new Date();
    const dayOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][now.getDay()];
    
    const hours = await RestaurantHours.findOne({
      where: {
        restaurantId,
        dayOfWeek,
        isClosed: false
      }
    });

    if (!hours) return false;

    const currentTime = now.toTimeString().slice(0, 5);
    return currentTime >= hours.openTime && currentTime <= hours.closeTime;
  }

  private async getAvailableTablesCount(restaurantId: string): Promise<number> {
    // Implementation would check available tables
    const cacheKey = `available_tables:${restaurantId}`;
    const cached = await cache.get<number>(cacheKey);
    
    if (cached !== null) {
      return cached;
    }

    // Mock implementation - would query actual table availability
    const count = Math.floor(Math.random() * 10) + 1;
    await cache.set(cacheKey, count, 60); // Cache for 1 minute
    
    return count;
  }
}

// Singleton instance
let wsService: WebSocketService;

export const initializeWebSocket = (server: Server): WebSocketService => {
  if (!wsService) {
    wsService = new WebSocketService(server);
  }
  return wsService;
};

export const getWebSocketService = (): WebSocketService => {
  if (!wsService) {
    throw new Error('WebSocket service not initialized');
  }
  return wsService;
};