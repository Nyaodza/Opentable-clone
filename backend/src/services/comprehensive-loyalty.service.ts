import { EventEmitter } from 'events';
import { Transaction, Op } from 'sequelize';
import {
  User,
  LoyaltyAccount,
  LoyaltyTransaction,
  LoyaltyTier,
  Reward,
  RewardRedemption,
  Restaurant,
  Reservation,
  PartnerProgram
} from '../models';
import { notificationService } from './notification.service';
import { redis } from '../config/redis';
import { logger } from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';
import moment from 'moment';
import crypto from 'crypto';

interface PointsTransaction {
  userId: string;
  points: number;
  type: 'earned' | 'redeemed' | 'expired' | 'bonus' | 'penalty' | 'transferred';
  source: 'reservation' | 'review' | 'referral' | 'purchase' | 'promotion' | 'admin';
  referenceId?: string;
  description: string;
  metadata?: any;
}

interface TierBenefits {
  tier: string;
  pointsMultiplier: number;
  freeDelivery: boolean;
  priorityReservations: boolean;
  exclusiveEvents: boolean;
  conciergeService: boolean;
  complimentaryUpgrades: boolean;
  birthdayReward: boolean;
  dedicatedSupport: boolean;
  partnerBenefits: string[];
}

interface RewardCatalogItem {
  id: string;
  name: string;
  description: string;
  category: string;
  pointsCost: number;
  tier: string[];
  availability: 'unlimited' | 'limited';
  stock?: number;
  expiresAt?: Date;
  terms: string[];
  restaurantId?: string;
  partnerProgramId?: string;
}

interface ReferralProgram {
  referrerId: string;
  referredEmail: string;
  referralCode: string;
  status: 'pending' | 'completed' | 'expired';
  referrerReward: number;
  referredReward: number;
}

export class ComprehensiveLoyaltyService extends EventEmitter {
  private readonly TIERS = {
    BRONZE: { name: 'Bronze', minPoints: 0, multiplier: 1.0, color: '#CD7F32' },
    SILVER: { name: 'Silver', minPoints: 1000, multiplier: 1.25, color: '#C0C0C0' },
    GOLD: { name: 'Gold', minPoints: 5000, multiplier: 1.5, color: '#FFD700' },
    PLATINUM: { name: 'Platinum', minPoints: 10000, multiplier: 2.0, color: '#E5E4E2' }
  };

  private readonly POINTS_PER_DOLLAR = 10;
  private readonly REFERRAL_BONUS = 500;
  private readonly REVIEW_BONUS = 50;
  private readonly BIRTHDAY_BONUS = 1000;
  private readonly POINTS_EXPIRY_MONTHS = 12;

  constructor() {
    super();
    this.initializeScheduledJobs();
  }

  // Create or get loyalty account
  async getOrCreateLoyaltyAccount(userId: string): Promise<LoyaltyAccount> {
    let account = await LoyaltyAccount.findOne({ where: { userId } });

    if (!account) {
      account = await LoyaltyAccount.create({
        id: uuidv4(),
        userId,
        totalPoints: 0,
        availablePoints: 0,
        lifetimePoints: 0,
        currentTier: 'BRONZE',
        tierExpiresAt: moment().add(1, 'year').toDate(),
        memberSince: new Date(),
        metadata: {
          joinSource: 'registration',
          preferences: {}
        }
      });

      // Send welcome bonus
      await this.awardPoints(userId, 100, 'bonus', 'registration', null, 'Welcome bonus');
    }

    return account;
  }

