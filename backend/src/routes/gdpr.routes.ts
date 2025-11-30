import { Router } from 'express';
import gdprService from '../services/gdpr.service';

const router = Router();

/**
 * @route   POST /api/gdpr/export-request
 * @desc    Request data export (GDPR Article 15)
 * @access  Private
 */
router.post('/export-request', async (req, res) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const request = await gdprService.requestDataExport(userId);

    res.json({
      success: true,
      data: request,
      message: 'Data export request created. You will receive an email when ready (within 30 days).',
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * @route   GET /api/gdpr/export-request/:requestId
 * @desc    Get data export request status
 * @access  Private
 */
router.get('/export-request/:requestId', async (req, res) => {
  try {
    const request = await gdprService.getExportRequest(req.params.requestId);

    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Export request not found',
      });
    }

    res.json({
      success: true,
      data: request,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * @route   POST /api/gdpr/deletion-request
 * @desc    Request account deletion (GDPR Article 17)
 * @access  Private
 */
router.post('/deletion-request', async (req, res) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const request = await gdprService.requestDataDeletion(userId, req.body.reason);

    res.json({
      success: true,
      data: request,
      message: 'Deletion scheduled for 30 days from now. You can cancel anytime before then.',
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * @route   POST /api/gdpr/deletion-request/:requestId/cancel
 * @desc    Cancel deletion request
 * @access  Private
 */
router.post('/deletion-request/:requestId/cancel', async (req, res) => {
  try {
    const request = await gdprService.cancelDeletionRequest(req.params.requestId);

    res.json({
      success: true,
      data: request,
      message: 'Deletion request cancelled successfully',
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * @route   GET /api/gdpr/consent-preferences
 * @desc    Get user's consent preferences
 * @access  Private
 */
router.get('/consent-preferences', async (req, res) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const preferences = await gdprService.getConsentPreferences(userId);

    res.json({
      success: true,
      data: preferences,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * @route   PUT /api/gdpr/consent-preferences
 * @desc    Update consent preferences
 * @access  Private
 */
router.put('/consent-preferences', async (req, res) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    await gdprService.updateConsentPreferences(userId, req.body);

    res.json({
      success: true,
      message: 'Preferences updated successfully',
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * @route   GET /api/gdpr/activity-log
 * @desc    Get user activity log
 * @access  Private
 */
router.get('/activity-log', async (req, res) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const log = await gdprService.getUserActivityLog(userId);

    res.json({
      success: true,
      data: log,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

export default router;
