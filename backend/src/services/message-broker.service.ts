import amqp from 'amqplib';
import { EventEmitter } from 'events';
import { logger } from '../utils/logger';

export interface MessageBrokerConfig {
  url: string;
  exchanges: {
    name: string;
    type: 'direct' | 'topic' | 'fanout' | 'headers';
    durable?: boolean;
  }[];
  queues: {
    name: string;
    durable?: boolean;
    exclusive?: boolean;
    autoDelete?: boolean;
    arguments?: any;
  }[];
  bindings: {
    queue: string;
    exchange: string;
    routingKey: string;
  }[];
}

export class MessageBrokerService extends EventEmitter {
  private static instance: MessageBrokerService;
  private connection: amqp.Connection | null = null;
  private channel: amqp.Channel | null = null;
  private config: MessageBrokerConfig;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectDelay = 1000;

  // Event types
  static readonly EVENTS = {
    RESERVATION_CREATED: 'reservation.created',
    RESERVATION_UPDATED: 'reservation.updated',
    RESERVATION_CANCELLED: 'reservation.cancelled',
    RESTAURANT_CREATED: 'restaurant.created',
    RESTAURANT_UPDATED: 'restaurant.updated',
    REVIEW_CREATED: 'review.created',
    USER_REGISTERED: 'user.registered',
    USER_UPDATED: 'user.updated',
    PAYMENT_PROCESSED: 'payment.processed',
    NOTIFICATION_SENT: 'notification.sent',
  } as const;

  // Exchange names
  static readonly EXCHANGES = {
    RESERVATIONS: 'reservations',
    RESTAURANTS: 'restaurants',
    USERS: 'users',
    NOTIFICATIONS: 'notifications',
    ANALYTICS: 'analytics',
  } as const;

  private constructor() {
    super();
    this.config = {
      url: process.env.RABBITMQ_URL || 'amqp://localhost',
      exchanges: [
        { name: this.constructor.EXCHANGES.RESERVATIONS, type: 'topic', durable: true },
        { name: this.constructor.EXCHANGES.RESTAURANTS, type: 'topic', durable: true },
        { name: this.constructor.EXCHANGES.USERS, type: 'topic', durable: true },
        { name: this.constructor.EXCHANGES.NOTIFICATIONS, type: 'fanout', durable: true },
        { name: this.constructor.EXCHANGES.ANALYTICS, type: 'topic', durable: true },
      ],
      queues: [
        { name: 'email-notifications', durable: true },
        { name: 'sms-notifications', durable: true },
        { name: 'push-notifications', durable: true },
        { name: 'analytics-events', durable: true },
        { name: 'search-indexing', durable: true },
        { name: 'cache-invalidation', durable: true },
      ],
      bindings: [
        {
          queue: 'email-notifications',
          exchange: this.constructor.EXCHANGES.NOTIFICATIONS,
          routingKey: '',
        },
        {
          queue: 'analytics-events',
          exchange: this.constructor.EXCHANGES.ANALYTICS,
          routingKey: '#',
        },
        {
          queue: 'search-indexing',
          exchange: this.constructor.EXCHANGES.RESTAURANTS,
          routingKey: 'restaurant.*',
        },
        {
          queue: 'cache-invalidation',
          exchange: this.constructor.EXCHANGES.RESTAURANTS,
          routingKey: 'restaurant.updated',
        },
      ],
    };
  }

  static getInstance(): MessageBrokerService {
    if (!this.instance) {
      this.instance = new MessageBrokerService();
    }
    return this.instance;
  }

  async connect(): Promise<void> {
    try {
      this.connection = await amqp.connect(this.config.url);
      
      this.connection.on('error', (err) => {
        logger.error('RabbitMQ connection error:', err);
        this.handleConnectionError();
      });

      this.connection.on('close', () => {
        logger.warn('RabbitMQ connection closed');
        this.handleConnectionError();
      });

      this.channel = await this.connection.createChannel();
      
      // Set up exchanges, queues, and bindings
      await this.setupInfrastructure();
      
      // Set up consumers
      await this.setupConsumers();
      
      this.reconnectAttempts = 0;
      logger.info('Connected to RabbitMQ');
      this.emit('connected');
    } catch (error) {
      logger.error('Failed to connect to RabbitMQ:', error);
      await this.handleConnectionError();
    }
  }

  private async setupInfrastructure(): Promise<void> {
    if (!this.channel) return;

    // Create exchanges
    for (const exchange of this.config.exchanges) {
      await this.channel.assertExchange(
        exchange.name,
        exchange.type,
        { durable: exchange.durable ?? true }
      );
    }

    // Create queues
    for (const queue of this.config.queues) {
      await this.channel.assertQueue(queue.name, {
        durable: queue.durable ?? true,
        exclusive: queue.exclusive ?? false,
        autoDelete: queue.autoDelete ?? false,
        arguments: queue.arguments,
      });
    }

    // Create bindings
    for (const binding of this.config.bindings) {
      await this.channel.bindQueue(
        binding.queue,
        binding.exchange,
        binding.routingKey
      );
    }
  }

