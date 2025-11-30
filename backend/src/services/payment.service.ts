import Stripe from 'stripe';
import { User } from '../models/User';
import { Restaurant } from '../models/Restaurant';
import { Reservation } from '../models/Reservation';
import { NotFoundError, BadRequestError } from '../middleware/errorHandler';
import { logInfo, logError } from '../utils/logger';
import { cache, CACHE_KEYS } from '../config/redis';
import { sequelize } from '../config/database';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16'
});

interface CreatePaymentIntentData {
  amount: number;
  currency?: string;
  reservationId?: string;
  customerId?: string;
  description?: string;
  metadata?: Record<string, string>;
}

interface CreateSetupIntentData {
  customerId: string;
  usage?: 'on_session' | 'off_session';
  metadata?: Record<string, string>;
}

interface PaymentMethodData {
  id: string;
  type: string;
  card?: {
    brand: string;
    last4: string;
    expMonth: number;
    expYear: number;
  };
}

export class PaymentService {
  /**
   * Create or get Stripe customer for user
   */
  static async getOrCreateCustomer(userId: string): Promise<string> {
    const user = await User.findByPk(userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Return existing customer ID if available
    if (user.stripeCustomerId) {
      return user.stripeCustomerId;
    }

    // Create new Stripe customer
    const customer = await stripe.customers.create({
      email: user.email,
      name: `${user.firstName} ${user.lastName}`,
      phone: user.phone,
      metadata: {
        userId: user.id
      }
    });

    // Update user with Stripe customer ID
    await user.update({ stripeCustomerId: customer.id });

    logInfo('Stripe customer created', { userId, customerId: customer.id });

    return customer.id;
  }

  /**
   * Create payment intent for reservation deposit or payment
   */
  static async createPaymentIntent(data: CreatePaymentIntentData): Promise<{
    clientSecret: string;
    paymentIntentId: string;
    amount: number;
    currency: string;
  }> {
    const {
      amount,
      currency = 'usd',
      reservationId,
      customerId,
      description,
      metadata = {}
    } = data;

    // Validate amount
    if (amount < 50) {
      throw new BadRequestError('Minimum payment amount is $0.50');
    }

    // Add reservation metadata if applicable
    if (reservationId) {
      const reservation = await Reservation.findByPk(reservationId);
      if (!reservation) {
        throw new NotFoundError('Reservation not found');
      }
      metadata.reservationId = reservationId;
    }

    // Create payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency,
      customer: customerId,
      description,
      metadata,
      automatic_payment_methods: {
        enabled: true
      }
    });

    logInfo('Payment intent created', {
      paymentIntentId: paymentIntent.id,
      amount,
      metadata
    });

