import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { WebhookController } from '../controllers/webhook.controller';
import { ListingSource } from '../models/UnifiedListing';

const router = Router();

// Validation middleware
const registerEndpointValidation = [
  body('name')
    .isString()
    .isLength({ min: 1, max: 255 })
    .withMessage('Name must be between 1 and 255 characters'),
  body('url')
    .isURL({ require_protocol: true, protocols: ['http', 'https'] })
    .withMessage('Valid URL is required'),
  body('source')
    .isIn(Object.values(ListingSource))
    .withMessage('Invalid source'),
  body('events')
    .isArray({ min: 1 })
    .withMessage('Events array is required'),
  body('events.*')
    .isString()
    .withMessage('Each event must be a string'),
  body('secret')
    .optional()
    .isString()
    .isLength({ min: 16 })
    .withMessage('Secret must be at least 16 characters'),
  body('maxRetries')
    .optional()
    .isInt({ min: 0, max: 10 })
    .withMessage('Max retries must be between 0 and 10'),
  body('retryBackoff')
    .optional()
    .isInt({ min: 1, max: 300 })
    .withMessage('Retry backoff must be between 1 and 300 seconds'),
  body('timeout')
    .optional()
    .isInt({ min: 1000, max: 60000 })
    .withMessage('Timeout must be between 1000 and 60000 milliseconds'),
  body('headers')
    .optional()
    .isObject()
    .withMessage('Headers must be an object'),
  body('metadata')
    .optional()
    .isObject()
    .withMessage('Metadata must be an object'),
];

const testWebhookValidation = [
  body('eventType')
    .isString()
    .isLength({ min: 1 })
    .withMessage('Event type is required'),
  body('listingId')
    .isString()
    .isLength({ min: 1 })
    .withMessage('Listing ID is required'),
  body('payload')
    .optional()
    .isObject()
    .withMessage('Payload must be an object'),
  body('source')
    .optional()
    .isIn(Object.values(ListingSource))
    .withMessage('Invalid source'),
];

const incomingWebhookValidation = [
  param('source')
    .isIn(Object.values(ListingSource))
    .withMessage('Invalid webhook source'),
];

const logsValidation = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  query('from')
    .optional()
    .isISO8601()
    .withMessage('From date must be in ISO8601 format'),
  query('to')
    .optional()
    .isISO8601()
    .withMessage('To date must be in ISO8601 format'),
];

const deliveryLogsValidation = [
  ...logsValidation,
  query('endpointId')
    .optional()
    .isUUID()
    .withMessage('Endpoint ID must be a valid UUID'),
  query('status')
    .optional()
    .isIn(['pending', 'processing', 'delivered', 'failed', 'cancelled'])
    .withMessage('Invalid status'),
  query('eventType')
    .optional()
    .isString()
    .withMessage('Event type must be a string'),
];

const incomingLogsValidation = [
  ...logsValidation,
  query('source')
    .optional()
    .isIn(Object.values(ListingSource))
    .withMessage('Invalid source'),
  query('eventType')
    .optional()
    .isString()
    .withMessage('Event type must be a string'),
  query('processed')
    .optional()
    .isBoolean()
    .withMessage('Processed must be a boolean'),
  query('verified')
    .optional()
    .isBoolean()
    .withMessage('Verified must be a boolean'),
];

const statsValidation = [
  query('from')
    .optional()
    .isISO8601()
    .withMessage('From date must be in ISO8601 format'),
  query('to')
    .optional()
    .isISO8601()
    .withMessage('To date must be in ISO8601 format'),
];

// Webhook management routes (authenticated)
router.post(
  '/endpoints',
  registerEndpointValidation,
  WebhookController.registerEndpoint
);

router.post(
  '/test',
  testWebhookValidation,
  WebhookController.sendTestWebhook
);

router.get(
  '/delivery-logs',
  deliveryLogsValidation,
  WebhookController.getDeliveryLogs
);

router.get(
  '/incoming-logs',
  incomingLogsValidation,
  WebhookController.getIncomingLogs
);

router.get(
  '/stats',
  statsValidation,
  WebhookController.getWebhookStats
);

// Public webhook receiver endpoint (no authentication)
router.post(
  '/incoming/:source',
  incomingWebhookValidation,
  WebhookController.handleIncoming
);

export default router;