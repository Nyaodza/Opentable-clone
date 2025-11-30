import Stripe from 'stripe';
import { Transaction } from 'sequelize';
import {
  Payment,
  PaymentMethod,
  Restaurant,
  User,
  Reservation,
  GiftCard,
  PromoCode,
  RestaurantPayout
} from '../models';
import { redis } from '../config/redis';
import { logger } from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import moment from 'moment';

interface PaymentRequest {
  amount: number;
  currency?: string;
  paymentMethodId?: string;
  customerId?: string;
  reservationId?: string;
  restaurantId: string;
  userId: string;
  type: 'deposit' | 'payment' | 'tip' | 'gift_card' | 'refund';
  metadata?: any;
}

interface DepositRequest {
  reservationId: string;
  amount: number;
  userId: string;
  restaurantId: string;
  paymentMethodId?: string;
}

interface RefundRequest {
  paymentId: string;
  amount?: number; // Partial refund if specified
  reason?: string;
}

interface SplitPaymentRequest {
  reservationId: string;
  splits: Array<{
    userId: string;
    amount: number;
    paymentMethodId?: string;
    includesTip?: boolean;
    tipAmount?: number;
  }>;
}

interface GiftCardPurchase {
  amount: number;
  recipientEmail?: string;
  recipientName?: string;
  message?: string;
  deliveryDate?: Date;
  purchaserId: string;
}

interface PayoutRequest {
  restaurantId: string;
  startDate: Date;
  endDate: Date;
}

export class AdvancedPaymentService {
  private stripe: Stripe;
  private readonly STRIPE_FEE_PERCENTAGE = 0.029; // 2.9%
  private readonly STRIPE_FEE_FIXED = 0.30; // $0.30
  private readonly PLATFORM_FEE_PERCENTAGE = 0.02; // 2% platform fee
  private readonly DEPOSIT_PERCENTAGE = 0.25; // 25% deposit for reservations

