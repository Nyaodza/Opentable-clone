import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { sequelize, testDatabaseConnection, initializeDatabase } from './config/database';
import { initializeSocket } from './config/socket';
import { applySecurity, applyErrorHandling } from './config/security.config';
import { applyPerformanceOptimizations, PerformanceMonitor, getPerformanceConfigForEnvironment } from './config/performance.config';
import { setupSwagger } from './config/swagger.config';
import { setupMonitoring } from './config/monitoring.config';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { logInfo, logError, logRequest } from './utils/logger';
import { CronService } from './services/cron.service';
import { createGraphQLServer } from './graphql/server';
import authRoutes from './routes/auth.routes';
import restaurantRoutes from './routes/restaurant.routes';
import reservationRoutes from './routes/reservation.routes';
import userRoutes from './routes/user.routes';
import reviewRoutes from './routes/review.routes';
import paymentRoutes from './routes/payment.routes';
import disruptiveFeaturesRoutes from './routes/disruptive-features';
import loyaltyRoutes from './routes/loyalty.routes';
import tableRoutes from './routes/table.routes';
import adminRoutes from './routes/admin.routes';
import travelAdminRoutes from './routes/travel-admin.routes';
import unifiedListingsRoutes from './routes/unified-listings.routes';
import waitlistRoutes from './routes/waitlist.routes';
import webhookRoutes from './routes/webhook.routes';
import geographicSearchRoutes from './routes/geographic-search.routes';
import advancedFilterRoutes from './routes/advanced-filter.routes';
import imageOptimizationRoutes from './routes/image-optimization.routes';
import i18nRoutes from './routes/i18n.routes';
import guestReservationRoutes from './routes/guest-reservation.routes';
import dineNowRoutes from './routes/dine-now.routes';
import giftCardRoutes from './routes/gift-card.routes';
import restaurantOnboardingRoutes from './routes/restaurant-onboarding.routes';
import gdprRoutes from './routes/gdpr.routes';
import privateDiningRoutes from './routes/private-dining.routes';
import depositRoutes from './routes/deposit.routes';
import socialProofRoutes from './routes/social-proof.routes';
import healthRoutes, { markStartupComplete } from './routes/health.routes';
import { apiVersioningMiddleware, applyApiVersioning } from './middleware/api-versioning.middleware';
import { correlationIdMiddleware, correlationErrorHandler } from './middleware/correlation-id.middleware';
import { createGracefulShutdown, CleanupTasks } from './utils/graceful-shutdown';
import { queryAnalyzerMiddleware } from './utils/query-builder';
import { RateLimiters } from './middleware/sliding-window-rate-limit';
import reminderScheduler from './services/reminder-scheduler.service';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Create HTTP server
const httpServer = createServer(app);

// Initialize Socket.io
export const io = initializeSocket(httpServer);


