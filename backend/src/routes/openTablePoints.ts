// backend/src/routes/openTablePoints.ts
import { Router } from 'express';
import { OpenTablePointsService } from '../services/OpenTablePointsService';
import { authenticateToken,  requireAdminUser } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';
import { body, param, query } from 'express-validator';

const router = Router();
const pointsService = new OpenTablePointsService();

/**
 * @route GET /api/opentable-points/account
 * @desc Get user's points account
 * @access Private
 */
router.get(
  '/account',
  authenticateToken,
  async (req, res) => {
    try {
      const userId = req.user.id;
      const account = await pointsService.getOrCreateAccount(userId);

      res.json({
        success: true,
        data: account
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve points account',
        error: process.env.NODE_ENV === 'development' ? error : undefined
      });
    }
  }
);

/**
 * @route GET /api/opentable-points/summary
 * @desc Get comprehensive points summary for user
 * @access Private
 */
router.get(
  '/summary',
  authenticateToken,
  async (req, res) => {
    try {
      const userId = req.user.id;
      const summary = await pointsService.getPointsSummary(userId);

      res.json({
        success: true,
        message: 'Points summary retrieved',
        data: summary
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve points summary',
        error: process.env.NODE_ENV === 'development' ? error : undefined
      });
    }
  }
);

/**
 * @route POST /api/opentable-points/earn/reservation
 * @desc Award points for completed reservation
 * @access Private (Restaurant Staff Only)
 */
router.post(
  '/earn/reservation',
  authenticateToken,
  authorizeUser(['restaurant_staff', 'admin']),
  [
    body('reservationId').isUUID().withMessage('Valid reservation ID required')
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { reservationId } = req.body;
      const transaction = await pointsService.awardReservationPoints(reservationId);

      res.json({
        success: true,
        message: 'Points awarded for reservation',
        data: transaction
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to award points',
        error: process.env.NODE_ENV === 'development' ? error : undefined
      });
    }
  }
);

/**
 * @route POST /api/opentable-points/earn/review
 * @desc Award points for writing review
 * @access Private
 */
router.post(
  '/earn/review',
  authenticateToken,
  [
    body('restaurantName').isString().withMessage('Restaurant name required'),
    body('reviewLength').isInt({ min: 10 }).withMessage('Review length required'),
    body('includesPhoto').isBoolean().withMessage('Photo inclusion flag required'),
    body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating required')
  ],
  validateRequest,
  async (req, res) => {
    try {
      const userId = req.user.id;
      const reviewDetails = req.body;

      const transaction = await pointsService.awardReviewPoints(userId, reviewDetails);

      res.json({
        success: true,
        message: 'Points awarded for review',
        data: transaction
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: 'Failed to award review points',
        error: process.env.NODE_ENV === 'development' ? error : undefined
      });
    }
  }
);

/**
 * @route POST /api/opentable-points/earn/birthday
 * @desc Award birthday bonus points
 * @access Private
 */
router.post(
  '/earn/birthday',
  authenticateToken,
  async (req, res) => {
    try {
      const userId = req.user.id;
      const transaction = await pointsService.awardBirthdayBonus(userId);

      if (!transaction) {
        return res.status(400).json({
          success: false,
          message: 'Birthday bonus already awarded this year'
        });
      }

      res.json({
        success: true,
        message: 'Birthday bonus points awarded',
        data: transaction
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: 'Failed to award birthday bonus',
        error: process.env.NODE_ENV === 'development' ? error : undefined
      });
    }
  }
);

/**
 * @route POST /api/opentable-points/redeem
 * @desc Redeem points for rewards
 * @access Private
 */
router.post(
  '/redeem',
  authenticateToken,
  [
    body('itemId').isUUID().withMessage('Valid item ID required'),
    body('quantity').optional().isInt({ min: 1, max: 10 }).withMessage('Quantity must be between 1 and 10')
  ],
  validateRequest,
  async (req, res) => {
    try {
      const userId = req.user.id;
      const { itemId, quantity = 1 } = req.body;

      const redemption = await pointsService.redeemPoints(userId, itemId, quantity);

      res.json({
        success: true,
        message: 'Points redeemed successfully',
        data: redemption
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to redeem points',
        error: process.env.NODE_ENV === 'development' ? error : undefined
      });
    }
  }
);

/**
 * @route GET /api/opentable-points/catalog
 * @desc Get redemption catalog
 * @access Private
 */
router.get(
  '/catalog',
  authenticateToken,
  [
    query('category').optional().isIn(['dining_rewards', 'experiences', 'merchandise']),
    query('restaurantId').optional().isUUID()
  ],
  validateRequest,
  async (req, res) => {
    try {
      const userId = req.user.id;
      const { category, restaurantId } = req.query;

      const catalog = await pointsService.getRedemptionCatalog(
        userId,
        category as any,
        restaurantId as string
      );

      res.json({
        success: true,
        data: catalog
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve redemption catalog',
        error: process.env.NODE_ENV === 'development' ? error : undefined
      });
    }
  }
);

/**
 * @route POST /api/opentable-points/transfer
 * @desc Transfer points between users
 * @access Private (Admin Only)
 */