  private async setupConsumers(): Promise<void> {
    if (!this.channel) return;

    // Email notifications consumer
    await this.channel.consume('email-notifications', async (msg) => {
      if (!msg) return;
      
      try {
        const data = JSON.parse(msg.content.toString());
        await this.handleEmailNotification(data);
        this.channel!.ack(msg);
      } catch (error) {
        logger.error('Error processing email notification:', error);
        this.channel!.nack(msg, false, true);
      }
    });

    // Analytics events consumer
    await this.channel.consume('analytics-events', async (msg) => {
      if (!msg) return;
      
      try {
        const data = JSON.parse(msg.content.toString());
        await this.handleAnalyticsEvent(data);
        this.channel!.ack(msg);
      } catch (error) {
        logger.error('Error processing analytics event:', error);
        this.channel!.nack(msg, false, false);
      }
    });

    // Search indexing consumer
    await this.channel.consume('search-indexing', async (msg) => {
      if (!msg) return;
      
      try {
        const data = JSON.parse(msg.content.toString());
        await this.handleSearchIndexing(data);
        this.channel!.ack(msg);
      } catch (error) {
        logger.error('Error processing search indexing:', error);
        this.channel!.nack(msg, false, true);
      }
    });

    // Cache invalidation consumer
    await this.channel.consume('cache-invalidation', async (msg) => {
      if (!msg) return;
      
      try {
        const data = JSON.parse(msg.content.toString());
        await this.handleCacheInvalidation(data);
        this.channel!.ack(msg);
      } catch (error) {
        logger.error('Error processing cache invalidation:', error);
        this.channel!.nack(msg, false, false);
      }
    });
  }

  async publish(
    exchange: string,
    routingKey: string,
    data: any,
    options?: amqp.Options.Publish
  ): Promise<boolean> {
    if (!this.channel) {
      throw new Error('Not connected to RabbitMQ');
    }

    const message = Buffer.from(JSON.stringify(data));
    
    return this.channel.publish(
      exchange,
      routingKey,
      message,
      {
        persistent: true,
        timestamp: Date.now(),
        ...options,
      }
    );
  }

  async publishReservationEvent(
    event: 'created' | 'updated' | 'cancelled',
    reservation: any
  ): Promise<void> {
    await this.publish(
      MessageBrokerService.EXCHANGES.RESERVATIONS,
      `reservation.${event}`,
      {
        event: `reservation.${event}`,
        timestamp: new Date(),
        data: reservation,
      }
    );
  }

  async publishRestaurantEvent(
    event: 'created' | 'updated' | 'deleted',
    restaurant: any
  ): Promise<void> {
    await this.publish(
      MessageBrokerService.EXCHANGES.RESTAURANTS,
      `restaurant.${event}`,
      {
        event: `restaurant.${event}`,
        timestamp: new Date(),
        data: restaurant,
      }
    );
  }

  async publishUserEvent(
    event: 'registered' | 'updated' | 'deleted',
    user: any
  ): Promise<void> {
    await this.publish(
      MessageBrokerService.EXCHANGES.USERS,
      `user.${event}`,
      {
        event: `user.${event}`,
        timestamp: new Date(),
        data: user,
      }
    );
  }

  async publishNotification(notification: {
    type: 'email' | 'sms' | 'push';
    userId: string;
    data: any;
  }): Promise<void> {
    await this.publish(
      MessageBrokerService.EXCHANGES.NOTIFICATIONS,
      '',
      notification
    );
  }

  // Message handlers
  private async handleEmailNotification(data: any): Promise<void> {
    const { EmailService } = require('./email.service');
    await EmailService.sendEmail({
      to: data.to,
      subject: data.subject,
      template: data.template,
      data: data.templateData,
    });
  }

  private async handleAnalyticsEvent(data: any): Promise<void> {
    logger.info('Analytics event received:', data);
    // Process analytics event
    this.emit('analytics', data);
  }

  private async handleSearchIndexing(data: any): Promise<void> {
    const { SearchService } = require('./search.service');
    
    if (data.event.startsWith('restaurant.')) {
      await SearchService.indexRestaurant(data.data);
    }
  }

  private async handleCacheInvalidation(data: any): Promise<void> {
    const { CacheService } = require('./cache.service');
    
    if (data.event === 'restaurant.updated') {
      await CacheService.invalidateRestaurantCache(data.data.id);
    }
  }

  // Connection management
  private async handleConnectionError(): Promise<void> {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      logger.error('Max reconnection attempts reached. Giving up.');
      this.emit('error', new Error('Failed to reconnect to RabbitMQ'));
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    
    logger.info(`Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts})`);
    
    setTimeout(() => {
      this.connect();
    }, delay);
  }

  async disconnect(): Promise<void> {
    if (this.channel) {
      await this.channel.close();
    }
    if (this.connection) {
      await this.connection.close();
    }
    
    this.channel = null;
    this.connection = null;
    logger.info('Disconnected from RabbitMQ');
  }

  // Health check
  isConnected(): boolean {
    return !!(this.connection && this.channel);
  }

  async healthCheck(): Promise<{
    status: 'healthy' | 'unhealthy';
    details: any;
  }> {
    if (!this.isConnected()) {
      return {
        status: 'unhealthy',
        details: { connected: false },
      };
    }

    try {
      // Test the connection by declaring a temporary queue
      const testQueue = await this.channel!.assertQueue('', { exclusive: true });
      await this.channel!.deleteQueue(testQueue.queue);
      
      return {
        status: 'healthy',
        details: {
          connected: true,
          exchanges: this.config.exchanges.length,
          queues: this.config.queues.length,
        },
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        details: {
          connected: true,
          error: error.message,
        },
      };
    }
  }
}