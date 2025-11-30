import { BlockchainLoyalty } from '../models/BlockchainLoyalty';
import { BlockchainTransaction } from '../models/BlockchainTransaction';
import { User } from '../models/User';
import { Reservation } from '../models/Reservation';
import { Review } from '../models/Review';
import { pubsub, EVENTS } from '../config/pubsub';
import { ethers } from 'ethers';
import { NotificationService } from './notification.service';

interface TokenEarnEvent {
  userId: string;
  amount: number;
  sourceType: string;
  sourceId?: string;
  metadata?: any;
}

interface TokenRedeemEvent {
  userId: string;
  amount: number;
  rewardType: string;
  metadata?: any;
}

interface StakingEvent {
  userId: string;
  amount: number;
  duration: number;
}

class BlockchainLoyaltyService {
  private notificationService: NotificationService;
  private provider: ethers.JsonRpcProvider;
  private contract: ethers.Contract | null = null;

  // Token earning rates
  private readonly EARNING_RATES = {
    reservation: 10, // 10 tokens per reservation
    review: 5, // 5 tokens per review
    referral: 50, // 50 tokens per successful referral
    social_share: 2, // 2 tokens per social share
    birthday: 100, // 100 tokens on birthday
    anniversary: 150, // 150 tokens on anniversary
    special_event: 25, // 25 tokens for special events
  };

  // Tier thresholds
  private readonly TIER_THRESHOLDS = {
    bronze: 0,
    silver: 1000,
    gold: 5000,
    platinum: 15000,
    diamond: 50000,
  };

  constructor() {
    this.notificationService = new NotificationService();
    this.initializeBlockchain();
  }

  private async initializeBlockchain(): Promise<void> {
    try {
      // Initialize provider (using Polygon for lower fees)
      const rpcUrl = process.env.POLYGON_RPC_URL || 'https://polygon-rpc.com';
      this.provider = new ethers.JsonRpcProvider(rpcUrl);

      // Initialize smart contract if address is provided
      if (process.env.LOYALTY_CONTRACT_ADDRESS) {
        const contractABI = [
          'function balanceOf(address owner) view returns (uint256)',
          'function transfer(address to, uint256 amount) returns (bool)',
          'function mint(address to, uint256 amount) returns (bool)',
          'function burn(address from, uint256 amount) returns (bool)',
          'function stake(uint256 amount, uint256 duration) returns (bool)',
          'function unstake() returns (bool)',
          'function getStakingReward(address staker) view returns (uint256)',
          'event Transfer(address indexed from, address indexed to, uint256 value)',
          'event Stake(address indexed staker, uint256 amount, uint256 duration)',
          'event Unstake(address indexed staker, uint256 amount, uint256 reward)',
        ];

        this.contract = new ethers.Contract(
          process.env.LOYALTY_CONTRACT_ADDRESS,
          contractABI,
          this.provider
        );
      }
    } catch (error) {
      console.error('Failed to initialize blockchain:', error);
    }
  }

  async createLoyaltyAccount(userId: string): Promise<BlockchainLoyalty> {
    try {
      // Check if account already exists
      const existing = await BlockchainLoyalty.findOne({ where: { userId } });
      if (existing) {
        return existing;
      }

      // Create new loyalty account
      const loyaltyAccount = await BlockchainLoyalty.create({
        userId,
        tokenBalance: 0,
        totalEarned: 0,
        totalRedeemed: 0,
        blockchainNetwork: 'polygon',
        stakingBalance: 0,
        stakingRewards: 0,
        loyaltyTier: 'bronze',
        tierProgress: 0,
        referralTokens: 0,
        nftCollectibles: [],
        transactionHistory: [],
        lastSyncedBlock: 0,
        isActive: true,
      });

      // Welcome bonus
      await this.earnTokens({
        userId,
        amount: 100,
        sourceType: 'special_event',
        metadata: { event: 'welcome_bonus', description: 'Welcome to OpenTable Blockchain Loyalty!' },
      });

      return loyaltyAccount;
    } catch (error) {
      console.error('Error creating loyalty account:', error);
      throw new Error('Failed to create loyalty account');
    }
  }

