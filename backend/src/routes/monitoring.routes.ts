import { Router } from 'express';
import { MonitoringController } from '../controllers/monitoring.controller';
import { authenticate, requireAdmin ,authorize} from '../middleware/auth.middleware';
import { UserRole } from '../models/User';
import { param, body, query } from 'express-validator';
import { ListingSource } from '../models/UnifiedListing';

const router = Router();

// Validation middleware
const validateProviderSource = [
  param('source')
    .isIn(Object.values(ListingSource))
    .withMessage('Invalid provider source'),
];

const validateAlertId = [
  param('alertId')
    .isString()
    .trim()
    .notEmpty()
    .withMessage('Alert ID is required'),
];

const validateRuleId = [
  param('ruleId')
    .isString()
    .trim()
    .notEmpty()
    .withMessage('Rule ID is required'),
];

const validateAlertHistoryQuery = [
  query('limit')
    .optional()
    .isInt({ min: 1, max: 1000 })
    .withMessage('Limit must be between 1 and 1000'),
  query('severity')
    .optional()
    .isIn(['low', 'medium', 'high', 'critical'])
    .withMessage('Invalid severity level'),
  query('source')
    .optional()
    .isIn(Object.values(ListingSource))
    .withMessage('Invalid provider source'),
];

// Health monitoring routes (admin only)
router.get(
  '/health/overview',
  authenticate,
  authorize(UserRole.ADMIN),
  MonitoringController.getHealthOverview
);

router.get(
  '/health/providers/:source',
  authenticate,
  authorize(UserRole.ADMIN),
  validateProviderSource,
  MonitoringController.getProviderHealth
);

router.post(
  '/health/providers/:source/check',
  authenticate,
  authorize(UserRole.ADMIN),
  validateProviderSource,
  MonitoringController.forceHealthCheck
);

router.post(
  '/health/providers/:source/enable',
  authenticate,
  authorize(UserRole.ADMIN),
  validateProviderSource,
  MonitoringController.enableProvider
);

router.post(
  '/health/providers/bulk',
  authenticate,
  authorize(UserRole.ADMIN),
  body('sources')
    .isArray({ min: 1 })
    .withMessage('Sources array is required'),
  body('sources.*')
    .isIn(Object.values(ListingSource))
    .withMessage('Invalid provider source in array'),
  MonitoringController.getBulkProviderStatus
);

// Alert management routes (admin only)
router.get(
  '/alerts/active',
  authenticate,
  authorize(UserRole.ADMIN),
  MonitoringController.getActiveAlerts
);

router.get(
  '/alerts/history',
  authenticate,
  authorize(UserRole.ADMIN),
  validateAlertHistoryQuery,
  MonitoringController.getAlertHistory
);

router.put(
  '/alerts/:alertId/acknowledge',
  authenticate,
  authorize(UserRole.ADMIN),
  validateAlertId,
  MonitoringController.acknowledgeAlert
);

router.get(
  '/alerts/rules',
  authenticate,
  authorize(UserRole.ADMIN),
  MonitoringController.getAlertRules
);

router.put(
  '/alerts/rules/:ruleId',
  authenticate,
  authorize(UserRole.ADMIN),
  validateRuleId,
  body('enabled')
    .optional()
    .isBoolean()
    .withMessage('Enabled must be a boolean'),
  body('threshold')
    .optional()
    .isNumeric()
    .withMessage('Threshold must be a number'),
  body('cooldownMinutes')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Cooldown must be at least 1 minute'),
  MonitoringController.updateAlertRule
);

// System metrics routes (admin only)
router.get(
  '/metrics/system',
  authenticate,
  authorize(UserRole.ADMIN),
  query('period')
    .optional()
    .isIn(['1h', '6h', '24h', '7d', '30d'])
    .withMessage('Invalid period'),
  MonitoringController.getSystemMetrics
);

// Real-time monitoring (admin only)
router.get(
  '/realtime/health',
  authenticate,
  authorize(UserRole.ADMIN),
  MonitoringController.getRealtimeHealth
);

// Public health status (limited info for status page)
router.get(
  '/status',
  async (req, res) => {
    try {
      const healthSummary = await MonitoringController.getHealthMonitor().getHealthSummary();
      
      // Return limited public status info
      res.json({
        status: healthSummary.downProviders > 0 ? 'degraded' : 'operational',
        providers: {
          total: healthSummary.totalProviders,
          healthy: healthSummary.healthyProviders,
          avgResponseTime: healthSummary.avgResponseTime,
        },
        lastUpdated: new Date(),
      });
    } catch (error) {
      res.status(500).json({
        status: 'unknown',
        error: 'Unable to determine system status',
      });
    }
  }
);

export default router;