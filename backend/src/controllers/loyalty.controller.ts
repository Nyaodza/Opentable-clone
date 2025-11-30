import { Request, Response, NextFunction } from 'express';
import { Op } from 'sequelize';
import { sequelize } from '../config/database';
import { User } from '../models/User';
import { LoyaltyTransaction, LoyaltyReward, UserReward, TransactionType, TierLevel } from '../models/LoyaltyProgram';
import { Reservation, ReservationStatus } from '../models/Reservation';
import { Restaurant } from '../models/Restaurant';
import { Review } from '../models/Review';
import { AppError } from '../middleware/error.middleware';
import { v4 as uuidv4 } from 'uuid';
import { addDays, addMonths } from 'date-fns';

// Tier thresholds
const TIER_THRESHOLDS = {
  [TierLevel.BRONZE]: 0,
  [TierLevel.SILVER]: 500,
  [TierLevel.GOLD]: 1500,
  [TierLevel.PLATINUM]: 3000
};

// Points earning rates
const POINTS_RATES = {
  RESERVATION_COMPLETED: 100,
  REVIEW_WRITTEN: 50,
  BIRTHDAY_BONUS: 200,
  REFERRAL_BONUS: 300,
  FIRST_RESERVATION: 150
};

export const getLoyaltyStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await User.findByPk(req.user!.id);
    if (!user) {
      throw new AppError('User not found', 404);
    }

    const currentTier = calculateUserTier(user.loyaltyPoints);
    const nextTier = getNextTier(currentTier);
    const pointsToNextTier = nextTier ? TIER_THRESHOLDS[nextTier] - user.loyaltyPoints : 0;

    // Get recent transactions
    const recentTransactions = await LoyaltyTransaction.findAll({
      where: { userId: req.user!.id },
      order: [['createdAt', 'DESC']],
      limit: 10,
      include: [{ model: Restaurant, as: 'restaurant', required: false }]
    });

    // Get available rewards
    const availableRewards = await LoyaltyReward.findAll({
      where: {
        isActive: true,
        minimumTier: { [Op.in]: getTierHierarchy(currentTier) },
        pointsCost: { [Op.lte]: user.loyaltyPoints },
        [Op.or]: [
          { validUntil: null },
          { validUntil: { [Op.gt]: new Date() } }
        ]
      }
    });

    // Get user's unredeemed rewards
    const unredeemedRewards = await UserReward.findAll({
      where: {
        userId: req.user!.id,
        isUsed: false,
        expiresAt: { [Op.gt]: new Date() }
      },
      include: [{ model: LoyaltyReward, as: 'reward' }]
    });

    res.json({
      success: true,
      loyaltyStatus: {
        points: user.loyaltyPoints,
        tier: currentTier,
        nextTier,
        pointsToNextTier,
        recentTransactions,
        availableRewards,
        unredeemedRewards
      }
    });
  } catch (error) {
    next(error);
  }
};

export const awardPoints = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId, points, type, description, referenceId, restaurantId } = req.body;

    const user = await User.findByPk(userId);
    if (!user) {
      throw new AppError('User not found', 404);
    }

    const newBalance = user.loyaltyPoints + points;
    const oldTier = calculateUserTier(user.loyaltyPoints);
    const newTier = calculateUserTier(newBalance);

    // Create transaction
    const transaction = await LoyaltyTransaction.create({
      userId,
      restaurantId,
      type: TransactionType.EARN,
      points,
      balanceAfter: newBalance,
      description,
      referenceId,
      expiresAt: addMonths(new Date(), 12) // Points expire after 12 months
    });

    // Update user points
    await user.update({ loyaltyPoints: newBalance });

    // Check for tier upgrade
    if (newTier !== oldTier) {
      await awardTierUpgradeBonus(userId, newTier);
    }

    res.json({
      success: true,
      transaction,
      newBalance,
      tierUpgrade: newTier !== oldTier ? { from: oldTier, to: newTier } : null
    });
  } catch (error) {
    next(error);
  }
};

