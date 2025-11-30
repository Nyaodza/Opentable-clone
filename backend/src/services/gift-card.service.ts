import { GiftCard } from '../models/GiftCard';
import { User } from '../models/User';
import crypto from 'crypto';
import { Op } from 'sequelize';

export interface PurchaseGiftCardDto {
  amount: number;
  purchasedBy?: string;
  recipientEmail?: string;
  recipientName?: string;
  message?: string;
  designTemplate?: string;
  isPhysicalCard?: boolean;
  shippingAddress?: Record<string, any>;
}

export interface RedeemGiftCardDto {
  code: string;
  pin: string;
  amount: number;
  userId?: string;
}

export class GiftCardService {
  /**
   * Purchase a new gift card
   */
  async purchaseGiftCard(data: PurchaseGiftCardDto): Promise<GiftCard> {
    // Generate unique code and PIN
    const code = this.generateGiftCardCode();
    const pin = this.generatePIN();

    // Set expiration date (1 year from now by default)
    const expirationDate = new Date();
    expirationDate.setFullYear(expirationDate.getFullYear() + 1);

    const giftCard = await GiftCard.create({
      code,
      pin,
      purchasedBy: data.purchasedBy || null,
      initialAmount: data.amount,
      currentBalance: data.amount,
      recipientEmail: data.recipientEmail || null,
      recipientName: data.recipientName || null,
      message: data.message || null,
      designTemplate: data.designTemplate || 'default',
      expirationDate,
      activationDate: new Date(),
      status: 'active',
      isPhysicalCard: data.isPhysicalCard || false,
      shippingAddress: data.shippingAddress || {},
      transactionHistory: [
        {
          date: new Date().toISOString(),
          amount: data.amount,
          type: 'purchase',
          description: 'Gift card purchased',
        },
      ],
    });

    return giftCard;
  }

  /**
   * Get gift card by code and PIN
   */
  async getGiftCard(code: string, pin: string): Promise<GiftCard | null> {
    const giftCard = await GiftCard.findOne({
      where: { code, pin },
      include: [
        { model: User, as: 'purchaser' },
        { model: User, as: 'redeemer' },
      ],
    });

    return giftCard;
  }

  /**
   * Check gift card balance
   */
  async checkBalance(code: string, pin: string): Promise<{ balance: number; status: string }> {
    const giftCard = await this.getGiftCard(code, pin);

    if (!giftCard) {
      throw new Error('Invalid gift card code or PIN');
    }

    // Check if expired
    if (giftCard.expirationDate && new Date() > giftCard.expirationDate) {
      await giftCard.update({ status: 'expired' });
      throw new Error('Gift card has expired');
    }

    return {
      balance: Number(giftCard.currentBalance),
      status: giftCard.status,
    };
  }

  /**
   * Redeem gift card (full or partial amount)
   */
  async redeemGiftCard(data: RedeemGiftCardDto): Promise<GiftCard> {
    const giftCard = await this.getGiftCard(data.code, data.pin);

    if (!giftCard) {
      throw new Error('Invalid gift card code or PIN');
    }

    if (giftCard.status !== 'active') {
      throw new Error(`Gift card is ${giftCard.status}`);
    }

    if (Number(giftCard.currentBalance) < data.amount) {
      throw new Error('Insufficient gift card balance');
    }

    // Check if expired
    if (giftCard.expirationDate && new Date() > giftCard.expirationDate) {
      await giftCard.update({ status: 'expired' });
      throw new Error('Gift card has expired');
    }

    const newBalance = Number(giftCard.currentBalance) - data.amount;

    // Update transaction history
    const transactionHistory = [...giftCard.transactionHistory, {
      date: new Date().toISOString(),
      amount: data.amount,
      type: 'redemption' as const,
      description: `Redeemed $${data.amount}`,
    }];

    // Update gift card
    await giftCard.update({
      currentBalance: newBalance,
      status: newBalance === 0 ? 'redeemed' : 'active',
      redeemedBy: data.userId || giftCard.redeemedBy,
      redeemedAt: newBalance === 0 ? new Date() : giftCard.redeemedAt,
      transactionHistory,
    });

    return giftCard;
  }

  /**
   * Get all gift cards purchased by a user
   */
  async getUserPurchasedGiftCards(userId: string): Promise<GiftCard[]> {
    const giftCards = await GiftCard.findAll({
      where: { purchasedBy: userId },
      order: [['createdAt', 'DESC']],
    });

    return giftCards;
  }

