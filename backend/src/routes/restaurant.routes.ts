import { Router } from 'express';
import * as restaurantController from '../controllers/restaurant.controller';
import { authenticate, requireRestaurantUser, requireAdmin } from '../middleware/auth.middleware';
import { validate, validateQuery } from '../validators/common.validators';
import { 
  createRestaurantSchema, 
  updateRestaurantSchema,
  searchRestaurantsSchema,
  restaurantHoursSchema,
  checkAvailabilitySchema
} from '../validators/restaurant.validators';
import {
  createTableSchema,
  updateTableSchema,
  getTableAvailabilitySchema,
  findBestTableSchema,
  getTableOccupancySchema,
  bulkUpdateTablesSchema
} from '../validators/table.validators';
import { UserRole } from '../models/User';

const router = Router();

/**
 * @route   GET /api/restaurants/search
 * @desc    Search restaurants with filters
 * @access  Public
 */
router.get(
  '/search',
  validateQuery(searchRestaurantsSchema),
  restaurantController.searchRestaurants
);

/**
 * @route   GET /api/restaurants/owner/my-restaurants
 * @desc    Get restaurants owned by current user
 * @access  Private (Restaurant Owner/Admin)
 */
router.get(
  '/owner/my-restaurants',
  authenticate,
  requireRestaurantUser,
  restaurantController.getMyRestaurants
);

/**
 * @route   POST /api/restaurants
 * @desc    Create a new restaurant
 * @access  Private (Restaurant Owner/Admin)
 */
router.post(
  '/',
  authenticate,
  requireRestaurantUser,
  validate(createRestaurantSchema),
  restaurantController.createRestaurant
);

/**
 * @route   GET /api/restaurants/:id
 * @desc    Get restaurant by ID
 * @access  Public
 */
router.get('/:id', restaurantController.getRestaurant);

/**
 * @route   PUT /api/restaurants/:id
 * @desc    Update restaurant
 * @access  Private (Owner/Admin)
 */
router.put(
  '/:id',
  authenticate,
  validate(updateRestaurantSchema),
  restaurantController.updateRestaurant
);

/**
 * @route   DELETE /api/restaurants/:id
 * @desc    Delete restaurant (soft delete)
 * @access  Private (Owner/Admin)
 */
router.delete('/:id', authenticate, restaurantController.deleteRestaurant);

/**
 * @route   GET /api/restaurants/:id/availability
 * @desc    Get restaurant availability for date/party size
 * @access  Public
 */
router.get(
  '/:id/availability',
  validateQuery(checkAvailabilitySchema),
  restaurantController.getRestaurantAvailability
);

/**
 * @route   PUT /api/restaurants/:id/hours
 * @desc    Update restaurant operating hours
 * @access  Private (Owner/Admin)
 */
router.put(
  '/:id/hours',
  authenticate,
  validate(restaurantHoursSchema),
  restaurantController.updateRestaurantHours
);

/**
 * @route   PUT /api/restaurants/:id/photos
 * @desc    Update restaurant photos
 * @access  Private (Owner/Admin)
 */
router.put(
  '/:id/photos',
  authenticate,
  validate(updateRestaurantSchema),
  restaurantController.updateRestaurantPhotos
);

/**
 * @route   GET /api/restaurants/:id/stats
 * @desc    Get restaurant statistics
 * @access  Private (Owner/Admin)
 */
router.get(
  '/:id/stats',
  authenticate,
  validateQuery(updateRestaurantSchema),
  restaurantController.getRestaurantStats
);

// Table Management Routes

/**
 * @route   GET /api/restaurants/:restaurantId/tables
 * @desc    Get all tables for a restaurant
 * @access  Public
 */
router.get('/:restaurantId/tables', restaurantController.getRestaurantTables);

/**
 * @route   POST /api/restaurants/:restaurantId/tables
 * @desc    Create a new table
 * @access  Private (Owner/Admin)
 */
router.post(
  '/:restaurantId/tables',
  authenticate,
  validate(createTableSchema),
  restaurantController.createTable
);

/**
 * @route   PUT /api/restaurants/:restaurantId/tables/bulk
 * @desc    Bulk update tables
 * @access  Private (Owner/Admin)
 */
router.put(
  '/:restaurantId/tables/bulk',
  authenticate,
  validate(bulkUpdateTablesSchema),
  restaurantController.bulkUpdateTables
);

/**
 * @route   GET /api/restaurants/:restaurantId/tables/availability
 * @desc    Get table availability for specific date/time
 * @access  Public
 */
router.get(
  '/:restaurantId/tables/availability',
  validateQuery(getTableAvailabilitySchema),
  restaurantController.getTableAvailability
);

/**
 * @route   GET /api/restaurants/:restaurantId/tables/best
 * @desc    Find best available table for party size
 * @access  Public
 */
router.get(
  '/:restaurantId/tables/best',
  validateQuery(findBestTableSchema),
  restaurantController.findBestTable
);

/**
 * @route   GET /api/restaurants/:restaurantId/tables/occupancy
 * @desc    Get table occupancy statistics
 * @access  Private (Owner/Admin)
 */
router.get(
  '/:restaurantId/tables/occupancy',
  authenticate,
  validateQuery(getTableOccupancySchema),
  restaurantController.getTableOccupancy
);

/**
 * @route   PUT /api/restaurants/tables/:tableId
 * @desc    Update a table
 * @access  Private (Owner/Admin)
 */
router.put(
  '/tables/:tableId',
  authenticate,
  validate(updateTableSchema),
  restaurantController.updateTable
);

/**
 * @route   DELETE /api/restaurants/tables/:tableId
 * @desc    Delete a table (soft delete)
 * @access  Private (Owner/Admin)
 */
router.delete('/tables/:tableId', authenticate, restaurantController.deleteTable);

export default router;