  // Award points
  async awardPoints(
    userId: string,
    basePoints: number,
    type: 'earned' | 'bonus',
    source: string,
    referenceId?: string,
    description?: string
  ): Promise<number> {
    const transaction = await LoyaltyAccount.sequelize!.transaction();

    try {
      const account = await this.getOrCreateLoyaltyAccount(userId);

      // Get tier multiplier
      const tierMultiplier = this.getTierMultiplier(account.currentTier);

      // Calculate final points with multipliers
      let finalPoints = basePoints;
      if (type === 'earned') {
        finalPoints = Math.round(basePoints * tierMultiplier);
      }

      // Special occasion multipliers
      const specialMultiplier = await this.getSpecialMultiplier(userId);
      finalPoints = Math.round(finalPoints * specialMultiplier);

      // Update account
      account.totalPoints += finalPoints;
      account.availablePoints += finalPoints;
      account.lifetimePoints += finalPoints;
      await account.save({ transaction });

      // Create transaction record
      await LoyaltyTransaction.create({
        id: uuidv4(),
        loyaltyAccountId: account.id,
        userId,
        points: finalPoints,
        type: 'earned',
        source,
        referenceId,
        description: description || `Points earned from ${source}`,
        balance: account.availablePoints,
        expiresAt: moment().add(this.POINTS_EXPIRY_MONTHS, 'months').toDate(),
        metadata: {
          basePoints,
          tierMultiplier,
          specialMultiplier
        }
      }, { transaction });

      // Check for tier upgrade
      await this.checkTierUpgrade(account, transaction);

      await transaction.commit();

      // Send notification
      await this.sendPointsNotification(userId, finalPoints, 'earned', account.availablePoints);

      // Emit event
      this.emit('points:awarded', {
        userId,
        points: finalPoints,
        source,
        newBalance: account.availablePoints
      });

      return finalPoints;
    } catch (error) {
      await transaction.rollback();
      logger.error('Failed to award points:', error);
      throw error;
    }
  }

  // Calculate dining points
  async calculateDiningPoints(userId: string, amount: number, restaurantId: string): Promise<number> {
    const account = await this.getOrCreateLoyaltyAccount(userId);

    // Base points calculation
    let points = Math.round(amount * this.POINTS_PER_DOLLAR);

    // Restaurant-specific bonuses
    const restaurant = await Restaurant.findByPk(restaurantId);
    if (restaurant?.loyaltyBonus) {
      points = Math.round(points * (1 + restaurant.loyaltyBonus));
    }

    // Double points promotions
    const hasDoublePoints = await this.checkDoublePointsPromotion(restaurantId);
    if (hasDoublePoints) {
      points *= 2;
    }

    // Milestone bonuses
    const reservationCount = await Reservation.count({
      where: {
        userId,
        restaurantId,
        status: 'completed'
      }
    });

    if (reservationCount % 10 === 0) {
      points += 500; // Bonus for every 10th visit
    }

    return points;
  }

  // Redeem points for rewards
  async redeemReward(userId: string, rewardId: string): Promise<any> {
    const transaction = await LoyaltyAccount.sequelize!.transaction();

    try {
      const account = await LoyaltyAccount.findOne({
        where: { userId },
        transaction,
        lock: true
      });

      if (!account) {
        throw new Error('Loyalty account not found');
      }

      const reward = await Reward.findByPk(rewardId, { transaction });
      if (!reward) {
        throw new Error('Reward not found');
      }

      // Check tier eligibility
      if (reward.requiredTier && !this.isTierEligible(account.currentTier, reward.requiredTier)) {
        throw new Error(`This reward requires ${reward.requiredTier} tier or higher`);
      }

      // Check points balance
      if (account.availablePoints < reward.pointsCost) {
        throw new Error('Insufficient points balance');
      }

      // Check availability
      if (reward.availability === 'limited' && reward.stock <= 0) {
        throw new Error('Reward is out of stock');
      }

      // Check expiry
      if (reward.expiresAt && reward.expiresAt < new Date()) {
        throw new Error('Reward has expired');
      }

      // Deduct points
      account.availablePoints -= reward.pointsCost;
      await account.save({ transaction });

      // Create redemption record
      const redemptionCode = this.generateRedemptionCode();
      const redemption = await RewardRedemption.create({
        id: uuidv4(),
        userId,
        loyaltyAccountId: account.id,
        rewardId,
        pointsSpent: reward.pointsCost,
        redemptionCode,
        status: 'pending',
        expiresAt: moment().add(30, 'days').toDate(),
        metadata: {
          rewardDetails: reward.toJSON(),
          accountBalance: account.availablePoints
        }
      }, { transaction });

      // Create transaction record
      await LoyaltyTransaction.create({
        id: uuidv4(),
        loyaltyAccountId: account.id,
        userId,
        points: -reward.pointsCost,
        type: 'redeemed',
        source: 'reward',
        referenceId: redemption.id,
        description: `Redeemed: ${reward.name}`,
        balance: account.availablePoints
      }, { transaction });

      // Update reward stock if limited
      if (reward.availability === 'limited') {
        reward.stock -= 1;
        await reward.save({ transaction });
      }

      await transaction.commit();

      // Send redemption confirmation
      await this.sendRedemptionConfirmation(userId, reward, redemptionCode);

      // Process reward fulfillment
      await this.processRewardFulfillment(redemption, reward);

      return {
        success: true,
        redemptionId: redemption.id,
        redemptionCode,
        reward: {
          name: reward.name,
          description: reward.description
        },
        remainingPoints: account.availablePoints,
        expiresAt: redemption.expiresAt
      };
    } catch (error) {
      await transaction.rollback();
      logger.error('Reward redemption failed:', error);
      throw error;
    }
  }

