import { Injectable, BadRequestException, UnauthorizedException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, In, MoreThanOrEqual, IsNull } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Message, Conversation, Notification, User, Restaurant, NotificationPreferences } from '../entities';
import * as Redis from 'ioredis';
import * as io from 'socket.io';
import * as nodemailer from 'nodemailer';
import * as twilio from 'twilio';
import * as admin from 'firebase-admin';
import * as webpush from 'web-push';
import * as handlebars from 'handlebars';
import * as fs from 'fs/promises';
import * as path from 'path';

interface MessageRequest {
  conversationId?: string;
  senderId: string;
  recipientId?: string;
  restaurantId?: string;
  content: string;
  messageType: 'text' | 'image' | 'reservation_update' | 'system';
  metadata?: any;
  attachments?: Array<{
    type: string;
    url: string;
    name: string;
  }>;
}

interface ConversationRequest {
  userId: string;
  restaurantId?: string;
  recipientId?: string;
  subject?: string;
  initialMessage?: string;
}

interface NotificationRequest {
  userId: string;
  type: string;
  title: string;
  message: string;
  priority: 'high' | 'normal' | 'low';
  data?: any;
  actionUrl?: string;
  actionText?: string;
  expiresAt?: Date;
}

interface BroadcastRequest {
  restaurantId?: string;
  userSegment?: 'all' | 'vip' | 'regular' | 'new' | 'inactive';
  title: string;
  message: string;
  actionUrl?: string;
  channels: Array<'push' | 'email' | 'sms' | 'in_app'>;
  scheduledFor?: Date;
}

interface NotificationStats {
  sent: number;
  delivered: number;
  opened: number;
  clicked: number;
  failed: number;
}

interface EmailTemplate {
  name: string;
  subject: string;
  html: string;
  text: string;
}

@Injectable()
export class MessagingNotificationService {
  private redis: Redis.Redis;
  private redisPub: Redis.Redis;
  private redisSub: Redis.Redis;
  private socketServer: io.Server;
  private emailTransporter: nodemailer.Transporter;
  private twilioClient: any;
  private firebaseApp: admin.app.App;
  private emailTemplates: Map<string, handlebars.TemplateDelegate> = new Map();

