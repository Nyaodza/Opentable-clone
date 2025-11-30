import { Router } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { PrivateDiningEvent } from '../models/PrivateDiningEvent';

const router = Router();

/**
 * @route   POST /api/private-dining
 * @desc    Create private dining event request
 * @access  Private
 */
router.post(
  '/',
  [
    body('restaurantId').isUUID(),
    body('eventName').notEmpty(),
    body('eventType').isIn(['wedding', 'corporate', 'birthday', 'anniversary', 'holiday', 'meeting', 'other']),
    body('date').isISO8601(),
    body('startTime').matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
    body('endTime').matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
    body('guestCount').isInt({ min: 10, max: 500 }),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const userId = (req as any).user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }

      const event = await PrivateDiningEvent.create({
        ...req.body,
        userId,
        restaurantId: req.body.restaurantId,
      });

      res.status(201).json({
        success: true,
        data: event,
        message: 'Private dining request submitted successfully',
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }
);

/**
 * @route   GET /api/private-dining/:id
 * @desc    Get private dining event
 * @access  Private
 */
router.get('/:id', [param('id').isUUID()], async (req, res) => {
  try {
    const event = await PrivateDiningEvent.findByPk(req.params.id);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found',
      });
    }

    res.json({
      success: true,
      data: event,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * @route   GET /api/private-dining/restaurant/:restaurantId
 * @desc    Get all private dining events for restaurant
 * @access  Private
 */
router.get(
  '/restaurant/:restaurantId',
  [param('restaurantId').isUUID()],
  async (req, res) => {
    try {
      const events = await PrivateDiningEvent.findAll({
        where: { restaurantId: req.params.restaurantId },
        order: [['date', 'ASC']],
      });

      res.json({
        success: true,
        data: events,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }
);

/**
 * @route   PATCH /api/private-dining/:id/status
 * @desc    Update event status
 * @access  Private (Restaurant staff)
 */
router.patch(
  '/:id/status',
  [
    param('id').isUUID(),
    body('status').isIn(['pending', 'confirmed', 'contract_sent', 'deposit_paid', 'completed', 'cancelled']),
  ],
  async (req, res) => {
    try {
      const event = await PrivateDiningEvent.findByPk(req.params.id);

      if (!event) {
        return res.status(404).json({
          success: false,
          message: 'Event not found',
        });
      }

      await event.update({ status: req.body.status });

      res.json({
        success: true,
        data: event,
        message: 'Status updated successfully',
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }
);

export default router;