  async earnTokens(event: TokenEarnEvent): Promise<BlockchainTransaction> {
    try {
      const { userId, amount, sourceType, sourceId, metadata } = event;

      // Get or create loyalty account
      let loyaltyAccount = await BlockchainLoyalty.findOne({ where: { userId } });
      if (!loyaltyAccount) {
        loyaltyAccount = await this.createLoyaltyAccount(userId);
      }

      // Create transaction record
      const transaction = await BlockchainTransaction.create({
        userId,
        transactionType: 'earn',
        tokenAmount: amount,
        sourceType: sourceType as any,
        sourceId,
        status: 'pending',
        confirmations: 0,
        metadata: metadata || {},
      });

      // Update loyalty account
      loyaltyAccount.tokenBalance += amount;
      loyaltyAccount.totalEarned += amount;

      // Check for tier upgrade
      const newTier = this.calculateTier(loyaltyAccount.totalEarned);
      const tierUpgraded = newTier !== loyaltyAccount.loyaltyTier;
      
      if (tierUpgraded) {
        loyaltyAccount.loyaltyTier = newTier;
        await this.handleTierUpgrade(userId, newTier);
      }

      loyaltyAccount.tierProgress = loyaltyAccount.calculateTierProgress();
      
      // Add to transaction history
      loyaltyAccount.transactionHistory = [
        ...loyaltyAccount.transactionHistory.slice(-99), // Keep last 100 transactions
        {
          id: transaction.id,
          type: 'earn',
          amount,
          sourceType,
          timestamp: new Date(),
          tierUpgraded,
        },
      ];

      await loyaltyAccount.save();

      // Process blockchain transaction if contract is available
      if (this.contract && loyaltyAccount.walletAddress) {
        try {
          await this.processBlockchainEarn(loyaltyAccount.walletAddress, amount);
          transaction.status = 'confirmed';
          transaction.confirmations = 12;
          transaction.processedAt = new Date();
        } catch (blockchainError) {
          console.error('Blockchain transaction failed:', blockchainError);
          // Keep transaction as pending for retry
        }
      } else {
        // Mark as confirmed for off-chain tracking
        transaction.status = 'confirmed';
        transaction.confirmations = 1;
        transaction.processedAt = new Date();
      }

      await transaction.save();

      // Send notifications
      await this.notificationService.sendNotification(userId, {
        type: 'token_earned',
        title: 'Tokens Earned!',
        message: `You earned ${amount} OTT tokens for ${sourceType}`,
        data: { amount, sourceType, newBalance: loyaltyAccount.tokenBalance },
      });

      // Publish real-time update
      pubsub.publish(EVENTS.LOYALTY_UPDATED, {
        userId,
        loyaltyAccount,
        transaction,
        tierUpgraded,
      });

      return transaction;
    } catch (error) {
      console.error('Error earning tokens:', error);
      throw new Error('Failed to earn tokens');
    }
  }

