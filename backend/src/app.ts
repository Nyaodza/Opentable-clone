import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import { applySecurity, applyErrorHandling } from './config/security.config';
import { verifyCsrfToken, generateCsrfToken, getCsrfToken } from './middleware/csrf.middleware';
import { sanitizeRequest, detectSuspiciousPatterns, sanitizeFileUpload } from './middleware/sanitization.middleware';
import { applySecurityHeaders } from './middleware/security-headers.middleware';
import { validatePasswordMiddleware } from './middleware/password-policy.middleware';
import { initializeRedis } from './middleware/advanced-cache.middleware';
import { applyPerformanceOptimizations, getPerformanceConfigForEnvironment } from './config/performance.config';
import { setupSwagger } from './config/swagger.config';
import { setupMonitoring } from './config/monitoring.config';
import authRoutes from './routes/auth.routes';
import restaurantRoutes from './routes/restaurant.routes';
import reservationRoutes from './routes/reservation.routes';
import userRoutes from './routes/user.routes';
import paymentRoutes from './routes/payment.routes';
import reviewRoutes from './routes/review.routes';
import waitlistRoutes from './routes/waitlist.routes';
import loyaltyRoutes from './routes/loyalty.routes';
import tableRoutes from './routes/table.routes';
import adminRoutes from './routes/admin.routes';
import travelAdminRoutes from './routes/travel-admin.routes';
import unifiedListingsRoutes from './routes/unified-listings.routes';
import webhookRoutes from './routes/webhook.routes';
import geographicSearchRoutes from './routes/geographic-search.routes';
import advancedFilterRoutes from './routes/advanced-filter.routes';
import imageOptimizationRoutes from './routes/image-optimization.routes';
import i18nRoutes from './routes/i18n.routes';
import monitoringRoutes from './routes/monitoring.routes';
import mobileRoutes from './routes/mobile.routes';
import searchRoutes from './routes/search.routes';
import guestReservationRoutes from './routes/guest-reservation.routes';
import dineNowRoutes from './routes/dine-now.routes';
import giftCardRoutes from './routes/gift-card.routes';
import restaurantOnboardingRoutes from './routes/restaurant-onboarding.routes';
import gdprRoutes from './routes/gdpr.routes';
import privateDiningRoutes from './routes/private-dining.routes';
import depositRoutes from './routes/deposit.routes';
import socialProofRoutes from './routes/social-proof.routes';

export const createApp = async () => {
  const app = express();

  // Get environment-specific configurations
  const performanceConfig = getPerformanceConfigForEnvironment(process.env.NODE_ENV || 'development');

  // Initialize Redis for caching
  try {
    initializeRedis();
    console.log('✓ Redis caching initialized');
  } catch (error) {
    console.warn('Redis initialization failed:', error);
  }

  // Apply comprehensive security headers
  applySecurityHeaders(app);

  // Apply security middleware
  applySecurity(app);

  // Apply performance optimizations
  await applyPerformanceOptimizations(app, performanceConfig);

  // Basic middleware
  app.use(morgan('dev'));
  
  // Stripe webhook endpoint (before express.json middleware)
  app.post('/api/payments/webhook', express.raw({ type: 'application/json' }), require('./controllers/payment.controller').stripeWebhook);
  
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Apply input sanitization and detection
  app.use(sanitizeRequest);
  app.use(detectSuspiciousPatterns);

  // CSRF token endpoint
  app.get('/api/csrf-token', getCsrfToken);

  // Generate CSRF tokens for form pages
  app.use(generateCsrfToken);

  // Routes
  app.use('/api/auth', authRoutes);
  app.use('/api/restaurants', restaurantRoutes);
  app.use('/api/reservations', reservationRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/payments', paymentRoutes);
  app.use('/api/reviews', reviewRoutes);
  app.use('/api/waitlist', waitlistRoutes);
  app.use('/api/loyalty', loyaltyRoutes);
  app.use('/api/tables', tableRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/admin/travel', travelAdminRoutes);
  app.use('/api/listings', unifiedListingsRoutes);
  app.use('/api/webhooks', webhookRoutes);
  app.use('/api/search/geo', geographicSearchRoutes);
  app.use('/api/filters', advancedFilterRoutes);
  app.use('/api/images', imageOptimizationRoutes);
  app.use('/api/i18n', i18nRoutes);
  app.use('/api/monitoring', monitoringRoutes);
  app.use('/api/mobile', mobileRoutes);
  app.use('/api/search', searchRoutes);
  app.use('/api/guest-reservations', guestReservationRoutes);
  app.use('/api/dine-now', dineNowRoutes);
  app.use('/api/gift-cards', giftCardRoutes);
  app.use('/api/restaurant-onboarding', restaurantOnboardingRoutes);
  app.use('/api/gdpr', gdprRoutes);
  app.use('/api/private-dining', privateDiningRoutes);
  app.use('/api/deposits', depositRoutes);
  app.use('/api/social-proof', socialProofRoutes);

  // Serve uploaded files in development
  if (process.env.NODE_ENV !== 'production') {
    app.use('/uploads', express.static('uploads'));
  }

  // Health check endpoint
  app.get('/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
  });

  // Setup API documentation
  setupSwagger(app);

  // Setup monitoring
  setupMonitoring(app);

  // Apply error handling middleware
  applyErrorHandling(app);

  return app;
};

export default createApp;