import { Router } from 'express';
import { body, param, validationResult } from 'express-validator';
import depositService from '../services/deposit.service';

const router = Router();

/**
 * @route   POST /api/deposits/create-intent
 * @desc    Create payment intent for deposit
 * @access  Private
 */
router.post(
  '/create-intent',
  [
    body('reservationId').isUUID(),
    body('restaurantId').isUUID(),
    body('amount').isFloat({ min: 1 }),
    body('type').isIn(['deposit', 'prepayment', 'no_show_fee']),
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

      const result = await depositService.createDepositIntent({
        ...req.body,
        userId,
      });

      res.json({
        success: true,
        data: result,
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
 * @route   POST /api/deposits/:depositId/requireAdmin
 * @desc    Authorize deposit (hold funds)
 * @access  Private
 */
router.post('/:depositId/authorize', [param('depositId').isUUID()], async (req, res) => {
  try {
    const deposit = await depositService.authorizeDeposit(req.params.depositId);

    res.json({
      success: true,
      data: deposit,
      message: 'Deposit authorized successfully',
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * @route   POST /api/deposits/:depositId/capture
 * @desc    Capture deposit (charge card)
 * @access  Private (Restaurant staff)
 */
router.post('/:depositId/capture', [param('depositId').isUUID()], async (req, res) => {
  try {
    const deposit = await depositService.captureDeposit(req.params.depositId);

    res.json({
      success: true,
      data: deposit,
      message: 'Deposit captured successfully',
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * @route   POST /api/deposits/:depositId/refund
 * @desc    Refund deposit
 * @access  Private
 */
router.post(
  '/:depositId/refund',
  [
    param('depositId').isUUID(),
    body('amount').optional().isFloat({ min: 0.01 }),
    body('reason').optional().isString(),
  ],
  async (req, res) => {
    try {
      const deposit = await depositService.refundDeposit(
        req.params.depositId,
        req.body.amount,
        req.body.reason
      );

      res.json({
        success: true,
        data: deposit,
        message: 'Deposit refunded successfully',
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
 * @route   GET /api/deposits/reservation/:reservationId
 * @desc    Get deposit by reservation
 * @access  Private
 */
router.get('/reservation/:reservationId', [param('reservationId').isUUID()], async (req, res) => {
  try {
    const deposit = await depositService.getDepositByReservation(req.params.reservationId);

    res.json({
      success: true,
      data: deposit,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * @route   GET /api/deposits/restaurant/:restaurantId
 * @desc    Get restaurant deposits
 * @access  Private (Restaurant staff)
 */
router.get('/restaurant/:restaurantId', [param('restaurantId').isUUID()], async (req, res) => {
  try {
    const deposits = await depositService.getRestaurantDeposits(
      req.params.restaurantId,
      req.query.status as string
    );

    res.json({
      success: true,
      data: deposits,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * @route   POST /api/deposits/calculate
 * @desc    Calculate deposit amount
 * @access  Public
 */
router.post(
  '/calculate',
  [
    body('restaurantId').isUUID(),
    body('partySize').isInt({ min: 1, max: 50 }),
    body('date').isISO8601(),
  ],
  async (req, res) => {
    try {
      const { restaurantId, partySize, date } = req.body;
      const result = await depositService.calculateDepositAmount(
        restaurantId,
        partySize,
        new Date(date)
      );

      res.json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }
);

export default router;