export const redeemReward = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { rewardId } = req.body;

    const reward = await LoyaltyReward.findByPk(rewardId);
    if (!reward) {
      throw new AppError('Reward not found', 404);
    }

    const user = await User.findByPk(req.user!.id);
    if (!user) {
      throw new AppError('User not found', 404);
    }

    // Check if user has enough points
    if (user.loyaltyPoints < reward.pointsCost) {
      throw new AppError('Insufficient points', 400);
    }

    // Check tier requirement
    const userTier = calculateUserTier(user.loyaltyPoints);
    const tierHierarchy = getTierHierarchy(userTier);
    if (!tierHierarchy.includes(reward.minimumTier)) {
      throw new AppError('Tier requirement not met', 400);
    }

    // Check redemption limits
    if (reward.maxRedemptions > 0 && reward.currentRedemptions >= reward.maxRedemptions) {
      throw new AppError('Reward redemption limit reached', 400);
    }

    // Check validity period
    if (reward.validUntil && reward.validUntil < new Date()) {
      throw new AppError('Reward has expired', 400);
    }

    const newBalance = user.loyaltyPoints - reward.pointsCost;

    // Create redemption transaction
    const transaction = await LoyaltyTransaction.create({
      userId: req.user!.id,
      type: TransactionType.REDEEM,
      points: -reward.pointsCost,
      balanceAfter: newBalance,
      description: `Redeemed: ${reward.name}`,
      referenceId: reward.id
    });

    // Create user reward
    const userReward = await UserReward.create({
      userId: req.user!.id,
      rewardId: reward.id,
      redemptionCode: generateRedemptionCode(),
      expiresAt: addDays(new Date(), 30) // Reward expires in 30 days
    });

    // Update user points and reward redemption count
    await user.update({ loyaltyPoints: newBalance });
    await reward.update({ currentRedemptions: reward.currentRedemptions + 1 });

    res.json({
      success: true,
      userReward: {
        ...userReward.toJSON(),
        reward
      },
      newBalance
    });
  } catch (error) {
    next(error);
  }
};

export const getRewards = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await User.findByPk(req.user!.id);
    if (!user) {
      throw new AppError('User not found', 404);
    }

    const userTier = calculateUserTier(user.loyaltyPoints);
    const tierHierarchy = getTierHierarchy(userTier);

    const rewards = await LoyaltyReward.findAll({
      where: {
        isActive: true,
        [Op.or]: [
          { validUntil: null },
          { validUntil: { [Op.gt]: new Date() } }
        ]
      },
      order: [['pointsCost', 'ASC']]
    });

    const categorizedRewards = rewards.map(reward => ({
      ...reward.toJSON(),
      available: tierHierarchy.includes(reward.minimumTier) && 
                user.loyaltyPoints >= reward.pointsCost &&
                (reward.maxRedemptions === 0 || reward.currentRedemptions < reward.maxRedemptions)
    }));

    res.json({
      success: true,
      rewards: categorizedRewards,
      userPoints: user.loyaltyPoints,
      userTier
    });
  } catch (error) {
    next(error);
  }
};

export const getMyRewards = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userRewards = await UserReward.findAll({
      where: { userId: req.user!.id },
      include: [{ model: LoyaltyReward, as: 'reward' }],
      order: [['createdAt', 'DESC']]
    });

    res.json({
      success: true,
      userRewards
    });
  } catch (error) {
    next(error);
  }
};

export const useReward = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { redemptionCode } = req.body;

    const userReward = await UserReward.findOne({
      where: { redemptionCode, isUsed: false },
      include: [{ model: LoyaltyReward, as: 'reward' }]
    });

    if (!userReward) {
      throw new AppError('Invalid or already used redemption code', 404);
    }

    if (userReward.expiresAt < new Date()) {
      throw new AppError('Reward has expired', 400);
    }

    userReward.isUsed = true;
    userReward.usedAt = new Date();
    await userReward.save();

    res.json({
      success: true,
      message: 'Reward successfully used',
      reward: userReward.reward
    });
  } catch (error) {
    next(error);
  }
};

