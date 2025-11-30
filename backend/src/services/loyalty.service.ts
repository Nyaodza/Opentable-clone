import { User } from '../models/User';
import { Restaurant } from '../models/Restaurant';
import { Reservation } from '../models/Reservation';
import { LoyaltyTransaction, TransactionType } from '../models/LoyaltyProgram';
import { sequelize } from '../config/database';
import { Transaction, Op } from 'sequelize';
import { BadRequestError, NotFoundError } from '../middleware/errorHandler';
import { logInfo, logError } from '../utils/logger';
import { cache, CACHE_KEYS, CACHE_TTL } from '../config/redis';
import { EmailService } from './email.service';

interface LoyaltyConfig {
  pointsPerDollar: number;
  welcomeBonus: number;
  referralBonus: number;
  birthdayBonus: number;
  reviewBonus: number;
  milestoneRewards: {
    points: number;
    bonus: number;
  }[];
  tierThresholds: {
    silver: number;
    gold: number;
    platinum: number;
  };
  tierBenefits: {
    silver: { multiplier: number; perks: string[] };
    gold: { multiplier: number; perks: string[] };
    platinum: { multiplier: number; perks: string[] };
  };
  redemptionRates: {
    dollarValue: number; // points per dollar
    minRedemption: number;
  };
}

const DEFAULT_LOYALTY_CONFIG: LoyaltyConfig = {
  pointsPerDollar: 10,
  welcomeBonus: 100,
  referralBonus: 500,
  birthdayBonus: 200,
  reviewBonus: 50,
  milestoneRewards: [
    { points: 1000, bonus: 100 },
    { points: 5000, bonus: 500 },
    { points: 10000, bonus: 1000 },
    { points: 25000, bonus: 2500 }
  ],
  tierThresholds: {
    silver: 2500,
    gold: 10000,
    platinum: 25000
  },
  tierBenefits: {
    silver: {
      multiplier: 1.25,
      perks: ['Priority waitlist', '10% bonus points']
    },
    gold: {
      multiplier: 1.5,
      perks: ['Priority reservations', '25% bonus points', 'Free birthday dessert']
    },
    platinum: {
      multiplier: 2,
      perks: ['VIP treatment', '50% bonus points', 'Complimentary appetizer monthly', 'Exclusive events']
    }
  },
  redemptionRates: {
    dollarValue: 100, // 100 points = $1
    minRedemption: 500
  }
};

export class LoyaltyService {
  private static config: LoyaltyConfig = DEFAULT_LOYALTY_CONFIG;