  async redeemTokens(event: TokenRedeemEvent): Promise<BlockchainTransaction> {
    try {
      const { userId, amount, rewardType, metadata } = event;

      // Get loyalty account
      const loyaltyAccount = await BlockchainLoyalty.findOne({ where: { userId } });
      if (!loyaltyAccount) {
        throw new Error('Loyalty account not found');
      }

      // Check sufficient balance
      if (loyaltyAccount.tokenBalance < amount) {
        throw new Error('Insufficient token balance');
      }

      // Create transaction record
      const transaction = await BlockchainTransaction.create({
        userId,
        transactionType: 'redeem',
        tokenAmount: amount,
        sourceType: 'manual',
        status: 'pending',
        confirmations: 0,
        metadata: { rewardType, ...metadata },
      });

      // Update loyalty account
      loyaltyAccount.tokenBalance -= amount;
      loyaltyAccount.totalRedeemed += amount;

      // Add to transaction history
      loyaltyAccount.transactionHistory = [
        ...loyaltyAccount.transactionHistory.slice(-99),
        {
          id: transaction.id,
          type: 'redeem',
          amount,
          rewardType,
          timestamp: new Date(),
        },
      ];

      await loyaltyAccount.save();

      // Process blockchain transaction if contract is available
      if (this.contract && loyaltyAccount.walletAddress) {
        try {
          await this.processBlockchainRedeem(loyaltyAccount.walletAddress, amount);
          transaction.status = 'confirmed';
          transaction.confirmations = 12;
          transaction.processedAt = new Date();
        } catch (blockchainError) {
          console.error('Blockchain redemption failed:', blockchainError);
          // Rollback balance changes
          loyaltyAccount.tokenBalance += amount;
          loyaltyAccount.totalRedeemed -= amount;
          await loyaltyAccount.save();
          throw new Error('Blockchain redemption failed');
        }
      } else {
        transaction.status = 'confirmed';
        transaction.confirmations = 1;
        transaction.processedAt = new Date();
      }

      await transaction.save();

      // Send notifications
      await this.notificationService.sendNotification(userId, {
        type: 'token_redeemed',
        title: 'Tokens Redeemed!',
        message: `You redeemed ${amount} OTT tokens for ${rewardType}`,
        data: { amount, rewardType, newBalance: loyaltyAccount.tokenBalance },
      });

      // Publish real-time update
      pubsub.publish(EVENTS.LOYALTY_UPDATED, {
        userId,
        loyaltyAccount,
        transaction,
      });

      return transaction;
    } catch (error) {
      console.error('Error redeeming tokens:', error);
      throw error;
    }
  }

  async stakeTokens(event: StakingEvent): Promise<BlockchainTransaction> {
    try {
      const { userId, amount, duration } = event;

      const loyaltyAccount = await BlockchainLoyalty.findOne({ where: { userId } });
      if (!loyaltyAccount) {
        throw new Error('Loyalty account not found');
      }

      if (!loyaltyAccount.canStake() || loyaltyAccount.tokenBalance < amount) {
        throw new Error('Insufficient tokens for staking');
      }

      const transaction = await BlockchainTransaction.create({
        userId,
        transactionType: 'stake',
        tokenAmount: amount,
        sourceType: 'manual',
        status: 'pending',
        confirmations: 0,
        metadata: { duration, stakingPeriod: duration },
      });

      // Update balances
      loyaltyAccount.tokenBalance -= amount;
      loyaltyAccount.stakingBalance += amount;

      await loyaltyAccount.save();

      // Process blockchain staking if available
      if (this.contract && loyaltyAccount.walletAddress) {
        try {
          await this.processBlockchainStake(loyaltyAccount.walletAddress, amount, duration);
          transaction.status = 'confirmed';
          transaction.confirmations = 12;
          transaction.processedAt = new Date();
        } catch (blockchainError) {
          console.error('Blockchain staking failed:', blockchainError);
          // Rollback
          loyaltyAccount.tokenBalance += amount;
          loyaltyAccount.stakingBalance -= amount;
          await loyaltyAccount.save();
          throw new Error('Blockchain staking failed');
        }
      } else {
        transaction.status = 'confirmed';
        transaction.confirmations = 1;
        transaction.processedAt = new Date();
      }

      await transaction.save();

      await this.notificationService.sendNotification(userId, {
        type: 'tokens_staked',
        title: 'Tokens Staked!',
        message: `You staked ${amount} OTT tokens for ${duration} days`,
        data: { amount, duration, stakingBalance: loyaltyAccount.stakingBalance },
      });

      return transaction;
    } catch (error) {
      console.error('Error staking tokens:', error);
      throw error;
    }
  }

  async processReservationReward(reservationId: string, userId: string): Promise<void> {
    const baseAmount = this.EARNING_RATES.reservation;
    
    // Get reservation details for bonus calculation
    const reservation = await Reservation.findByPk(reservationId);
    if (!reservation) return;

    let bonusMultiplier = 1;
    
    // Weekend bonus
    const reservationDate = new Date(reservation.reservationDate);
    if (reservationDate.getDay() === 0 || reservationDate.getDay() === 6) {
      bonusMultiplier += 0.5;
    }

    // Prime time bonus
    const hour = reservationDate.getHours();
    if (hour >= 18 && hour <= 21) {
      bonusMultiplier += 0.3;
    }

    const finalAmount = Math.floor(baseAmount * bonusMultiplier);

    await this.earnTokens({
      userId,
      amount: finalAmount,
      sourceType: 'reservation',
      sourceId: reservationId,
      metadata: { 
        bonusMultiplier, 
        baseAmount, 
        reservationDate: reservation.reservationDate,
        restaurantId: reservation.restaurantId 
      },
    });
  }

