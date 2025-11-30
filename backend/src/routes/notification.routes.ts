import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import * as notificationController from '../controllers/notification.controller';
import { validateRequest } from '../middleware/validation.middleware';
import { body, query, param } from 'express-validator';

const router = Router();

// All notification routes require authentication
router.use(authenticate);

// Get user notifications
router.get(
  '/',
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('unreadOnly').optional().isBoolean()
  ],
  validateRequest,
  notificationController.getUserNotifications
);

// Get unread count
router.get('/unread-count', notificationController.getUnreadCount);

// Update notification preferences
router.put(
  '/preferences',
  [
    body('email').optional().isBoolean(),
    body('push').optional().isBoolean(),
    body('sms').optional().isBoolean(),
    body('bookingReminders').optional().isBoolean(),
    body('promotions').optional().isBoolean(),
    body('restaurantUpdates').optional().isBoolean(),
    body('reviewResponses').optional().isBoolean()
  ],
  validateRequest,
  notificationController.updatePreferences
);

// Subscribe to restaurant notifications
router.post(
  '/subscribe/:restaurantId',
  [param('restaurantId').isUUID()],
  validateRequest,
  notificationController.subscribeToRestaurant
);

// Unsubscribe from restaurant notifications
router.delete(
  '/subscribe/:restaurantId',
  [param('restaurantId').isUUID()],
  validateRequest,
  notificationController.unsubscribeFromRestaurant
);

// Mark notification as read
router.patch(
  '/:notificationId/read',
  [param('notificationId').isUUID()],
  validateRequest,
  notificationController.markAsRead
);

// Mark all notifications as read
router.patch('/read-all', notificationController.markAllAsRead);

// Delete notification
router.delete(
  '/:notificationId',
  [param('notificationId').isUUID()],
  validateRequest,
  notificationController.deleteNotification
);

// Send test notification (development only)
if (process.env.NODE_ENV === 'development') {
  router.post(
    '/test',
    [
      body('type').optional().isIn(['email', 'push', 'sms']),
      body('channel').optional().isString()
    ],
    validateRequest,
    notificationController.sendTestNotification
  );
}

export default router;