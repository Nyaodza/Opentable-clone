import { Router } from 'express';
import { AnalyticsController } from '../controllers/analytics.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';
import { validateTenant } from '../middleware/tenant.middleware';
import { rateLimitMiddleware } from '../middleware/security.middleware';

const router = Router();

// Public tracking endpoints (higher rate limits)
router.post('/track/event', 
  rateLimitMiddleware({ windowMs: 60000, max: 1000 }), // 1000 requests per minute
  AnalyticsController.trackEvent
);

router.post('/track/page-view',
  rateLimitMiddleware({ windowMs: 60000, max: 1000 }),
  AnalyticsController.trackPageView
);

router.post('/track/experiment',
  authenticate,
  rateLimitMiddleware({ windowMs: 60000, max: 100 }),
  AnalyticsController.trackExperiment
);

// Admin-only analytics endpoints
router.use(authenticate);
router.use(validateTenant);
router.use(requireRole(['admin', 'manager']));

// User Segmentation
router.post('/segments',
  AnalyticsController.createUserSegment
);

router.get('/segments/:segmentId/users',
  AnalyticsController.getSegmentUsers
);

router.get('/users/:userId/segments',
  AnalyticsController.getUserSegments
);

// Funnel Analysis
router.post('/funnels',
  AnalyticsController.createFunnel
);

router.get('/funnels/:funnelId/analyze',
  AnalyticsController.analyzeFunnel
);

// Cohort Analysis
router.get('/cohorts',
  AnalyticsController.performCohortAnalysis
);

// Real-time Analytics
router.get('/real-time',
  rateLimitMiddleware({ windowMs: 60000, max: 60 }), // 1 request per second
  AnalyticsController.getRealTimeMetrics
);

// Custom Reports
router.post('/reports',
  AnalyticsController.generateCustomReport
);

// A/B Testing
router.get('/experiments/:experimentId/results',
  AnalyticsController.getExperimentResults
);

// Dashboard
router.get('/dashboard',
  AnalyticsController.getDashboardData
);

router.get('/popular-content',
  AnalyticsController.getPopularContent
);

router.get('/users/:userId/journey',
  AnalyticsController.getUserJourney
);

export default router;