import { Router } from 'express';
import * as mobileController from '../controllers/mobile.controller';
import { authenticate } from '../middleware/auth.middleware';
import { validateBody, validateQuery } from '../validators/common.validators';
import * as yup from 'yup';

const router = Router();

// Validation schemas
const deviceRegistrationSchema = yup.object().shape({
  deviceToken: yup.string().required('Device token is required'),
  platform: yup.string().oneOf(['ios', 'android'], 'Invalid platform').required(),
  deviceModel: yup.string().optional(),
  appVersion: yup.string().optional(),
  osVersion: yup.string().optional(),
  language: yup.string().optional(),
  timezone: yup.string().optional()
});

const locationUpdateSchema = yup.object().shape({
  latitude: yup.number()
    .required('Latitude is required')
    .min(-90, 'Invalid latitude')
    .max(90, 'Invalid latitude'),
  longitude: yup.number()
    .required('Longitude is required')
    .min(-180, 'Invalid longitude')
    .max(180, 'Invalid longitude'),
  accuracy: yup.number().optional()
});

const nearbySearchSchema = yup.object().shape({
  latitude: yup.number().min(-90).max(90).optional(),
  longitude: yup.number().min(-180).max(180).optional(),
  radius: yup.number().min(1).max(50).optional(),
  quickFilters: yup.string().optional(),
  sortBy: yup.string().oneOf(['nearest', 'rating', 'trending']).optional()
});

const appEventSchema = yup.object().shape({
  event: yup.string().required('Event name is required'),
  properties: yup.object().optional()
});

const testNotificationSchema = yup.object().shape({
  title: yup.string().optional(),
  body: yup.string().optional(),
  data: yup.object().optional()
});

/**
 * @route   POST /api/mobile/device/register
 * @desc    Register device for push notifications
 * @access  Private
 */
router.post(
  '/device/register',
  authenticate,
  validateBody(deviceRegistrationSchema),
  mobileController.registerDevice
);

/**
 * @route   POST /api/mobile/device/unregister
 * @desc    Unregister device
 * @access  Private
 */
router.post(
  '/device/unregister',
  authenticate,
  validateBody(yup.object().shape({
    deviceToken: yup.string().required()
  })),
  mobileController.unregisterDevice
);

/**
 * @route   POST /api/mobile/location/update
 * @desc    Update user location
 * @access  Private
 */
router.post(
  '/location/update',
  authenticate,
  validateBody(locationUpdateSchema),
  mobileController.updateLocation
);

/**
 * @route   GET /api/mobile/restaurants/nearby
 * @desc    Get nearby restaurants optimized for mobile
 * @access  Private
 */
router.get(
  '/restaurants/nearby',
  authenticate,
  validateQuery(nearbySearchSchema),
  mobileController.getNearbyRestaurants
);

/**
 * @route   GET /api/mobile/home/feed
 * @desc    Get personalized home feed
 * @access  Private
 */
router.get(
  '/home/feed',
  authenticate,
  mobileController.getHomeFeed
);

/**
 * @route   POST /api/mobile/restaurants/:restaurantId/view
 * @desc    Track restaurant view
 * @access  Private
 */
router.post(
  '/restaurants/:restaurantId/view',
  authenticate,
  mobileController.trackRestaurantView
);

/**
 * @route   GET /api/mobile/restaurants/:restaurantId/quick-slots
 * @desc    Get quick reservation slots
 * @access  Public
 */
router.get(
  '/restaurants/:restaurantId/quick-slots',
  validateQuery(yup.object().shape({
    partySize: yup.number().required().min(1).max(50)
  })),
  mobileController.getQuickReservationSlots
);

/**
 * @route   POST /api/mobile/events/track
 * @desc    Track app events for analytics
 * @access  Private
 */
router.post(
  '/events/track',
  authenticate,
  validateBody(appEventSchema),
  mobileController.trackAppEvent
);

/**
 * @route   POST /api/mobile/notifications/test
 * @desc    Send test push notification
 * @access  Private
 */
router.post(
  '/notifications/test',
  authenticate,
  validateBody(testNotificationSchema),
  mobileController.testPushNotification
);

/**
 * @route   GET /api/mobile/notifications/preferences
 * @desc    Get notification preferences
 * @access  Private
 */
router.get(
  '/notifications/preferences',
  authenticate,
  mobileController.getNotificationPreferences
);

/**
 * @route   PUT /api/mobile/notifications/preferences
 * @desc    Update notification preferences
 * @access  Private
 */
router.put(
  '/notifications/preferences',
  authenticate,
  validateBody(yup.object().shape({
    reservationReminders: yup.boolean().optional(),
    reservationUpdates: yup.boolean().optional(),
    promotionalOffers: yup.boolean().optional(),
    restaurantUpdates: yup.boolean().optional(),
    waitlistAlerts: yup.boolean().optional(),
    reviewReminders: yup.boolean().optional(),
    quietHoursStart: yup.string().matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
    quietHoursEnd: yup.string().matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
    preferredLanguage: yup.string().optional()
  })),
  mobileController.updateNotificationPreferences
);

export default router;