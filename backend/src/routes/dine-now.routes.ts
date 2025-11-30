import { Router } from 'express';
import { query, body, validationResult } from 'express-validator';
import dineNowService from '../services/dine-now.service';

const router = Router();

/**
 * @route   GET /api/dine-now
 * @desc    Find restaurants with immediate availability
 * @access  Public
 */
router.get(
  '/',
  [
    query('latitude').optional().isFloat(),
    query('longitude').optional().isFloat(),
    query('partySize').optional().isInt({ min: 1, max: 20 }),
    query('maxDistance').optional().isInt({ min: 1, max: 50 }),
    query('cuisine').optional().isString(),
    query('priceRange').optional().isString(),
    query('limit').optional().isInt({ min: 1, max: 50 }),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const params = {
        latitude: req.query.latitude ? parseFloat(req.query.latitude as string) : undefined,
        longitude: req.query.longitude ? parseFloat(req.query.longitude as string) : undefined,
        partySize: req.query.partySize ? parseInt(req.query.partySize as string) : undefined,
        maxDistance: req.query.maxDistance ? parseInt(req.query.maxDistance as string) : undefined,
        cuisine: req.query.cuisine as string,
        priceRange: req.query.priceRange as string,
        limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
      };

      const restaurants = await dineNowService.findDineNowRestaurants(params);

      res.json({
        success: true,
        data: restaurants,
        count: restaurants.length,
        message: restaurants.length > 0 
          ? 'Found restaurants with immediate availability' 
          : 'No restaurants available right now. Try booking for later.',
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to find available restaurants',
      });
    }
  }
);

/**
 * @route   POST /api/dine-now/book
 * @desc    Create immediate reservation (Dine Now booking)
 * @access  Public/Authenticated
 */
router.post(
  '/book',
  [
    body('restaurantId').isUUID().withMessage('Valid restaurant ID is required'),
    body('partySize').isInt({ min: 1, max: 20 }).withMessage('Party size must be between 1 and 20'),
    body('guestEmail').optional().isEmail(),
    body('guestName').optional().isString(),
    body('guestPhone').optional().isString(),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { restaurantId, partySize, guestEmail, guestName, guestPhone } = req.body;
      const userId = (req as any).user?.id || null;

      const result = await dineNowService.createDineNowReservation(
        restaurantId,
        userId,
        { guestEmail, guestName, guestPhone },
        partySize
      );

      res.status(201).json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to create immediate reservation',
      });
    }
  }
);

/**
 * @route   GET /api/dine-now/check-availability/:restaurantId
 * @desc    Check if restaurant has immediate availability
 * @access  Public
 */
router.get(
  '/check-availability/:restaurantId',
  [
    query('partySize').isInt({ min: 1, max: 20 }),
  ],
  async (req, res) => {
    try {
      const partySize = parseInt(req.query.partySize as string);
      const now = new Date();
      const date = now.toISOString().split('T')[0];
      const time = now.toTimeString().split(' ')[0].substring(0, 5);

      const availability = await dineNowService.checkImmediateAvailability(
        req.params.restaurantId,
        partySize,
        date,
        time
      );

      res.json({
        success: true,
        data: availability,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to check availability',
      });
    }
  }
);

export default router;
