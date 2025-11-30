import { Router } from 'express';
import * as searchController from '../controllers/search.controller';
import { authenticate, optionalAuth } from '../middleware/auth.middleware';
import { validateQuery } from '../validators/common.validators';
import { searchSchema, searchSuggestionsSchema, popularSearchesSchema } from '../validators/search.validators';

const router = Router();

/**
 * @route   GET /api/search/restaurants
 * @desc    Search restaurants with filters
 * @access  Public
 */
router.get(
  '/restaurants',
  optionalAuth,
  validateQuery(searchSchema),
  searchController.searchRestaurants
);

/**
 * @route   GET /api/search/suggestions
 * @desc    Get search suggestions (autocomplete)
 * @access  Public
 */
router.get(
  '/suggestions',
  validateQuery(searchSuggestionsSchema),
  searchController.getSearchSuggestions
);

/**
 * @route   GET /api/search/popular
 * @desc    Get popular searches
 * @access  Public
 */
router.get(
  '/popular',
  validateQuery(popularSearchesSchema),
  searchController.getPopularSearches
);

/**
 * @route   GET /api/search/recommendations
 * @desc    Get personalized recommendations
 * @access  Private
 */
router.get(
  '/recommendations',
  authenticate,
  searchController.getRecommendations
);

/**
 * @route   GET /api/search/filters/cuisines
 * @desc    Get all cuisine types
 * @access  Public
 */
router.get('/filters/cuisines', searchController.getCuisineTypes);

/**
 * @route   GET /api/search/filters/prices
 * @desc    Get all price ranges
 * @access  Public
 */
router.get('/filters/prices', searchController.getPriceRanges);

/**
 * @route   GET /api/search/filters/amenities
 * @desc    Get all amenities
 * @access  Public
 */
router.get('/filters/amenities', searchController.getAmenities);

/**
 * @route   GET /api/search/filters/dietary
 * @desc    Get all dietary options
 * @access  Public
 */
router.get('/filters/dietary', searchController.getDietaryOptions);

export default router;