  constructor(
    @InjectRepository(Message)
    private messageRepository: Repository<Message>,
    @InjectRepository(Conversation)
    private conversationRepository: Repository<Conversation>,
    @InjectRepository(Notification)
    private notificationRepository: Repository<Notification>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Restaurant)
    private restaurantRepository: Repository<Restaurant>,
    @InjectRepository(NotificationPreferences)
    private preferencesRepository: Repository<NotificationPreferences>,
    private dataSource: DataSource,
    private eventEmitter: EventEmitter2,
  ) {
    // Initialize Redis
    this.redis = new Redis({
      host: process.env.REDIS_HOST,
      port: parseInt(process.env.REDIS_PORT),
    });

    this.redisPub = new Redis({
      host: process.env.REDIS_HOST,
      port: parseInt(process.env.REDIS_PORT),
    });

    this.redisSub = new Redis({
      host: process.env.REDIS_HOST,
      port: parseInt(process.env.REDIS_PORT),
    });

    // Initialize Socket.io
    this.initializeSocketServer();

    // Initialize email transporter
    this.emailTransporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    // Initialize Twilio
    this.twilioClient = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );

    // Initialize Firebase
    this.initializeFirebase();

    // Initialize Web Push
    webpush.setVapidDetails(
      process.env.VAPID_SUBJECT,
      process.env.VAPID_PUBLIC_KEY,
      process.env.VAPID_PRIVATE_KEY
    );

    // Load email templates
    this.loadEmailTemplates();

    // Subscribe to Redis events
    this.subscribeToRedisEvents();
  }

  private async initializeSocketServer() {
    this.socketServer = new io.Server({
      cors: {
        origin: process.env.FRONTEND_URL,
        credentials: true,
      },
    });

    this.socketServer.on('connection', (socket) => {
      console.log('Client connected:', socket.id);

      // Handle authentication
      socket.on('authenticate', async (token) => {
        try {
          const userId = await this.verifyToken(token);
          socket.userId = userId;
          socket.join(`user:${userId}`);

          // Join restaurant rooms if applicable
          const userRestaurants = await this.getUserRestaurants(userId);
          userRestaurants.forEach(restaurantId => {
            socket.join(`restaurant:${restaurantId}`);
          });

          socket.emit('authenticated', { success: true });
        } catch (error) {
          socket.emit('authenticated', { success: false, error: error.message });
        }
      });

      // Handle messaging events
      socket.on('message:send', async (data) => {
        await this.handleSocketMessage(socket, data);
      });

      socket.on('message:typing', async (data) => {
        await this.handleTypingIndicator(socket, data);
      });

      socket.on('message:read', async (data) => {
        await this.markMessageAsRead(data.messageId, socket.userId);
      });

      socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
      });
    });
  }

  private async initializeFirebase() {
    if (!admin.apps.length) {
      this.firebaseApp = admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        }),
      });
    } else {
      this.firebaseApp = admin.app();
    }
  }

  private async loadEmailTemplates() {
    const templatesDir = path.join(__dirname, '../templates/emails');
    const templateFiles = await fs.readdir(templatesDir);

    for (const file of templateFiles) {
      if (file.endsWith('.hbs')) {
        const templateName = file.replace('.hbs', '');
        const templateContent = await fs.readFile(path.join(templatesDir, file), 'utf-8');
        const compiledTemplate = handlebars.compile(templateContent);
        this.emailTemplates.set(templateName, compiledTemplate);
      }
    }
  }

  private subscribeToRedisEvents() {
    this.redisSub.subscribe('notification:send');
    this.redisSub.subscribe('message:new');

    this.redisSub.on('message', async (channel, message) => {
      const data = JSON.parse(message);

      switch (channel) {
        case 'notification:send':
          await this.processNotification(data);
          break;
        case 'message:new':
          await this.broadcastMessage(data);
          break;
      }
    });
  }

  // Send a message
  async sendMessage(request: MessageRequest): Promise<any> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      let conversation: any;

      // Get or create conversation
      if (request.conversationId) {
        conversation = await this.conversationRepository.findOne({
          where: { id: request.conversationId },
          relations: ['participants'],
        });

        if (!conversation) {
          throw new NotFoundException('Conversation not found');
        }

        // Verify sender is participant
        if (!conversation.participants.some(p => p.id === request.senderId)) {
          throw new UnauthorizedException('Not authorized to send messages in this conversation');
        }
      } else {
        // Create new conversation
        conversation = await this.createConversation({
          userId: request.senderId,
          restaurantId: request.restaurantId,
          recipientId: request.recipientId,
          initialMessage: request.content,
        });
      }

      // Create message
      const message = this.messageRepository.create({
        conversationId: conversation.id,
        senderId: request.senderId,
        content: request.content,
        messageType: request.messageType,
        metadata: request.metadata,
        attachments: request.attachments,
        isRead: false,
        createdAt: new Date(),
      });

      await queryRunner.manager.save(message);

      // Update conversation
      conversation.lastMessageAt = new Date();
      conversation.lastMessage = request.content;
      conversation.unreadCount = conversation.unreadCount + 1;
      await queryRunner.manager.save(conversation);

      await queryRunner.commitTransaction();

      // Real-time broadcast
      await this.broadcastMessage({
        conversationId: conversation.id,
        message,
        participants: conversation.participants,
      });

      // Send push notification to recipient
      const recipient = conversation.participants.find(p => p.id !== request.senderId);
      if (recipient) {
        await this.sendNotification({
          userId: recipient.id,
          type: 'new_message',
          title: 'New Message',
          message: request.content.substring(0, 100),
          priority: 'normal',
          data: {
            conversationId: conversation.id,
            messageId: message.id,
          },
        });
      }

      return {
        success: true,
        message,
        conversation,
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  // Create a new conversation
  async createConversation(request: ConversationRequest): Promise<any> {
    try {
      const participants = [request.userId];

      if (request.recipientId) {
        participants.push(request.recipientId);
      } else if (request.restaurantId) {
        // Get restaurant staff
        const restaurant = await this.restaurantRepository.findOne({
          where: { id: request.restaurantId },
          relations: ['managers'],
        });

        if (!restaurant) {
          throw new NotFoundException('Restaurant not found');
        }

        participants.push(...restaurant.managers.map(m => m.id));
      }

      // Check if conversation already exists
      const existingConversation = await this.conversationRepository
        .createQueryBuilder('conversation')
        .leftJoin('conversation.participants', 'participant')
        .where('participant.id IN (:...participants)', { participants })
        .groupBy('conversation.id')
        .having('COUNT(DISTINCT participant.id) = :count', { count: participants.length })
        .getOne();

      if (existingConversation) {
        return existingConversation;
      }

      // Create new conversation
      const conversation = this.conversationRepository.create({
        subject: request.subject,
        restaurantId: request.restaurantId,
        participants: await this.userRepository.findByIds(participants),
        unreadCount: 0,
        lastMessageAt: new Date(),
        createdAt: new Date(),
      });

      await this.conversationRepository.save(conversation);

      return conversation;
    } catch (error) {
      throw error;
    }
  }

  // Send notification
  async sendNotification(request: NotificationRequest): Promise<any> {
    try {
      // Get user preferences
      const preferences = await this.preferencesRepository.findOne({
        where: { userId: request.userId },
      });

      if (!preferences) {
        // Create default preferences
        await this.createDefaultPreferences(request.userId);
      }

      // Check if notification type is enabled
      if (preferences && !this.isNotificationEnabled(preferences, request.type)) {
        return {
          success: false,
          reason: 'Notification type disabled by user',
        };
      }

      // Save notification to database
      const notification = this.notificationRepository.create({
        userId: request.userId,
        type: request.type,
        title: request.title,
        message: request.message,
        priority: request.priority,
        data: request.data,
        actionUrl: request.actionUrl,
        actionText: request.actionText,
        isRead: false,
        expiresAt: request.expiresAt,
        createdAt: new Date(),
      });

      await this.notificationRepository.save(notification);

      // Send through appropriate channels
      const results = {
        push: false,
        email: false,
        sms: false,
        inApp: false,
      };

      // In-app notification (always sent)
      results.inApp = await this.sendInAppNotification(notification);

      // Push notification
      if (preferences?.pushEnabled) {
        results.push = await this.sendPushNotification(notification);
      }

      // Email notification
      if (preferences?.emailEnabled && this.shouldSendEmail(request.type, request.priority)) {
        results.email = await this.sendEmailNotification(notification);
      }

      // SMS notification
      if (preferences?.smsEnabled && request.priority === 'high') {
        results.sms = await this.sendSMSNotification(notification);
      }

      return {
        success: true,
        notificationId: notification.id,
        channels: results,
      };
    } catch (error) {
      throw error;
    }
  }

  // Send push notification
  private async sendPushNotification(notification: any): Promise<boolean> {
    try {
      const user = await this.userRepository.findOne({
        where: { id: notification.userId },
      });

      if (!user?.pushTokens || user.pushTokens.length === 0) {
        return false;
      }

      const payload = {
        notification: {
          title: notification.title,
          body: notification.message,
          icon: '/icon-192x192.png',
          badge: '/badge-72x72.png',
          data: notification.data,
        },
      };

      // Send to all user's devices
      const promises = user.pushTokens.map(token => {
        if (token.type === 'fcm') {
          // Firebase Cloud Messaging
          return admin.messaging().sendToDevice(token.token, payload);
        } else if (token.type === 'web') {
          // Web Push
          return webpush.sendNotification(
            {
              endpoint: token.endpoint,
              keys: {
                p256dh: token.p256dh,
                auth: token.auth,
              },
            },
            JSON.stringify(payload)
          );
        }
      });

      await Promise.allSettled(promises);
      return true;
    } catch (error) {
      console.error('Push notification error:', error);
      return false;
    }
  }

  // Send email notification
  private async sendEmailNotification(notification: any): Promise<boolean> {
    try {
      const user = await this.userRepository.findOne({
        where: { id: notification.userId },
      });

      if (!user?.email) {
        return false;
      }

      // Get email template
      const templateName = this.getEmailTemplate(notification.type);
      const template = this.emailTemplates.get(templateName);

      if (!template) {
        console.error(`Email template ${templateName} not found`);
        return false;
      }

      // Prepare email data
      const emailData = {
        user: {
          name: user.name,
          email: user.email,
        },
        notification: {
          title: notification.title,
          message: notification.message,
          actionUrl: notification.actionUrl,
          actionText: notification.actionText,
          data: notification.data,
        },
        appUrl: process.env.FRONTEND_URL,
        unsubscribeUrl: `${process.env.FRONTEND_URL}/unsubscribe?token=${user.unsubscribeToken}`,
      };

      // Send email
      await this.emailTransporter.sendMail({
        from: `${process.env.APP_NAME} <${process.env.SMTP_FROM}>`,
        to: user.email,
        subject: notification.title,
        html: template(emailData),
      });

      return true;
    } catch (error) {
      console.error('Email notification error:', error);
      return false;
    }
  }

  // Send SMS notification
  private async sendSMSNotification(notification: any): Promise<boolean> {
    try {
      const user = await this.userRepository.findOne({
        where: { id: notification.userId },
      });

      if (!user?.phone || !user.phoneVerified) {
        return false;
      }

      // Format message
      const smsMessage = `${notification.title}\n\n${notification.message}`;
      const truncatedMessage = smsMessage.substring(0, 160);

      // Send SMS
      await this.twilioClient.messages.create({
        body: truncatedMessage,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: user.phone,
      });

      return true;
    } catch (error) {
      console.error('SMS notification error:', error);
      return false;
    }
  }

  // Send in-app notification
  private async sendInAppNotification(notification: any): Promise<boolean> {
    try {
      // Broadcast to connected sockets
      this.socketServer.to(`user:${notification.userId}`).emit('notification:new', {
        id: notification.id,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        priority: notification.priority,
        data: notification.data,
        actionUrl: notification.actionUrl,
        actionText: notification.actionText,
        createdAt: notification.createdAt,
      });

      // Update unread count
      await this.updateUnreadNotificationCount(notification.userId);

      return true;
    } catch (error) {
      console.error('In-app notification error:', error);
      return false;
    }
  }

  // Broadcast notification to restaurant/segment
  async broadcastNotification(request: BroadcastRequest): Promise<any> {
    try {
      // Get target users
      const users = await this.getTargetUsers(request.restaurantId, request.userSegment);

      if (users.length === 0) {
        return {
          success: false,
          reason: 'No users found for the specified segment',
        };
      }

      const stats: NotificationStats = {
        sent: 0,
        delivered: 0,
        opened: 0,
        clicked: 0,
        failed: 0,
      };

      // Schedule or send immediately
      if (request.scheduledFor && request.scheduledFor > new Date()) {
        // Schedule for later
        await this.schedulebroadcast(request, users);
        return {
          success: true,
          scheduled: true,
          scheduledFor: request.scheduledFor,
          targetUsers: users.length,
        };
      }

      // Send immediately
      const promises = users.map(user => {
        return this.sendNotification({
          userId: user.id,
          type: 'broadcast',
          title: request.title,
          message: request.message,
          priority: 'normal',
          actionUrl: request.actionUrl,
        }).then(result => {
          if (result.success) {
            stats.sent++;
          } else {
            stats.failed++;
          }
        });
      });

      await Promise.allSettled(promises);

      return {
        success: true,
        stats,
        targetUsers: users.length,
      };
    } catch (error) {
      throw error;
    }
  }

  // Get target users for broadcast
  private async getTargetUsers(restaurantId?: string, segment?: string): Promise<any[]> {
    const query = this.userRepository.createQueryBuilder('user');

    if (restaurantId) {
      // Users who have made reservations at this restaurant
      query.innerJoin('user.reservations', 'reservation')
           .where('reservation.restaurantId = :restaurantId', { restaurantId });
    }

    if (segment) {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      switch (segment) {
        case 'vip':
          query.andWhere('user.loyaltyTier IN (:...tiers)', { tiers: ['gold', 'platinum'] });
          break;
        case 'new':
          query.andWhere('user.createdAt >= :date', { date: thirtyDaysAgo });
          break;
        case 'inactive':
          query.andWhere('user.lastLogin < :date', { date: thirtyDaysAgo });
          break;
        case 'regular':
          query.andWhere('user.loyaltyTier IN (:...tiers)', { tiers: ['bronze', 'silver'] });
          break;
      }
    }

    return query.getMany();
  }

  // Mark notification as read
  async markNotificationAsRead(notificationId: string, userId: string): Promise<any> {
    try {
      const notification = await this.notificationRepository.findOne({
        where: { id: notificationId, userId },
      });

      if (!notification) {
        throw new NotFoundException('Notification not found');
      }

      notification.isRead = true;
      notification.readAt = new Date();
      await this.notificationRepository.save(notification);

      // Update unread count
      await this.updateUnreadNotificationCount(userId);

      return {
        success: true,
      };
    } catch (error) {
      throw error;
    }
  }

  // Update notification preferences
  async updateNotificationPreferences(userId: string, preferences: any): Promise<any> {
    try {
      let userPreferences = await this.preferencesRepository.findOne({
        where: { userId },
      });

      if (!userPreferences) {
        userPreferences = this.preferencesRepository.create({
          userId,
          ...preferences,
        });
      } else {
        Object.assign(userPreferences, preferences);
      }

      await this.preferencesRepository.save(userPreferences);

      return {
        success: true,
        preferences: userPreferences,
      };
    } catch (error) {
      throw error;
    }
  }

  // Helper methods
  private async verifyToken(token: string): Promise<string> {
    // Implement JWT verification
    // Return user ID
    return 'userId';
  }

  private async getUserRestaurants(userId: string): Promise<string[]> {
    const restaurants = await this.restaurantRepository
      .createQueryBuilder('restaurant')
      .leftJoin('restaurant.managers', 'manager')
      .where('restaurant.ownerId = :userId OR manager.id = :userId', { userId })
      .getMany();

    return restaurants.map(r => r.id);
  }

  private async handleSocketMessage(socket: any, data: any) {
    try {
      await this.sendMessage({
        ...data,
        senderId: socket.userId,
      });
    } catch (error) {
      socket.emit('message:error', { error: error.message });
    }
  }

  private async handleTypingIndicator(socket: any, data: any) {
    const { conversationId, isTyping } = data;

    // Broadcast to other participants
    socket.to(`conversation:${conversationId}`).emit('message:typing', {
      userId: socket.userId,
      isTyping,
    });
  }

  private async markMessageAsRead(messageId: string, userId: string) {
    const message = await this.messageRepository.findOne({
      where: { id: messageId },
      relations: ['conversation'],
    });

    if (message && message.conversation.participants.some(p => p.id === userId)) {
      message.isRead = true;
      message.readAt = new Date();
      await this.messageRepository.save(message);

      // Update conversation unread count
      const unreadCount = await this.messageRepository.count({
        where: {
          conversationId: message.conversationId,
          isRead: false,
        },
      });

      await this.conversationRepository.update(message.conversationId, {
        unreadCount,
      });
    }
  }

  private async broadcastMessage(data: any) {
    const { conversationId, message, participants } = data;

    // Broadcast to all participants
    participants.forEach(participant => {
      this.socketServer.to(`user:${participant.id}`).emit('message:new', {
        conversationId,
        message,
      });
    });
  }

  private async processNotification(data: any) {
    await this.sendNotification(data);
  }

  private isNotificationEnabled(preferences: any, type: string): boolean {
    const typeSettings = preferences.notificationTypes || {};
    return typeSettings[type] !== false;
  }

  private shouldSendEmail(type: string, priority: string): boolean {
    // Define which notification types should trigger emails
    const emailTypes = [
      'reservation_confirmed',
      'reservation_cancelled',
      'reservation_reminder',
      'review_response',
      'points_earned',
      'tier_upgrade',
    ];

    return emailTypes.includes(type) || priority === 'high';
  }

  private getEmailTemplate(type: string): string {
    const templateMap = {
      reservation_confirmed: 'reservation-confirmation',
      reservation_cancelled: 'reservation-cancellation',
      reservation_reminder: 'reservation-reminder',
      review_response: 'review-response',
      points_earned: 'points-earned',
      tier_upgrade: 'tier-upgrade',
      new_message: 'new-message',
      broadcast: 'broadcast',
    };

    return templateMap[type] || 'default';
  }

  private async createDefaultPreferences(userId: string) {
    const preferences = this.preferencesRepository.create({
      userId,
      emailEnabled: true,
      pushEnabled: true,
      smsEnabled: false,
      inAppEnabled: true,
      notificationTypes: {
        reservation_confirmed: true,
        reservation_reminder: true,
        reservation_cancelled: true,
        new_message: true,
        review_response: true,
        points_earned: true,
        marketing: false,
      },
      quietHours: {
        enabled: false,
        start: '22:00',
        end: '08:00',
      },
    });

    await this.preferencesRepository.save(preferences);
  }

  private async updateUnreadNotificationCount(userId: string) {
    const count = await this.notificationRepository.count({
      where: {
        userId,
        isRead: false,
        expiresAt: IsNull(),
      },
    });

    // Broadcast to user's sockets
    this.socketServer.to(`user:${userId}`).emit('notification:count', { count });

    // Cache in Redis
    await this.redis.set(`notifications:unread:${userId}`, count, 'EX', 3600);
  }

  private async schedulebroadcast(request: BroadcastRequest, users: any[]) {
    // Store scheduled broadcast in database
    // In production, would use a job queue like Bull
    const scheduledJob = {
      type: 'broadcast',
      data: request,
      users: users.map(u => u.id),
      scheduledFor: request.scheduledFor,
      status: 'scheduled',
    };

    await this.redis.zadd(
      'scheduled:broadcasts',
      request.scheduledFor.getTime(),
      JSON.stringify(scheduledJob)
    );
  }
}