import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { AdvancedFilterController } from '../controllers/advanced-filter.controller';
import { ServiceType } from '../models/UnifiedListing';

const router = Router();

// Validation middleware
const applyFiltersValidation = [
  query('serviceType')
    .optional()
    .isIn(Object.values(ServiceType))
    .withMessage('Invalid service type'),
  query('location')
    .optional()
    .isString()
    .isLength({ max: 255 })
    .withMessage('Location must be a string with max 255 characters'),
  query('minPrice')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Min price must be a positive number'),
  query('maxPrice')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Max price must be a positive number'),
  query('minRating')
    .optional()
    .isFloat({ min: 0, max: 5 })
    .withMessage('Min rating must be between 0 and 5'),
  query('maxRating')
    .optional()
    .isFloat({ min: 0, max: 5 })
    .withMessage('Max rating must be between 0 and 5'),
  query('amenities')
    .optional()
    .custom((value) => {
      if (typeof value === 'string') return true;
      if (Array.isArray(value) && value.every(item => typeof item === 'string')) return true;
      throw new Error('Amenities must be a string or array of strings');
    }),
  query('categories')
    .optional()
    .custom((value) => {
      if (typeof value === 'string') return true;
      if (Array.isArray(value) && value.every(item => typeof item === 'string')) return true;
      throw new Error('Categories must be a string or array of strings');
    }),
  query('instantConfirmation')
    .optional()
    .isBoolean()
    .withMessage('Instant confirmation must be a boolean'),
  query('cancellationPolicy')
    .optional()
    .isIn(['free', 'flexible', 'moderate', 'strict', 'super_strict'])
    .withMessage('Invalid cancellation policy'),
  query('difficulty')
    .optional()
    .isIn(['easy', 'moderate', 'challenging', 'difficult', 'extreme'])
    .withMessage('Invalid difficulty level'),
  query('sortBy')
    .optional()
    .isIn(['price', 'rating', 'distance', 'popularity', 'newest'])
    .withMessage('Invalid sort field'),
  query('sortOrder')
    .optional()
    .isIn(['asc', 'desc'])
    .withMessage('Sort order must be asc or desc'),
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
];

const serviceTypeValidation = [
  param('serviceType')
    .isIn(Object.values(ServiceType))
    .withMessage('Invalid service type'),
];

const createPresetValidation = [
  body('name')
    .isString()
    .isLength({ min: 1, max: 255 })
    .withMessage('Name must be between 1 and 255 characters'),
  body('description')
    .optional()
    .isString()
    .isLength({ max: 1000 })
    .withMessage('Description must be max 1000 characters'),
  body('serviceType')
    .isIn(Object.values(ServiceType))
    .withMessage('Invalid service type'),
  body('filters')
    .isObject()
    .withMessage('Filters must be an object'),
  body('isPublic')
    .optional()
    .isBoolean()
    .withMessage('IsPublic must be a boolean'),
];

const saveFilterValidation = [
  body('name')
    .isString()
    .isLength({ min: 1, max: 255 })
    .withMessage('Name must be between 1 and 255 characters'),
  body('serviceType')
    .isIn(Object.values(ServiceType))
    .withMessage('Invalid service type'),
  body('filters')
    .isObject()
    .withMessage('Filters must be an object'),
  body('isDefault')
    .optional()
    .isBoolean()
    .withMessage('IsDefault must be a boolean'),
];

const presetIdValidation = [
  param('presetId')
    .isUUID()
    .withMessage('Preset ID must be a valid UUID'),
];

const filterIdValidation = [
  param('filterId')
    .isUUID()
    .withMessage('Filter ID must be a valid UUID'),
];

const serviceTypeQueryValidation = [
  query('serviceType')
    .optional()
    .isIn(Object.values(ServiceType))
    .withMessage('Invalid service type'),
];

// Filter application routes
router.get(
  '/search',
  applyFiltersValidation,
  AdvancedFilterController.applyFilters
);

router.get(
  '/available/:serviceType',
  serviceTypeValidation,
  AdvancedFilterController.getAvailableFilters
);

// Filter preset routes
router.get(
  '/presets',
  serviceTypeQueryValidation,
  AdvancedFilterController.getFilterPresets
);

router.post(
  '/presets',
  createPresetValidation,
  AdvancedFilterController.createFilterPreset
);

router.put(
  '/presets/:presetId/usage',
  presetIdValidation,
  AdvancedFilterController.updatePresetUsage
);

// Saved filter routes (require authentication)
router.get(
  '/saved',
  serviceTypeQueryValidation,
  AdvancedFilterController.getSavedFilters
);

router.post(
  '/saved',
  saveFilterValidation,
  AdvancedFilterController.saveFilter
);

router.delete(
  '/saved/:filterId',
  filterIdValidation,
  AdvancedFilterController.deleteSavedFilter
);

// Statistics routes
router.get(
  '/stats',
  serviceTypeQueryValidation,
  AdvancedFilterController.getFilterStats
);

export default router;