  /**
   * Get all gift cards redeemed by a user
   */
  async getUserRedeemedGiftCards(userId: string): Promise<GiftCard[]> {
    const giftCards = await GiftCard.findAll({
      where: { redeemedBy: userId },
      order: [['redeemedAt', 'DESC']],
    });

    return giftCards;
  }

  /**
   * Cancel/refund a gift card
   */
  async cancelGiftCard(code: string, pin: string, reason: string): Promise<GiftCard> {
    const giftCard = await this.getGiftCard(code, pin);

    if (!giftCard) {
      throw new Error('Invalid gift card code or PIN');
    }

    if (giftCard.status === 'cancelled') {
      throw new Error('Gift card is already cancelled');
    }

    const transactionHistory = [...giftCard.transactionHistory, {
      date: new Date().toISOString(),
      amount: Number(giftCard.currentBalance),
      type: 'refund' as const,
      description: `Cancelled: ${reason}`,
    }];

    await giftCard.update({
      status: 'cancelled',
      transactionHistory,
    });

    return giftCard;
  }

  /**
   * Extend gift card expiration
   */
  async extendExpiration(code: string, pin: string, monthsToAdd: number): Promise<GiftCard> {
    const giftCard = await this.getGiftCard(code, pin);

    if (!giftCard) {
      throw new Error('Invalid gift card code or PIN');
    }

    const newExpiration = new Date(giftCard.expirationDate || new Date());
    newExpiration.setMonth(newExpiration.getMonth() + monthsToAdd);

    await giftCard.update({
      expirationDate: newExpiration,
      status: 'active', // Reactivate if was expired
    });

    return giftCard;
  }

  /**
   * Send gift card email to recipient
   */
  async sendGiftCardEmail(giftCardId: string): Promise<void> {
    const giftCard = await GiftCard.findByPk(giftCardId);

    if (!giftCard) {
      throw new Error('Gift card not found');
    }

    // Email sending logic would go here
    // For now, just mark as sent
    await giftCard.update({ emailSent: true });
  }

  /**
   * Get gift card statistics
   */
  async getStatistics(): Promise<any> {
    const totalPurchased = await GiftCard.sum('initialAmount');
    const totalRedeemed = await GiftCard.sum('initialAmount', {
      where: { status: 'redeemed' },
    });
    const activeBalance = await GiftCard.sum('currentBalance', {
      where: { status: 'active' },
    });
    const totalCards = await GiftCard.count();
    const activeCards = await GiftCard.count({ where: { status: 'active' } });
    const expiredCards = await GiftCard.count({ where: { status: 'expired' } });

    return {
      totalPurchased: Number(totalPurchased) || 0,
      totalRedeemed: Number(totalRedeemed) || 0,
      activeBalance: Number(activeBalance) || 0,
      totalCards,
      activeCards,
      expiredCards,
      redemptionRate: totalCards > 0 ? ((totalCards - activeCards) / totalCards) * 100 : 0,
    };
  }

  /**
   * Generate unique gift card code (16 characters)
   */
  private generateGiftCardCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Excluding ambiguous characters
    let code = '';
    for (let i = 0; i < 16; i++) {
      if (i > 0 && i % 4 === 0) code += '-';
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    return code;
  }

  /**
   * Generate 6-digit PIN
   */
  private generatePIN(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * Validate gift card for use
   */
  async validateGiftCard(code: string, pin: string, requiredAmount?: number): Promise<boolean> {
    try {
      const { balance, status } = await this.checkBalance(code, pin);

      if (status !== 'active') {
        return false;
      }

      if (requiredAmount && balance < requiredAmount) {
        return false;
      }

      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Search gift cards
   */
  async searchGiftCards(query: string): Promise<GiftCard[]> {
    const giftCards = await GiftCard.findAll({
      where: {
        [Op.or]: [
          { code: { [Op.iLike]: `%${query}%` } },
          { recipientEmail: { [Op.iLike]: `%${query}%` } },
          { recipientName: { [Op.iLike]: `%${query}%` } },
        ],
      },
      limit: 50,
      order: [['createdAt', 'DESC']],
    });

    return giftCards;
  }
}

export default new GiftCardService();