  // Get rewards catalog
  async getRewardsCatalog(userId: string): Promise<RewardCatalogItem[]> {
    const account = await this.getOrCreateLoyaltyAccount(userId);

    const rewards = await Reward.findAll({
      where: {
        status: 'active',
        [Op.or]: [
          { requiredTier: null },
          { requiredTier: { [Op.lte]: this.getTierLevel(account.currentTier) } }
        ]
      },
      order: [['pointsCost', 'ASC']]
    });

    return rewards.map(reward => ({
      id: reward.id,
      name: reward.name,
      description: reward.description,
      category: reward.category,
      pointsCost: reward.pointsCost,
      tier: reward.requiredTier ? [reward.requiredTier] : ['all'],
      availability: reward.availability,
      stock: reward.stock,
      expiresAt: reward.expiresAt,
      terms: reward.terms || [],
      restaurantId: reward.restaurantId,
      partnerProgramId: reward.partnerProgramId,
      canRedeem: account.availablePoints >= reward.pointsCost
    }));
  }

  // Transfer points between users
  async transferPoints(fromUserId: string, toUserId: string, points: number): Promise<any> {
    const transaction = await LoyaltyAccount.sequelize!.transaction();

    try {
      const fromAccount = await LoyaltyAccount.findOne({
        where: { userId: fromUserId },
        transaction,
        lock: true
      });

      if (!fromAccount || fromAccount.availablePoints < points) {
        throw new Error('Insufficient points for transfer');
      }

      const toAccount = await this.getOrCreateLoyaltyAccount(toUserId);

      // Deduct from sender
      fromAccount.availablePoints -= points;
      await fromAccount.save({ transaction });

      // Add to receiver
      toAccount.availablePoints += points;
      toAccount.totalPoints += points;
      await toAccount.save({ transaction });

      // Create transaction records
      await LoyaltyTransaction.create({
        id: uuidv4(),
        loyaltyAccountId: fromAccount.id,
        userId: fromUserId,
        points: -points,
        type: 'transferred',
        source: 'transfer',
        description: `Transferred to user ${toUserId}`,
        balance: fromAccount.availablePoints
      }, { transaction });

      await LoyaltyTransaction.create({
        id: uuidv4(),
        loyaltyAccountId: toAccount.id,
        userId: toUserId,
        points: points,
        type: 'earned',
        source: 'transfer',
        description: `Received from user ${fromUserId}`,
        balance: toAccount.availablePoints
      }, { transaction });

      await transaction.commit();

      // Send notifications
      await this.sendTransferNotifications(fromUserId, toUserId, points);

      return {
        success: true,
        transferredPoints: points,
        senderBalance: fromAccount.availablePoints,
        recipientBalance: toAccount.availablePoints
      };
    } catch (error) {
      await transaction.rollback();
      logger.error('Points transfer failed:', error);
      throw error;
    }
  }

  // Referral program
  async createReferral(referrerId: string, referredEmail: string): Promise<ReferralProgram> {
    const referralCode = this.generateReferralCode(referrerId);

    const referral = {
      referrerId,
      referredEmail,
      referralCode,
      status: 'pending' as const,
      referrerReward: this.REFERRAL_BONUS,
      referredReward: this.REFERRAL_BONUS / 2,
      expiresAt: moment().add(30, 'days').toDate()
    };

    // Store in Redis for quick lookup
    await redis.setex(
      `referral:${referralCode}`,
      30 * 24 * 60 * 60, // 30 days
      JSON.stringify(referral)
    );

    // Send referral invitation
    await notificationService.sendReferralInvitation({
      to: referredEmail,
      referrerName: await this.getUserName(referrerId),
      referralCode,
      reward: referral.referredReward
    });

    return referral;
  }