// Database connection and server start
const startServer = async () => {
  try {
    // Get environment-specific configurations
    const performanceConfig = getPerformanceConfigForEnvironment(process.env.NODE_ENV || 'development');

    // Apply security middleware
    applySecurity(app);

    // Apply correlation ID middleware (early for request tracing)
    app.use(correlationIdMiddleware({
      logRequests: true,
      addTiming: true,
    }));

    // Apply performance optimizations
    await applyPerformanceOptimizations(app, performanceConfig);

    // Query analyzer middleware (development only)
    if (process.env.NODE_ENV === 'development') {
      app.use(queryAnalyzerMiddleware());
    }

    // Apply rate limiting to auth routes
    app.use('/api/auth/login', RateLimiters.auth());
    app.use('/api/auth/register', RateLimiters.auth());
    app.use('/api/auth/forgot-password', RateLimiters.passwordReset());

    // Request logging middleware
    app.use(morgan('combined', {
      stream: {
        write: (message) => logInfo(message.trim())
      }
    }));
    
    // Track response time
    app.use((req, res, next) => {
      const start = Date.now();
      res.on('finish', () => {
        const duration = Date.now() - start;
        logRequest(req.method, req.url, res.statusCode, duration);
      });
      next();
    });
    
    // Stripe webhook endpoint (before express.json middleware)
    app.post('/api/payments/webhook', express.raw({ type: 'application/json' }), require('./controllers/payment.controller').stripeWebhook);
    
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));

    // Apply API versioning middleware
    applyApiVersioning(app);

    // Health check routes (before versioned routes)
    app.use('/', healthRoutes);

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
    app.use('/api/disruptive', disruptiveFeaturesRoutes);
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

    // Simple health check endpoint (for backward compatibility)
    app.get('/api/health-simple', (req, res) => {
      res.json({ status: 'OK', timestamp: new Date().toISOString() });
    });

    // Setup GraphQL server
    try {
      const graphqlMiddleware = await createGraphQLServer(httpServer);
      app.use('/graphql', graphqlMiddleware);
      logInfo('✓ GraphQL server configured at /graphql');
    } catch (error) {
      logError('GraphQL server initialization failed:', error);
      logInfo('⚠ Continuing without GraphQL server');
    }

    // Setup API documentation
    setupSwagger(app);

    // Setup monitoring
    setupMonitoring(app);
    
    // 404 handler - must be before error handler
    app.use(notFoundHandler);

    // Apply error handling middleware
    app.use(errorHandler);

    // Initialize database with proper model synchronization
    try {
      await initializeDatabase();
      logInfo('Database initialization completed successfully');
    } catch (error) {
      logError('Database initialization failed:', error);
      // Continue running server even if database fails in development
      if (process.env.NODE_ENV !== 'development') {
        process.exit(1);
      }
    }
    
    // Start performance monitoring
    const performanceMonitor = PerformanceMonitor.getInstance();
    performanceMonitor.startMonitoring();
    
    // Start cron jobs
    CronService.start();
    logInfo('Cron jobs started');
    
    // Start SMS reminder scheduler
    if (process.env.ENABLE_SMS_REMINDERS !== 'false') {
      reminderScheduler.start();
      logInfo('SMS reminder scheduler started');
    }
    
    httpServer.listen(PORT, () => {
      // Mark startup as complete for Kubernetes probes
      markStartupComplete();
      
      // Setup graceful shutdown
      const gracefulShutdown = createGracefulShutdown(httpServer, {
        timeout: 30000,
        onShutdown: async () => {
          logInfo('Running cleanup tasks...');
        },
      });
      
      // Register cleanup tasks
      gracefulShutdown.registerCleanupTask(CleanupTasks.closeDatabase(sequelize));
      gracefulShutdown.registerCleanupTask(CleanupTasks.stopCronJobs(CronService));
      gracefulShutdown.registerCleanupTask(async () => {
        reminderScheduler.stop();
        logInfo('SMS reminder scheduler stopped');
      });
      
      logInfo(`Server running on port ${PORT}`);
      logInfo('WebSocket server ready');
      logInfo('Performance monitoring active');
      logInfo('Security middleware enabled');
      logInfo('Performance optimizations applied');
      logInfo('Redis caching enabled');
      logInfo('Database optimizations active');
      logInfo('API versioning enabled');
      logInfo('Correlation ID tracking enabled');
      logInfo('Graceful shutdown configured');
      logInfo(`API documentation available at: http://localhost:${PORT}/api-docs`);
      logInfo(`Health checks at: http://localhost:${PORT}/health`);
      logInfo(`Monitoring dashboard at: http://localhost:${PORT}/api/monitoring/health`);
      logInfo(`GraphQL endpoint available at: http://localhost:${PORT}/graphql`);
      
      console.log('\n🚀 OpenTable Clone Backend Server Started!');
      console.log('==========================================');
      console.log(`📍 API URL: http://localhost:${PORT}`);
      console.log(`🔗 GraphQL: http://localhost:${PORT}/graphql`);
      console.log(`📚 API Docs: http://localhost:${PORT}/api-docs`);
      console.log(`📊 Monitoring: http://localhost:${PORT}/api/monitoring/health`);
      console.log('==========================================\n');
    });
  } catch (error) {
    logError('Unable to start server', error);
    process.exit(1);
  }
};

startServer();