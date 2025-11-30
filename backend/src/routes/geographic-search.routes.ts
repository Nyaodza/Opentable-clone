import { Router } from 'express';
import { GeographicSearchController } from '../controllers/geographic-search.controller';
import { query } from 'express-validator';
import { ServiceType } from '../models/UnifiedListing';

const router = Router();

// Validation middleware
const nearbySearchValidation = [
  query('lat')
    .isFloat({ min: -90, max: 90 })
    .withMessage('Latitude must be between -90 and 90'),
  query('lng')
    .isFloat({ min: -180, max: 180 })
    .withMessage('Longitude must be between -180 and 180'),
  query('radius')
    .optional()
    .isFloat({ min: 0.1, max: 100 })
    .withMessage('Radius must be between 0.1 and 100 km'),
  query('serviceType')
    .optional()
    .isIn(Object.values(ServiceType))
    .withMessage('Invalid service type'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('minRating')
    .optional()
    .isFloat({ min: 0, max: 5 })
    .withMessage('Min rating must be between 0 and 5'),
  query('maxPrice')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Max price must be positive'),
  query('minPrice')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Min price must be positive'),
];

const boundsSearchValidation = [
  query('north')
    .isFloat({ min: -90, max: 90 })
    .withMessage('North bound must be between -90 and 90'),
  query('south')
    .isFloat({ min: -90, max: 90 })
    .withMessage('South bound must be between -90 and 90'),
  query('east')
    .isFloat({ min: -180, max: 180 })
    .withMessage('East bound must be between -180 and 180'),
  query('west')
    .isFloat({ min: -180, max: 180 })
    .withMessage('West bound must be between -180 and 180'),
  query('serviceType')
    .optional()
    .isIn(Object.values(ServiceType))
    .withMessage('Invalid service type'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 500 })
    .withMessage('Limit must be between 1 and 500'),
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
];

const closestSearchValidation = [
  query('lat')
    .isFloat({ min: -90, max: 90 })
    .withMessage('Latitude must be between -90 and 90'),
  query('lng')
    .isFloat({ min: -180, max: 180 })
    .withMessage('Longitude must be between -180 and 180'),
  query('count')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('Count must be between 1 and 50'),
  query('serviceType')
    .optional()
    .isIn(Object.values(ServiceType))
    .withMessage('Invalid service type'),
];

const distanceCalculationValidation = [
  query('lat1')
    .isFloat({ min: -90, max: 90 })
    .withMessage('Latitude 1 must be between -90 and 90'),
  query('lng1')
    .isFloat({ min: -180, max: 180 })
    .withMessage('Longitude 1 must be between -180 and 180'),
  query('lat2')
    .isFloat({ min: -90, max: 90 })
    .withMessage('Latitude 2 must be between -90 and 90'),
  query('lng2')
    .isFloat({ min: -180, max: 180 })
    .withMessage('Longitude 2 must be between -180 and 180'),
];

const clusterValidation = [
  ...boundsSearchValidation,
  query('zoom')
    .optional()
    .isInt({ min: 1, max: 20 })
    .withMessage('Zoom must be between 1 and 20'),
];

// Geographic search routes
router.get(
  '/nearby',
  nearbySearchValidation,
  GeographicSearchController.searchNearby
);

router.get(
  '/bounds',
  boundsSearchValidation,
  GeographicSearchController.searchInBounds
);

router.get(
  '/closest',
  closestSearchValidation,
  GeographicSearchController.findClosest
);

router.get(
  '/clusters',
  clusterValidation,
  GeographicSearchController.getClusters
);

// Utility routes
router.get(
  '/distance',
  distanceCalculationValidation,
  GeographicSearchController.calculateDistance
);

router.get(
  '/stats',
  query('serviceType')
    .optional()
    .isIn(Object.values(ServiceType))
    .withMessage('Invalid service type'),
  GeographicSearchController.getGeoStats
);

export default router;