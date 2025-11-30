import { Request, Response, NextFunction } from 'express';
import { NotificationService } from '../services/notification.service';
import { logInfo } from '../utils/logger';

export const getUserNotifications = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page = 1, limit = 20, unreadOnly } = req.query;

    const notifications = await NotificationService.getUserNotifications(
      req.user!.id,
      {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        unreadOnly: unreadOnly === 'true'
      }
    );

    res.json({
      success: true,
      data: notifications
    });
  } catch (error) {
    next(error);
  }
};

export const markAsRead = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { notificationId } = req.params;

    const notification = await NotificationService.markAsRead(
      notificationId,
      req.user!.id
    );

    res.json({
      success: true,
      data: notification
    });
  } catch (error) {
    next(error);
  }
};

export const markAllAsRead = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const count = await NotificationService.markAllAsRead(req.user!.id);

    res.json({
      success: true,
      message: `${count} notifications marked as read`
    });
  } catch (error) {
    next(error);
  }
};

export const deleteNotification = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { notificationId } = req.params;

    await NotificationService.deleteNotification(
      notificationId,
      req.user!.id
    );

    res.json({
      success: true,
      message: 'Notification deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

export const getUnreadCount = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const count = await NotificationService.getUnreadCount(req.user!.id);

    res.json({
      success: true,
      data: { count }
    });
  } catch (error) {
    next(error);
  }
};

export const updatePreferences = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const preferences = await NotificationService.updatePreferences(
      req.user!.id,
      req.body
    );

    res.json({
      success: true,
      data: preferences
    });
  } catch (error) {
    next(error);
  }
};

export const subscribeToRestaurant = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { restaurantId } = req.params;

    await NotificationService.subscribeToRestaurant(
      req.user!.id,
      restaurantId
    );

    res.json({
      success: true,
      message: 'Successfully subscribed to restaurant notifications'
    });
  } catch (error) {
    next(error);
  }
};

export const unsubscribeFromRestaurant = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { restaurantId } = req.params;

    await NotificationService.unsubscribeFromRestaurant(
      req.user!.id,
      restaurantId
    );

    res.json({
      success: true,
      message: 'Successfully unsubscribed from restaurant notifications'
    });
  } catch (error) {
    next(error);
  }
};

export const sendTestNotification = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { type, channel } = req.body;

    await NotificationService.sendTestNotification(
      req.user!.id,
      type || 'test',
      channel || 'email'
    );

    logInfo('Test notification sent', {
      userId: req.user!.id,
      type,
      channel
    });

    res.json({
      success: true,
      message: 'Test notification sent successfully'
    });
  } catch (error) {
    next(error);
  }
};