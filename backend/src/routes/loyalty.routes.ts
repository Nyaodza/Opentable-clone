import { Router } from 'express';
import { body } from 'express-validator';
import * as loyaltyController from '../controllers/loyalty.controller';
import { authenticate, requireAdmin, authorize ,authorize} from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import { UserRole } from '../models/User';

const router = Router();

// Get user's loyalty status
router.get('/status', authenticate, loyaltyController.getLoyaltyStatus);

// Get available rewards
router.get('/rewards', authenticate, loyaltyController.getRewards);

// Get my redeemed rewards
router.get('/my-rewards', authenticate, loyaltyController.getMyRewards);

// Redeem a reward
router.post(
  '/redeem',
  authenticate,
  [body('rewardId').isUUID()],
  validate,
  loyaltyController.redeemReward
);

// Use a reward (for restaurant staff)
router.post(
  '/use',
  authenticate,
  [body('redemptionCode').trim().notEmpty()],
  validate,
  loyaltyController.useReward
);

// Award points (admin only)
router.post(
  '/award-points',
  authenticate,
  authorize(UserRole.ADMIN),
  [
    body('userId').isUUID(),
    body('points').isInt({ min: 1 }),
    body('description').trim().notEmpty(),
    body('referenceId').optional().trim(),
    body('restaurantId').optional().isUUID()
  ],
  validate,
  loyaltyController.awardPoints
);

export default router;