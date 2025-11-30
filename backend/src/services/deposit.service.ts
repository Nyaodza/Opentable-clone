import { ReservationDeposit } from '../models/ReservationDeposit';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', { apiVersion: '2023-10-16' });

export interface CreateDepositDto {
  reservationId: string;
  userId: string;
  restaurantId: string;
  amount: number;
  type: 'deposit' | 'prepayment' | 'no_show_fee';
  paymentMethodId?: string;
}

export class DepositService {
  /**
   * Create payment intent for deposit
   */
  async createDepositIntent(data: CreateDepositDto): Promise<any> {
    // Create Stripe payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(data.amount * 100), // Convert to cents
      currency: 'usd',
      metadata: {
        reservationId: data.reservationId,
        userId: data.userId,
        restaurantId: data.restaurantId,
        type: data.type,
      },
      capture_method: data.type === 'deposit' ? 'manual' : 'automatic',
    });

    // Create deposit record
    const deposit = await ReservationDeposit.create({
      reservationId: data.reservationId,
      userId: data.userId,
      restaurantId: data.restaurantId,
      amount: data.amount,
      type: data.type,
      status: 'pending',
      stripePaymentIntentId: paymentIntent.id,
    });

    return {
      deposit,
      clientSecret: paymentIntent.client_secret,
    };
  }

  /**
   * Authorize deposit (hold funds)
   */
  async authorizeDeposit(depositId: string): Promise<ReservationDeposit> {
    const deposit = await ReservationDeposit.findByPk(depositId);
    if (!deposit) {
      throw new Error('Deposit not found');
    }

    if (!deposit.stripePaymentIntentId) {
      throw new Error('No payment intent associated');
    }

    // Confirm payment intent (authorize)
    const paymentIntent = await stripe.paymentIntents.confirm(deposit.stripePaymentIntentId);

    await deposit.update({
      status: 'authorized',
      authorizedAt: new Date(),
    });

    return deposit;
  }

  /**
   * Capture deposit (charge card)
   */
  async captureDeposit(depositId: string): Promise<ReservationDeposit> {
    const deposit = await ReservationDeposit.findByPk(depositId);
    if (!deposit) {
      throw new Error('Deposit not found');
    }

    if (deposit.status !== 'authorized') {
      throw new Error('Deposit must be authorized first');
    }

    // Capture payment
    const paymentIntent = await stripe.paymentIntents.capture(deposit.stripePaymentIntentId!);

    await deposit.update({
      status: 'captured',
      capturedAt: new Date(),
      stripeChargeId: paymentIntent.charges.data[0]?.id,
    });

    return deposit;
  }

  /**
   * Refund deposit
   */
  async refundDeposit(
    depositId: string,
    amount?: number,
    reason?: string
  ): Promise<ReservationDeposit> {
    const deposit = await ReservationDeposit.findByPk(depositId);
    if (!deposit) {
      throw new Error('Deposit not found');
    }

    if (!deposit.isRefundable) {
      throw new Error('Deposit is not refundable');
    }

    if (deposit.refundableUntil && new Date() > deposit.refundableUntil) {
      throw new Error('Refund period has expired');
    }

    const refundAmount = amount || Number(deposit.amount);

    // Process refund via Stripe
    if (deposit.stripeChargeId) {
      await stripe.refunds.create({
        charge: deposit.stripeChargeId,
        amount: Math.round(refundAmount * 100),
        reason: 'requested_by_customer',
      });
    }

    await deposit.update({
      status: 'refunded',
      refundedAt: new Date(),
      refundAmount,
      refundReason: reason || 'Customer requested',
    });

    return deposit;
  }

  /**
   * Calculate deposit amount based on restaurant policy
   */
  async calculateDepositAmount(
    restaurantId: string,
    partySize: number,
    reservationDate: Date
  ): Promise<{ required: boolean; amount: number; type: string }> {
    // Example logic - should be based on restaurant settings
    let required = false;
    let amount = 0;
    let type = 'none';

    // Require deposit for large parties (8+)
    if (partySize >= 8) {
      required = true;
      amount = partySize * 25; // $25 per person
      type = 'deposit';
    }

    // Require deposit for holiday periods
    const holidays = ['12-24', '12-25', '12-31', '01-01', '02-14'];
    const dateStr = `${reservationDate.getMonth() + 1}-${reservationDate.getDate()}`;
    if (holidays.includes(dateStr.padStart(5, '0'))) {
      required = true;
      amount = partySize * 50; // $50 per person for holidays
      type = 'prepayment';
    }

    return { required, amount, type };
  }

  /**
   * Get deposit by reservation
   */
  async getDepositByReservation(reservationId: string): Promise<ReservationDeposit | null> {
    return await ReservationDeposit.findOne({
      where: { reservationId },
    });
  }

  /**
   * Get user deposits
   */
  async getUserDeposits(userId: string): Promise<ReservationDeposit[]> {
    return await ReservationDeposit.findAll({
      where: { userId },
      order: [['createdAt', 'DESC']],
    });
  }

  /**
   * Get restaurant deposits
   */
  async getRestaurantDeposits(
    restaurantId: string,
    status?: string
  ): Promise<ReservationDeposit[]> {
    const where: any = { restaurantId };
    if (status) where.status = status;

    return await ReservationDeposit.findAll({
      where,
      order: [['createdAt', 'DESC']],
    });
  }

  /**
   * Handle no-show fee
   */
  async chargeNoShowFee(reservationId: string): Promise<ReservationDeposit> {
    const deposit = await this.getDepositByReservation(reservationId);

    if (!deposit) {
      throw new Error('No deposit found for reservation');
    }

    if (deposit.status !== 'authorized') {
      throw new Error('Cannot charge no-show fee - deposit not authorized');
    }

    // Capture as no-show fee
    await deposit.update({ type: 'no_show_fee' });
    return await this.captureDeposit(deposit.id);
  }
}

export default new DepositService();
