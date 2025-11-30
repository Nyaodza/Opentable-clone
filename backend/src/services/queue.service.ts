import Bull from 'bull';
import { logger } from '../utils/logger';
import { EmailService } from './email.service';
import { NotificationService } from './notification.service';
import { RecommendationService } from './recommendation.service';
import { ImageService } from './image.service';

interface QueueConfig {
  name: string;
  redis: {
    host: string;
    port: number;
    password?: string;
  };
  defaultJobOptions?: Bull.JobOptions;
}

export class QueueService {
  private static queues: Map<string, Bull.Queue> = new Map();
  
  // Queue names
  static readonly QUEUES = {
    EMAIL: 'email',
    NOTIFICATION: 'notification',
    IMAGE_PROCESSING: 'image-processing',
    RECOMMENDATION: 'recommendation',
    RESERVATION_REMINDER: 'reservation-reminder',
    ANALYTICS: 'analytics',
    EXPORT: 'export',
    IMPORT: 'import',
  } as const;

  static initialize(): void {
    const redisConfig = {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
    };

    // Initialize queues
    Object.values(this.QUEUES).forEach(queueName => {
      this.createQueue({
        name: queueName,
        redis: redisConfig,
        defaultJobOptions: {
          removeOnComplete: true,
          removeOnFail: false,
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
        },
      });
    });

    // Set up queue processors
    this.setupProcessors();
  }

  private static createQueue(config: QueueConfig): Bull.Queue {
    const queue = new Bull(config.name, {
      redis: config.redis,
      defaultJobOptions: config.defaultJobOptions,
    });

    // Queue event handlers
    queue.on('error', (error) => {
      logger.error(`Queue ${config.name} error:`, error);
    });

    queue.on('failed', (job, err) => {
      logger.error(`Job ${job.id} in queue ${config.name} failed:`, err);
    });

    queue.on('stalled', (job) => {
      logger.warn(`Job ${job.id} in queue ${config.name} stalled`);
    });

    this.queues.set(config.name, queue);
    return queue;
  }

  private static setupProcessors(): void {
    // Email queue processor
    this.queues.get(this.QUEUES.EMAIL)?.process(async (job) => {
      const { to, subject, template, data } = job.data;
      await EmailService.sendEmail({
        to,
        subject,
        template,
        data,
      });
    });

    // Notification queue processor
    this.queues.get(this.QUEUES.NOTIFICATION)?.process(async (job) => {
      const { userId, type, title, message, data } = job.data;
      await NotificationService.sendNotification({
        userId,
        type,
        title,
        message,
        data,
      });
    });

    // Image processing queue processor
    this.queues.get(this.QUEUES.IMAGE_PROCESSING)?.process(async (job) => {
      const { imageUrl, operations } = job.data;
      await ImageService.processImage(imageUrl, operations);
    });

    // Recommendation queue processor
    this.queues.get(this.QUEUES.RECOMMENDATION)?.process(async (job) => {
      const { userId, type } = job.data;
      
      if (type === 'generate') {
        await RecommendationService.getPersonalizedRecommendations(userId);
      } else if (type === 'update_preferences') {
        await RecommendationService.getUserPreferences(userId);
      }
    });

    // Reservation reminder queue processor
    this.queues.get(this.QUEUES.RESERVATION_REMINDER)?.process(async (job) => {
      const { reservationId } = job.data;
      await this.sendReservationReminder(reservationId);
    });

    // Analytics queue processor
    this.queues.get(this.QUEUES.ANALYTICS)?.process(async (job) => {
      const { event, data } = job.data;
      await this.trackAnalyticsEvent(event, data);
    });
  }

  // Queue job methods
  static async addEmailJob(data: {
    to: string;
    subject: string;
    template: string;
    data: any;
  }, options?: Bull.JobOptions): Promise<Bull.Job> {
    const queue = this.queues.get(this.QUEUES.EMAIL);
    if (!queue) throw new Error('Email queue not initialized');
    
    return queue.add(data, options);
  }

  static async addNotificationJob(data: {
    userId: string;
    type: string;
    title: string;
    message: string;
    data?: any;
  }, options?: Bull.JobOptions): Promise<Bull.Job> {
    const queue = this.queues.get(this.QUEUES.NOTIFICATION);
    if (!queue) throw new Error('Notification queue not initialized');
    
    return queue.add(data, options);
  }

  static async addImageProcessingJob(data: {
    imageUrl: string;
    operations: Array<{
      type: 'resize' | 'crop' | 'optimize' | 'watermark';
      params: any;
    }>;
  }, options?: Bull.JobOptions): Promise<Bull.Job> {
    const queue = this.queues.get(this.QUEUES.IMAGE_PROCESSING);
    if (!queue) throw new Error('Image processing queue not initialized');
    
    return queue.add(data, {
      ...options,
      priority: options?.priority || 1,
    });
  }

