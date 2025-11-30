import { Router, Request, Response } from 'express';
import { SMSService } from '../services/messaging/sms.service';
import { authenticate, requireAdmin } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';
import { body, param, query } from 'express-validator';

const router = Router();
const smsService = new SMSService();

// Send SMS
router.post('/send',
  authenticate,
  authorize(['restaurant_owner', 'restaurant_manager', 'restaurant_staff']),
  [
    body('to').isMobilePhone('any'),
    body('message').isString().isLength({ min: 1, max: 1600 }),
    body('restaurantId').isUUID()
  ],
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      const { to, message, restaurantId } = req.body;
      
      await smsService.sendSMS(to, message, {
        restaurantId,
        userId: req.user.id
      });

      res.json({
        success: true,
        message: 'SMS sent successfully'
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }
);

// Send templated SMS
router.post('/send-template',
  authenticate,
  authorize(['restaurant_owner', 'restaurant_manager', 'restaurant_staff']),
  [
    body('to').isMobilePhone('any'),
    body('templateId').isString(),
    body('variables').isObject(),
    body('restaurantId').isUUID()
  ],
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      const { to, templateId, variables, restaurantId } = req.body;
      
      await smsService.sendTemplatedSMS(to, templateId, variables, {
        restaurantId,
        userId: req.user.id
      });

      res.json({
        success: true,
        message: 'Templated SMS sent successfully'
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }
);

// Send bulk SMS
router.post('/send-bulk',
  authenticate,
  authorize(['restaurant_owner', 'restaurant_manager']),
  [
    body('recipients').isArray().custom((value) => {
      return value.every((phone: string) => /^[+]?[(]?[0-9]{3}[)]?[-\s.]?[0-9]{3}[-\s.]?[0-9]{4,6}$/.test(phone));
    }),
    body('templateId').isString(),
    body('variables').isObject(),
    body('restaurantId').isUUID()
  ],
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      const { recipients, templateId, variables, restaurantId } = req.body;
      
      const results = await smsService.sendBulkSMS(recipients, templateId, variables, {
        restaurantId,
        userId: req.user.id
      });

      res.json({
        success: true,
        data: results
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }
);

// Create SMS template
router.post('/templates',
  authenticate,
  authorize(['restaurant_owner', 'restaurant_manager']),
  [
    body('name').isString(),
    body('content').isString(),
    body('type').isIn(['confirmation', 'reminder', 'waitlist', 'marketing', 'custom']),
    body('variables').optional().isArray(),
    body('restaurantId').isUUID()
  ],
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      const template = await smsService.createTemplate(req.body);

      res.json({
        success: true,
        data: template
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }
);

// Get SMS templates
router.get('/templates',
  authenticate,
  authorize(['restaurant_owner', 'restaurant_manager', 'restaurant_staff']),
  [
    query('restaurantId').isUUID(),
    query('type').optional().isIn(['confirmation', 'reminder', 'waitlist', 'marketing', 'custom'])
  ],
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      const { restaurantId, type } = req.query;
      
      const templates = await smsService.getTemplates(
        restaurantId as string,
        type as string
      );

      res.json({
        success: true,
        data: templates
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }
);

// Update SMS template
router.put('/templates/:templateId',
  authenticate,
  authorize(['restaurant_owner', 'restaurant_manager']),
  [
    param('templateId').isUUID(),
    body('name').optional().isString(),
    body('content').optional().isString(),
    body('variables').optional().isArray()
  ],
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      const template = await smsService.updateTemplate(
        req.params.templateId,
        req.body
      );

      res.json({
        success: true,
        data: template
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }
);

// Delete SMS template
router.delete('/templates/:templateId',
  authenticate,
  authorize(['restaurant_owner', 'restaurant_manager']),
  [param('templateId').isUUID()],
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      await smsService.deleteTemplate(req.params.templateId);

      res.json({
        success: true,
        message: 'Template deleted successfully'
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }
);

// Handle opt-out
router.post('/opt-out',
  [
    body('phoneNumber').isMobilePhone('any'),
    body('restaurantId').optional().isUUID()
  ],
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      const { phoneNumber, restaurantId } = req.body;
      
      await smsService.handleOptOut(phoneNumber, restaurantId);

      res.json({
        success: true,
        message: 'Opt-out processed successfully'
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }
);

// Get SMS history
router.get('/history',
  authenticate,
  authorize(['restaurant_owner', 'restaurant_manager']),
  [
    query('restaurantId').isUUID(),
    query('startDate').optional().isISO8601(),
    query('endDate').optional().isISO8601(),
    query('status').optional().isIn(['pending', 'sent', 'delivered', 'failed']),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('offset').optional().isInt({ min: 0 })
  ],
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      const messages = await smsService.getMessageHistory(req.query);

      res.json({
        success: true,
        data: messages
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }
);

// Get SMS statistics
router.get('/stats',
  authenticate,
  authorize(['restaurant_owner', 'restaurant_manager']),
  [
    query('restaurantId').isUUID(),
    query('startDate').isISO8601(),
    query('endDate').isISO8601()
  ],
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      const { restaurantId, startDate, endDate } = req.query;
      
      const stats = await smsService.getStatistics(
        restaurantId as string,
        new Date(startDate as string),
        new Date(endDate as string)
      );

      res.json({
        success: true,
        data: stats
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }
);

// Webhook for incoming SMS (Twilio)
router.post('/webhook/incoming',
  async (req: Request, res: Response) => {
    try {
      const { From, To, Body } = req.body;
      
      await smsService.handleIncomingSMS(From, To, Body);

      // Respond with TwiML
      res.type('text/xml');
      res.send(`<?xml version="1.0" encoding="UTF-8"?>
        <Response>
          <Message>Thank you for your message. We'll get back to you shortly.</Message>
        </Response>`);
    } catch (error: any) {
      console.error('Webhook error:', error);
      res.status(200).send(''); // Always return 200 to Twilio
    }
  }
);

export default router;