  async processReviewReward(reviewId: string, userId: string): Promise<void> {
    const review = await Review.findByPk(reviewId);
    if (!review) return;

    let amount = this.EARNING_RATES.review;
    
    // Bonus for detailed reviews
    if (review.comment && review.comment.length > 100) {
      amount += 3;
    }

    // Bonus for photos
    if (review.photos && review.photos.length > 0) {
      amount += 2;
    }

    await this.earnTokens({
      userId,
      amount,
      sourceType: 'review',
      sourceId: reviewId,
      metadata: { 
        rating: review.rating, 
        hasComment: !!review.comment,
        hasPhotos: review.photos?.length > 0 
      },
    });
  }

  private calculateTier(totalEarned: number): 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond' {
    if (totalEarned >= this.TIER_THRESHOLDS.diamond) return 'diamond';
    if (totalEarned >= this.TIER_THRESHOLDS.platinum) return 'platinum';
    if (totalEarned >= this.TIER_THRESHOLDS.gold) return 'gold';
    if (totalEarned >= this.TIER_THRESHOLDS.silver) return 'silver';
    return 'bronze';
  }

  private async handleTierUpgrade(userId: string, newTier: string): Promise<void> {
    const bonusAmounts = {
      silver: 100,
      gold: 250,
      platinum: 500,
      diamond: 1000,
    };

    const bonus = bonusAmounts[newTier as keyof typeof bonusAmounts];
    if (bonus) {
      await this.earnTokens({
        userId,
        amount: bonus,
        sourceType: 'special_event',
        metadata: { event: 'tier_upgrade', newTier, bonus },
      });
    }

    await this.notificationService.sendNotification(userId, {
      type: 'tier_upgraded',
      title: 'Tier Upgraded!',
      message: `Congratulations! You've reached ${newTier.toUpperCase()} tier!`,
      data: { newTier, bonus },
    });
  }

  private async processBlockchainEarn(walletAddress: string, amount: number): Promise<void> {
    if (!this.contract) throw new Error('Smart contract not initialized');
    
    // This would interact with the actual smart contract
    // For now, we'll simulate the transaction
    console.log(`Minting ${amount} tokens to ${walletAddress}`);
  }

  private async processBlockchainRedeem(walletAddress: string, amount: number): Promise<void> {
    if (!this.contract) throw new Error('Smart contract not initialized');
    
    console.log(`Burning ${amount} tokens from ${walletAddress}`);
  }

  private async processBlockchainStake(walletAddress: string, amount: number, duration: number): Promise<void> {
    if (!this.contract) throw new Error('Smart contract not initialized');
    
    console.log(`Staking ${amount} tokens from ${walletAddress} for ${duration} days`);
  }

  async getLoyaltyAccount(userId: string): Promise<BlockchainLoyalty | null> {
    return await BlockchainLoyalty.findOne({ where: { userId } });
  }

  async getTransactionHistory(userId: string, limit: number = 50): Promise<BlockchainTransaction[]> {
    return await BlockchainTransaction.findAll({
      where: { userId },
      order: [['createdAt', 'DESC']],
      limit,
    });
  }

  async getLeaderboard(limit: number = 100): Promise<any[]> {
    const topUsers = await BlockchainLoyalty.findAll({
      include: [{ model: User, attributes: ['id', 'firstName', 'lastName'] }],
      order: [['totalEarned', 'DESC']],
      limit,
    });

    return topUsers.map((account, index) => ({
      rank: index + 1,
      userId: account.userId,
      user: account.User,
      totalEarned: account.totalEarned,
      loyaltyTier: account.loyaltyTier,
      stakingBalance: account.stakingBalance,
    }));
  }
}

export { BlockchainLoyaltyService, TokenEarnEvent, TokenRedeemEvent, StakingEvent };
