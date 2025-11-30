import { Router } from 'express';
import * as reservationController from '../controllers/reservation.controller';
import { authenticate, requireRestaurantUser } from '../middleware/auth.middleware';
import { validate, validateQuery } from '../validators/common.validators';
import {
  createReservationSchema,
  updateReservationSchema,
  cancelReservationSchema,
  searchReservationsSchema,
  getRestaurantReservationsSchema
} from '../validators/reservation.validators';

const router = Router();

/**
 * @route   POST /api/reservations
 * @desc    Create a new reservation
 * @access  Private
 */
router.post(
  '/',
  authenticate,
  validate(createReservationSchema),
  reservationController.createReservation
);

/**
 * @route   GET /api/reservations/my-reservations
 * @desc    Get current user's reservations
 * @access  Private
 */
router.get(
  '/my-reservations',
  authenticate,
  validateQuery(searchReservationsSchema),
  reservationController.getMyReservations
);

/**
 * @route   GET /api/reservations/upcoming
 * @desc    Get user's upcoming reservations
 * @access  Private
 */
router.get(
  '/upcoming',
  authenticate,
  reservationController.getUpcomingReservations
);

/**
 * @route   GET /api/reservations/:id
 * @desc    Get reservation by ID
 * @access  Private (Owner/Admin)
 */
router.get('/:id', authenticate, reservationController.getReservation);

/**
 * @route   PUT /api/reservations/:id
 * @desc    Update reservation
 * @access  Private (Owner/Admin)
 */
router.put(
  '/:id',
  authenticate,
  validate(updateReservationSchema),
  reservationController.updateReservation
);

/**
 * @route   POST /api/reservations/:id/cancel
 * @desc    Cancel reservation
 * @access  Private (Owner/Admin)
 */
router.post(
  '/:id/cancel',
  authenticate,
  validate(cancelReservationSchema),
  reservationController.cancelReservation
);

// Restaurant owner endpoints
/**
 * @route   GET /api/reservations/restaurant/:restaurantId
 * @desc    Get restaurant reservations for a date
 * @access  Private (Restaurant Owner/Admin)
 */
router.get(
  '/restaurant/:restaurantId',
  authenticate,
  requireRestaurantUser,
  validateQuery(getRestaurantReservationsSchema),
  reservationController.getRestaurantReservations
);

/**
 * @route   PUT /api/reservations/:id/seat
 * @desc    Mark reservation as seated
 * @access  Private (Restaurant Owner/Admin)
 */
router.put(
  '/:id/seat',
  authenticate,
  requireRestaurantUser,
  reservationController.markAsSeated
);

/**
 * @route   PUT /api/reservations/:id/complete
 * @desc    Mark reservation as completed
 * @access  Private (Restaurant Owner/Admin)
 */
router.put(
  '/:id/complete',
  authenticate,
  requireRestaurantUser,
  reservationController.markAsCompleted
);

/**
 * @route   PUT /api/reservations/:id/no-show
 * @desc    Mark reservation as no-show
 * @access  Private (Restaurant Owner/Admin)
 */
router.put(
  '/:id/no-show',
  authenticate,
  requireRestaurantUser,
  reservationController.markAsNoShow
);

export default router;