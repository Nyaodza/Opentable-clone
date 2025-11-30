import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import {
  getDashboardStats,
  getUsers,
  updateUser,
  getRestaurants,
  updateRestaurantStatus,
  getAnalytics,
  getReports,
  updatePlatformSettings,
  getAlerts
} from '../controllers/admin.controller';

const router = Router();

// All admin routes require authentication
router.use(authenticate);

// Dashboard and statistics
router.get('/dashboard/stats', getDashboardStats);
router.get('/alerts', getAlerts);

// User management
router.get('/users', getUsers);
router.put('/users/:id', updateUser);

// Restaurant management
router.get('/restaurants', getRestaurants);
router.put('/restaurants/:id/status', updateRestaurantStatus);

// Analytics and reporting
router.get('/analytics', getAnalytics);
router.get('/reports', getReports);

// Platform settings
router.put('/settings', updatePlatformSettings);

export default router;