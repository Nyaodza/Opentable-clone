import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('notifications')
@Controller('notifications')
export class NotificationController {

  @Get('user/:userId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user notifications' })
  @ApiResponse({ status: 200 })
  async getUserNotifications(
    @Param('userId') userId: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
    @Query('unread') unread?: boolean,
    @Query('type') type?: string,
    @Req() req: any,
  ) {
    const notificationTypes = [
      'reservation_confirmed',
      'reservation_reminder',
      'reservation_cancelled',
      'loyalty_points_earned',
      'loyalty_tier_upgrade',
      'special_offer',
      'review_request',
      'payment_processed',
      'table_ready',
    ];

    const mockNotifications = Array.from({ length: limit }, (_, idx) => {
      const notifType = type || notificationTypes[Math.floor(Math.random() * notificationTypes.length)];
      const isRead = unread === true ? false : Math.random() > 0.4;

      return {
        id: `notification-${idx}`,
        userId,
        type: notifType,
        title: this.getNotificationTitle(notifType),
        message: this.getNotificationMessage(notifType, idx),
        data: this.getNotificationData(notifType, idx),
        isRead,
        priority: ['low', 'medium', 'high'][Math.floor(Math.random() * 3)],
        channel: ['push', 'email', 'sms'][Math.floor(Math.random() * 3)],
        scheduledFor: null,
        sentAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
        readAt: isRead ? new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000) : null,
        createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
      };
    });

    return {
      success: true,
      data: {
        notifications: mockNotifications,
        pagination: {
          page,
          limit,
          total: 125,
          totalPages: Math.ceil(125 / limit),
        },
        unreadCount: mockNotifications.filter(n => !n.isRead).length,
      },
    };
  }

  @Put(':notificationId/read')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Mark notification as read' })
  @ApiResponse({ status: 200 })
  async markAsRead(@Param('notificationId') notificationId: string, @Req() req: any) {
    return {
      success: true,
      data: {
        notificationId,
        readAt: new Date(),
      },
      message: 'Notification marked as read',
    };
  }

  @Put('user/:userId/read-all')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Mark all notifications as read' })
  @ApiResponse({ status: 200 })
  async markAllAsRead(@Param('userId') userId: string, @Req() req: any) {
    return {
      success: true,
      data: {
        userId,
        markedCount: 15,
        readAt: new Date(),
      },
      message: 'All notifications marked as read',
    };
  }

  @Delete(':notificationId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete notification' })
  @ApiResponse({ status: 200 })
  async deleteNotification(@Param('notificationId') notificationId: string, @Req() req: any) {
    return {
      success: true,
      message: 'Notification deleted successfully',
    };
  }

  @Post('send')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('restaurant_owner', 'restaurant_staff', 'admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Send notification to user' })
  @ApiResponse({ status: 201 })
  async sendNotification(
    @Body() body: {
      userId: string;
      type: string;
      title: string;
      message: string;
      data?: any;
      channel?: string[];
      priority?: 'low' | 'medium' | 'high';
      scheduledFor?: Date;
    },
    @Req() req: any,
  ) {
    const notification = {
      id: 'notification-' + Date.now(),
      userId: body.userId,
      type: body.type,
      title: body.title,
      message: body.message,
      data: body.data || {},
      priority: body.priority || 'medium',
      channel: body.channel || ['push'],
      scheduledFor: body.scheduledFor,
      sentBy: req.user.sub,
      sentAt: body.scheduledFor ? null : new Date(),
      createdAt: new Date(),
    };

    return {
      success: true,
      data: notification,
      message: 'Notification sent successfully',
    };
  }

  @Post('bulk-send')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('restaurant_owner', 'admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Send bulk notifications' })
  @ApiResponse({ status: 201 })
  async sendBulkNotifications(
    @Body() body: {
      userIds: string[];
      type: string;
      title: string;
      message: string;
      data?: any;
      channel?: string[];
      priority?: 'low' | 'medium' | 'high';
      scheduledFor?: Date;
    },
    @Req() req: any,
  ) {
    return {
      success: true,
      data: {
        batchId: 'batch-' + Date.now(),
        recipientCount: body.userIds.length,
        scheduledFor: body.scheduledFor,
        estimatedDelivery: body.scheduledFor || new Date(),
      },
      message: `Bulk notification scheduled for ${body.userIds.length} recipients`,
    };
  }

  @Get('templates')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('restaurant_owner', 'restaurant_staff', 'admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get notification templates' })
  @ApiResponse({ status: 200 })
  async getTemplates() {
    const templates = [
      {
        id: 'reservation_confirmed',
        name: 'Reservation Confirmed',
        title: 'Reservation Confirmed at {{restaurantName}}',
        message: 'Your reservation for {{partySize}} on {{date}} at {{time}} has been confirmed.',
        variables: ['restaurantName', 'partySize', 'date', 'time'],
        category: 'reservation',
      },
      {
        id: 'reservation_reminder',
        name: 'Reservation Reminder',
        title: 'Reminder: Your reservation is tomorrow',
        message: 'Don\'t forget about your reservation at {{restaurantName}} tomorrow at {{time}}.',
        variables: ['restaurantName', 'time'],
        category: 'reservation',
      },
      {
        id: 'loyalty_points_earned',
        name: 'Loyalty Points Earned',
        title: 'You earned {{points}} points!',
        message: 'Thanks for dining with us! You earned {{points}} loyalty points.',
        variables: ['points'],
        category: 'loyalty',
      },
      {
        id: 'special_offer',
        name: 'Special Offer',
        title: 'Special offer just for you!',
        message: '{{offerDescription}} - Use code {{promoCode}} by {{expiryDate}}.',
        variables: ['offerDescription', 'promoCode', 'expiryDate'],
        category: 'marketing',
      },
    ];

    return {
      success: true,
      data: templates,
    };
  }

  @Get('preferences/:userId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user notification preferences' })
  @ApiResponse({ status: 200 })
  async getPreferences(@Param('userId') userId: string, @Req() req: any) {
    return {
      success: true,
      data: {
        userId,
        preferences: {
          reservationConfirmation: {
            push: true,
            email: true,
            sms: false,
          },
          reservationReminder: {
            push: true,
            email: false,
            sms: true,
          },
          loyaltyUpdates: {
            push: true,
            email: true,
            sms: false,
          },
          specialOffers: {
            push: false,
            email: true,
            sms: false,
          },
          reviewRequests: {
            push: true,
            email: false,
            sms: false,
          },
          tableReady: {
            push: true,
            email: false,
            sms: true,
          },
        },
        doNotDisturb: {
          enabled: false,
          startTime: '22:00',
          endTime: '08:00',
        },
        quietHours: {
          enabled: true,
          startTime: '21:00',
          endTime: '09:00',
        },
      },
    };
  }

  @Put('preferences/:userId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update notification preferences' })
  @ApiResponse({ status: 200 })
  async updatePreferences(
    @Param('userId') userId: string,
    @Body() body: any,
    @Req() req: any,
  ) {
    return {
      success: true,
      data: {
        userId,
        preferences: body,
        updatedAt: new Date(),
      },
      message: 'Notification preferences updated successfully',
    };
  }

  @Get('analytics/restaurant/:restaurantId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('restaurant_owner', 'restaurant_staff', 'admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get notification analytics' })
  @ApiResponse({ status: 200 })
  async getAnalytics(@Param('restaurantId') restaurantId: string) {
    return {
      success: true,
      data: {
        totalSent: 1250,
        totalDelivered: 1180,
        totalOpened: 945,
        totalClicked: 234,
        deliveryRate: 94.4,
        openRate: 80.1,
        clickRate: 24.8,
        byChannel: {
          push: {
            sent: 750,
            delivered: 720,
            opened: 580,
            clicked: 145,
          },
          email: {
            sent: 400,
            delivered: 380,
            opened: 285,
            clicked: 78,
          },
          sms: {
            sent: 100,
            delivered: 80,
            opened: 80,
            clicked: 11,
          },
        },
        byType: {
          reservation_confirmed: { sent: 300, opened: 285 },
          reservation_reminder: { sent: 280, opened: 260 },
          loyalty_points_earned: { sent: 150, opened: 120 },
          special_offer: { sent: 200, opened: 140 },
          review_request: { sent: 180, opened: 90 },
          table_ready: { sent: 140, opened: 50 },
        },
        trending: {
          thisWeek: 1250,
          lastWeek: 1180,
          change: '+5.9%',
        },
        engagement: [
          { day: 'Mon', sent: 180, opened: 145 },
          { day: 'Tue', sent: 160, opened: 128 },
          { day: 'Wed', sent: 200, opened: 160 },
          { day: 'Thu', sent: 220, opened: 176 },
          { day: 'Fri', sent: 250, opened: 200 },
          { day: 'Sat', sent: 150, opened: 90 },
          { day: 'Sun', { sent: 90, opened: 46 },
        ],
      },
    };
  }

  @Post('device-token')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Register device token for push notifications' })
  @ApiResponse({ status: 201 })
  async registerDeviceToken(
    @Body() body: {
      token: string;
      platform: 'ios' | 'android' | 'web';
      deviceId?: string;
    },
    @Req() req: any,
  ) {
    return {
      success: true,
      data: {
        userId: req.user.sub,
        token: body.token,
        platform: body.platform,
        deviceId: body.deviceId,
        registeredAt: new Date(),
      },
      message: 'Device token registered successfully',
    };
  }

  private getNotificationTitle(type: string): string {
    const titles = {
      reservation_confirmed: 'Reservation Confirmed',
      reservation_reminder: 'Reservation Reminder',
      reservation_cancelled: 'Reservation Cancelled',
      loyalty_points_earned: 'Points Earned!',
      loyalty_tier_upgrade: 'Tier Upgrade!',
      special_offer: 'Special Offer',
      review_request: 'How was your experience?',
      payment_processed: 'Payment Processed',
      table_ready: 'Your table is ready!',
    };
    return titles[type] || 'Notification';
  }

  private getNotificationMessage(type: string, idx: number): string {
    const messages = {
      reservation_confirmed: `Your reservation at Restaurant ${idx + 1} has been confirmed for tomorrow at 7:00 PM.`,
      reservation_reminder: `Don't forget about your reservation at Restaurant ${idx + 1} in 1 hour.`,
      reservation_cancelled: `Your reservation at Restaurant ${idx + 1} has been cancelled.`,
      loyalty_points_earned: `You earned ${Math.floor(Math.random() * 500) + 100} points from your recent visit!`,
      loyalty_tier_upgrade: 'Congratulations! You\'ve been upgraded to Gold tier.',
      special_offer: `Get 20% off your next meal at Restaurant ${idx + 1}. Valid until next week.`,
      review_request: `How was your experience at Restaurant ${idx + 1}? Leave a review and earn points!`,
      payment_processed: `Your payment of $${(Math.random() * 100 + 20).toFixed(2)} has been processed successfully.`,
      table_ready: `Your table for ${Math.floor(Math.random() * 6) + 2} is ready at Restaurant ${idx + 1}.`,
    };
    return messages[type] || 'You have a new notification.';
  }

  private getNotificationData(type: string, idx: number): any {
    const data = {
      reservation_confirmed: {
        reservationId: `reservation-${idx}`,
        restaurantId: `restaurant-${idx}`,
        restaurantName: `Restaurant ${idx + 1}`,
        date: new Date(Date.now() + 24 * 60 * 60 * 1000),
        partySize: Math.floor(Math.random() * 6) + 2,
      },
      loyalty_points_earned: {
        points: Math.floor(Math.random() * 500) + 100,
        newBalance: Math.floor(Math.random() * 3000) + 500,
      },
      special_offer: {
        promoCode: 'SAVE20',
        discount: 20,
        expiryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    };
    return data[type] || {};
  }
}