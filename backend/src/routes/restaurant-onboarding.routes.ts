import { Router } from 'express';
import { param, body, validationResult } from 'express-validator';
import restaurantOnboardingService from '../services/restaurant-onboarding.service';

const router = Router();

/**
 * @route   POST /api/restaurant-onboarding/initialize
 * @desc    Initialize onboarding for a restaurant
 * @access  Private
 */
router.post(
  '/initialize',
  [body('restaurantId').isUUID()],
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

      const onboarding = await restaurantOnboardingService.initializeOnboarding(
        req.body.restaurantId,
        userId
      );

      res.json({
        success: true,
        data: onboarding,
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
 * @route   GET /api/restaurant-onboarding/:restaurantId/progress
 * @desc    Get onboarding progress
 * @access  Private
 */
router.get('/:restaurantId/progress', [param('restaurantId').isUUID()], async (req, res) => {
  try {
    const progress = await restaurantOnboardingService.getProgress(req.params.restaurantId);

    res.json({
      success: true,
      data: progress,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * @route   GET /api/restaurant-onboarding/:restaurantId/checklist
 * @desc    Get onboarding checklist
 * @access  Private
 */
router.get('/:restaurantId/checklist', [param('restaurantId').isUUID()], async (req, res) => {
  try {
    const checklist = await restaurantOnboardingService.getChecklist(req.params.restaurantId);

    res.json({
      success: true,
      data: checklist,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * @route   POST /api/restaurant-onboarding/:restaurantId/step/:step
 * @desc    Complete a step
 * @access  Private
 */
router.post(
  '/:restaurantId/step/:step',
  [param('restaurantId').isUUID(), param('step').isString()],
  async (req, res) => {
    try {
      // Save step data if provided
      if (req.body.data) {
        await restaurantOnboardingService.saveStepData(
          req.params.restaurantId,
          req.params.step,
          req.body.data
        );
      }

      // Complete step
      const onboarding = await restaurantOnboardingService.completeStep(
        req.params.restaurantId,
        req.params.step
      );

      res.json({
        success: true,
        data: onboarding,
        message: 'Step completed successfully',
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
