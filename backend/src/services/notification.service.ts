import { Op } from 'sequelize';
import { User } from '../models/User';
import { Restaurant } from '../models/Restaurant';
import { Reservation } from '../models/Reservation';
import { EmailService } from './email.service';
import { logInfo, logError } from '../utils/logger';
import { cache, CACHE_KEYS } from '../config/redis';
import * as webpush from 'web-push';
import * as twilio from 'twilio';

// Configure push notifications
webpush.setVapidDetails(
  'mailto:' + process.env.PUSH_NOTIFICATION_EMAIL,
  process.env.VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

// Configure Twilio for SMS
const twilioClient = process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN
  ? twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
  : null;

export enum NotificationType {
  RESERVATION_CONFIRMATION = 'reservation_confirmation',
  RESERVATION_REMINDER = 'reservation_reminder',
  RESERVATION_CANCELLED = 'reservation_cancelled',
  RESERVATION_MODIFIED = 'reservation_modified',
  TABLE_READY = 'table_ready',
  REVIEW_REQUEST = 'review_request',
  WAITLIST_AVAILABLE = 'waitlist_available',
  PROMOTIONAL = 'promotional',
  RESTAURANT_UPDATE = 'restaurant_update',
  LOYALTY_POINTS = 'loyalty_points'
}

export enum NotificationChannel {
  EMAIL = 'email',
  SMS = 'sms',
  PUSH = 'push',
  IN_APP = 'in_app'
}

interface NotificationData {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: any;
  channels?: NotificationChannel[];
  priority?: 'high' | 'normal' | 'low';
  scheduledFor?: Date;
}

interface UserNotificationPreferences {
  email: boolean;
  sms: boolean;
  push: boolean;
  inApp: boolean;
  reservationReminders: boolean;
  marketingEmails: boolean;
  reviewRequests: boolean;
  quietHoursStart?: string;
  quietHoursEnd?: string;
}

export class NotificationService {
  /**
   * Send notification to user
   */
  static async sendNotification(data: NotificationData): Promise<void> {
    try {
      const user = await User.findByPk(data.userId);
      if (!user) {
        logError('User not found for notification', { userId: data.userId });
        return;
      }

      // Get user preferences
      const preferences = await this.getUserNotificationPreferences(data.userId);

      // Determine channels to use
      const channels = data.channels || this.getDefaultChannels(data.type);

      // Check quiet hours
      if (this.isInQuietHours(preferences)) {
        // Schedule for later unless high priority
        if (data.priority !== 'high') {
          await this.scheduleNotification(data, this.getEndOfQuietHours(preferences));
          return;
        }
      }

      // Send through each channel
      const promises = [];

      if (channels.includes(NotificationChannel.EMAIL) && preferences.email) {
        promises.push(this.sendEmail(user, data));
      }

      if (channels.includes(NotificationChannel.SMS) && preferences.sms && user.phone) {
        promises.push(this.sendSMS(user, data));
      }

      if (channels.includes(NotificationChannel.PUSH) && preferences.push) {
        promises.push(this.sendPushNotification(user, data));
      }

      if (channels.includes(NotificationChannel.IN_APP) && preferences.inApp) {
        promises.push(this.saveInAppNotification(user, data));
      }

      await Promise.allSettled(promises);

      logInfo('Notification sent', {
        userId: data.userId,
        type: data.type,
        channels: channels.length
      });
    } catch (error) {
      logError('Failed to send notification', error);
    }
  }

  /**
   * Send email notification
   */
  private static async sendEmail(user: User, data: NotificationData): Promise<void> {
    switch (data.type) {
      case NotificationType.RESERVATION_CONFIRMATION:
        await EmailService.sendReservationConfirmation(user.email, data.data);
        break;
      case NotificationType.RESERVATION_REMINDER:
        await EmailService.sendReservationReminder(user.email, data.data);
        break;
      case NotificationType.RESERVATION_CANCELLED:
        await EmailService.sendReservationCancellation(user.email, data.data);
        break;
      case NotificationType.REVIEW_REQUEST:
        await EmailService.sendReviewRequest(user.email, data.data);
        break;
      default:
        await EmailService.sendGenericNotification(user.email, {
          subject: data.title,
          message: data.message,
          ...data.data
        });
    }
  }

  /**
   * Send SMS notification
   */
  private static async sendSMS(user: User, data: NotificationData): Promise<void> {
    if (!twilioClient || !user.phone || !user.phoneVerified) {
      return;
    }

    try {
      await twilioClient.messages.create({
        body: data.message,
        to: user.phone,
        from: process.env.TWILIO_PHONE_NUMBER
      });

      logInfo('SMS sent', { userId: user.id, type: data.type });
    } catch (error) {
      logError('Failed to send SMS', error);
    }
  }

  /**
   * Send push notification
   */
  private static async sendPushNotification(user: User, data: NotificationData): Promise<void> {
    const subscriptions = await this.getUserPushSubscriptions(user.id);

    if (subscriptions.length === 0) {
      return;
    }

    const payload = JSON.stringify({
      title: data.title,
      body: data.message,
      icon: '/icon-192x192.png',
      badge: '/badge-72x72.png',
      data: {
        type: data.type,
        ...data.data
      }
    });

    const promises = subscriptions.map(subscription =>
      webpush.sendNotification(subscription, payload).catch(error => {
        if (error.statusCode === 410) {
          // Subscription expired, remove it
          this.removePushSubscription(user.id, subscription.endpoint);
        }
        logError('Failed to send push notification', error);
      })
    );

    await Promise.allSettled(promises);
  }

  /**
   * Save in-app notification
   */
  private static async saveInAppNotification(user: User, data: NotificationData): Promise<void> {
    const notifications = await this.getUserInAppNotifications(user.id);
    
    notifications.push({
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: data.type,
      title: data.title,
      message: data.message,
      data: data.data,
      read: false,
      createdAt: new Date()
    });

    // Keep only last 50 notifications
    if (notifications.length > 50) {
      notifications.splice(0, notifications.length - 50);
    }

    await cache.set(
      CACHE_KEYS.USER_NOTIFICATIONS(user.id),
      notifications,
      60 * 60 * 24 * 30 // 30 days
    );
  }

  /**
   * Get user notification preferences
   */
  static async getUserNotificationPreferences(userId: string): Promise<UserNotificationPreferences> {
    const user = await User.findByPk(userId);
    
    return {
      email: user?.preferences?.notifications?.email !== false,
      sms: user?.preferences?.notifications?.sms !== false,
      push: user?.preferences?.notifications?.push !== false,
      inApp: user?.preferences?.notifications?.inApp !== false,
      reservationReminders: user?.preferences?.notifications?.reservationReminders !== false,
      marketingEmails: user?.preferences?.notifications?.marketingEmails !== false,
      reviewRequests: user?.preferences?.notifications?.reviewRequests !== false,
      quietHoursStart: user?.preferences?.notifications?.quietHoursStart,
      quietHoursEnd: user?.preferences?.notifications?.quietHoursEnd
    };
  }

  /**
   * Update user notification preferences
   */
  static async updateUserNotificationPreferences(
    userId: string,
    preferences: Partial<UserNotificationPreferences>
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

    logInfo('Notification preferences updated', { userId });
  }

  /**
   * Subscribe to push notifications
   */
  static async subscribeToPushNotifications(
    userId: string,
    subscription: webpush.PushSubscription
  ): Promise<void> {
    const subscriptions = await this.getUserPushSubscriptions(userId);
    
    // Check if already subscribed
    const exists = subscriptions.some(sub => sub.endpoint === subscription.endpoint);
    if (!exists) {
      subscriptions.push(subscription);
      await cache.set(
        CACHE_KEYS.USER_PUSH_SUBSCRIPTIONS(userId),
        subscriptions,
        60 * 60 * 24 * 365 // 1 year
      );
    }

    logInfo('Push subscription added', { userId });
  }

  /**
   * Send reservation reminders
   */
  static async sendReservationReminders(): Promise<void> {
    // Get reservations happening in the next 24 hours
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    const reservations = await Reservation.findAll({
      where: {
        dateTime: {
          [Op.between]: [new Date(), tomorrow]
        },
        status: 'confirmed',
        reminderSent: false
      },
      include: [
        { model: User, as: 'user' },
        { model: Restaurant, as: 'restaurant' }
      ]
    });

    for (const reservation of reservations) {
      // Check if user wants reminders
      const preferences = await this.getUserNotificationPreferences(reservation.userId);
      
      if (preferences.reservationReminders) {
        await this.sendNotification({
          userId: reservation.userId,
          type: NotificationType.RESERVATION_REMINDER,
          title: 'Reservation Reminder',
          message: `Don't forget your reservation at ${reservation.restaurant.name} tomorrow!`,
          data: {
            reservationId: reservation.id,
            restaurantName: reservation.restaurant.name,
            dateTime: reservation.dateTime,
            partySize: reservation.partySize,
            confirmationCode: reservation.confirmationCode
          },
          channels: [NotificationChannel.EMAIL, NotificationChannel.PUSH, NotificationChannel.SMS]
        });

        await reservation.update({ reminderSent: true });
      }
    }
  }

  /**
   * Send review requests
   */
  static async sendReviewRequests(): Promise<void> {
    // Get completed reservations from yesterday
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const dayBeforeYesterday = new Date();
    dayBeforeYesterday.setDate(dayBeforeYesterday.getDate() - 2);

    const reservations = await Reservation.findAll({
      where: {
        dateTime: {
          [Op.between]: [dayBeforeYesterday, yesterday]
        },
        status: 'completed',
        reviewRequestSent: false
      },
      include: [
        { model: User, as: 'user' },
        { model: Restaurant, as: 'restaurant' }
      ]
    });

    for (const reservation of reservations) {
      // Check if user wants review requests
      const preferences = await this.getUserNotificationPreferences(reservation.userId);
      
      if (preferences.reviewRequests) {
        await this.sendNotification({
          userId: reservation.userId,
          type: NotificationType.REVIEW_REQUEST,
          title: 'How was your experience?',
          message: `We'd love to hear about your experience at ${reservation.restaurant.name}`,
          data: {
            reservationId: reservation.id,
            restaurantName: reservation.restaurant.name,
            restaurantId: reservation.restaurantId
          },
          channels: [NotificationChannel.EMAIL, NotificationChannel.PUSH]
        });

        await reservation.update({ reviewRequestSent: true });
      }
    }
  }

  /**
   * Get default channels for notification type
   */
  private static getDefaultChannels(type: NotificationType): NotificationChannel[] {
    switch (type) {
      case NotificationType.RESERVATION_CONFIRMATION:
      case NotificationType.RESERVATION_CANCELLED:
        return [NotificationChannel.EMAIL, NotificationChannel.SMS, NotificationChannel.PUSH];
      case NotificationType.RESERVATION_REMINDER:
        return [NotificationChannel.EMAIL, NotificationChannel.PUSH, NotificationChannel.SMS];
      case NotificationType.TABLE_READY:
        return [NotificationChannel.SMS, NotificationChannel.PUSH];
      case NotificationType.REVIEW_REQUEST:
        return [NotificationChannel.EMAIL, NotificationChannel.PUSH];
      case NotificationType.PROMOTIONAL:
        return [NotificationChannel.EMAIL];
      default:
        return [NotificationChannel.EMAIL, NotificationChannel.PUSH];
    }
  }

  /**
   * Check if current time is in quiet hours
   */
  private static isInQuietHours(preferences: UserNotificationPreferences): boolean {
    if (!preferences.quietHoursStart || !preferences.quietHoursEnd) {
      return false;
    }

    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();
    
    const [startHour, startMin] = preferences.quietHoursStart.split(':').map(Number);
    const [endHour, endMin] = preferences.quietHoursEnd.split(':').map(Number);
    
    const startTime = startHour * 60 + startMin;
    const endTime = endHour * 60 + endMin;

    if (startTime <= endTime) {
      return currentTime >= startTime && currentTime <= endTime;
    } else {
      // Quiet hours span midnight
      return currentTime >= startTime || currentTime <= endTime;
    }
  }

  /**
   * Get end of quiet hours
   */
  private static getEndOfQuietHours(preferences: UserNotificationPreferences): Date {
    if (!preferences.quietHoursEnd) {
      return new Date();
    }

    const [hour, minute] = preferences.quietHoursEnd.split(':').map(Number);
    const endTime = new Date();
    endTime.setHours(hour, minute, 0, 0);

    if (endTime < new Date()) {
      endTime.setDate(endTime.getDate() + 1);
    }

    return endTime;
  }

  /**
   * Schedule notification for later
   */
  private static async scheduleNotification(data: NotificationData, scheduledFor: Date): Promise<void> {
    // In production, use a job queue like Bull or Agenda
    logInfo('Notification scheduled', {
      userId: data.userId,
      type: data.type,
      scheduledFor
    });
  }

  /**
   * Get user push subscriptions
   */
  private static async getUserPushSubscriptions(userId: string): Promise<webpush.PushSubscription[]> {
    const cached = await cache.get<webpush.PushSubscription[]>(
      CACHE_KEYS.USER_PUSH_SUBSCRIPTIONS(userId)
    );
    return cached || [];
  }

  /**
   * Remove push subscription
   */
  private static async removePushSubscription(userId: string, endpoint: string): Promise<void> {
    const subscriptions = await this.getUserPushSubscriptions(userId);
    const filtered = subscriptions.filter(sub => sub.endpoint !== endpoint);
    
    await cache.set(
      CACHE_KEYS.USER_PUSH_SUBSCRIPTIONS(userId),
      filtered,
      60 * 60 * 24 * 365
    );
  }

  /**
   * Get user in-app notifications
   */
  private static async getUserInAppNotifications(userId: string): Promise<any[]> {
    const cached = await cache.get<any[]>(CACHE_KEYS.USER_NOTIFICATIONS(userId));
    return cached || [];
  }

  /**
   * Mark notifications as read
   */
  static async markNotificationsAsRead(userId: string, notificationIds: string[]): Promise<void> {
    const notifications = await this.getUserInAppNotifications(userId);
    
    notifications.forEach(notification => {
      if (notificationIds.includes(notification.id)) {
        notification.read = true;
      }
    });

    await cache.set(
      CACHE_KEYS.USER_NOTIFICATIONS(userId),
      notifications,
      60 * 60 * 24 * 30
    );
  }
}