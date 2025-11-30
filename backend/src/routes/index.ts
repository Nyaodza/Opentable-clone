import { Router } from 'express';
import authRoutes from './auth.routes';
import userRoutes from './user.routes';
import restaurantRoutes from './restaurant.routes';
import bookingRoutes from './booking.routes';
import reviewRoutes from './review.routes';
import searchRoutes from './search.routes';
import paymentRoutes from './payment.routes';
import loyaltyRoutes from './loyalty.routes';
import notificationRoutes from './notification.routes';
import adminRoutes from './admin.routes';

const router = Router();

// Health check
router.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV
  });
});

// API version
router.get('/version', (req, res) => {
  res.json({
    version: '1.0.0',
    api: 'OpenTable Clone API',
    documentation: '/api-docs'
  });
});

// Mount routes
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/restaurants', restaurantRoutes);
router.use('/bookings', bookingRoutes);
router.use('/reviews', reviewRoutes);
router.use('/search', searchRoutes);
router.use('/payments', paymentRoutes);
router.use('/loyalty', loyaltyRoutes);
router.use('/notifications', notificationRoutes);
router.use('/admin', adminRoutes);

// 404 handler
router.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'API endpoint not found',
    path: req.originalUrl
  });
});

export default router;