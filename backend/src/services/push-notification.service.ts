import * as admin from 'firebase-admin';
import { User } from '../models/User';
import { logInfo, logError, logWarning } from '../utils/logger';
import { cache, CACHE_KEYS, CACHE_TTL } from '../config/redis';

interface NotificationPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
  image?: string;
  badge?: number;
  sound?: string;
}

interface NotificationPreferences {
  reservationReminders: boolean;
  reservationUpdates: boolean;
  promotionalOffers: boolean;
  restaurantUpdates: boolean;
  waitlistAlerts: boolean;
  reviewReminders: boolean;
  quietHoursStart?: string;
  quietHoursEnd?: string;
  preferredLanguage?: string;
}

interface BatchNotification {
  userIds: string[];
  notification: NotificationPayload;
  options?: admin.messaging.MessagingOptions;
}

export class PushNotificationService {
  private static initialized = false;
  private static app: admin.app.App;

  /**
   * Initialize Firebase Admin SDK
   */
  static initialize(): void {
    if (this.initialized) return;

    try {
      // Initialize with service account credentials
      this.app = admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
        })
      });

      this.initialized = true;
      logInfo('Push notification service initialized');
    } catch (error) {
      logError('Failed to initialize push notification service', error);
      // Don't throw - allow app to run without push notifications
    }
  }

  /**
   * Send notification to a specific user
   */
  static async sendToUser(
    userId: string,
    notification: NotificationPayload,
    options?: admin.messaging.MessagingOptions
  ): Promise<string[]> {
    if (!this.initialized) {
      logWarning('Push notification service not initialized');
      return [];
    }

    try {
      const user = await User.findByPk(userId);
      if (!user || !user.preferences?.devices) {
        return [];
      }

      // Check user notification preferences
      const preferences = await this.getUserPreferences(userId);
      if (!this.shouldSendNotification(notification, preferences)) {
        logInfo('Notification blocked by user preferences', { userId });
        return [];
      }

      // Get active device tokens
      const devices = user.preferences.devices.filter(d => 
        d.deviceToken && d.lastActive && 
        new Date(d.lastActive) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Active in last 30 days
      );

      if (devices.length === 0) {
        return [];
      }

      // Build messages
      const messages: admin.messaging.Message[] = devices.map(device => ({
        token: device.deviceToken,
        notification: {
          title: notification.title,
          body: notification.body,
          imageUrl: notification.image
        },
        data: notification.data,
        android: {
          priority: 'high',
          notification: {
            sound: notification.sound || 'default',
            channelId: 'default'
          }
        },
        apns: {
          payload: {
            aps: {
              badge: notification.badge,
              sound: notification.sound || 'default',
              'mutable-content': 1
            }
          }
        },
        ...options
      }));

      // Send all messages
      const response = await admin.messaging(this.app).sendAll(messages);
      
      // Process results
      const successTokens: string[] = [];
      const failedTokens: string[] = [];

      response.responses.forEach((resp, idx) => {
        if (resp.success) {
          successTokens.push(devices[idx].deviceToken);
        } else {
          failedTokens.push(devices[idx].deviceToken);
          logError('Failed to send notification', {
            token: devices[idx].deviceToken,
            error: resp.error?.message
          });

          // Remove invalid tokens
          if (resp.error?.code === 'messaging/invalid-registration-token' ||
              resp.error?.code === 'messaging/registration-token-not-registered') {
            this.removeInvalidToken(userId, devices[idx].deviceToken);
          }
        }
      });

      logInfo('Push notifications sent', {
        userId,
        successCount: successTokens.length,
        failedCount: failedTokens.length
      });

      return successTokens;
    } catch (error) {
      logError('Failed to send push notification', error);
      return [];
    }
  }

  /**
   * Send notification to multiple users
   */
  static async sendToUsers(
    userIds: string[],
    notification: NotificationPayload,
    options?: admin.messaging.MessagingOptions
  ): Promise<Record<string, string[]>> {
    const results: Record<string, string[]> = {};

    // Process in batches to avoid overwhelming the service
    const batchSize = 100;
    for (let i = 0; i < userIds.length; i += batchSize) {
      const batch = userIds.slice(i, i + batchSize);
      
      await Promise.all(
        batch.map(async (userId) => {
          results[userId] = await this.sendToUser(userId, notification, options);
        })
      );
    }

    return results;
  }

  /**
   * Send topic notification
   */
  static async sendToTopic(
    topic: string,
    notification: NotificationPayload,
    options?: admin.messaging.MessagingOptions
  ): Promise<string> {
    if (!this.initialized) {
      throw new Error('Push notification service not initialized');
    }

    try {
      const message: admin.messaging.Message = {
        topic,
        notification: {
          title: notification.title,
          body: notification.body,
          imageUrl: notification.image
        },
        data: notification.data,
        ...options
      };

      const messageId = await admin.messaging(this.app).send(message);
      
      logInfo('Topic notification sent', { topic, messageId });
      
      return messageId;
    } catch (error) {
      logError('Failed to send topic notification', error);
      throw error;
    }
  }

  /**
   * Subscribe user to topic
   */
  static async subscribeToTopic(userId: string, topic: string): Promise<void> {
    if (!this.initialized) return;

    try {
      const user = await User.findByPk(userId);
      if (!user || !user.preferences?.devices) return;

      const tokens = user.preferences.devices
        .filter(d => d.deviceToken)
        .map(d => d.deviceToken);

      if (tokens.length > 0) {
        await admin.messaging(this.app).subscribeToTopic(tokens, topic);
        logInfo('User subscribed to topic', { userId, topic });
      }
    } catch (error) {
      logError('Failed to subscribe to topic', error);
    }
  }

  /**
   * Unsubscribe user from topic
   */
  static async unsubscribeFromTopic(userId: string, topic: string): Promise<void> {
    if (!this.initialized) return;

    try {
      const user = await User.findByPk(userId);
      if (!user || !user.preferences?.devices) return;

      const tokens = user.preferences.devices
        .filter(d => d.deviceToken)
        .map(d => d.deviceToken);

      if (tokens.length > 0) {
        await admin.messaging(this.app).unsubscribeFromTopic(tokens, topic);
        logInfo('User unsubscribed from topic', { userId, topic });
      }
    } catch (error) {
      logError('Failed to unsubscribe from topic', error);
    }
  }

  /**
   * Get user notification preferences
   */
  static async getUserPreferences(userId: string): Promise<NotificationPreferences> {
    const cacheKey = CACHE_KEYS.USER_NOTIFICATION_PREFS(userId);
    const cached = await cache.get<NotificationPreferences>(cacheKey);
    
    if (cached) {
      return cached;
    }

    const user = await User.findByPk(userId);
    const preferences: NotificationPreferences = user?.preferences?.notifications || {
      reservationReminders: true,
      reservationUpdates: true,
      promotionalOffers: true,
      restaurantUpdates: true,
      waitlistAlerts: true,
      reviewReminders: true
    };

    await cache.set(cacheKey, preferences, CACHE_TTL.LONG);
    
    return preferences;
  }

  /**
   * Update user notification preferences
   */
  static async updateUserPreferences(
    userId: string,
    preferences: Partial<NotificationPreferences>
  ): Promise<void> {
    const user = await User.findByPk(userId);
    if (!user) return;

    await user.update({
      preferences: {
        ...user.preferences,
        notifications: {
          ...user.preferences?.notifications,
          ...preferences
        }
      }
    });

    // Clear cache
    await cache.del(CACHE_KEYS.USER_NOTIFICATION_PREFS(userId));
    
    logInfo('Notification preferences updated', { userId });
  }

  /**
   * Send reservation reminder
   */
  static async sendReservationReminder(reservationId: string): Promise<void> {
    const Reservation = require('../models/Reservation').Reservation;
    const Restaurant = require('../models/Restaurant').Restaurant;

    const reservation = await Reservation.findByPk(reservationId, {
      include: [{ model: Restaurant, as: 'restaurant' }]
    });

    if (!reservation || reservation.status !== 'confirmed') return;

    const timeDiff = reservation.dateTime.getTime() - Date.now();
    const hoursUntil = Math.round(timeDiff / (1000 * 60 * 60));

    await this.sendToUser(reservation.userId, {
      title: 'Reservation Reminder',
      body: `Your reservation at ${reservation.restaurant.name} is in ${hoursUntil} hours`,
      data: {
        type: 'reservation_reminder',
        reservationId: reservation.id,
        restaurantId: reservation.restaurantId
      }
    });
  }

  /**
   * Send waitlist alert
   */
  static async sendWaitlistAlert(
    userId: string,
    restaurantName: string,
    availableTime: string
  ): Promise<void> {
    await this.sendToUser(userId, {
      title: 'Table Available!',
      body: `A table at ${restaurantName} is now available for ${availableTime}`,
      data: {
        type: 'waitlist_alert',
        action: 'book_now'
      },
      sound: 'urgent'
    });
  }

  /**
   * Check if notification should be sent based on preferences
   */
  private static shouldSendNotification(
    notification: NotificationPayload,
    preferences: NotificationPreferences
  ): boolean {
    // Check notification type
    const notificationType = notification.data?.type;
    
    if (notificationType) {
      switch (notificationType) {
        case 'reservation_reminder':
        case 'reservation_update':
          if (!preferences.reservationUpdates) return false;
          break;
        case 'promotional':
          if (!preferences.promotionalOffers) return false;
          break;
        case 'waitlist_alert':
          if (!preferences.waitlistAlerts) return false;
          break;
        case 'review_reminder':
          if (!preferences.reviewReminders) return false;
          break;
      }
    }

    // Check quiet hours
    if (preferences.quietHoursStart && preferences.quietHoursEnd) {
      const now = new Date();
      const currentTime = now.toTimeString().slice(0, 5);
      
      if (currentTime >= preferences.quietHoursStart && 
          currentTime <= preferences.quietHoursEnd) {
        // Only allow urgent notifications during quiet hours
        return notification.data?.priority === 'urgent';
      }
    }

    return true;
  }

  /**
   * Remove invalid device token
   */
  private static async removeInvalidToken(userId: string, deviceToken: string): Promise<void> {
    const user = await User.findByPk(userId);
    if (!user || !user.preferences?.devices) return;

    const filteredDevices = user.preferences.devices.filter(
      d => d.deviceToken !== deviceToken
    );

    await user.update({
      preferences: {
        ...user.preferences,
        devices: filteredDevices
      }
    });

    logInfo('Invalid device token removed', { userId, deviceToken });
  }

  /**
   * Send batch notifications efficiently
   */
  static async sendBatch(notifications: BatchNotification[]): Promise<void> {
    if (!this.initialized) return;

    const allMessages: admin.messaging.Message[] = [];

    for (const batch of notifications) {
      for (const userId of batch.userIds) {
        const user = await User.findByPk(userId);
        if (!user || !user.preferences?.devices) continue;

        const devices = user.preferences.devices.filter(d => d.deviceToken);
        
        devices.forEach(device => {
          allMessages.push({
            token: device.deviceToken,
            notification: {
              title: batch.notification.title,
              body: batch.notification.body
            },
            data: batch.notification.data,
            ...batch.options
          });
        });
      }
    }

    // Send in batches of 500 (FCM limit)
    const batchSize = 500;
    for (let i = 0; i < allMessages.length; i += batchSize) {
      const batch = allMessages.slice(i, i + batchSize);
      
      try {
        await admin.messaging(this.app).sendAll(batch);
      } catch (error) {
        logError('Failed to send batch notifications', error);
      }
    }
  }
}

// Initialize on module load if credentials are available
if (process.env.FIREBASE_PROJECT_ID) {
  PushNotificationService.initialize();
}