import { Router } from 'express';
import { param, validationResult } from 'express-validator';
import socialProofService from '../services/social-proof.service';

const router = Router();

/**
 * @route   GET /api/social-proof/:restaurantId
 * @desc    Get social proof indicators for restaurant
 * @access  Public
 */
router.get('/:restaurantId', [param('restaurantId').isUUID()], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const socialProof = await socialProofService.getSocialProof(req.params.restaurantId);

    res.json({
      success: true,
      data: socialProof,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * @route   POST /api/social-proof/:restaurantId/track-view
 * @desc    Track restaurant page view
 * @access  Public
 */
router.post('/:restaurantId/track-view', [param('restaurantId').isUUID()], async (req, res) => {
  try {
    const userId = (req as any).user?.id;
    await socialProofService.trackView(req.params.restaurantId, userId);

    res.json({
      success: true,
      message: 'View tracked',
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * @route   GET /api/social-proof/:restaurantId/viewers
 * @desc    Get current viewers count
 * @access  Public
 */
router.get('/:restaurantId/viewers', [param('restaurantId').isUUID()], async (req, res) => {
  try {
    const count = await socialProofService.getCurrentViewers(req.params.restaurantId);

    res.json({
      success: true,
      data: { viewers: count },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * @route   GET /api/social-proof/:restaurantId/rank
 * @desc    Get popularity rank
 * @access  Public
 */
router.get('/:restaurantId/rank', [param('restaurantId').isUUID()], async (req, res) => {
  try {
    const rank = await socialProofService.getPopularityRank(req.params.restaurantId);

    res.json({
      success: true,
      data: { rank },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * @route   GET /api/social-proof/:restaurantId/recent-bookings
 * @desc    Get recent booking notifications
 * @access  Public
 */
router.get('/:restaurantId/recent-bookings', [param('restaurantId').isUUID()], async (req, res) => {
  try {
    const notifications = await socialProofService.getRecentBookingNotifications(
      req.params.restaurantId
    );

    res.json({
      success: true,
      data: notifications,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

export default router;
