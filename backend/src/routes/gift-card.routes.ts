import { Router } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import giftCardService from '../services/gift-card.service';

const router = Router();

/**
 * @route   POST /api/gift-cards/purchase
 * @desc    Purchase a gift card
 * @access  Public/Authenticated
 */
router.post(
  '/purchase',
  [
    body('amount').isFloat({ min: 25, max: 1000 }).withMessage('Amount must be between $25 and $1000'),
    body('recipientEmail').optional().isEmail(),
    body('recipientName').optional().isString(),
    body('message').optional().isString().isLength({ max: 500 }),
    body('designTemplate').optional().isString(),
    body('isPhysicalCard').optional().isBoolean(),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const giftCard = await giftCardService.purchaseGiftCard({
        ...req.body,
        purchasedBy: (req as any).user?.id || null,
      });

      res.status(201).json({
        success: true,
        data: {
          id: giftCard.id,
          code: giftCard.code,
          pin: giftCard.pin,
          amount: giftCard.initialAmount,
          expirationDate: giftCard.expirationDate,
        },
        message: 'Gift card purchased successfully',
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to purchase gift card',
      });
    }
  }
);

/**
 * @route   POST /api/gift-cards/check-balance
 * @desc    Check gift card balance
 * @access  Public
 */
router.post(
  '/check-balance',
  [
    body('code').notEmpty().withMessage('Gift card code is required'),
    body('pin').notEmpty().withMessage('PIN is required'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { code, pin } = req.body;
      const result = await giftCardService.checkBalance(code, pin);

      res.json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to check balance',
      });
    }
  }
);

/**
 * @route   POST /api/gift-cards/redeem
 * @desc    Redeem gift card
 * @access  Public/Authenticated
 */
router.post(
  '/redeem',
  [
    body('code').notEmpty().withMessage('Gift card code is required'),
    body('pin').notEmpty().withMessage('PIN is required'),
    body('amount').isFloat({ min: 0.01 }).withMessage('Amount must be greater than 0'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const giftCard = await giftCardService.redeemGiftCard({
        ...req.body,
        userId: (req as any).user?.id || null,
      });

      res.json({
        success: true,
        data: {
          remainingBalance: giftCard.currentBalance,
          status: giftCard.status,
        },
        message: 'Gift card redeemed successfully',
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to redeem gift card',
      });
    }
  }
);

/**
 * @route   GET /api/gift-cards/my-cards
 * @desc    Get user's gift cards (purchased and redeemed)
 * @access  Private
 */
router.get('/my-cards', async (req, res) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const [purchased, redeemed] = await Promise.all([
      giftCardService.getUserPurchasedGiftCards(userId),
      giftCardService.getUserRedeemedGiftCards(userId),
    ]);

    res.json({
      success: true,
      data: {
        purchased,
        redeemed,
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to retrieve gift cards',
    });
  }
});

/**
 * @route   POST /api/gift-cards/validate
 * @desc    Validate gift card for use
 * @access  Public
 */
router.post(
  '/validate',
  [
    body('code').notEmpty(),
    body('pin').notEmpty(),
    body('amount').optional().isFloat({ min: 0.01 }),
  ],
  async (req, res) => {
    try {
      const { code, pin, amount } = req.body;
      const isValid = await giftCardService.validateGiftCard(code, pin, amount);

      res.json({
        success: true,
        data: { isValid },
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to validate gift card',
      });
    }
  }
);

/**
 * @route   GET /api/gift-cards/stats
 * @desc    Get gift card statistics
 * @access  Private (Admin)
 */
router.get('/stats', async (req, res) => {
  try {
    const stats = await giftCardService.getStatistics();

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
});

export default router;
