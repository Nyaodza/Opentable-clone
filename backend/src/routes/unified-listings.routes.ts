import { Router } from 'express';
import { UnifiedListingsController } from '../controllers/unified-listings.controller';
import { authenticate, requireAdmin ,authorize} from '../middleware/auth.middleware';
import { UserRole } from '../models/User';
import { query, body, param } from 'express-validator';
import { ServiceType } from '../models/UnifiedListing';

const router = Router();

// Validation middleware
const searchValidation = [
  query('serviceType')
    .isIn(Object.values(ServiceType))
    .withMessage('Invalid service type'),
  query('city')
    .optional()
    .isString()
    .trim()
    .isLength({ min: 2 })
    .withMessage('City must be at least 2 characters'),
  query('country')
    .optional()
    .isString()
    .trim()
    .isLength({ min: 2 })
    .withMessage('Country must be at least 2 characters'),
  query('lat')
    .optional()
    .isFloat({ min: -90, max: 90 })
    .withMessage('Invalid latitude'),
  query('lng')
    .optional()
    .isFloat({ min: -180, max: 180 })
    .withMessage('Invalid longitude'),
  query('radius')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Radius must be between 1 and 100 km'),
  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('Invalid start date'),
  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('Invalid end date'),
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('pageSize')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Page size must be between 1 and 100'),
  query('minPrice')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Min price must be positive'),
  query('maxPrice')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Max price must be positive'),
  query('minRating')
    .optional()
    .isFloat({ min: 0, max: 5 })
    .withMessage('Rating must be between 0 and 5'),
];

const createListingValidation = [
  body('serviceType')
    .isIn(Object.values(ServiceType))
    .withMessage('Invalid service type'),
  body('title')
    .isString()
    .trim()
    .isLength({ min: 3, max: 200 })
    .withMessage('Title must be between 3 and 200 characters'),
  body('description')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 5000 })
    .withMessage('Description must not exceed 5000 characters'),
  body('location.city')
    .isString()
    .trim()
    .notEmpty()
    .withMessage('City is required'),
  body('location.country')
    .isString()
    .trim()
    .notEmpty()
    .withMessage('Country is required'),
  body('location.lat')
    .isFloat({ min: -90, max: 90 })
    .withMessage('Invalid latitude'),
  body('location.lng')
    .isFloat({ min: -180, max: 180 })
    .withMessage('Invalid longitude'),
  body('price')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Price must be positive'),
  body('currency')
    .optional()
    .isString()
    .isLength({ min: 3, max: 3 })
    .withMessage('Currency must be a 3-letter code'),
  body('url')
    .isURL()
    .withMessage('Invalid URL'),
  body('images')
    .optional()
    .isArray()
    .withMessage('Images must be an array'),
  body('images.*')
    .isURL()
    .withMessage('Each image must be a valid URL'),
];

// Public routes
router.get(
  '/search',
  searchValidation,
  UnifiedListingsController.searchListings
);

router.get(
  '/:id',
  param('id').isString().notEmpty(),
  UnifiedListingsController.getListingDetails
);

router.post(
  '/:id/track',
  param('id').isString().notEmpty(),
  body('action').isIn(['click', 'booking']),
  UnifiedListingsController.trackListingAction
);

// Authenticated routes
router.post(
  '/',
  authenticate,
  createListingValidation,
  UnifiedListingsController.createListing
);

router.put(
  '/:id',
  authenticate,
  param('id').isUUID(),
  UnifiedListingsController.updateListing
);

router.delete(
  '/:id',
  authenticate,
  param('id').isUUID(),
  UnifiedListingsController.deleteListing
);

// Admin routes
router.get(
  '/admin/providers',
  authenticate,
  authorize(UserRole.ADMIN),
  UnifiedListingsController.getProviderStatus
);

router.put(
  '/admin/providers/:source',
  authenticate,
  authorize(UserRole.ADMIN),
  param('source').isString().notEmpty(),
  body('enabled').isBoolean(),
  UnifiedListingsController.toggleProvider
);

router.put(
  '/admin/listings/:id/moderate',
  authenticate,
  authorize(UserRole.ADMIN),
  param('id').isUUID(),
  body('status').isString().notEmpty(),
  body('reason').optional().isString(),
  UnifiedListingsController.moderateListing
);

router.put(
  '/admin/listings/:id/feature',
  authenticate,
  authorize(UserRole.ADMIN),
  param('id').isUUID(),
  body('featured').isBoolean(),
  UnifiedListingsController.featureListing
);

export default router;