  constructor() {
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: '2023-10-16'
    });

    this.initializeWebhooks();
  }

  // Process payment for reservation
  async processPayment(request: PaymentRequest): Promise<any> {
    const transaction = await Payment.sequelize!.transaction();

    try {
      // Validate amount
      if (request.amount <= 0) {
        throw new Error('Invalid payment amount');
      }

      // Get or create Stripe customer
      const customer = await this.getOrCreateStripeCustomer(request.userId, transaction);

      // Create payment intent
      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: Math.round(request.amount * 100), // Convert to cents
        currency: request.currency || 'usd',
        customer: customer.id,
        payment_method: request.paymentMethodId,
        confirm: true,
        capture_method: request.type === 'deposit' ? 'manual' : 'automatic',
        metadata: {
          reservationId: request.reservationId || '',
          restaurantId: request.restaurantId,
          userId: request.userId,
          type: request.type,
          ...request.metadata
        }
      });

      // Create payment record
      const payment = await Payment.create({
        id: uuidv4(),
        stripePaymentIntentId: paymentIntent.id,
        reservationId: request.reservationId,
        restaurantId: request.restaurantId,
        userId: request.userId,
        amount: request.amount,
        currency: request.currency || 'usd',
        status: this.mapStripeStatus(paymentIntent.status),
        type: request.type,
        paymentMethodId: request.paymentMethodId,

        // Fees calculation
        stripeFee: this.calculateStripeFee(request.amount),
        platformFee: this.calculatePlatformFee(request.amount),
        netAmount: this.calculateNetAmount(request.amount),

        metadata: {
          ...request.metadata,
          stripeResponse: paymentIntent
        },
        processedAt: new Date()
      }, { transaction });

      await transaction.commit();

      // Emit payment event
      this.emitPaymentProcessed(payment);

      return {
        success: true,
        paymentId: payment.id,
        stripePaymentIntentId: paymentIntent.id,
        status: payment.status,
        amount: payment.amount,
        netAmount: payment.netAmount
      };
    } catch (error: any) {
      await transaction.rollback();
      logger.error('Payment processing failed:', error);

      // Handle specific Stripe errors
      if (error.type === 'StripeCardError') {
        throw new Error(`Card error: ${error.message}`);
      } else if (error.type === 'StripeInvalidRequestError') {
        throw new Error('Invalid payment request');
      }

      throw error;
    }
  }

  // Process deposit for reservation
  async processDeposit(
    reservationId: string,
    userId: string,
    amount: number,
    dbTransaction?: Transaction
  ): Promise<any> {
    try {
      const reservation = await Reservation.findByPk(reservationId);
      if (!reservation) {
        throw new Error('Reservation not found');
      }

      // Get default payment method
      const paymentMethod = await this.getDefaultPaymentMethod(userId);
      if (!paymentMethod) {
        throw new Error('No payment method available');
      }

      const result = await this.processPayment({
        amount,
        paymentMethodId: paymentMethod.stripePaymentMethodId,
        customerId: paymentMethod.stripeCustomerId,
        reservationId,
        restaurantId: reservation.restaurantId,
        userId,
        type: 'deposit',
        metadata: {
          description: `Deposit for reservation ${reservation.confirmationCode}`
        }
      });

      // Update reservation with deposit info
      await Reservation.update(
        {
          depositPaymentId: result.paymentId,
          depositAmount: amount,
          depositPaidAt: new Date()
        },
        {
          where: { id: reservationId },
          transaction: dbTransaction
        }
      );

      return result;
    } catch (error) {
      logger.error('Deposit processing failed:', error);
      throw error;
    }
  }

  // Process refund
  async processRefund(request: RefundRequest): Promise<any> {
    const transaction = await Payment.sequelize!.transaction();

    try {
      const payment = await Payment.findByPk(request.paymentId, { transaction });
      if (!payment) {
        throw new Error('Payment not found');
      }

      if (payment.status !== 'succeeded' && payment.status !== 'captured') {
        throw new Error('Payment cannot be refunded');
      }

      // Calculate refund amount
      const refundAmount = request.amount || payment.amount;
      if (refundAmount > payment.amount) {
        throw new Error('Refund amount exceeds original payment');
      }

      // Create Stripe refund
      const refund = await this.stripe.refunds.create({
        payment_intent: payment.stripePaymentIntentId,
        amount: Math.round(refundAmount * 100),
        reason: this.mapRefundReason(request.reason),
        metadata: {
          paymentId: payment.id,
          reason: request.reason || 'requested_by_customer'
        }
      });

      // Create refund record
      const refundRecord = await Payment.create({
        id: uuidv4(),
        stripeRefundId: refund.id,
        originalPaymentId: payment.id,
        reservationId: payment.reservationId,
        restaurantId: payment.restaurantId,
        userId: payment.userId,
        amount: -refundAmount, // Negative amount for refund
        currency: payment.currency,
        status: 'refunded',
        type: 'refund',
        refundReason: request.reason,
        metadata: {
          originalPayment: payment.id,
          stripeRefund: refund
        },
        processedAt: new Date()
      }, { transaction });

      // Update original payment
      payment.refundedAmount = (payment.refundedAmount || 0) + refundAmount;
      payment.hasRefund = true;
      await payment.save({ transaction });

      await transaction.commit();

      return {
        success: true,
        refundId: refundRecord.id,
        amount: refundAmount,
        status: 'refunded'
      };
    } catch (error) {
      await transaction.rollback();
      logger.error('Refund processing failed:', error);
      throw error;
    }
  }

  // Split payment among multiple users
  async processSplitPayment(request: SplitPaymentRequest): Promise<any> {
    const results = [];
    const errors = [];

    // Validate total amount
    const totalAmount = request.splits.reduce((sum, split) => sum + split.amount, 0);

    for (const split of request.splits) {
      try {
        const paymentResult = await this.processPayment({
          amount: split.amount,
          paymentMethodId: split.paymentMethodId,
          reservationId: request.reservationId,
          restaurantId: await this.getRestaurantIdFromReservation(request.reservationId),
          userId: split.userId,
          type: 'payment',
          metadata: {
            splitPayment: true,
            includesTip: split.includesTip,
            tipAmount: split.tipAmount
          }
        });

        results.push({
          userId: split.userId,
          amount: split.amount,
          success: true,
          paymentId: paymentResult.paymentId
        });
      } catch (error: any) {
        errors.push({
          userId: split.userId,
          amount: split.amount,
          success: false,
          error: error.message
        });
      }
    }

    // If any payment failed, refund successful ones
    if (errors.length > 0) {
      for (const result of results) {
        if (result.success) {
          await this.processRefund({
            paymentId: result.paymentId,
            reason: 'Split payment failed'
          });
        }
      }

      throw new Error(`Split payment failed for ${errors.length} user(s)`);
    }

    return {
      success: true,
      totalAmount,
      splits: results
    };
  }

  // Gift card management
  async purchaseGiftCard(purchase: GiftCardPurchase): Promise<any> {
    const transaction = await GiftCard.sequelize!.transaction();

    try {
      // Generate unique gift card code
      const code = this.generateGiftCardCode();

      // Process payment for gift card
      const paymentResult = await this.processPayment({
        amount: purchase.amount,
        restaurantId: 'platform', // Platform-level gift card
        userId: purchase.purchaserId,
        type: 'gift_card',
        metadata: {
          giftCardCode: code,
          recipientEmail: purchase.recipientEmail
        }
      });

      // Create gift card
      const giftCard = await GiftCard.create({
        id: uuidv4(),
        code,
        amount: purchase.amount,
        balance: purchase.amount,
        purchaserId: purchase.purchaserId,
        recipientEmail: purchase.recipientEmail,
        recipientName: purchase.recipientName,
        message: purchase.message,
        paymentId: paymentResult.paymentId,
        status: 'active',
        expiresAt: moment().add(1, 'year').toDate(),
        metadata: {
          deliveryDate: purchase.deliveryDate,
          purchaseDate: new Date()
        }
      }, { transaction });

      await transaction.commit();

      // Schedule delivery if specified
      if (purchase.deliveryDate) {
        await this.scheduleGiftCardDelivery(giftCard, purchase.deliveryDate);
      } else {
        await this.sendGiftCard(giftCard);
      }

      return {
        success: true,
        giftCardId: giftCard.id,
        code: giftCard.code,
        amount: giftCard.amount
      };
    } catch (error) {
      await transaction.rollback();
      logger.error('Gift card purchase failed:', error);
      throw error;
    }
  }

  async redeemGiftCard(code: string, amount: number, userId: string): Promise<any> {
    const transaction = await GiftCard.sequelize!.transaction();

    try {
      const giftCard = await GiftCard.findOne({
        where: { code, status: 'active' },
        transaction
      });

      if (!giftCard) {
        throw new Error('Invalid gift card code');
      }

      if (giftCard.expiresAt < new Date()) {
        throw new Error('Gift card has expired');
      }

      if (giftCard.balance < amount) {
        throw new Error('Insufficient gift card balance');
      }

      // Update gift card balance
      giftCard.balance -= amount;
      giftCard.lastUsedAt = new Date();
      giftCard.lastUsedBy = userId;

      if (giftCard.balance === 0) {
        giftCard.status = 'depleted';
      }

      await giftCard.save({ transaction });

      // Create redemption record
      await Payment.create({
        id: uuidv4(),
        userId,
        amount: -amount, // Negative for redemption
        type: 'gift_card',
        status: 'succeeded',
        giftCardId: giftCard.id,
        metadata: {
          giftCardCode: code,
          remainingBalance: giftCard.balance
        }
      }, { transaction });

      await transaction.commit();

      return {
        success: true,
        amountRedeemed: amount,
        remainingBalance: giftCard.balance
      };
    } catch (error) {
      await transaction.rollback();
      logger.error('Gift card redemption failed:', error);
      throw error;
    }
  }

  // Promo code management
  async applyPromoCode(code: string, amount: number, restaurantId: string): Promise<any> {
    const promoCode = await PromoCode.findOne({
      where: {
        code,
        status: 'active',
        validFrom: { [Op.lte]: new Date() },
        validUntil: { [Op.gte]: new Date() }
      }
    });

    if (!promoCode) {
      throw new Error('Invalid or expired promo code');
    }

    // Check usage limits
    if (promoCode.maxUses && promoCode.currentUses >= promoCode.maxUses) {
      throw new Error('Promo code usage limit reached');
    }

    // Check restaurant restrictions
    if (promoCode.restaurantIds && !promoCode.restaurantIds.includes(restaurantId)) {
      throw new Error('Promo code not valid for this restaurant');
    }

    // Calculate discount
    let discount = 0;
    if (promoCode.discountType === 'percentage') {
      discount = amount * (promoCode.discountValue / 100);
      if (promoCode.maxDiscount) {
        discount = Math.min(discount, promoCode.maxDiscount);
      }
    } else {
      discount = Math.min(promoCode.discountValue, amount);
    }

    // Check minimum amount requirement
    if (promoCode.minimumAmount && amount < promoCode.minimumAmount) {
      throw new Error(`Minimum amount of ${promoCode.minimumAmount} required`);
    }

    // Update usage
    await PromoCode.increment('currentUses', {
      where: { id: promoCode.id }
    });

    return {
      success: true,
      discount,
      finalAmount: amount - discount,
      promoCodeId: promoCode.id
    };
  }

  // Payment method management
  async addPaymentMethod(userId: string, paymentMethodId: string): Promise<any> {
    const transaction = await PaymentMethod.sequelize!.transaction();

    try {
      const customer = await this.getOrCreateStripeCustomer(userId, transaction);

      // Attach payment method to customer
      await this.stripe.paymentMethods.attach(paymentMethodId, {
        customer: customer.id
      });

      // Get payment method details
      const paymentMethod = await this.stripe.paymentMethods.retrieve(paymentMethodId);

      // Save to database
      const savedMethod = await PaymentMethod.create({
        id: uuidv4(),
        userId,
        stripePaymentMethodId: paymentMethodId,
        stripeCustomerId: customer.id,
        type: paymentMethod.type,
        last4: paymentMethod.card?.last4,
        brand: paymentMethod.card?.brand,
        expiryMonth: paymentMethod.card?.exp_month,
        expiryYear: paymentMethod.card?.exp_year,
        isDefault: false,
        metadata: {
          fingerprint: paymentMethod.card?.fingerprint,
          funding: paymentMethod.card?.funding
        }
      }, { transaction });

      await transaction.commit();

      return {
        success: true,
        paymentMethodId: savedMethod.id,
        last4: savedMethod.last4,
        brand: savedMethod.brand
      };
    } catch (error) {
      await transaction.rollback();
      logger.error('Failed to add payment method:', error);
      throw error;
    }
  }

  async removePaymentMethod(userId: string, paymentMethodId: string): Promise<void> {
    try {
      const paymentMethod = await PaymentMethod.findOne({
        where: { id: paymentMethodId, userId }
      });

      if (!paymentMethod) {
        throw new Error('Payment method not found');
      }

      // Detach from Stripe
      await this.stripe.paymentMethods.detach(paymentMethod.stripePaymentMethodId);

      // Delete from database
      await paymentMethod.destroy();
    } catch (error) {
      logger.error('Failed to remove payment method:', error);
      throw error;
    }
  }

  async setDefaultPaymentMethod(userId: string, paymentMethodId: string): Promise<void> {
    const transaction = await PaymentMethod.sequelize!.transaction();

    try {
      // Remove default from all other methods
      await PaymentMethod.update(
        { isDefault: false },
        { where: { userId }, transaction }
      );

      // Set new default
      await PaymentMethod.update(
        { isDefault: true },
        { where: { id: paymentMethodId, userId }, transaction }
      );

      // Update Stripe customer
      const paymentMethod = await PaymentMethod.findByPk(paymentMethodId, { transaction });
      if (paymentMethod) {
        await this.stripe.customers.update(paymentMethod.stripeCustomerId, {
          invoice_settings: {
            default_payment_method: paymentMethod.stripePaymentMethodId
          }
        });
      }

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      logger.error('Failed to set default payment method:', error);
      throw error;
    }
  }

  // Restaurant payouts
  async processRestaurantPayout(request: PayoutRequest): Promise<any> {
    const transaction = await RestaurantPayout.sequelize!.transaction();

    try {
      const restaurant = await Restaurant.findByPk(request.restaurantId);
      if (!restaurant) {
        throw new Error('Restaurant not found');
      }

      // Calculate payout amount
      const payments = await Payment.findAll({
        where: {
          restaurantId: request.restaurantId,
          status: 'succeeded',
          createdAt: {
            [Op.between]: [request.startDate, request.endDate]
          }
        }
      });

      const totalAmount = payments.reduce((sum, p) => sum + p.netAmount, 0);

      if (totalAmount <= 0) {
        throw new Error('No payments to process');
      }

      // Create Stripe transfer
      const transfer = await this.stripe.transfers.create({
        amount: Math.round(totalAmount * 100),
        currency: 'usd',
        destination: restaurant.stripeAccountId,
        metadata: {
          restaurantId: request.restaurantId,
          period: `${request.startDate} to ${request.endDate}`
        }
      });

      // Create payout record
      const payout = await RestaurantPayout.create({
        id: uuidv4(),
        restaurantId: request.restaurantId,
        stripeTransferId: transfer.id,
        amount: totalAmount,
        currency: 'usd',
        status: 'pending',
        periodStart: request.startDate,
        periodEnd: request.endDate,
        paymentCount: payments.length,
        metadata: {
          stripeTransfer: transfer,
          paymentIds: payments.map(p => p.id)
        }
      }, { transaction });

      // Mark payments as paid out
      await Payment.update(
        { payoutId: payout.id },
        {
          where: {
            id: payments.map(p => p.id)
          },
          transaction
        }
      );

      await transaction.commit();

      return {
        success: true,
        payoutId: payout.id,
        amount: totalAmount,
        paymentCount: payments.length
      };
    } catch (error) {
      await transaction.rollback();
      logger.error('Restaurant payout failed:', error);
      throw error;
    }
  }

  // Helper functions
  private async getOrCreateStripeCustomer(userId: string, transaction?: Transaction): Promise<any> {
    const user = await User.findByPk(userId, { transaction });
    if (!user) {
      throw new Error('User not found');
    }

    if (user.stripeCustomerId) {
      return this.stripe.customers.retrieve(user.stripeCustomerId);
    }

    // Create new Stripe customer
    const customer = await this.stripe.customers.create({
      email: user.email,
      name: `${user.firstName} ${user.lastName}`,
      metadata: {
        userId: user.id
      }
    });

    // Save customer ID
    user.stripeCustomerId = customer.id;
    await user.save({ transaction });

    return customer;
  }

  private async getDefaultPaymentMethod(userId: string): Promise<any> {
    return PaymentMethod.findOne({
      where: { userId, isDefault: true }
    });
  }

  private async getRestaurantIdFromReservation(reservationId: string): Promise<string> {
    const reservation = await Reservation.findByPk(reservationId);
    if (!reservation) {
      throw new Error('Reservation not found');
    }
    return reservation.restaurantId;
  }

  private calculateStripeFee(amount: number): number {
    return amount * this.STRIPE_FEE_PERCENTAGE + this.STRIPE_FEE_FIXED;
  }

  private calculatePlatformFee(amount: number): number {
    return amount * this.PLATFORM_FEE_PERCENTAGE;
  }

  private calculateNetAmount(amount: number): number {
    const stripeFee = this.calculateStripeFee(amount);
    const platformFee = this.calculatePlatformFee(amount);
    return amount - stripeFee - platformFee;
  }

  private mapStripeStatus(status: string): string {
    const statusMap: { [key: string]: string } = {
      'succeeded': 'succeeded',
      'processing': 'processing',
      'requires_payment_method': 'pending',
      'requires_confirmation': 'pending',
      'requires_action': 'pending',
      'canceled': 'cancelled',
      'failed': 'failed'
    };
    return statusMap[status] || 'unknown';
  }

  private mapRefundReason(reason?: string): Stripe.RefundCreateParams.Reason | undefined {
    const reasonMap: { [key: string]: Stripe.RefundCreateParams.Reason } = {
      'duplicate': 'duplicate',
      'fraudulent': 'fraudulent',
      'requested': 'requested_by_customer'
    };
    return reason ? reasonMap[reason] || 'requested_by_customer' : undefined;
  }

  private generateGiftCardCode(): string {
    const prefix = 'GC';
    const random = crypto.randomBytes(8).toString('hex').toUpperCase();
    return `${prefix}-${random.substr(0, 4)}-${random.substr(4, 4)}-${random.substr(8, 4)}`;
  }

  private async sendGiftCard(giftCard: any): Promise<void> {
    // Implementation for sending gift card email
    logger.info(`Sending gift card ${giftCard.code} to ${giftCard.recipientEmail}`);
  }

  private async scheduleGiftCardDelivery(giftCard: any, deliveryDate: Date): Promise<void> {
    // Implementation for scheduling gift card delivery
    logger.info(`Scheduling gift card ${giftCard.code} for delivery on ${deliveryDate}`);
  }

  private emitPaymentProcessed(payment: any): void {
    // Emit payment event for real-time updates
    process.emit('payment:processed', payment);
  }

  // Webhook handling
  private initializeWebhooks(): void {
    // This would be set up as an Express endpoint
    // Handles Stripe webhook events
  }

  async handleStripeWebhook(event: Stripe.Event): Promise<void> {
    try {
      switch (event.type) {
        case 'payment_intent.succeeded':
          await this.handlePaymentSucceeded(event.data.object as Stripe.PaymentIntent);
          break;
        case 'payment_intent.payment_failed':
          await this.handlePaymentFailed(event.data.object as Stripe.PaymentIntent);
          break;
        case 'charge.refunded':
          await this.handleRefundCompleted(event.data.object as Stripe.Charge);
          break;
        case 'transfer.paid':
          await this.handlePayoutCompleted(event.data.object as Stripe.Transfer);
          break;
        default:
          logger.info(`Unhandled webhook event: ${event.type}`);
      }
    } catch (error) {
      logger.error('Webhook handling failed:', error);
      throw error;
    }
  }

  private async handlePaymentSucceeded(paymentIntent: Stripe.PaymentIntent): Promise<void> {
    await Payment.update(
      { status: 'succeeded' },
      { where: { stripePaymentIntentId: paymentIntent.id } }
    );
  }

  private async handlePaymentFailed(paymentIntent: Stripe.PaymentIntent): Promise<void> {
    await Payment.update(
      {
        status: 'failed',
        failureReason: paymentIntent.last_payment_error?.message
      },
      { where: { stripePaymentIntentId: paymentIntent.id } }
    );
  }

  private async handleRefundCompleted(charge: Stripe.Charge): Promise<void> {
    // Update refund status
  }

  private async handlePayoutCompleted(transfer: Stripe.Transfer): Promise<void> {
    await RestaurantPayout.update(
      { status: 'completed' },
      { where: { stripeTransferId: transfer.id } }
    );
  }
}

export const advancedPaymentService = new AdvancedPaymentService();