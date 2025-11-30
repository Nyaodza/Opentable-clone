import { Router, Request, Response } from 'express';
import { POSIntegrationHub } from '../integrations/pos';
import { authenticate, requireAdmin } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';
import { body, param, query } from 'express-validator';

const router = Router();
const posHub = new POSIntegrationHub();

// Connect POS integration
router.post('/connect',
  authenticate,
  authorize(['restaurant_owner', 'restaurant_manager']),
  [
    body('provider').isIn(['square', 'toast', 'clover', 'lightspeed', 'revel', 'upserve']),
    body('config').isObject(),
    body('restaurantId').isUUID()
  ],
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      const { provider, config, restaurantId } = req.body;
      
      await posHub.connect(restaurantId, {
        provider,
        ...config
      });

      res.json({
        success: true,
        message: 'POS integration connected successfully'
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }
);

// Disconnect POS integration
router.post('/disconnect/:restaurantId',
  authenticate,
  authorize(['restaurant_owner', 'restaurant_manager']),
  [param('restaurantId').isUUID()],
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      await posHub.disconnect(req.params.restaurantId);
      
      res.json({
        success: true,
        message: 'POS integration disconnected'
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }
);

// Sync inventory
router.post('/sync/inventory/:restaurantId',
  authenticate,
  authorize(['restaurant_owner', 'restaurant_manager', 'restaurant_staff']),
  [param('restaurantId').isUUID()],
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      const inventory = await posHub.syncInventory(req.params.restaurantId);
      
      res.json({
        success: true,
        data: inventory
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }
);

// Sync orders
router.post('/sync/orders/:restaurantId',
  authenticate,
  authorize(['restaurant_owner', 'restaurant_manager', 'restaurant_staff']),
  [
    param('restaurantId').isUUID(),
    query('startDate').optional().isISO8601(),
    query('endDate').optional().isISO8601()
  ],
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      const { startDate, endDate } = req.query;
      const orders = await posHub.syncOrders(
        req.params.restaurantId,
        startDate ? new Date(startDate as string) : undefined,
        endDate ? new Date(endDate as string) : undefined
      );
      
      res.json({
        success: true,
        data: orders
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }
);

// Update table status
router.put('/tables/:restaurantId/:tableId/status',
  authenticate,
  authorize(['restaurant_owner', 'restaurant_manager', 'restaurant_staff']),
  [
    param('restaurantId').isUUID(),
    param('tableId').isString(),
    body('status').isIn(['available', 'occupied', 'reserved', 'cleaning'])
  ],
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      await posHub.updateTableStatus(
        req.params.restaurantId,
        req.params.tableId,
        req.body.status
      );
      
      res.json({
        success: true,
        message: 'Table status updated'
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }
);

// Process payment
router.post('/payments/process',
  authenticate,
  authorize(['restaurant_owner', 'restaurant_manager', 'restaurant_staff']),
  [
    body('restaurantId').isUUID(),
    body('amount').isFloat({ min: 0 }),
    body('orderId').isString(),
    body('paymentMethod').optional().isString()
  ],
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      const { restaurantId, amount, orderId, paymentMethod } = req.body;
      
      const payment = await posHub.processPayment(restaurantId, amount, orderId, paymentMethod);
      
      res.json({
        success: true,
        data: payment
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }
);

// Process refund
router.post('/payments/refund',
  authenticate,
  authorize(['restaurant_owner', 'restaurant_manager']),
  [
    body('restaurantId').isUUID(),
    body('transactionId').isString(),
    body('amount').isFloat({ min: 0 }),
    body('reason').optional().isString()
  ],
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      const { restaurantId, transactionId, amount, reason } = req.body;
      
      const refund = await posHub.processRefund(restaurantId, transactionId, amount, reason);
      
      res.json({
        success: true,
        data: refund
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }
);

// Get integration status
router.get('/status/:restaurantId',
  authenticate,
  authorize(['restaurant_owner', 'restaurant_manager', 'restaurant_staff']),
  [param('restaurantId').isUUID()],
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      const status = await posHub.getIntegrationStatus(req.params.restaurantId);
      
      res.json({
        success: true,
        data: status
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }
);

// Get sync logs
router.get('/logs/:restaurantId',
  authenticate,
  authorize(['restaurant_owner', 'restaurant_manager']),
  [
    param('restaurantId').isUUID(),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('offset').optional().isInt({ min: 0 })
  ],
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      const { limit = 50, offset = 0 } = req.query;
      
      const logs = await posHub.getSyncLogs(
        req.params.restaurantId,
        parseInt(limit as string),
        parseInt(offset as string)
      );
      
      res.json({
        success: true,
        data: logs
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }
);

export default router;