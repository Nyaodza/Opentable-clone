import { Request, Response, NextFunction } from 'express';
import { Payment, PaymentStatus, PaymentType } from '../models/Payment';
import { Reservation } from '../models/Reservation';
import { Restaurant } from '../models/Restaurant';
import { User } from '../models/User';
import { AppError } from '../middleware/error.middleware';
import { 
  stripe, 
  createPaymentIntent as stripeCreatePaymentIntent,
  createCustomer,
  refundPayment,
  createCheckoutSession as stripeCreateCheckoutSession,
  handleStripeWebhook
} from '../config/stripe';

export const createPaymentIntent = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { reservationId, amount } = req.body;

    // Get reservation details
    const reservation = await Reservation.findByPk(reservationId, {
      include: [{ model: Restaurant, as: 'restaurant' }]
    });

    if (!reservation) {
      throw new AppError('Reservation not found', 404);
    }

    if (reservation.userId !== req.user!.id) {
      throw new AppError('Unauthorized', 403);
    }

    // Get or create Stripe customer
    const user = await User.findByPk(req.user!.id);
    let stripeCustomerId = user!.getDataValue('stripeCustomerId');

    if (!stripeCustomerId) {
      const customer = await createCustomer(user!.email, user!.fullName);
      stripeCustomerId = customer.id;
      await user!.update({ stripeCustomerId });
    }

    // Create payment intent
    const paymentIntent = await stripeCreatePaymentIntent({
      amount,
      customerId: stripeCustomerId,
      metadata: {
        reservationId,
        restaurantId: reservation.restaurantId,
        userId: req.user!.id
      }
    });

    // Create payment record
    const payment = await Payment.create({
      userId: req.user!.id,
      reservationId,
      restaurantId: reservation.restaurantId,
      amount,
      type: PaymentType.DEPOSIT,
      stripePaymentIntentId: paymentIntent.id,
      stripeCustomerId,
      status: PaymentStatus.PENDING
    });

    res.json({
      success: true,
      clientSecret: paymentIntent.client_secret,
      paymentId: payment.id
    });
  } catch (error) {
    next(error);
  }
};

export const createCheckoutSession = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { restaurantId, type } = req.body;

    const restaurant = await Restaurant.findByPk(restaurantId);
    if (!restaurant || restaurant.ownerId !== req.user!.id) {
      throw new AppError('Unauthorized', 403);
    }

    const user = await User.findByPk(req.user!.id);
    let stripeCustomerId = user!.getDataValue('stripeCustomerId');

    if (!stripeCustomerId) {
      const customer = await createCustomer(user!.email, user!.fullName);
      stripeCustomerId = customer.id;
      await user!.update({ stripeCustomerId });
    }

    const session = await stripeCreateCheckoutSession({
      customerId: stripeCustomerId,
      successUrl: `${process.env.FRONTEND_URL}/dashboard?payment=success`,
      cancelUrl: `${process.env.FRONTEND_URL}/dashboard?payment=cancelled`,
      lineItems: [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: type === 'monthly_subscription' ? 'Monthly Subscription' : 'Commission Fee',
            description: `For ${restaurant.name}`
          },
          unit_amount: type === 'monthly_subscription' ? 9900 : 2500 // $99 or $25
        },
        quantity: 1
      }],
      metadata: {
        restaurantId,
        type,
        userId: req.user!.id
      }
    });

    res.json({
      success: true,
      sessionUrl: session.url
    });
  } catch (error) {
    next(error);
  }
};

export const getPaymentHistory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const payments = await Payment.findAll({
      where: { userId: req.user!.id },
      include: [
        { model: Restaurant, as: 'restaurant', attributes: ['name'] },
        { model: Reservation, as: 'reservation', attributes: ['dateTime', 'confirmationCode'] }
      ],
      order: [['createdAt', 'DESC']]
    });

    res.json({
      success: true,
      payments
    });
  } catch (error) {
    next(error);
  }
};

export const processRefund = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { paymentId, amount, reason } = req.body;

    const payment = await Payment.findByPk(paymentId);
    if (!payment) {
      throw new AppError('Payment not found', 404);
    }

    // Check authorization
    if (payment.userId !== req.user!.id) {
      // Check if user is restaurant owner
      const restaurant = await Restaurant.findByPk(payment.restaurantId);
      if (!restaurant || restaurant.ownerId !== req.user!.id) {
        throw new AppError('Unauthorized', 403);
      }
    }

    if (payment.status !== PaymentStatus.COMPLETED) {
      throw new AppError('Only completed payments can be refunded', 400);
    }

    // Process refund with Stripe
    const refund = await refundPayment(payment.stripePaymentIntentId, amount);

    // Update payment record
    const refundAmount = amount || payment.amount;
    payment.refundedAmount = Number(payment.refundedAmount) + refundAmount;
    
    if (payment.refundedAmount >= payment.amount) {
      payment.status = PaymentStatus.REFUNDED;
    } else {
      payment.status = PaymentStatus.PARTIALLY_REFUNDED;
    }

    payment.metadata = {
      ...payment.metadata,
      lastRefund: {
        amount: refundAmount,
        reason,
        date: new Date(),
        stripeRefundId: refund.id
      }
    };

    await payment.save();

    res.json({
      success: true,
      payment
    });
  } catch (error) {
    next(error);
  }
};

export const stripeWebhook = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const sig = req.headers['stripe-signature'] as string;
    const event = await handleStripeWebhook(req.body, sig);

    switch (event.type) {
      case 'payment_intent.succeeded':
        const paymentIntent = event.data.object as any;
        const payment = await Payment.findOne({
          where: { stripePaymentIntentId: paymentIntent.id }
        });
        
        if (payment) {
          payment.status = PaymentStatus.COMPLETED;
          await payment.save();
        }
        break;

      case 'payment_intent.payment_failed':
        const failedIntent = event.data.object as any;
        const failedPayment = await Payment.findOne({
          where: { stripePaymentIntentId: failedIntent.id }
        });
        
        if (failedPayment) {
          failedPayment.status = PaymentStatus.FAILED;
          await failedPayment.save();
        }
        break;

      case 'checkout.session.completed':
        const session = event.data.object as any;
        // Handle subscription or commission payment completion
        console.log('Checkout completed:', session);
        break;
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(400).json({ error: 'Webhook error' });
  }
};