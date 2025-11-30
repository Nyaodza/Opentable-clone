import { Request, Response } from 'express';
import { MobileService } from '../services/mobile.service';
import { asyncHandler } from '../middleware/errorHandler';
import { PushNotificationService } from '../services/push-notification.service';

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    role: string;
  };
}

/**
 * Register device for push notifications
 */
export const registerDevice = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const { deviceToken, platform, deviceModel, appVersion, osVersion, language, timezone } = req.body;

  await MobileService.registerDevice({
    userId,
    deviceToken,
    platform,
    deviceModel,
    appVersion,
    osVersion,
    language,
    timezone
  });

  res.json({
    success: true,
    message: 'Device registered successfully'
  });
});

/**
 * Unregister device
 */
export const unregisterDevice = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const { deviceToken } = req.body;

  await MobileService.unregisterDevice(userId, deviceToken);

  res.json({
    success: true,
    message: 'Device unregistered successfully'
  });
});

/**
 * Update user location
 */
export const updateLocation = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const { latitude, longitude, accuracy } = req.body;

  await MobileService.updateLocation({
    userId,
    latitude,
    longitude,
    accuracy,
    timestamp: new Date()
  });

  res.json({
    success: true,
    message: 'Location updated successfully'
  });
});

/**
 * Get nearby restaurants
 */
export const getNearbyRestaurants = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const { latitude, longitude, radius, quickFilters, sortBy } = req.query;

  const filters = {
    latitude: latitude ? parseFloat(latitude as string) : undefined,
    longitude: longitude ? parseFloat(longitude as string) : undefined,
    radius: radius ? parseFloat(radius as string) : undefined,
    quickFilters: quickFilters ? (quickFilters as string).split(',') : undefined,
    sortBy: sortBy as 'nearest' | 'rating' | 'trending' | undefined
  };

  const result = await MobileService.getNearbyRestaurants(userId, filters);

  res.json({
    success: true,
    data: result
  });
});

/**
 * Get home feed
 */
export const getHomeFeed = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;

  const feed = await MobileService.getHomeFeed(userId);

  res.json({
    success: true,
    data: feed
  });
});

/**
 * Track restaurant view
 */
export const trackRestaurantView = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const { restaurantId } = req.params;

  await MobileService.trackRestaurantView(userId, restaurantId);

  res.json({
    success: true,
    message: 'View tracked successfully'
  });
});

/**
 * Get quick reservation slots
 */
export const getQuickReservationSlots = asyncHandler(async (req: Request, res: Response) => {
  const { restaurantId } = req.params;
  const { partySize } = req.query;

  const slots = await MobileService.getQuickReservationSlots(
    restaurantId,
    parseInt(partySize as string, 10)
  );

  res.json({
    success: true,
    data: slots
  });
});

/**
 * Track app event
 */
export const trackAppEvent = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const { event, properties } = req.body;

  await MobileService.trackAppEvent(userId, event, properties);

  res.json({
    success: true,
    message: 'Event tracked successfully'
  });
});

/**
 * Test push notification
 */
export const testPushNotification = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const { title, body, data } = req.body;

  await PushNotificationService.sendToUser(userId, {
    title: title || 'Test Notification',
    body: body || 'This is a test push notification',
    data: data || {}
  });

  res.json({
    success: true,
    message: 'Test notification sent'
  });
});

/**
 * Get notification preferences
 */
export const getNotificationPreferences = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;

  const preferences = await PushNotificationService.getUserPreferences(userId);

  res.json({
    success: true,
    data: preferences
  });
});

/**
 * Update notification preferences
 */
export const updateNotificationPreferences = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const preferences = req.body;

  await PushNotificationService.updateUserPreferences(userId, preferences);

  res.json({
    success: true,
    message: 'Notification preferences updated'
  });
});