  /**
   * Get user loyalty status
   */
  static async getUserLoyaltyStatus(userId: string): Promise<{
    points: number;
    lifetime: number;
    tier: 'bronze' | 'silver' | 'gold' | 'platinum';
    tierProgress: number;
    nextTier?: string;
    pointsToNextTier?: number;
    recentTransactions: LoyaltyTransaction[];
    availableRewards: any[];
  }> {
    const cacheKey = CACHE_KEYS.LOYALTY_POINTS(userId);
    const cached = await cache.get<any>(cacheKey);
    
    if (cached) {
      return cached;
    }

    const user = await User.findByPk(userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Get all transactions
    const transactions = await LoyaltyTransaction.findAll({
      where: { userId },
      order: [['createdAt', 'DESC']],
      limit: 10
    });

    // Calculate lifetime points
    const lifetimePoints = await LoyaltyTransaction.sum('points', {
      where: {
        userId,
        type: { [Op.in]: [TransactionType.EARN, TransactionType.BONUS] }
      }
    }) || 0;

    // Calculate current balance
    const earned = await LoyaltyTransaction.sum('points', {
      where: {
        userId,
        type: { [Op.in]: [TransactionType.EARN, TransactionType.BONUS] }
      }
    }) || 0;

    const redeemed = await LoyaltyTransaction.sum('points', {
      where: {
        userId,
        type: TransactionType.REDEEM
      }
    }) || 0;

    const expired = await LoyaltyTransaction.sum('points', {
      where: {
        userId,
        type: TransactionType.EXPIRE
      }
    }) || 0;

    const currentPoints = earned - redeemed - expired;

    // Determine tier
    const tier = this.calculateTier(lifetimePoints);
    const tierProgress = this.calculateTierProgress(lifetimePoints, tier);
    const { nextTier, pointsToNextTier } = this.getNextTierInfo(lifetimePoints, tier);

    // Get available rewards
    const availableRewards = await this.getAvailableRewards(currentPoints);

    const status = {
      points: currentPoints,
      lifetime: lifetimePoints,
      tier,
      tierProgress,
      nextTier,
      pointsToNextTier,
      recentTransactions: transactions,
      availableRewards
    };

    await cache.set(cacheKey, status, CACHE_TTL.MEDIUM);
    
    return status;
  }

  /**
   * Award points for completed reservation
   */
  static async awardReservationPoints(
    reservationId: string,
    transaction?: Transaction
  ): Promise<LoyaltyTransaction> {
    const reservation = await Reservation.findByPk(reservationId, {
      include: [
        { model: User, as: 'user' },
        { model: Restaurant, as: 'restaurant' }
      ],
      transaction
    });

    if (!reservation) {
      throw new NotFoundError('Reservation not found');
    }

    // Calculate base points
    const billAmount = reservation.estimatedBillAmount || 50; // Default estimate
    const basePoints = Math.floor(billAmount * this.config.pointsPerDollar);

    // Apply tier multiplier
    const userStatus = await this.getUserLoyaltyStatus(reservation.userId);
    const tierMultiplier = this.getTierMultiplier(userStatus.tier);
    const totalPoints = Math.floor(basePoints * tierMultiplier);

    // Create transaction
    const loyaltyTransaction = await LoyaltyTransaction.create({
      userId: reservation.userId,
      type: TransactionType.EARN,
      points: totalPoints,
      description: `Dining at ${reservation.restaurant.name}`,
      metadata: {
        reservationId,
        restaurantId: reservation.restaurantId,
        billAmount,
        basePoints,
        tierMultiplier
      }
    }, { transaction });

    // Update user points
    await User.update(
      { loyaltyPoints: sequelize.literal(`loyalty_points + ${totalPoints}`) },
      { where: { id: reservation.userId }, transaction }
    );

    // Check for milestone rewards
    await this.checkMilestoneRewards(reservation.userId, userStatus.lifetime + totalPoints, transaction);

    // Clear cache
    await cache.del(CACHE_KEYS.LOYALTY_POINTS(reservation.userId));

    logInfo('Loyalty points awarded', {
      userId: reservation.userId,
      reservationId,
      points: totalPoints
    });

    return loyaltyTransaction;
  }

  /**
   * Award bonus points
   */
  static async awardBonusPoints(
    userId: string,
    points: number,
    reason: string,
    metadata?: any
  ): Promise<LoyaltyTransaction> {
    const transaction = await sequelize.transaction();

    try {
      const loyaltyTransaction = await LoyaltyTransaction.create({
        userId,
        type: TransactionType.BONUS,
        points,
        description: reason,
        metadata
      }, { transaction });

      await User.update(
        { loyaltyPoints: sequelize.literal(`loyalty_points + ${points}`) },
        { where: { id: userId }, transaction }
      );

      await transaction.commit();

      // Clear cache
      await cache.del(CACHE_KEYS.LOYALTY_POINTS(userId));

      logInfo('Bonus points awarded', { userId, points, reason });

      // Send notification
      await EmailService.sendLoyaltyPointsNotification(userId, points, reason);

      return loyaltyTransaction;
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Award referral bonus
   */
  static async awardReferralBonus(
    referrerId: string,
    referredId: string
  ): Promise<void> {
    await this.awardBonusPoints(
      referrerId,
      this.config.referralBonus,
      'Referral bonus',
      { referredUserId: referredId }
    );

    await this.awardBonusPoints(
      referredId,
      this.config.welcomeBonus,
      'Welcome bonus from referral',
      { referrerUserId: referrerId }
    );
  }

  /**
   * Award review bonus
   */
  static async awardReviewBonus(
    userId: string,
    reviewId: string,
    restaurantName: string
  ): Promise<void> {
    await this.awardBonusPoints(
      userId,
      this.config.reviewBonus,
      `Review bonus for ${restaurantName}`,
      { reviewId }
    );
  }

  /**
   * Redeem points
   */
  static async redeemPoints(
    userId: string,
    points: number,
    redemptionType: 'credit' | 'gift_card' | 'donation',
    metadata?: any
  ): Promise<{
    transaction: LoyaltyTransaction;
    value: number;
  }> {
    const transaction = await sequelize.transaction();

    try {
      // Check available points
      const status = await this.getUserLoyaltyStatus(userId);
      
      if (status.points < points) {
        throw new BadRequestError('Insufficient points');
      }

      if (points < this.config.redemptionRates.minRedemption) {
        throw new BadRequestError(`Minimum redemption is ${this.config.redemptionRates.minRedemption} points`);
      }

      // Calculate dollar value
      const dollarValue = points / this.config.redemptionRates.dollarValue;

      // Create redemption transaction
      const loyaltyTransaction = await LoyaltyTransaction.create({
        userId,
        type: TransactionType.REDEEM,
        points: -points,
        description: `Redeemed for ${redemptionType}`,
        metadata: {
          ...metadata,
          redemptionType,
          dollarValue
        }
      }, { transaction });

      // Update user points
      await User.update(
        { loyaltyPoints: sequelize.literal(`loyalty_points - ${points}`) },
        { where: { id: userId }, transaction }
      );

      // Process redemption based on type
      switch (redemptionType) {
        case 'credit':
          // Add credit to user account
          // This would integrate with payment system
          break;
        case 'gift_card':
          // Generate gift card
          // This would integrate with gift card system
          break;
        case 'donation':
          // Process donation
          // This would integrate with charity partners
          break;
      }

      await transaction.commit();

      // Clear cache
      await cache.del(CACHE_KEYS.LOYALTY_POINTS(userId));

      logInfo('Points redeemed', { userId, points, redemptionType, dollarValue });

      return {
        transaction: loyaltyTransaction,
        value: dollarValue
      };
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Get point history
   */
  static async getPointHistory(
    userId: string,
    filters?: {
      type?: TransactionType;
      startDate?: Date;
      endDate?: Date;
      page?: number;
      limit?: number;
    }
  ): Promise<{
    transactions: LoyaltyTransaction[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const {
      type,
      startDate,
      endDate,
      page = 1,
      limit = 20
    } = filters || {};

    const where: any = { userId };

    if (type) where.type = type;
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt[Op.gte] = startDate;
      if (endDate) where.createdAt[Op.lte] = endDate;
    }

    const offset = (page - 1) * limit;

    const { count, rows } = await LoyaltyTransaction.findAndCountAll({
      where,
      limit,
      offset,
      order: [['createdAt', 'DESC']]
    });

    return {
      transactions: rows,
      total: count,
      page,
      totalPages: Math.ceil(count / limit)
    };
  }

  /**
   * Check and expire points
   */
  static async expirePoints(): Promise<void> {
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    // Find points that should expire
    const expiringTransactions = await LoyaltyTransaction.findAll({
      where: {
        type: { [Op.in]: [TransactionType.EARN, TransactionType.BONUS] },
        createdAt: { [Op.lt]: oneYearAgo },
        expiryProcessed: false
      },
      include: [{ model: User, as: 'user' }]
    });

    for (const transaction of expiringTransactions) {
      const t = await sequelize.transaction();

      try {
        // Create expiry transaction
        await LoyaltyTransaction.create({
          userId: transaction.userId,
          type: TransactionType.EXPIRE,
          points: -transaction.points,
          description: 'Points expired',
          metadata: {
            originalTransactionId: transaction.id,
            earnedDate: transaction.createdAt
          }
        }, { transaction: t });

        // Mark original transaction as processed
        await transaction.update({ expiryProcessed: true }, { transaction: t });

        // Update user points
        await User.update(
          { loyaltyPoints: sequelize.literal(`loyalty_points - ${transaction.points}`) },
          { where: { id: transaction.userId }, transaction: t }
        );

        await t.commit();

        // Send notification
        await EmailService.sendPointsExpiryNotification(
          transaction.userId,
          transaction.points
        );

        logInfo('Points expired', {
          userId: transaction.userId,
          points: transaction.points
        });
      } catch (error) {
        await t.rollback();
        logError('Failed to expire points', error);
      }
    }
  }

  /**
   * Get loyalty leaderboard
   */
  static async getLeaderboard(
    period: 'all' | 'year' | 'month' = 'month',
    limit: number = 10
  ): Promise<Array<{
    user: User;
    points: number;
    rank: number;
  }>> {
    let startDate: Date | undefined;
    
    if (period === 'month') {
      startDate = new Date();
      startDate.setMonth(startDate.getMonth() - 1);
    } else if (period === 'year') {
      startDate = new Date();
      startDate.setFullYear(startDate.getFullYear() - 1);
    }

    const where: any = {
      type: { [Op.in]: [TransactionType.EARN, TransactionType.BONUS, TransactionType.BONUS] }
    };

    if (startDate) {
      where.createdAt = { [Op.gte]: startDate };
    }

    const leaderboard = await LoyaltyTransaction.findAll({
      where,
      attributes: [
        'userId',
        [sequelize.fn('SUM', sequelize.col('points')), 'totalPoints']
      ],
      group: ['userId'],
      order: [[sequelize.fn('SUM', sequelize.col('points')), 'DESC']],
      limit,
      include: [{
        model: User,
        as: 'user',
        attributes: ['id', 'firstName', 'lastName']
      }],
      raw: false
    });

    return leaderboard.map((entry: any, index) => ({
      user: entry.user,
      points: parseInt(entry.dataValues.totalPoints),
      rank: index + 1
    }));
  }

  // Helper methods

  private static calculateTier(lifetimePoints: number): 'bronze' | 'silver' | 'gold' | 'platinum' {
    if (lifetimePoints >= this.config.tierThresholds.platinum) return 'platinum';
    if (lifetimePoints >= this.config.tierThresholds.gold) return 'gold';
    if (lifetimePoints >= this.config.tierThresholds.silver) return 'silver';
    return 'bronze';
  }

  private static calculateTierProgress(
    lifetimePoints: number,
    currentTier: string
  ): number {
    switch (currentTier) {
      case 'bronze':
        return (lifetimePoints / this.config.tierThresholds.silver) * 100;
      case 'silver':
        const silverProgress = lifetimePoints - this.config.tierThresholds.silver;
        const silverToGold = this.config.tierThresholds.gold - this.config.tierThresholds.silver;
        return (silverProgress / silverToGold) * 100;
      case 'gold':
        const goldProgress = lifetimePoints - this.config.tierThresholds.gold;
        const goldToPlatinum = this.config.tierThresholds.platinum - this.config.tierThresholds.gold;
        return (goldProgress / goldToPlatinum) * 100;
      default:
        return 100;
    }
  }

  private static getNextTierInfo(
    lifetimePoints: number,
    currentTier: string
  ): { nextTier?: string; pointsToNextTier?: number } {
    switch (currentTier) {
      case 'bronze':
        return {
          nextTier: 'silver',
          pointsToNextTier: this.config.tierThresholds.silver - lifetimePoints
        };
      case 'silver':
        return {
          nextTier: 'gold',
          pointsToNextTier: this.config.tierThresholds.gold - lifetimePoints
        };
      case 'gold':
        return {
          nextTier: 'platinum',
          pointsToNextTier: this.config.tierThresholds.platinum - lifetimePoints
        };
      default:
        return {};
    }
  }

  private static getTierMultiplier(tier: string): number {
    switch (tier) {
      case 'silver':
        return this.config.tierBenefits.silver.multiplier;
      case 'gold':
        return this.config.tierBenefits.gold.multiplier;
      case 'platinum':
        return this.config.tierBenefits.platinum.multiplier;
      default:
        return 1;
    }
  }

  private static async getAvailableRewards(points: number): Promise<any[]> {
    const rewards = [];

    // Standard redemptions
    if (points >= this.config.redemptionRates.minRedemption) {
      rewards.push({
        type: 'credit',
        name: 'Account Credit',
        pointsCost: this.config.redemptionRates.minRedemption,
        value: this.config.redemptionRates.minRedemption / this.config.redemptionRates.dollarValue,
        description: 'Redeem points for account credit'
      });
    }

    // Gift cards at various levels
    const giftCardLevels = [2500, 5000, 10000];
    for (const level of giftCardLevels) {
      if (points >= level) {
        rewards.push({
          type: 'gift_card',
          name: `$${level / this.config.redemptionRates.dollarValue} Gift Card`,
          pointsCost: level,
          value: level / this.config.redemptionRates.dollarValue,
          description: 'Digital gift card'
        });
      }
    }

    // Charity donations
    if (points >= 1000) {
      rewards.push({
        type: 'donation',
        name: 'Charity Donation',
        pointsCost: 1000,
        value: 10,
        description: 'Donate to partner charities'
      });
    }

    return rewards;
  }

  private static async checkMilestoneRewards(
    userId: string,
    newLifetimePoints: number,
    transaction?: Transaction
  ): Promise<void> {
    for (const milestone of this.config.milestoneRewards) {
      const previousPoints = newLifetimePoints - milestone.points;
      
      // Check if user just crossed this milestone
      if (previousPoints < milestone.points && newLifetimePoints >= milestone.points) {
        await this.awardBonusPoints(
          userId,
          milestone.bonus,
          `Milestone reward: ${milestone.points} lifetime points`,
          { milestone: milestone.points }
        );
      }
    }
  }

  /**
   * Award birthday bonus
   */
  static async awardBirthdayBonuses(): Promise<void> {
    const today = new Date();
    const month = today.getMonth() + 1;
    const day = today.getDate();

    // Find users with birthdays today
    const birthdayUsers = await User.findAll({
      where: sequelize.where(
        sequelize.fn('EXTRACT', sequelize.literal('MONTH FROM "dateOfBirth"')),
        month
      )
    });

    for (const user of birthdayUsers) {
      try {
        // Check if bonus already awarded this year
        const existingBonus = await LoyaltyTransaction.findOne({
          where: {
            userId: user.id,
            type: TransactionType.BONUS,
            description: { [Op.like]: '%Birthday bonus%' },
            createdAt: {
              [Op.gte]: new Date(today.getFullYear(), 0, 1)
            }
          }
        });

        if (!existingBonus) {
          await this.awardBonusPoints(
            user.id,
            this.config.birthdayBonus,
            'Birthday bonus! Happy Birthday!',
            { birthday: true }
          );
        }
      } catch (error) {
        logError('Failed to award birthday bonus', { userId: user.id, error });
      }
    }
  }
}