// Automatic points awarding functions
export const awardReservationPoints = async (reservationId: string) => {
  try {
    const reservation = await Reservation.findByPk(reservationId, {
      include: [{ model: User, as: 'user' }]
    });

    if (!reservation || reservation.status !== ReservationStatus.COMPLETED) {
      return;
    }

    const user = reservation.user!;
    const isFirstReservation = await Reservation.count({
      where: {
        userId: user.id,
        status: ReservationStatus.COMPLETED
      }
    }) === 1;

    const points = isFirstReservation ? 
      POINTS_RATES.RESERVATION_COMPLETED + POINTS_RATES.FIRST_RESERVATION :
      POINTS_RATES.RESERVATION_COMPLETED;

    const description = isFirstReservation ? 
      'First reservation completed + bonus' : 
      'Reservation completed';

    await awardPointsToUser(user.id, points, description, reservationId, reservation.restaurantId);
  } catch (error) {
    console.error('Error awarding reservation points:', error);
  }
};

export const awardReviewPoints = async (reviewId: string) => {
  try {
    const review = await Review.findByPk(reviewId);
    if (!review) return;

    await awardPointsToUser(
      review.userId,
      POINTS_RATES.REVIEW_WRITTEN,
      'Review written',
      reviewId,
      review.restaurantId
    );
  } catch (error) {
    console.error('Error awarding review points:', error);
  }
};

// Helper functions
function calculateUserTier(points: number): TierLevel {
  if (points >= TIER_THRESHOLDS[TierLevel.PLATINUM]) return TierLevel.PLATINUM;
  if (points >= TIER_THRESHOLDS[TierLevel.GOLD]) return TierLevel.GOLD;
  if (points >= TIER_THRESHOLDS[TierLevel.SILVER]) return TierLevel.SILVER;
  return TierLevel.BRONZE;
}

function getNextTier(currentTier: TierLevel): TierLevel | null {
  const tiers = [TierLevel.BRONZE, TierLevel.SILVER, TierLevel.GOLD, TierLevel.PLATINUM];
  const currentIndex = tiers.indexOf(currentTier);
  return currentIndex < tiers.length - 1 ? tiers[currentIndex + 1] : null;
}

function getTierHierarchy(tier: TierLevel): TierLevel[] {
  const tiers = [TierLevel.BRONZE, TierLevel.SILVER, TierLevel.GOLD, TierLevel.PLATINUM];
  const tierIndex = tiers.indexOf(tier);
  return tiers.slice(0, tierIndex + 1);
}

async function awardPointsToUser(
  userId: string,
  points: number,
  description: string,
  referenceId?: string,
  restaurantId?: string
) {
  const user = await User.findByPk(userId);
  if (!user) return;

  const newBalance = user.loyaltyPoints + points;
  
  await LoyaltyTransaction.create({
    userId,
    restaurantId,
    type: TransactionType.EARN,
    points,
    balanceAfter: newBalance,
    description,
    referenceId,
    expiresAt: addMonths(new Date(), 12)
  });

  await user.update({ loyaltyPoints: newBalance });
}

async function awardTierUpgradeBonus(userId: string, newTier: TierLevel) {
  const bonusPoints = {
    [TierLevel.BRONZE]: 0,
    [TierLevel.SILVER]: 100,
    [TierLevel.GOLD]: 200,
    [TierLevel.PLATINUM]: 500
  };

  if (bonusPoints[newTier] > 0) {
    await awardPointsToUser(
      userId,
      bonusPoints[newTier],
      `Tier upgrade bonus - Welcome to ${newTier}!`
    );
  }
}

function generateRedemptionCode(): string {
  return uuidv4().substring(0, 8).toUpperCase();
}