  async completeReferral(referralCode: string, newUserId: string): Promise<void> {
    const referralData = await redis.get(`referral:${referralCode}`);
    if (!referralData) {
      throw new Error('Invalid or expired referral code');
    }

    const referral = JSON.parse(referralData);

    // Award points to both users
    await this.awardPoints(
      referral.referrerId,
      referral.referrerReward,
      'bonus',
      'referral',
      newUserId,
      'Referral bonus'
    );

    await this.awardPoints(
      newUserId,
      referral.referredReward,
      'bonus',
      'referral',
      referral.referrerId,
      'Welcome bonus from referral'
    );

    // Mark referral as completed
    await redis.del(`referral:${referralCode}`);
  }

  // Partner program integration
  async syncPartnerPoints(userId: string, partnerId: string, partnerPoints: number): Promise<void> {
    const partner = await PartnerProgram.findByPk(partnerId);
    if (!partner) {
      throw new Error('Partner program not found');
    }

    // Convert partner points based on exchange rate
    const convertedPoints = Math.round(partnerPoints * partner.exchangeRate);

    await this.awardPoints(
      userId,
      convertedPoints,
      'earned',
      'partner',
      partnerId,
      `Points from ${partner.name}`
    );
  }

  // Birthday rewards
  async processBirthdayRewards(): Promise<void> {
    const today = moment().startOf('day');

    const users = await User.findAll({
      where: {
        [Op.and]: [
          Sequelize.where(
            Sequelize.fn('EXTRACT', Sequelize.literal('MONTH FROM birth_date')),
            today.month() + 1
          ),
          Sequelize.where(
            Sequelize.fn('EXTRACT', Sequelize.literal('DAY FROM birth_date')),
            today.date()
          )
        ]
      }
    });

    for (const user of users) {
      try {
        await this.awardPoints(
          user.id,
          this.BIRTHDAY_BONUS,
          'bonus',
          'promotion',
          null,
          'Happy Birthday! Enjoy your special bonus points'
        );

        // Create special birthday reward
        await Reward.create({
          id: uuidv4(),
          name: 'Birthday Special - Free Dessert',
          description: 'Celebrate with a complimentary dessert on us!',
          category: 'birthday',
          pointsCost: 0,
          requiredTier: null,
          availability: 'limited',
          stock: 1,
          userId: user.id,
          expiresAt: moment().add(30, 'days').toDate()
        });
      } catch (error) {
        logger.error(`Failed to process birthday reward for user ${user.id}:`, error);
      }
    }
  }

  // Tier management
  private async checkTierUpgrade(account: LoyaltyAccount, transaction?: Transaction): Promise<void> {
    const currentTierLevel = this.getTierLevel(account.currentTier);
    const newTier = this.calculateTier(account.lifetimePoints);
    const newTierLevel = this.getTierLevel(newTier);

    if (newTierLevel > currentTierLevel) {
      account.currentTier = newTier;
      account.tierExpiresAt = moment().add(1, 'year').toDate();
      await account.save({ transaction });

      // Send tier upgrade notification
      await this.sendTierUpgradeNotification(account.userId, newTier);

      // Award tier upgrade bonus
      const bonusPoints = (newTierLevel - currentTierLevel) * 500;
      await this.awardPoints(
        account.userId,
        bonusPoints,
        'bonus',
        'promotion',
        null,
        `Congratulations on reaching ${newTier} tier!`
      );

      this.emit('tier:upgraded', {
        userId: account.userId,
        oldTier: account.currentTier,
        newTier
      });
    }
  }

  private calculateTier(lifetimePoints: number): string {
    if (lifetimePoints >= this.TIERS.PLATINUM.minPoints) return 'PLATINUM';
    if (lifetimePoints >= this.TIERS.GOLD.minPoints) return 'GOLD';
    if (lifetimePoints >= this.TIERS.SILVER.minPoints) return 'SILVER';
    return 'BRONZE';
  }

  private getTierLevel(tier: string): number {
    const levels: { [key: string]: number } = {
      'BRONZE': 1,
      'SILVER': 2,
      'GOLD': 3,
      'PLATINUM': 4
    };
    return levels[tier] || 1;
  }

  private getTierMultiplier(tier: string): number {
    return this.TIERS[tier as keyof typeof this.TIERS]?.multiplier || 1.0;
  }

  private isTierEligible(userTier: string, requiredTier: string): boolean {
    return this.getTierLevel(userTier) >= this.getTierLevel(requiredTier);
  }