    return {
      clientSecret: paymentIntent.client_secret!,
      paymentIntentId: paymentIntent.id,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency
    };
  }

  /**
   * Create setup intent for saving payment method
   */
  static async createSetupIntent(data: CreateSetupIntentData): Promise<{
    clientSecret: string;
    setupIntentId: string;
  }> {
    const { customerId, usage = 'off_session', metadata = {} } = data;

    const setupIntent = await stripe.setupIntents.create({
      customer: customerId,
      usage,
      metadata,
      automatic_payment_methods: {
        enabled: true
      }
    });

    logInfo('Setup intent created', {
      setupIntentId: setupIntent.id,
      customerId
    });

    return {
      clientSecret: setupIntent.client_secret!,
      setupIntentId: setupIntent.id
    };
  }

  /**
   * List user's saved payment methods
   */
  static async getPaymentMethods(userId: string): Promise<PaymentMethodData[]> {
    const customerId = await this.getOrCreateCustomer(userId);

    const paymentMethods = await stripe.paymentMethods.list({
      customer: customerId,
      type: 'card'
    });

    return paymentMethods.data.map(pm => ({
      id: pm.id,
      type: pm.type,
      card: pm.card ? {
        brand: pm.card.brand,
        last4: pm.card.last4,
        expMonth: pm.card.exp_month,
        expYear: pm.card.exp_year
      } : undefined
    }));
  }

  /**
   * Set default payment method
   */
  static async setDefaultPaymentMethod(
    userId: string,
    paymentMethodId: string
  ): Promise<void> {
    const customerId = await this.getOrCreateCustomer(userId);

    // Attach payment method to customer if not already attached
    try {
      await stripe.paymentMethods.attach(paymentMethodId, {
        customer: customerId
      });
    } catch (error: any) {
      if (error.code !== 'resource_already_exists') {
        throw error;
      }
    }

    // Set as default payment method
    await stripe.customers.update(customerId, {
      invoice_settings: {
        default_payment_method: paymentMethodId
      }
    });

    logInfo('Default payment method set', { userId, paymentMethodId });
  }

  /**
   * Remove payment method
   */
  static async removePaymentMethod(
    userId: string,
    paymentMethodId: string
  ): Promise<void> {
    const customerId = await this.getOrCreateCustomer(userId);

    // Verify payment method belongs to customer
    const paymentMethod = await stripe.paymentMethods.retrieve(paymentMethodId);
    
    if (paymentMethod.customer !== customerId) {
      throw new BadRequestError('Payment method not found');
    }

    // Detach payment method
    await stripe.paymentMethods.detach(paymentMethodId);

    logInfo('Payment method removed', { userId, paymentMethodId });
  }

  /**
   * Process reservation deposit
   */
  static async processReservationDeposit(
    reservationId: string,
    paymentMethodId: string
  ): Promise<{
    success: boolean;
    paymentIntentId?: string;
    error?: string;
  }> {
    const transaction = await sequelize.transaction();

    try {
      const reservation = await Reservation.findByPk(reservationId, {
        include: [{ model: Restaurant, as: 'restaurant' }],
        transaction
      });

      if (!reservation) {
        throw new NotFoundError('Reservation not found');
      }

      const depositAmount = reservation.depositAmount;
      if (!depositAmount || depositAmount === 0) {
        return { success: true };
      }

      // Get or create customer
      const customerId = await this.getOrCreateCustomer(reservation.userId);

      // Create payment intent
      const paymentIntent = await stripe.paymentIntents.create({
        amount: depositAmount,
        currency: 'usd',
        customer: customerId,
        payment_method: paymentMethodId,
        confirm: true,
        description: `Reservation deposit for ${reservation.restaurant.name}`,
        metadata: {
          reservationId,
          restaurantId: reservation.restaurantId,
          userId: reservation.userId
        }
      });

      // Update reservation with payment info
      await reservation.update({
        paymentIntentId: paymentIntent.id,
        paymentStatus: paymentIntent.status === 'succeeded' ? 'paid' : 'pending',
        paidAt: paymentIntent.status === 'succeeded' ? new Date() : null
      }, { transaction });

      await transaction.commit();

      logInfo('Reservation deposit processed', {
        reservationId,
        paymentIntentId: paymentIntent.id,
        status: paymentIntent.status
      });

      return {
        success: paymentIntent.status === 'succeeded',
        paymentIntentId: paymentIntent.id
      };
    } catch (error: any) {
      await transaction.rollback();
      logError('Failed to process reservation deposit', error);
      
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Process reservation cancellation fee
   */
  static async processCancellationFee(
    reservationId: string
  ): Promise<{
    success: boolean;
    chargeId?: string;
    error?: string;
  }> {
    try {
      const reservation = await Reservation.findByPk(reservationId, {
        include: [
          { model: Restaurant, as: 'restaurant' },
          { model: User, as: 'user' }
        ]
      });

      if (!reservation) {
        throw new NotFoundError('Reservation not found');
      }

      const cancellationFee = reservation.cancellationFee;
      if (!cancellationFee || cancellationFee === 0) {
        return { success: true };
      }

      // Get customer
      const customerId = reservation.user.stripeCustomerId;
      if (!customerId) {
        throw new BadRequestError('No payment method on file');
      }

      // Get default payment method
      const customer = await stripe.customers.retrieve(customerId) as Stripe.Customer;
      const defaultPaymentMethod = customer.invoice_settings?.default_payment_method;

      if (!defaultPaymentMethod) {
        throw new BadRequestError('No default payment method');
      }

      // Create charge
      const paymentIntent = await stripe.paymentIntents.create({
        amount: cancellationFee,
        currency: 'usd',
        customer: customerId,
        payment_method: defaultPaymentMethod as string,
        confirm: true,
        description: `Cancellation fee for ${reservation.restaurant.name}`,
        metadata: {
          reservationId,
          restaurantId: reservation.restaurantId,
          userId: reservation.userId,
          type: 'cancellation_fee'
        }
      });

      // Update reservation
      await reservation.update({
        cancellationFeeCharged: true,
        cancellationFeeChargedAt: new Date()
      });

      logInfo('Cancellation fee processed', {
        reservationId,
        chargeId: paymentIntent.id,
        amount: cancellationFee
      });

      return {
        success: paymentIntent.status === 'succeeded',
        chargeId: paymentIntent.id
      };
    } catch (error: any) {
      logError('Failed to process cancellation fee', error);
      
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Create connected account for restaurant
   */
  static async createRestaurantAccount(
    restaurantId: string,
    accountData: {
      country?: string;
      email?: string;
      businessType?: 'individual' | 'company';
    }
  ): Promise<{
    accountId: string;
    accountLinkUrl: string;
  }> {
    const restaurant = await Restaurant.findByPk(restaurantId, {
      include: [{ model: User, as: 'owner' }]
    });

    if (!restaurant) {
      throw new NotFoundError('Restaurant not found');
    }

    // Create connected account
    const account = await stripe.accounts.create({
      type: 'express',
      country: accountData.country || 'US',
      email: accountData.email || restaurant.email,
      business_type: accountData.businessType || 'company',
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true }
      },
      business_profile: {
        mcc: '5812', // Restaurants
        name: restaurant.name,
        url: restaurant.website
      },
      metadata: {
        restaurantId: restaurant.id,
        ownerId: restaurant.ownerId
      }
    });

    // Update restaurant with Stripe account ID
    await restaurant.update({ stripeAccountId: account.id });

    // Create account link for onboarding
    const accountLink = await stripe.accountLinks.create({
      account: account.id,
      refresh_url: `${process.env.FRONTEND_URL}/restaurant/settings/payments`,
      return_url: `${process.env.FRONTEND_URL}/restaurant/settings/payments/success`,
      type: 'account_onboarding'
    });

    logInfo('Restaurant Stripe account created', {
      restaurantId,
      accountId: account.id
    });

    return {
      accountId: account.id,
      accountLinkUrl: accountLink.url
    };
  }

  /**
   * Get restaurant payout balance
   */
  static async getRestaurantBalance(restaurantId: string): Promise<{
    available: number;
    pending: number;
    currency: string;
  }> {
    const restaurant = await Restaurant.findByPk(restaurantId);
    
    if (!restaurant || !restaurant.stripeAccountId) {
      throw new NotFoundError('Restaurant payment account not found');
    }

    const balance = await stripe.balance.retrieve({
      stripeAccount: restaurant.stripeAccountId
    });

    const available = balance.available[0]?.amount || 0;
    const pending = balance.pending[0]?.amount || 0;
    const currency = balance.available[0]?.currency || 'usd';

    return {
      available,
      pending,
      currency
    };
  }

  /**
   * Create payout for restaurant
   */
  static async createRestaurantPayout(
    restaurantId: string,
    amount?: number
  ): Promise<{
    payoutId: string;
    amount: number;
    arrivalDate: Date;
  }> {
    const restaurant = await Restaurant.findByPk(restaurantId);
    
    if (!restaurant || !restaurant.stripeAccountId) {
      throw new NotFoundError('Restaurant payment account not found');
    }

    // Create payout (if no amount specified, payout full balance)
    const payout = await stripe.payouts.create(
      amount ? { amount, currency: 'usd' } : {},
      { stripeAccount: restaurant.stripeAccountId }
    );

    logInfo('Restaurant payout created', {
      restaurantId,
      payoutId: payout.id,
      amount: payout.amount
    });

    return {
      payoutId: payout.id,
      amount: payout.amount,
      arrivalDate: new Date(payout.arrival_date * 1000)
    };
  }

  /**
   * Handle Stripe webhook events
   */
  static async handleWebhook(
    signature: string,
    rawBody: string
  ): Promise<void> {
    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(
        rawBody,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET!
      );
    } catch (err: any) {
      throw new BadRequestError(`Webhook signature verification failed: ${err.message}`);
    }

    // Handle different event types
    switch (event.type) {
      case 'payment_intent.succeeded':
        await this.handlePaymentSucceeded(event.data.object as Stripe.PaymentIntent);
        break;

      case 'payment_intent.payment_failed':
        await this.handlePaymentFailed(event.data.object as Stripe.PaymentIntent);
        break;

      case 'account.updated':
        await this.handleAccountUpdated(event.data.object as Stripe.Account);
        break;

      case 'payout.paid':
        await this.handlePayoutPaid(event.data.object as Stripe.Payout);
        break;

      default:
        logInfo('Unhandled webhook event', { type: event.type });
    }
  }

  /**
   * Handle successful payment
   */
  private static async handlePaymentSucceeded(
    paymentIntent: Stripe.PaymentIntent
  ): Promise<void> {
    const { reservationId } = paymentIntent.metadata;

    if (reservationId) {
      await Reservation.update(
        {
          paymentStatus: 'paid',
          paidAt: new Date()
        },
        {
          where: { id: reservationId }
        }
      );

      logInfo('Payment succeeded for reservation', { reservationId });
    }
  }

  /**
   * Handle failed payment
   */
  private static async handlePaymentFailed(
    paymentIntent: Stripe.PaymentIntent
  ): Promise<void> {
    const { reservationId } = paymentIntent.metadata;

    if (reservationId) {
      await Reservation.update(
        {
          paymentStatus: 'failed'
        },
        {
          where: { id: reservationId }
        }
      );

      logError('Payment failed for reservation', { reservationId });
    }
  }

  /**
   * Handle Stripe account updates
   */
  private static async handleAccountUpdated(
    account: Stripe.Account
  ): Promise<void> {
    const { restaurantId } = account.metadata || {};

    if (restaurantId) {
      await Restaurant.update(
        {
          stripeAccountStatus: account.charges_enabled ? 'active' : 'pending'
        },
        {
          where: { id: restaurantId }
        }
      );

      logInfo('Restaurant Stripe account updated', {
        restaurantId,
        chargesEnabled: account.charges_enabled
      });
    }
  }

  /**
   * Handle payout completion
   */
  private static async handlePayoutPaid(
    payout: Stripe.Payout
  ): Promise<void> {
    logInfo('Payout completed', {
      payoutId: payout.id,
      amount: payout.amount,
      account: payout.destination
    });
  }
}