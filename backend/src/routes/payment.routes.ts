import { Router } from 'express';
import { body } from 'express-validator';
import * as paymentController from '../controllers/payment.controller';
import { authenticate } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';

const router = Router();

// Create payment intent for reservation deposit
router.post(
  '/create-intent',
  authenticate,
  [
    body('reservationId').isUUID(),
    body('amount').isFloat({ min: 0.01 })
  ],
  validate,
  paymentController.createPaymentIntent
);

// Create checkout session for restaurant fees
router.post(
  '/create-checkout',
  authenticate,
  [
    body('restaurantId').isUUID(),
    body('type').isIn(['monthly_subscription', 'commission'])
  ],
  validate,
  paymentController.createCheckoutSession
);

// Get payment history
router.get('/history', authenticate, paymentController.getPaymentHistory);

// Process refund
router.post(
  '/refund',
  authenticate,
  [
    body('paymentId').isUUID(),
    body('amount').optional().isFloat({ min: 0.01 }),
    body('reason').optional().trim()
  ],
  validate,
  paymentController.processRefund
);

// Stripe webhook is handled in server.ts before body parsing

export default router;