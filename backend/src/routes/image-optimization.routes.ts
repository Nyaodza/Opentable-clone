import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { ImageOptimizationController } from '../controllers/image-optimization.controller';

const router = Router();

// Validation middleware
const uploadValidation = [
  body('listingId')
    .isString()
    .notEmpty()
    .withMessage('Listing ID is required'),
];

const urlsValidation = [
  body('listingId')
    .isString()
    .notEmpty()
    .withMessage('Listing ID is required'),
  body('imageUrls')
    .isArray({ min: 1 })
    .withMessage('Image URLs array is required'),
  body('imageUrls.*')
    .isURL()
    .withMessage('Each image URL must be valid'),
  body('priority')
    .optional()
    .isInt({ min: 0, max: 10 })
    .withMessage('Priority must be between 0 and 10'),
];

const srcsetValidation = [
  query('imageUrl')
    .isURL()
    .withMessage('Valid image URL is required'),
  query('listingId')
    .isString()
    .notEmpty()
    .withMessage('Listing ID is required'),
];

const listingIdValidation = [
  param('listingId')
    .isString()
    .notEmpty()
    .withMessage('Listing ID is required'),
];

const cleanupValidation = [
  query('olderThanDays')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Older than days must be a positive integer'),
];

const performanceValidation = [
  body('imageId')
    .isString()
    .notEmpty()
    .withMessage('Image ID is required'),
  body('loadTime')
    .isFloat({ min: 0 })
    .withMessage('Load time must be a positive number'),
  body('renderTime')
    .isFloat({ min: 0 })
    .withMessage('Render time must be a positive number'),
  body('viewportSize')
    .isString()
    .notEmpty()
    .withMessage('Viewport size is required'),
  body('deviceType')
    .isIn(['desktop', 'mobile', 'tablet'])
    .withMessage('Device type must be desktop, mobile, or tablet'),
  body('connectionType')
    .optional()
    .isString()
    .withMessage('Connection type must be a string'),
  body('cacheHit')
    .optional()
    .isBoolean()
    .withMessage('Cache hit must be a boolean'),
  body('lazyLoaded')
    .optional()
    .isBoolean()
    .withMessage('Lazy loaded must be a boolean'),
  body('userAgent')
    .optional()
    .isString()
    .withMessage('User agent must be a string'),
  body('country')
    .optional()
    .isString()
    .isLength({ min: 2, max: 2 })
    .withMessage('Country must be a 2-letter code'),
];

const reportValidation = [
  query('period')
    .optional()
    .isIn(['24h', '7d', '30d'])
    .withMessage('Period must be 24h, 7d, or 30d'),
];

// Upload and optimization routes
router.post(
  '/upload/single',
  ImageOptimizationController.uploadSingle,
  uploadValidation,
  ImageOptimizationController.optimizeSingleImage
);

router.post(
  '/upload/multiple',
  ImageOptimizationController.uploadMultiple,
  uploadValidation,
  ImageOptimizationController.optimizeMultipleImages
);

router.post(
  '/optimize/urls',
  urlsValidation,
  ImageOptimizationController.optimizeFromUrls
);

// Queue management routes
router.get(
  '/queue/status',
  ImageOptimizationController.getQueueStatus
);

router.post(
  '/queue/reprocess',
  query('limit')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Limit must be a positive integer'),
  ImageOptimizationController.reprocessFailed
);

router.delete(
  '/queue/clear',
  cleanupValidation,
  ImageOptimizationController.clearCompletedQueue
);

// Image utilities routes
router.get(
  '/srcset',
  srcsetValidation,
  ImageOptimizationController.generateSrcSet
);

router.get(
  '/performance/:listingId',
  listingIdValidation,
  ImageOptimizationController.getImagePerformance
);

// Cleanup routes (admin only)
router.delete(
  '/cleanup/unused',
  cleanupValidation,
  ImageOptimizationController.cleanupUnused
);

// CDN statistics routes
router.get(
  '/cdn/stats',
  ImageOptimizationController.getCDNStats
);

// Performance tracking routes
router.post(
  '/performance/track',
  performanceValidation,
  ImageOptimizationController.trackPerformance
);

router.get(
  '/performance/report',
  reportValidation,
  ImageOptimizationController.getPerformanceReport
);

export default router;