  // Get tier benefits
  getTierBenefits(tier: string): TierBenefits {
    const benefits: { [key: string]: TierBenefits } = {
      'BRONZE': {
        tier: 'Bronze',
        pointsMultiplier: 1.0,
        freeDelivery: false,
        priorityReservations: false,
        exclusiveEvents: false,
        conciergeService: false,
        complimentaryUpgrades: false,
        birthdayReward: true,
        dedicatedSupport: false,
        partnerBenefits: []
      },
      'SILVER': {
        tier: 'Silver',
        pointsMultiplier: 1.25,
        freeDelivery: false,
        priorityReservations: true,
        exclusiveEvents: false,
        conciergeService: false,
        complimentaryUpgrades: false,
        birthdayReward: true,
        dedicatedSupport: false,
        partnerBenefits: ['hotel_discounts']
      },
      'GOLD': {
        tier: 'Gold',
        pointsMultiplier: 1.5,
        freeDelivery: true,
        priorityReservations: true,
        exclusiveEvents: true,
        conciergeService: false,
        complimentaryUpgrades: true,
        birthdayReward: true,
        dedicatedSupport: true,
        partnerBenefits: ['hotel_discounts', 'airline_miles', 'car_rental']
      },
      'PLATINUM': {
        tier: 'Platinum',
        pointsMultiplier: 2.0,
        freeDelivery: true,
        priorityReservations: true,
        exclusiveEvents: true,
        conciergeService: true,
        complimentaryUpgrades: true,
        birthdayReward: true,
        dedicatedSupport: true,
        partnerBenefits: ['hotel_discounts', 'airline_miles', 'car_rental', 'exclusive_experiences']
      }
    };

    return benefits[tier] || benefits['BRONZE'];
  }

  // Point expiry management
  async processPointExpiry(): Promise<void> {
    const expiringTransactions = await LoyaltyTransaction.findAll({
      where: {
        type: 'earned',
        expiresAt: {
          [Op.lte]: new Date()
        },
        expired: false
      }
    });

    for (const transaction of expiringTransactions) {
      try {
        const account = await LoyaltyAccount.findByPk(transaction.loyaltyAccountId);
        if (account && account.availablePoints >= transaction.points) {
          account.availablePoints -= transaction.points;
          await account.save();

          transaction.expired = true;
          await transaction.save();

          await LoyaltyTransaction.create({
            id: uuidv4(),
            loyaltyAccountId: account.id,
            userId: account.userId,
            points: -transaction.points,
            type: 'expired',
            source: 'system',
            description: 'Points expired',
            balance: account.availablePoints
          });
        }
      } catch (error) {
        logger.error(`Failed to expire points for transaction ${transaction.id}:`, error);
      }
    }
  }

  // Helper functions
  private async getSpecialMultiplier(userId: string): Promise<number> {
    // Check for special promotions
    const promotions = await redis.get(`promotions:${userId}`);
    if (promotions) {
      const promo = JSON.parse(promotions);
      return promo.multiplier || 1.0;
    }
    return 1.0;
  }

  private async checkDoublePointsPromotion(restaurantId: string): Promise<boolean> {
    const promotion = await redis.get(`double_points:${restaurantId}`);
    return !!promotion;
  }

