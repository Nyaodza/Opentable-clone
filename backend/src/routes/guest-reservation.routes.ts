import { Router } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import guestReservationService from '../services/guest-reservation.service';

const router = Router();

/**
 * @route   POST /api/guest-reservations
 * @desc    Create a guest reservation without authentication
 * @access  Public
 */
router.post(
  '/',
  [
    body('restaurantId').isUUID().withMessage('Valid restaurant ID is required'),
    body('guestEmail').isEmail().withMessage('Valid email is required'),
    body('guestName').notEmpty().withMessage('Guest name is required'),
    body('guestPhone').notEmpty().withMessage('Phone number is required'),
    body('date').isISO8601().withMessage('Valid date is required'),
    body('time').matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Valid time is required'),
    body('partySize').isInt({ min: 1, max: 20 }).withMessage('Party size must be between 1 and 20'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const reservation = await guestReservationService.createGuestReservation(req.body);

      res.status(201).json({
        success: true,
        data: {
          id: reservation.id,
          confirmationCode: reservation.confirmationCode,
          managementToken: reservation.managementToken,
          managementUrl: `${process.env.FRONTEND_URL}/guest-reservations/${reservation.managementToken}`,
          reservation,
        },
        message: 'Reservation created successfully. Check your email for confirmation details.',
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to create reservation',
      });
    }
  }
);

/**
 * @route   GET /api/guest-reservations/token/:token
 * @desc    Get guest reservation by management token
 * @access  Public (with token)
 */
router.get(
  '/token/:token',
  [param('token').notEmpty().withMessage('Management token is required')],
  async (req, res) => {
    try {
      const reservation = await guestReservationService.getByManagementToken(req.params.token);

      if (!reservation) {
        return res.status(404).json({
          success: false,
          message: 'Reservation not found',
        });
      }

      res.json({
        success: true,
        data: reservation,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to retrieve reservation',
      });
    }
  }
);

/**
 * @route   GET /api/guest-reservations/code/:code
 * @desc    Get guest reservation by confirmation code
 * @access  Public
 */
router.get(
  '/code/:code',
  [param('code').notEmpty().withMessage('Confirmation code is required')],
  async (req, res) => {
    try {
      const reservation = await guestReservationService.getByConfirmationCode(req.params.code);

      if (!reservation) {
        return res.status(404).json({
          success: false,
          message: 'Reservation not found',
        });
      }

      res.json({
        success: true,
        data: reservation,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to retrieve reservation',
      });
    }
  }
);

/**
 * @route   PATCH /api/guest-reservations/:token
 * @desc    Update guest reservation
 * @access  Public (with token)
 */
router.patch(
  '/:token',
  [
    param('token').notEmpty().withMessage('Management token is required'),
    body('date').optional().isISO8601().withMessage('Valid date is required'),
    body('time').optional().matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Valid time is required'),
    body('partySize').optional().isInt({ min: 1, max: 20 }).withMessage('Party size must be between 1 and 20'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const reservation = await guestReservationService.updateGuestReservation(
        req.params.token,
        req.body
      );

      res.json({
        success: true,
        data: reservation,
        message: 'Reservation updated successfully',
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to update reservation',
      });
    }
  }
);

/**
 * @route   DELETE /api/guest-reservations/:token
 * @desc    Cancel guest reservation
 * @access  Public (with token)
 */
router.delete('/:token', [param('token').notEmpty()], async (req, res) => {
  try {
    const reservation = await guestReservationService.cancelGuestReservation(req.params.token);

    res.json({
      success: true,
      data: reservation,
      message: 'Reservation cancelled successfully',
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to cancel reservation',
    });
  }
});

/**
 * @route   GET /api/guest-reservations/restaurant/:restaurantId
 * @desc    Get all guest reservations for a restaurant
 * @access  Private (Restaurant staff)
 */
router.get(
  '/restaurant/:restaurantId',
  [
    param('restaurantId').isUUID(),
    query('status').optional().isString(),
    query('dateFrom').optional().isISO8601(),
    query('dateTo').optional().isISO8601(),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
  ],
  async (req, res) => {
    try {
      const { reservations, total } = await guestReservationService.getRestaurantGuestReservations(
        req.params.restaurantId,
        req.query as any
      );

      res.json({
        success: true,
        data: reservations,
        pagination: {
          total,
          page: parseInt(req.query.page as string) || 1,
          limit: parseInt(req.query.limit as string) || 20,
        },
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to retrieve reservations',
      });
    }
  }
);

/**
 * @route   GET /api/guest-reservations/search
 * @desc    Search guest reservations
 * @access  Private
 */
router.get(
  '/search',
  [query('q').notEmpty().withMessage('Search query is required')],
  async (req, res) => {
    try {
      const reservations = await guestReservationService.searchGuestReservations(
        req.query.q as string
      );

      res.json({
        success: true,
        data: reservations,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to search reservations',
      });
    }
  }
);

/**
 * @route   GET /api/guest-reservations/stats/:restaurantId
 * @desc    Get guest reservation statistics
 * @access  Private (Restaurant staff)
 */
router.get('/stats/:restaurantId', [param('restaurantId').isUUID()], async (req, res) => {
  try {
    const stats = await guestReservationService.getGuestReservationStats(req.params.restaurantId);

    res.json({
      success: true,
      data: stats,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to retrieve statistics',
    });
    }
  }
);

export default router;
