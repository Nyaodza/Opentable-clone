import { Router } from 'express';
import enhancedLoyaltyController from '../controllers/loyalty-enhanced.controller';

const router = Router();

// Program management
router.post('/programs', enhancedLoyaltyController.createProgram);
router.get('/programs/:programId/analytics', enhancedLoyaltyController.getProgramAnalytics);

// Member enrollment and management
router.post('/enroll', enhancedLoyaltyController.enrollMember);
router.get('/members/:memberId', enhancedLoyaltyController.getMemberDetails);
router.get('/members/:memberId/history', enhancedLoyaltyController.getMemberHistory);
router.get('/members/:memberId/badges', enhancedLoyaltyController.getMemberBadges);

// Points system
router.post('/points/earn', enhancedLoyaltyController.earnPoints);
router.post('/points/redeem', enhancedLoyaltyController.redeemPoints);

// Gamification
router.post('/challenges/:challengeId/join', enhancedLoyaltyController.joinChallenge);
router.get('/leaderboards/:programId', enhancedLoyaltyController.getLeaderboard);

export default router;