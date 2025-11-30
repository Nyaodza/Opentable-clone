import express from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validation';
import { SocialDiningService } from '../services/social-dining.service';
import { AIConciergeService } from '../services/ai-concierge.service';
import { SustainabilityService } from '../services/sustainability.service';
import { BlockchainLoyaltyService } from '../services/blockchain-loyalty.service';
import { VoiceIoTService } from '../services/voice-iot.service';
import { VirtualExperienceService } from '../services/virtual-experience.service';
import { body, param, query } from 'express-validator';

const router = express.Router();

// Initialize services
const socialDiningService = new SocialDiningService();
const aiConciergeService = new AIConciergeService();
const sustainabilityService = new SustainabilityService();
const blockchainLoyaltyService = new BlockchainLoyaltyService();
const voiceIoTService = new VoiceIoTService();
const virtualExperienceService = new VirtualExperienceService();

// Social Dining Routes
router.post('/social-dining/groups', 
  authenticate,
  [
    body('name').notEmpty().withMessage('Group name is required'),
    body('maxMembers').optional().isInt({ min: 2, max: 50 }),
    body('preferences').optional().isObject()
  ],
  validateRequest,
  async (req, res) => {
    try {
      const group = await socialDiningService.createGroup(req.user.id, req.body);
      res.status(201).json({ success: true, data: group });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  }
);

router.get('/social-dining/groups/:id',
  authenticate,
  param('id').isUUID(),
  validateRequest,
  async (req, res) => {
    try {
      const group = await socialDiningService.getGroup(req.params.id, req.user.id);
      res.json({ success: true, data: group });
    } catch (error) {
      res.status(404).json({ success: false, error: error.message });
    }
  }
);

router.post('/social-dining/groups/:id/invite',
  authenticate,
  [
    param('id').isUUID(),
    body('userIds').isArray().withMessage('User IDs must be an array')
  ],
  validateRequest,
  async (req, res) => {
    try {
      await socialDiningService.inviteMembers(req.params.id, req.user.id, req.body.userIds);
      res.json({ success: true, message: 'Invitations sent successfully' });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  }
);

// AI Concierge Routes
router.post('/ai-concierge/chat',
  authenticate,
  [
    body('message').notEmpty().withMessage('Message is required'),
    body('context').optional().isObject()
  ],
  validateRequest,
  async (req, res) => {
    try {
      const response = await aiConciergeService.processMessage(
        req.user.id,
        req.body.message,
        req.body.context
      );
      res.json({ success: true, data: response });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

// Sustainability Routes
router.get('/sustainability/restaurant/:id/metrics',
  param('id').isUUID(),
  validateRequest,
  async (req, res) => {
    try {
      const metrics = await sustainabilityService.getRestaurantMetrics(req.params.id);
      res.json({ success: true, data: metrics });
    } catch (error) {
      res.status(404).json({ success: false, error: error.message });
    }
  }
);

router.get('/sustainability/user/profile',
  authenticate,
  async (req, res) => {
    try {
      const profile = await sustainabilityService.getUserProfile(req.user.id);
      res.json({ success: true, data: profile });
    } catch (error) {
      res.status(404).json({ success: false, error: error.message });
    }
  }
);

router.put('/sustainability/user/preferences',
  authenticate,
  [
    body('prioritizeLocalSourcing').optional().isBoolean(),
    body('prioritizeLowCarbon').optional().isBoolean(),
    body('minimumSustainabilityRating').optional().isFloat({ min: 0, max: 5 })
  ],
  validateRequest,
  async (req, res) => {
    try {
      await sustainabilityService.updateUserPreferences(req.user.id, req.body);
      res.json({ success: true, message: 'Preferences updated successfully' });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  }
);

// Blockchain Loyalty Routes
router.get('/blockchain/loyalty/account',
  authenticate,
  async (req, res) => {
    try {
      const account = await blockchainLoyaltyService.getLoyaltyAccount(req.user.id);
      res.json({ success: true, data: account });
    } catch (error) {
      res.status(404).json({ success: false, error: error.message });
    }
  }
);

router.post('/blockchain/loyalty/earn',
  authenticate,
  [
    body('amount').isFloat({ min: 0 }).withMessage('Amount must be positive'),
    body('sourceType').notEmpty().withMessage('Source type is required'),
    body('sourceId').optional().isUUID()
  ],
  validateRequest,
  async (req, res) => {
    try {
      const transaction = await blockchainLoyaltyService.earnTokens({
        userId: req.user.id,
        ...req.body
      });
      res.status(201).json({ success: true, data: transaction });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  }
);

router.post('/blockchain/loyalty/redeem',
  authenticate,
  [
    body('amount').isFloat({ min: 0 }).withMessage('Amount must be positive'),
    body('rewardType').notEmpty().withMessage('Reward type is required')
  ],
  validateRequest,
  async (req, res) => {
    try {
      const transaction = await blockchainLoyaltyService.redeemTokens({
        userId: req.user.id,
        ...req.body
      });
      res.status(201).json({ success: true, data: transaction });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  }
);

router.post('/blockchain/loyalty/stake',
  authenticate,
  [
    body('amount').isFloat({ min: 100 }).withMessage('Minimum staking amount is 100 tokens'),
    body('duration').isInt({ min: 30 }).withMessage('Minimum staking duration is 30 days')
  ],
  validateRequest,
  async (req, res) => {
    try {
      const transaction = await blockchainLoyaltyService.stakeTokens({
        userId: req.user.id,
        ...req.body
      });
      res.status(201).json({ success: true, data: transaction });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  }
);

router.get('/blockchain/loyalty/transactions',
  authenticate,
  [
    query('limit').optional().isInt({ min: 1, max: 100 })
  ],
  validateRequest,
  async (req, res) => {
    try {
      const transactions = await blockchainLoyaltyService.getTransactionHistory(
        req.user.id,
        parseInt(req.query.limit as string) || 50
      );
      res.json({ success: true, data: transactions });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

router.get('/blockchain/loyalty/leaderboard',
  [
    query('limit').optional().isInt({ min: 1, max: 100 })
  ],
  validateRequest,
  async (req, res) => {
    try {
      const leaderboard = await blockchainLoyaltyService.getLeaderboard(
        parseInt(req.query.limit as string) || 100
      );
      res.json({ success: true, data: leaderboard });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

// Virtual Experience Routes
router.get('/virtual-experiences',
  [
    query('experienceType').optional().isString(),
    query('restaurantId').optional().isUUID(),
    query('maxPrice').optional().isFloat({ min: 0 }),
    query('difficulty').optional().isIn(['beginner', 'intermediate', 'advanced']),
    query('limit').optional().isInt({ min: 1, max: 50 })
  ],
  validateRequest,
  async (req, res) => {
    try {
      const experiences = await virtualExperienceService.searchExperiences(req.query);
      res.json({ success: true, data: experiences });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

router.get('/virtual-experiences/:id',
  param('id').isUUID(),
  validateRequest,
  async (req, res) => {
    try {
      const experience = await virtualExperienceService.getExperienceById(req.params.id);
      if (!experience) {
        return res.status(404).json({ success: false, error: 'Virtual experience not found' });
      }
      res.json({ success: true, data: experience });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

router.post('/virtual-experiences/book',
  authenticate,
  [
    body('virtualExperienceId').isUUID().withMessage('Valid experience ID is required'),
    body('bookingDate').isISO8601().withMessage('Valid booking date is required'),
    body('startTime').matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Valid start time is required'),
    body('participants').isArray({ min: 1 }).withMessage('At least one participant is required'),
    body('deviceInfo.type').isIn(['vr_headset', 'mobile', 'desktop', 'tablet']).withMessage('Valid device type is required')
  ],
  validateRequest,
  async (req, res) => {
    try {
      const booking = await virtualExperienceService.createBooking({
        userId: req.user.id,
        ...req.body
      });
      res.status(201).json({ success: true, data: booking });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  }
);

router.get('/virtual-experiences/bookings/user',
  authenticate,
  [
    query('status').optional().isString(),
    query('upcoming').optional().isBoolean()
  ],
  validateRequest,
  async (req, res) => {
    try {
      const bookings = await virtualExperienceService.getUserBookings(req.user.id, req.query);
      res.json({ success: true, data: bookings });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

router.post('/virtual-experiences/session/start',
  authenticate,
  [
    body('bookingId').isUUID().withMessage('Valid booking ID is required')
  ],
  validateRequest,
  async (req, res) => {
    try {
      const session = await virtualExperienceService.startVRSession(req.body.bookingId);
      res.json({ success: true, data: session });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  }
);

router.post('/virtual-experiences/session/end',
  authenticate,
  [
    body('sessionId').notEmpty().withMessage('Session ID is required')
  ],
  validateRequest,
  async (req, res) => {
    try {
      await virtualExperienceService.endVRSession(req.body.sessionId);
      res.json({ success: true, message: 'VR session ended successfully' });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  }
);

// Voice/IoT Routes
router.post('/voice/command',
  authenticate,
  [
    body('command').notEmpty().withMessage('Voice command is required'),
    body('deviceType').isIn(['alexa', 'google_home', 'siri', 'mobile_app', 'smart_speaker', 'car_system']).withMessage('Valid device type is required')
  ],
  validateRequest,
  async (req, res) => {
    try {
      const response = await voiceIoTService.processVoiceCommand({
        userId: req.user.id,
        ...req.body
      });
      res.json({ success: true, data: response });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

router.post('/iot/devices/register',
  authenticate,
  [
    body('deviceType').isIn(['alexa', 'google_home', 'smart_display', 'smart_watch', 'car_system', 'smart_fridge']).withMessage('Valid device type is required'),
    body('deviceName').notEmpty().withMessage('Device name is required'),
    body('capabilities').isArray().withMessage('Device capabilities must be an array')
  ],
  validateRequest,
  async (req, res) => {
    try {
      const deviceId = await voiceIoTService.registerDevice({
        userId: req.user.id,
        isActive: true,
        ...req.body
      });
      res.status(201).json({ success: true, data: { deviceId } });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  }
);

router.get('/iot/devices',
  authenticate,
  async (req, res) => {
    try {
      const devices = await voiceIoTService.getConnectedDevices(req.user.id);
      res.json({ success: true, data: devices });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

router.put('/iot/devices/:id/status',
  authenticate,
  [
    param('id').notEmpty().withMessage('Device ID is required'),
    body('isActive').isBoolean().withMessage('Active status must be boolean')
  ],
  validateRequest,
  async (req, res) => {
    try {
      await voiceIoTService.updateDeviceStatus(req.params.id, req.body.isActive);
      res.json({ success: true, message: 'Device status updated successfully' });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  }
);

// Health check endpoint for all disruptive features
router.get('/health',
  async (req, res) => {
    try {
      const health = {
        timestamp: new Date().toISOString(),
        services: {
          socialDining: 'operational',
          aiConcierge: 'operational',
          sustainability: 'operational',
          blockchainLoyalty: 'operational',
          voiceIoT: 'operational',
          virtualExperiences: 'operational'
        },
        version: '1.0.0'
      };
      res.json({ success: true, data: health });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Health check failed' });
    }
  }
);

export default router;
