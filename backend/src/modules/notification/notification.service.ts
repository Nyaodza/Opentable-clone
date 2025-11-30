import { Injectable } from '@nestjs/common';

@Injectable()
export class NotificationService {
  async getUserNotifications(userId: string, filters: any) {
    // Mock implementation
    return {
      notifications: [],
      unreadCount: 0,
    };
  }

  async markAsRead(notificationId: string) {
    // Mock implementation
    return {
      notificationId,
      readAt: new Date(),
    };
  }

  async sendNotification(notification: any) {
    // Mock implementation
    return {
      id: 'notification-' + Date.now(),
      ...notification,
      sentAt: new Date(),
    };
  }
}