  private generateRedemptionCode(): string {
    return `RDM-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
  }

  private generateReferralCode(userId: string): string {
    const userPart = userId.substring(0, 4).toUpperCase();
    const randomPart = crypto.randomBytes(3).toString('hex').toUpperCase();
    return `REF-${userPart}-${randomPart}`;
  }

  private async getUserName(userId: string): Promise<string> {
    const user = await User.findByPk(userId);
    return user ? `${user.firstName} ${user.lastName}` : 'A friend';
  }

  private async processRewardFulfillment(redemption: any, reward: any): Promise<void> {
    // Process different reward types
    switch (reward.type) {
      case 'discount':
        // Create discount code
        break;
      case 'free_item':
        // Add credit to account
        break;
      case 'experience':
        // Book experience
        break;
      case 'gift_card':
        // Generate gift card
        break;
      default:
        logger.info(`Processing reward fulfillment for ${redemption.id}`);
    }
  }

  // Notifications
  private async sendPointsNotification(userId: string, points: number, type: string, balance: number): Promise<void> {
    await notificationService.sendLoyaltyNotification({
      userId,
      type: 'points_earned',
      points,
      balance
    });
  }

  private async sendRedemptionConfirmation(userId: string, reward: any, code: string): Promise<void> {
    await notificationService.sendRedemptionConfirmation({
      userId,
      reward,
      redemptionCode: code
    });
  }

  private async sendTierUpgradeNotification(userId: string, newTier: string): Promise<void> {
    await notificationService.sendTierUpgradeNotification({
      userId,
      newTier,
      benefits: this.getTierBenefits(newTier)
    });
  }

  private async sendTransferNotifications(fromUserId: string, toUserId: string, points: number): Promise<void> {
    await notificationService.sendPointsTransferNotification({
      fromUserId,
      toUserId,
      points
    });
  }

  // Scheduled jobs
  private initializeScheduledJobs(): void {
    // Daily birthday rewards check
    setInterval(() => {
      this.processBirthdayRewards();
    }, 24 * 60 * 60 * 1000);

    // Daily point expiry check
    setInterval(() => {
      this.processPointExpiry();
    }, 24 * 60 * 60 * 1000);
  }

  // Analytics
  async getLoyaltyAnalytics(userId: string): Promise<any> {
    const account = await this.getOrCreateLoyaltyAccount(userId);

    const transactions = await LoyaltyTransaction.findAll({
      where: { userId },
      order: [['createdAt', 'DESC']],
      limit: 100
    });

    const redemptions = await RewardRedemption.findAll({
      where: { userId },
      include: [Reward],
      order: [['createdAt', 'DESC']],
      limit: 10
    });

    const pointsEarnedThisMonth = await LoyaltyTransaction.sum('points', {
      where: {
        userId,
        type: 'earned',
        createdAt: {
          [Op.gte]: moment().startOf('month').toDate()
        }
      }
    });

    const pointsRedeemedThisMonth = await LoyaltyTransaction.sum('points', {
      where: {
        userId,
        type: 'redeemed',
        createdAt: {
          [Op.gte]: moment().startOf('month').toDate()
        }
      }
    });

    return {
      account: {
        totalPoints: account.totalPoints,
        availablePoints: account.availablePoints,
        lifetimePoints: account.lifetimePoints,
        currentTier: account.currentTier,
        tierBenefits: this.getTierBenefits(account.currentTier),
        nextTier: this.getNextTier(account.currentTier),
        pointsToNextTier: this.getPointsToNextTier(account.lifetimePoints)
      },
      activity: {
        recentTransactions: transactions.slice(0, 10),
        recentRedemptions: redemptions,
        pointsEarnedThisMonth: pointsEarnedThisMonth || 0,
        pointsRedeemedThisMonth: Math.abs(pointsRedeemedThisMonth || 0)
      },
      statistics: {
        totalRedemptions: redemptions.length,
        favoriteRewardCategory: this.getFavoriteRewardCategory(redemptions),
        averagePointsPerMonth: this.calculateAveragePointsPerMonth(transactions)
      }
    };
  }

  private getNextTier(currentTier: string): string | null {
    const tiers = ['BRONZE', 'SILVER', 'GOLD', 'PLATINUM'];
    const currentIndex = tiers.indexOf(currentTier);
    return currentIndex < tiers.length - 1 ? tiers[currentIndex + 1] : null;
  }

  private getPointsToNextTier(lifetimePoints: number): number {
    if (lifetimePoints < this.TIERS.SILVER.minPoints) {
      return this.TIERS.SILVER.minPoints - lifetimePoints;
    }
    if (lifetimePoints < this.TIERS.GOLD.minPoints) {
      return this.TIERS.GOLD.minPoints - lifetimePoints;
    }
    if (lifetimePoints < this.TIERS.PLATINUM.minPoints) {
      return this.TIERS.PLATINUM.minPoints - lifetimePoints;
    }
    return 0;
  }

  private getFavoriteRewardCategory(redemptions: any[]): string {
    const categories = redemptions.map(r => r.Reward?.category).filter(Boolean);
    if (categories.length === 0) return 'none';

    const frequency: { [key: string]: number } = {};
    categories.forEach(cat => {
      frequency[cat] = (frequency[cat] || 0) + 1;
    });

    return Object.entries(frequency).sort(([, a], [, b]) => b - a)[0][0];
  }

  private calculateAveragePointsPerMonth(transactions: any[]): number {
    if (transactions.length === 0) return 0;

    const oldestTransaction = transactions[transactions.length - 1];
    const monthsSince = moment().diff(moment(oldestTransaction.createdAt), 'months') || 1;

    const totalEarned = transactions
      .filter(t => t.type === 'earned')
      .reduce((sum, t) => sum + t.points, 0);

    return Math.round(totalEarned / monthsSince);
  }
}

export const comprehensiveLoyaltyService = new ComprehensiveLoyaltyService();