router.post(
  '/transfer',
  authenticateToken,
  authorizeUser(['admin']),
  [
    body('fromUserId').isUUID().withMessage('Valid from user ID required'),
    body('toUserId').isUUID().withMessage('Valid to user ID required'),
    body('points').isInt({ min: 1 }).withMessage('Points amount required'),
    body('reason').isString().isLength({ min: 5, max: 200 }).withMessage('Reason required')
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { fromUserId, toUserId, points, reason } = req.body;

      const transfer = await pointsService.transferPoints(
        fromUserId,
        toUserId,
        points,
        reason
      );

      res.json({
        success: true,
        message: 'Points transferred successfully',
        data: transfer
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to transfer points',
        error: process.env.NODE_ENV === 'development' ? error : undefined
      });
    }
  }
);

/**
 * @route GET /api/opentable-points/transactions
 * @desc Get user's points transaction history
 * @access Private
 */
router.get(
  '/transactions',
  authenticateToken,
  [
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('offset').optional().isInt({ min: 0 }),
    query('type').optional().isIn(['all', 'earned', 'redeemed', 'expired', 'transferred'])
  ],
  validateRequest,
  async (req, res) => {
    try {
      const userId = req.user.id;
      const { limit = 20, offset = 0, type = 'all' } = req.query;

      // Get transactions from summary (which includes recent transactions)
      const summary = await pointsService.getPointsSummary(userId);
      
      // Filter by type if specified
      let transactions = summary.recentTransactions;
      if (type !== 'all') {
        transactions = transactions.filter(t => {
          switch (type) {
            case 'earned':
              return t.pointsChange > 0;
            case 'redeemed':
              return t.pointsChange < 0 && t.transactionType !== 'EXPIRED';
            case 'expired':
              return t.transactionType === 'EXPIRED';
            case 'transferred':
              return t.transactionType === 'TRANSFERRED';
            default:
              return true;
          }
        });
      }

      res.json({
        success: true,
        data: {
          transactions,
          pagination: {
            total: transactions.length,
            limit: parseInt(limit as string),
            offset: parseInt(offset as string)
          }
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve transactions',
        error: process.env.NODE_ENV === 'development' ? error : undefined
      });
    }
  }
);

/**
 * @route GET /api/opentable-points/tier-progress
 * @desc Get user's tier progress and benefits
 * @access Private
 */
router.get(
  '/tier-progress',
  authenticateToken,
  async (req, res) => {
    try {
      const userId = req.user.id;
      const summary = await pointsService.getPointsSummary(userId);

      res.json({
        success: true,
        data: {
          currentTier: summary.tierProgress.currentTier,
          pointsToNext: summary.tierProgress.pointsToNext,
          nextTier: summary.tierProgress.nextTier,
          progress: summary.tierProgress.progress,
          currentBenefits: summary.account.getTierBenefits()
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve tier progress',
        error: process.env.NODE_ENV === 'development' ? error : undefined
      });
    }
  }
);

/**
 * @route POST /api/opentable-points/expire
 * @desc Manually expire old points (Admin only)
 * @access Private (Admin Only)
 */
router.post(
  '/expire',
  authenticateToken,
  authorizeUser(['admin']),
  async (req, res) => {
    try {
      const expiredPoints = await pointsService.expireOldPoints();

      res.json({
        success: true,
        message: 'Points expiration process completed',
        data: {
          totalPointsExpired: expiredPoints
        }
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: 'Failed to expire points',
        error: process.env.NODE_ENV === 'development' ? error : undefined
      });
    }
  }
);

/**
 * @route GET /api/opentable-points/analytics
 * @desc Get points program analytics
 * @access Private (Admin Only)
 */
router.get(
  '/analytics',
  authenticateToken,
  authorizeUser(['admin']),
  [
    query('startDate').isISO8601().withMessage('Valid start date required'),
    query('endDate').isISO8601().withMessage('Valid end date required')
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { startDate, endDate } = req.query;

      const analytics = await pointsService.getPointsAnalytics({
        startDate: new Date(startDate as string),
        endDate: new Date(endDate as string)
      });

      res.json({
        success: true,
        message: 'Points analytics retrieved',
        data: analytics
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve analytics',
        error: process.env.NODE_ENV === 'development' ? error : undefined
      });
    }
  }
);

/**
 * @route GET /api/opentable-points/leaderboard
 * @desc Get points leaderboard for gamification
 * @access Private
 */
router.get(
  '/leaderboard',
  authenticateToken,
  [
    query('period').optional().isIn(['week', 'month', 'year', 'all']),
    query('limit').optional().isInt({ min: 1, max: 100 })
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { period = 'month', limit = 10 } = req.query;

      // Mock leaderboard data - would implement actual leaderboard logic
      const leaderboard = {
        period,
        updated: new Date(),
        rankings: [
          { rank: 1, userId: 'user1', points: 15420, tier: 'platinum' },
          { rank: 2, userId: 'user2', points: 12340, tier: 'gold' },
          // ... more entries
        ],
        userRank: {
          rank: 45,
          points: 2340,
          tier: 'silver'
        }
      };

      res.json({
        success: true,
        data: leaderboard
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve leaderboard',
        error: process.env.NODE_ENV === 'development' ? error : undefined
      });
    }
  }
);

export default router;