  static async scheduleReservationReminder(
    reservationId: string,
    reminderTime: Date
  ): Promise<Bull.Job> {
    const queue = this.queues.get(this.QUEUES.RESERVATION_REMINDER);
    if (!queue) throw new Error('Reservation reminder queue not initialized');
    
    const delay = reminderTime.getTime() - Date.now();
    
    return queue.add(
      { reservationId },
      {
        delay,
        attempts: 3,
      }
    );
  }

  static async addAnalyticsJob(data: {
    event: string;
    data: any;
  }): Promise<Bull.Job> {
    const queue = this.queues.get(this.QUEUES.ANALYTICS);
    if (!queue) throw new Error('Analytics queue not initialized');
    
    return queue.add(data, {
      removeOnComplete: true,
      attempts: 1,
    });
  }

  // Bulk operations
  static async addBulkJobs(
    queueName: string,
    jobs: Array<{ data: any; opts?: Bull.JobOptions }>
  ): Promise<Bull.Job[]> {
    const queue = this.queues.get(queueName);
    if (!queue) throw new Error(`Queue ${queueName} not initialized`);
    
    return queue.addBulk(jobs);
  }

  // Queue management methods
  static async pauseQueue(queueName: string): Promise<void> {
    const queue = this.queues.get(queueName);
    if (!queue) throw new Error(`Queue ${queueName} not initialized`);
    
    await queue.pause();
    logger.info(`Queue ${queueName} paused`);
  }

  static async resumeQueue(queueName: string): Promise<void> {
    const queue = this.queues.get(queueName);
    if (!queue) throw new Error(`Queue ${queueName} not initialized`);
    
    await queue.resume();
    logger.info(`Queue ${queueName} resumed`);
  }

  static async cleanQueue(
    queueName: string,
    grace: number = 0,
    status?: 'completed' | 'failed'
  ): Promise<void> {
    const queue = this.queues.get(queueName);
    if (!queue) throw new Error(`Queue ${queueName} not initialized`);
    
    if (status) {
      await queue.clean(grace, status);
    } else {
      await queue.clean(grace, 'completed');
      await queue.clean(grace, 'failed');
    }
    
    logger.info(`Queue ${queueName} cleaned`);
  }

  static async getQueueStats(queueName: string): Promise<{
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    delayed: number;
    paused: boolean;
  }> {
    const queue = this.queues.get(queueName);
    if (!queue) throw new Error(`Queue ${queueName} not initialized`);
    
    const [waiting, active, completed, failed, delayed, paused] = await Promise.all([
      queue.getWaitingCount(),
      queue.getActiveCount(),
      queue.getCompletedCount(),
      queue.getFailedCount(),
      queue.getDelayedCount(),
      queue.isPaused(),
    ]);

    return {
      waiting,
      active,
      completed,
      failed,
      delayed,
      paused,
    };
  }

  static async getAllQueuesStats(): Promise<Map<string, any>> {
    const stats = new Map();
    
    for (const [name, queue] of this.queues) {
      stats.set(name, await this.getQueueStats(name));
    }
    
    return stats;
  }

  // Helper methods
  private static async sendReservationReminder(reservationId: string): Promise<void> {
    const Reservation = require('../models/reservation.model').default;
    const reservation = await Reservation.findByPk(reservationId, {
      include: ['user', 'restaurant'],
    });

    if (!reservation || reservation.status !== 'confirmed') {
      return;
    }

    await this.addEmailJob({
      to: reservation.user.email,
      subject: `Reminder: Your reservation at ${reservation.restaurant.name}`,
      template: 'reservation-reminder',
      data: {
        userName: reservation.user.firstName,
        restaurantName: reservation.restaurant.name,
        date: reservation.date,
        time: reservation.time,
        partySize: reservation.partySize,
      },
    });

    await this.addNotificationJob({
      userId: reservation.userId,
      type: 'RESERVATION_REMINDER',
      title: 'Reservation Reminder',
      message: `Don't forget your reservation at ${reservation.restaurant.name} today at ${reservation.time}`,
      data: { reservationId },
    });
  }

  private static async trackAnalyticsEvent(event: string, data: any): Promise<void> {
    // Send to analytics service (e.g., Mixpanel, Segment, Google Analytics)
    logger.info(`Analytics event: ${event}`, data);
    
    // Store in database for internal analytics
    const Analytics = require('../models/analytics.model').default;
    await Analytics.create({
      event,
      data,
      timestamp: new Date(),
    });
  }

  // Graceful shutdown
  static async shutdown(): Promise<void> {
    logger.info('Shutting down queues...');
    
    const closePromises = Array.from(this.queues.values()).map(queue => 
      queue.close()
    );
    
    await Promise.all(closePromises);
    logger.info('All queues shut down successfully');
  }
}