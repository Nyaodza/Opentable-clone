import { Service } from 'typedi';
import { Op } from 'sequelize';
import * as moment from 'moment';
import { Redis } from 'ioredis';
import Queue from 'bull';
import * as crypto from 'crypto';

interface LoyaltyProgram {
  programId: string;
  name: string;
  type: 'points' | 'tiered' | 'subscription' | 'hybrid';
  status: 'active' | 'paused' | 'discontinued';
  tiers: LoyaltyTier[];
  pointSystem: {
    earningRules: EarningRule[];
    redemptionRules: RedemptionRule[];
    pointValue: number; // cents per point
    expirationPolicy: {
      enabled: boolean;
      periodMonths?: number;
      rolloverAllowed?: boolean;
    };
  };
  benefits: Benefit[];
  partnerships: Partnership[];
  gamification: {
    challenges: Challenge[];
    badges: Badge[];
    leaderboards: Leaderboard[];
    streaks: StreakReward[];
  };
  analytics: {
    totalMembers: number;
    activeMembers: number;
    averagePointsBalance: number;
    redemptionRate: number;
    customerLifetimeValue: number;
    churnRate: number;
  };
}

interface LoyaltyMember {
  memberId: string;
  userId: string;
  programId: string;
  tier: string;
  status: 'active' | 'suspended' | 'expired' | 'cancelled';
  points: {
    current: number;
    lifetime: number;
    pending: number;
    expiring: { amount: number; date: Date }[];
  };
  tierProgress: {
    currentTier: string;
    nextTier?: string;
    pointsToNext?: number;
    qualifyingSpend: number;
    qualifyingVisits: number;
  };
  achievements: {
    badges: string[];
    challenges: CompletedChallenge[];
    streaks: ActiveStreak[];
    milestones: Milestone[];
  };
  preferences: {
    communicationChannels: string[];
    favoriteRestaurants: string[];
    dietaryRestrictions: string[];
    specialInterests: string[];
  };
  history: Transaction[];
  joinedAt: Date;
  lastActivity: Date;
}

interface LoyaltyTier {
  tierId: string;
  name: string;
  level: number;
  requirements: {
    points?: number;
    visits?: number;
    spend?: number;
    period?: 'lifetime' | 'annual' | 'quarterly';
  };
  benefits: {
    pointMultiplier: number;
    discountPercentage?: number;
    freeItems?: string[];
    priorityReservations: boolean;
    exclusiveEvents: boolean;
    conciergeService: boolean;
    complimentaryUpgrades: boolean;
  };
  color: string;
  icon: string;
}

interface EarningRule {
  ruleId: string;
  name: string;
  type: 'spend' | 'visit' | 'referral' | 'social' | 'review' | 'special';
  condition: {
    minimumSpend?: number;
    dayOfWeek?: number[];
    timeOfDay?: { start: string; end: string };
    restaurantCategories?: string[];
    specialEvents?: string[];
  };
  points: {
    base: number;
    multiplier?: number;
    bonus?: number;
    cap?: number;
  };
  validFrom: Date;
  validUntil?: Date;
  stackable: boolean;
}

interface RedemptionRule {
  ruleId: string;
  name: string;
  type: 'discount' | 'freeItem' | 'experience' | 'gift' | 'donation';
  pointsCost: number;
  value: number | string;
  restrictions: {
    minimumPurchase?: number;
    excludedItems?: string[];
    validDays?: number[];
    validHours?: { start: string; end: string };
    maxRedemptionsPerPeriod?: number;
  };
  availability: {
    stock?: number;
    startDate?: Date;
    endDate?: Date;
  };
}

interface Benefit {
  benefitId: string;
  name: string;
  description: string;
  type: 'instant' | 'accumulated' | 'surprise' | 'exclusive';
  eligibility: {
    tiers: string[];
    minimumPoints?: number;
    membershipDuration?: number; // days
  };
  value: {
    type: 'percentage' | 'fixed' | 'item' | 'experience';
    amount?: number;
    item?: string;
    description?: string;
  };
  usageLimit?: {
    perMember?: number;
    perPeriod?: { count: number; period: 'day' | 'week' | 'month' };
    total?: number;
  };
}

interface Partnership {
  partnerId: string;
  partnerName: string;
  type: 'airline' | 'hotel' | 'retail' | 'entertainment' | 'charity';
  exchangeRate: {
    toPartner: number;
    fromPartner: number;
  };
  benefits: string[];
  status: 'active' | 'pending' | 'expired';
  validUntil?: Date;
}

interface Challenge {
  challengeId: string;
  name: string;
  description: string;
  type: 'individual' | 'team' | 'community';
  requirements: {
    action: string;
    target: number;
    period: { start: Date; end: Date };
  };
  rewards: {
    points?: number;
    badge?: string;
    benefit?: string;
  };
  participants: number;
  completions: number;
  leaderboard?: string[];
}

interface Badge {
  badgeId: string;
  name: string;
  description: string;
  icon: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  requirements: {
    type: string;
    value: number;
  };
  benefits?: {
    points?: number;
    multiplier?: number;
  };
  earnedBy: number;
}

interface Leaderboard {
  leaderboardId: string;
  name: string;
  period: 'daily' | 'weekly' | 'monthly' | 'allTime';
  metric: 'points' | 'visits' | 'spend' | 'referrals';
  entries: {
    rank: number;
    memberId: string;
    displayName: string;
    value: number;
    change: number; // position change
    prize?: string;
  }[];
  prizes: {
    rank: number | number[];
    reward: string;
  }[];
  updatedAt: Date;
}

interface StreakReward {
  streakId: string;
  type: 'visit' | 'spend' | 'review';
  milestones: {
    days: number;
    reward: {
      points?: number;
      multiplier?: number;
      benefit?: string;
    };
  }[];
}

interface ActiveStreak {
  type: string;
  current: number;
  longest: number;
  lastActivity: Date;
  nextMilestone?: number;
}

interface CompletedChallenge {
  challengeId: string;
  completedAt: Date;
  reward: any;
}

interface Milestone {
  type: string;
  value: number;
  achievedAt: Date;
  reward?: any;
}

interface Transaction {
  transactionId: string;
  type: 'earn' | 'redeem' | 'expire' | 'transfer' | 'adjust';
  points: number;
  balance: number;
  description: string;
  reference?: {
    type: 'reservation' | 'purchase' | 'challenge' | 'referral' | 'review';
    id: string;
  };
  timestamp: Date;
}

@Service()
export class EnhancedLoyaltyService {
  private redis: Redis;
  private pointsQueue: Queue.Queue;
  private notificationQueue: Queue.Queue;
  private analyticsQueue: Queue.Queue;

  constructor() {
    this.redis = new Redis(process.env.REDIS_URL);

    this.pointsQueue = new Queue('loyalty-points', process.env.REDIS_URL!);
    this.notificationQueue = new Queue('loyalty-notifications', process.env.REDIS_URL!);
    this.analyticsQueue = new Queue('loyalty-analytics', process.env.REDIS_URL!);

    this.setupQueueProcessors();
    this.schedulePeriodicTasks();
  }

  private setupQueueProcessors(): void {
    // Process points transactions
    this.pointsQueue.process(async (job) => {
      const { memberId, transaction } = job.data;
      return await this.processTransaction(memberId, transaction);
    });

    // Process notifications
    this.notificationQueue.process(async (job) => {
      const { memberId, notification } = job.data;
      return await this.sendNotification(memberId, notification);
    });

    // Process analytics
    this.analyticsQueue.process(async (job) => {
      const { programId } = job.data;
      return await this.updateAnalytics(programId);
    });
  }

  private schedulePeriodicTasks(): void {
    // Check for expiring points daily
    setInterval(async () => {
      await this.processExpiringPoints();
    }, 86400000); // 24 hours

    // Update leaderboards hourly
    setInterval(async () => {
      await this.updateAllLeaderboards();
    }, 3600000); // 1 hour

    // Process streak checks daily
    setInterval(async () => {
      await this.checkStreaks();
    }, 86400000); // 24 hours

    // Update tier qualifications monthly
    setInterval(async () => {
      await this.evaluateTierProgressions();
    }, 86400000 * 30); // 30 days
  }

  async createLoyaltyProgram(
    program: Partial<LoyaltyProgram>
  ): Promise<LoyaltyProgram> {
    const programId = `lp_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;

    const fullProgram: LoyaltyProgram = {
      programId,
      name: program.name!,
      type: program.type || 'points',
      status: 'active',
      tiers: program.tiers || this.getDefaultTiers(),
      pointSystem: program.pointSystem || this.getDefaultPointSystem(),
      benefits: program.benefits || [],
      partnerships: program.partnerships || [],
      gamification: {
        challenges: [],
        badges: this.getDefaultBadges(),
        leaderboards: [],
        streaks: this.getDefaultStreaks()
      },
      analytics: {
        totalMembers: 0,
        activeMembers: 0,
        averagePointsBalance: 0,
        redemptionRate: 0,
        customerLifetimeValue: 0,
        churnRate: 0
      }
    };

    // Store program
    await this.redis.set(
      `loyalty:program:${programId}`,
      JSON.stringify(fullProgram)
    );

    // Initialize leaderboards
    await this.initializeLeaderboards(programId);

    return fullProgram;
  }

  private getDefaultTiers(): LoyaltyTier[] {
    return [
      {
        tierId: 'bronze',
        name: 'Bronze',
        level: 1,
        requirements: {},
        benefits: {
          pointMultiplier: 1,
          priorityReservations: false,
          exclusiveEvents: false,
          conciergeService: false,
          complimentaryUpgrades: false
        },
        color: '#CD7F32',
        icon: '🥉'
      },
      {
        tierId: 'silver',
        name: 'Silver',
        level: 2,
        requirements: {
          points: 1000,
          visits: 10
        },
        benefits: {
          pointMultiplier: 1.25,
          discountPercentage: 5,
          priorityReservations: true,
          exclusiveEvents: false,
          conciergeService: false,
          complimentaryUpgrades: false
        },
        color: '#C0C0C0',
        icon: '🥈'
      },
      {
        tierId: 'gold',
        name: 'Gold',
        level: 3,
        requirements: {
          points: 5000,
          visits: 25,
          spend: 2500
        },
        benefits: {
          pointMultiplier: 1.5,
          discountPercentage: 10,
          priorityReservations: true,
          exclusiveEvents: true,
          conciergeService: true,
          complimentaryUpgrades: true
        },
        color: '#FFD700',
        icon: '🥇'
      },
      {
        tierId: 'platinum',
        name: 'Platinum',
        level: 4,
        requirements: {
          points: 15000,
          visits: 50,
          spend: 10000,
          period: 'annual'
        },
        benefits: {
          pointMultiplier: 2,
          discountPercentage: 15,
          freeItems: ['appetizer', 'dessert'],
          priorityReservations: true,
          exclusiveEvents: true,
          conciergeService: true,
          complimentaryUpgrades: true
        },
        color: '#E5E4E2',
        icon: '💎'
      }
    ];
  }

  private getDefaultPointSystem(): LoyaltyProgram['pointSystem'] {
    return {
      earningRules: [
        {
          ruleId: 'basic_spend',
          name: 'Basic Spending',
          type: 'spend',
          condition: {},
          points: {
            base: 1, // 1 point per dollar
            multiplier: 1
          },
          validFrom: new Date(),
          stackable: true
        },
        {
          ruleId: 'happy_hour',
          name: 'Happy Hour Bonus',
          type: 'spend',
          condition: {
            timeOfDay: { start: '15:00', end: '18:00' }
          },
          points: {
            multiplier: 2
          },
          validFrom: new Date(),
          stackable: true
        },
        {
          ruleId: 'review_bonus',
          name: 'Review Bonus',
          type: 'review',
          condition: {},
          points: {
            base: 100
          },
          validFrom: new Date(),
          stackable: false
        },
        {
          ruleId: 'referral',
          name: 'Referral Reward',
          type: 'referral',
          condition: {},
          points: {
            base: 500
          },
          validFrom: new Date(),
          stackable: true
        }
      ],
      redemptionRules: [
        {
          ruleId: 'discount_5',
          name: '$5 Off',
          type: 'discount',
          pointsCost: 500,
          value: 5,
          restrictions: {
            minimumPurchase: 25
          },
          availability: {}
        },
        {
          ruleId: 'discount_10',
          name: '$10 Off',
          type: 'discount',
          pointsCost: 900,
          value: 10,
          restrictions: {
            minimumPurchase: 50
          },
          availability: {}
        },
        {
          ruleId: 'free_appetizer',
          name: 'Free Appetizer',
          type: 'freeItem',
          pointsCost: 800,
          value: 'appetizer',
          restrictions: {},
          availability: {}
        }
      ],
      pointValue: 0.01, // 1 cent per point
      expirationPolicy: {
        enabled: true,
        periodMonths: 12,
        rolloverAllowed: true
      }
    };
  }

  private getDefaultBadges(): Badge[] {
    return [
      {
        badgeId: 'first_visit',
        name: 'First Timer',
        description: 'Completed your first reservation',
        icon: '🎉',
        rarity: 'common',
        requirements: {
          type: 'visits',
          value: 1
        },
        benefits: {
          points: 50
        },
        earnedBy: 0
      },
      {
        badgeId: 'foodie',
        name: 'Foodie',
        description: 'Tried 10 different restaurants',
        icon: '🍴',
        rarity: 'rare',
        requirements: {
          type: 'unique_restaurants',
          value: 10
        },
        benefits: {
          points: 200,
          multiplier: 1.1
        },
        earnedBy: 0
      },
      {
        badgeId: 'big_spender',
        name: 'VIP Diner',
        description: 'Spent over $1000',
        icon: '💰',
        rarity: 'epic',
        requirements: {
          type: 'total_spend',
          value: 1000
        },
        benefits: {
          points: 500,
          multiplier: 1.2
        },
        earnedBy: 0
      },
      {
        badgeId: 'centurion',
        name: 'Centurion',
        description: '100 reservations completed',
        icon: '🏆',
        rarity: 'legendary',
        requirements: {
          type: 'visits',
          value: 100
        },
        benefits: {
          points: 1000,
          multiplier: 1.5
        },
        earnedBy: 0
      }
    ];
  }

  private getDefaultStreaks(): StreakReward[] {
    return [
      {
        streakId: 'weekly_diner',
        type: 'visit',
        milestones: [
          {
            days: 7,
            reward: { points: 100 }
          },
          {
            days: 14,
            reward: { points: 250, multiplier: 1.1 }
          },
          {
            days: 30,
            reward: { points: 500, multiplier: 1.2, benefit: 'free_dessert' }
          }
        ]
      },
      {
        streakId: 'reviewer',
        type: 'review',
        milestones: [
          {
            days: 5,
            reward: { points: 150 }
          },
          {
            days: 10,
            reward: { points: 300, multiplier: 1.15 }
          }
        ]
      }
    ];
  }

  async enrollMember(
    userId: string,
    programId: string,
    referralCode?: string
  ): Promise<LoyaltyMember> {
    const memberId = `mem_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
    const program = await this.getProgram(programId);

    const member: LoyaltyMember = {
      memberId,
      userId,
      programId,
      tier: program.tiers[0].tierId,
      status: 'active',
      points: {
        current: referralCode ? 100 : 0, // Welcome bonus for referrals
        lifetime: referralCode ? 100 : 0,
        pending: 0,
        expiring: []
      },
      tierProgress: {
        currentTier: program.tiers[0].tierId,
        nextTier: program.tiers[1]?.tierId,
        pointsToNext: program.tiers[1]?.requirements.points || 0,
        qualifyingSpend: 0,
        qualifyingVisits: 0
      },
      achievements: {
        badges: [],
        challenges: [],
        streaks: [],
        milestones: []
      },
      preferences: {
        communicationChannels: ['email', 'push'],
        favoriteRestaurants: [],
        dietaryRestrictions: [],
        specialInterests: []
      },
      history: [],
      joinedAt: new Date(),
      lastActivity: new Date()
    };

    // Store member
    await this.redis.set(
      `loyalty:member:${memberId}`,
      JSON.stringify(member)
    );

    // Add to program members
    await this.redis.sadd(`loyalty:program:${programId}:members`, memberId);

    // Add to user's memberships
    await this.redis.sadd(`user:${userId}:loyaltymemberships`, memberId);

    // Process referral if applicable
    if (referralCode) {
      await this.processReferral(referralCode, memberId);
    }

    // Send welcome notification
    await this.notificationQueue.add('send-notification', {
      memberId,
      notification: {
        type: 'welcome',
        title: 'Welcome to Our Loyalty Program!',
        message: 'Start earning points with your next reservation.',
        data: { programId, tier: member.tier }
      }
    });

    // Update program analytics
    await this.analyticsQueue.add('update-analytics', { programId });

    return member;
  }

  async earnPoints(
    memberId: string,
    source: {
      type: 'reservation' | 'purchase' | 'review' | 'referral' | 'challenge' | 'bonus';
      referenceId: string;
      amount?: number;
      description: string;
    }
  ): Promise<Transaction> {
    const member = await this.getMember(memberId);
    const program = await this.getProgram(member.programId);

    // Calculate points based on earning rules
    let pointsEarned = 0;
    let appliedRules: string[] = [];

    for (const rule of program.pointSystem.earningRules) {
      if (this.matchesEarningRule(source, rule)) {
        const rulePoints = this.calculateRulePoints(source, rule, member);
        if (rule.stackable || appliedRules.length === 0) {
          pointsEarned += rulePoints;
          appliedRules.push(rule.ruleId);
        }
      }
    }

    // Apply tier multiplier
    const tier = program.tiers.find(t => t.tierId === member.tier);
    if (tier) {
      pointsEarned = Math.round(pointsEarned * tier.benefits.pointMultiplier);
    }

    // Create transaction
    const transactionId = `txn_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
    const transaction: Transaction = {
      transactionId,
      type: 'earn',
      points: pointsEarned,
      balance: member.points.current + pointsEarned,
      description: source.description,
      reference: {
        type: source.type,
        id: source.referenceId
      },
      timestamp: new Date()
    };

    // Update member points
    member.points.current += pointsEarned;
    member.points.lifetime += pointsEarned;
    member.history.push(transaction);
    member.lastActivity = new Date();

    // Check for achievements
    await this.checkAchievements(member);

    // Check for tier progression
    await this.checkTierProgression(member, program);

    // Store updated member
    await this.redis.set(
      `loyalty:member:${memberId}`,
      JSON.stringify(member)
    );

    // Update leaderboards
    await this.updateLeaderboardEntry(member.programId, memberId, pointsEarned);

    // Send notification
    await this.notificationQueue.add('send-notification', {
      memberId,
      notification: {
        type: 'points_earned',
        title: `You earned ${pointsEarned} points!`,
        message: source.description,
        data: { points: pointsEarned, balance: member.points.current }
      }
    });

    return transaction;
  }

  private matchesEarningRule(
    source: any,
    rule: EarningRule
  ): boolean {
    if (rule.type !== source.type && rule.type !== 'special') {
      return false;
    }

    // Check conditions
    if (rule.condition.minimumSpend && source.amount < rule.condition.minimumSpend) {
      return false;
    }

    // Check time conditions
    if (rule.condition.timeOfDay) {
      const now = moment();
      const start = moment(rule.condition.timeOfDay.start, 'HH:mm');
      const end = moment(rule.condition.timeOfDay.end, 'HH:mm');
      if (!now.isBetween(start, end)) {
        return false;
      }
    }

    // Check day of week
    if (rule.condition.dayOfWeek) {
      const today = new Date().getDay();
      if (!rule.condition.dayOfWeek.includes(today)) {
        return false;
      }
    }

    return true;
  }

  private calculateRulePoints(
    source: any,
    rule: EarningRule,
    member: LoyaltyMember
  ): number {
    let points = rule.points.base;

    if (source.amount && rule.type === 'spend') {
      points = source.amount * (rule.points.base || 1);
    }

    if (rule.points.multiplier) {
      points *= rule.points.multiplier;
    }

    if (rule.points.bonus) {
      points += rule.points.bonus;
    }

    if (rule.points.cap) {
      points = Math.min(points, rule.points.cap);
    }

    return Math.round(points);
  }

  async redeemPoints(
    memberId: string,
    redemptionRuleId: string
  ): Promise<{ success: boolean; transaction?: Transaction; error?: string }> {
    const member = await this.getMember(memberId);
    const program = await this.getProgram(member.programId);

    const rule = program.pointSystem.redemptionRules.find(
      r => r.ruleId === redemptionRuleId
    );

    if (!rule) {
      return { success: false, error: 'Invalid redemption rule' };
    }

    if (member.points.current < rule.pointsCost) {
      return { success: false, error: 'Insufficient points' };
    }

    // Check availability
    if (rule.availability.stock !== undefined && rule.availability.stock <= 0) {
      return { success: false, error: 'Redemption no longer available' };
    }

    // Create transaction
    const transactionId = `txn_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
    const transaction: Transaction = {
      transactionId,
      type: 'redeem',
      points: -rule.pointsCost,
      balance: member.points.current - rule.pointsCost,
      description: `Redeemed: ${rule.name}`,
      timestamp: new Date()
    };

    // Update member points
    member.points.current -= rule.pointsCost;
    member.history.push(transaction);
    member.lastActivity = new Date();

    // Store updated member
    await this.redis.set(
      `loyalty:member:${memberId}`,
      JSON.stringify(member)
    );

    // Generate redemption code
    const redemptionCode = await this.generateRedemptionCode(memberId, rule);

    // Send notification
    await this.notificationQueue.add('send-notification', {
      memberId,
      notification: {
        type: 'points_redeemed',
        title: 'Redemption Successful!',
        message: `You redeemed ${rule.name} for ${rule.pointsCost} points`,
        data: {
          redemptionCode,
          value: rule.value,
          expiresIn: '30 days'
        }
      }
    });

    return { success: true, transaction };
  }

  private async generateRedemptionCode(
    memberId: string,
    rule: RedemptionRule
  ): Promise<string> {
    const code = `RED${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

    await this.redis.set(
      `redemption:${code}`,
      JSON.stringify({
        memberId,
        rule,
        createdAt: new Date(),
        expiresAt: moment().add(30, 'days').toDate(),
        used: false
      }),
      'EX',
      86400 * 30
    );

    return code;
  }

  async joinChallenge(
    memberId: string,
    challengeId: string
  ): Promise<void> {
    const member = await this.getMember(memberId);
    const program = await this.getProgram(member.programId);

    const challenge = program.gamification.challenges.find(
      c => c.challengeId === challengeId
    );

    if (!challenge) {
      throw new Error('Challenge not found');
    }

    // Add member to challenge participants
    await this.redis.sadd(`challenge:${challengeId}:participants`, memberId);
    challenge.participants++;

    // Track member's challenge progress
    await this.redis.set(
      `challenge:${challengeId}:member:${memberId}`,
      JSON.stringify({
        joinedAt: new Date(),
        progress: 0,
        completed: false
      })
    );

    // Send notification
    await this.notificationQueue.add('send-notification', {
      memberId,
      notification: {
        type: 'challenge_joined',
        title: `You joined the ${challenge.name} challenge!`,
        message: challenge.description,
        data: { challengeId, requirements: challenge.requirements }
      }
    });
  }

  private async checkAchievements(member: LoyaltyMember): Promise<void> {
    const program = await this.getProgram(member.programId);

    for (const badge of program.gamification.badges) {
      if (!member.achievements.badges.includes(badge.badgeId)) {
        if (await this.qualifiesForBadge(member, badge)) {
          // Award badge
          member.achievements.badges.push(badge.badgeId);

          // Award badge benefits
          if (badge.benefits?.points) {
            member.points.current += badge.benefits.points;
            member.points.lifetime += badge.benefits.points;
          }

          // Send notification
          await this.notificationQueue.add('send-notification', {
            memberId: member.memberId,
            notification: {
              type: 'badge_earned',
              title: `Badge Unlocked: ${badge.name}!`,
              message: badge.description,
              data: {
                badgeId: badge.badgeId,
                rarity: badge.rarity,
                benefits: badge.benefits
              }
            }
          });

          // Update badge earned count
          badge.earnedBy++;
        }
      }
    }

    // Check milestones
    const milestones = this.checkMilestones(member);
    for (const milestone of milestones) {
      if (!member.achievements.milestones.find(
        m => m.type === milestone.type && m.value === milestone.value
      )) {
        member.achievements.milestones.push(milestone);

        // Send notification
        await this.notificationQueue.add('send-notification', {
          memberId: member.memberId,
          notification: {
            type: 'milestone_reached',
            title: `Milestone Reached!`,
            message: `You reached ${milestone.type}: ${milestone.value}`,
            data: milestone
          }
        });
      }
    }
  }

  private async qualifiesForBadge(
    member: LoyaltyMember,
    badge: Badge
  ): Promise<boolean> {
    switch (badge.requirements.type) {
      case 'visits':
        return member.tierProgress.qualifyingVisits >= badge.requirements.value;
      case 'total_spend':
        return member.tierProgress.qualifyingSpend >= badge.requirements.value;
      case 'points':
        return member.points.lifetime >= badge.requirements.value;
      default:
        return false;
    }
  }

  private checkMilestones(member: LoyaltyMember): Milestone[] {
    const milestones: Milestone[] = [];

    // Check points milestones
    const pointMilestones = [100, 500, 1000, 5000, 10000, 50000, 100000];
    for (const milestone of pointMilestones) {
      if (member.points.lifetime >= milestone &&
          !member.achievements.milestones.find(
            m => m.type === 'points' && m.value === milestone
          )) {
        milestones.push({
          type: 'points',
          value: milestone,
          achievedAt: new Date(),
          reward: { points: Math.floor(milestone * 0.1) }
        });
      }
    }

    // Check visit milestones
    const visitMilestones = [5, 10, 25, 50, 100];
    for (const milestone of visitMilestones) {
      if (member.tierProgress.qualifyingVisits >= milestone &&
          !member.achievements.milestones.find(
            m => m.type === 'visits' && m.value === milestone
          )) {
        milestones.push({
          type: 'visits',
          value: milestone,
          achievedAt: new Date(),
          reward: { points: milestone * 20 }
        });
      }
    }

    return milestones;
  }

  private async checkTierProgression(
    member: LoyaltyMember,
    program: LoyaltyProgram
  ): Promise<void> {
    const currentTierIndex = program.tiers.findIndex(t => t.tierId === member.tier);
    const nextTier = program.tiers[currentTierIndex + 1];

    if (!nextTier) return;

    let qualifies = true;

    if (nextTier.requirements.points &&
        member.points.lifetime < nextTier.requirements.points) {
      qualifies = false;
    }

    if (nextTier.requirements.visits &&
        member.tierProgress.qualifyingVisits < nextTier.requirements.visits) {
      qualifies = false;
    }

    if (nextTier.requirements.spend &&
        member.tierProgress.qualifyingSpend < nextTier.requirements.spend) {
      qualifies = false;
    }

    if (qualifies) {
      // Upgrade tier
      member.tier = nextTier.tierId;
      member.tierProgress.currentTier = nextTier.tierId;
      member.tierProgress.nextTier = program.tiers[currentTierIndex + 2]?.tierId;

      // Send notification
      await this.notificationQueue.add('send-notification', {
        memberId: member.memberId,
        notification: {
          type: 'tier_upgrade',
          title: `Congratulations! You're now ${nextTier.name}!`,
          message: `Enjoy your new benefits and ${nextTier.benefits.pointMultiplier}x points`,
          data: {
            newTier: nextTier.tierId,
            benefits: nextTier.benefits
          }
        }
      });
    } else {
      // Update progress
      member.tierProgress.pointsToNext = nextTier.requirements.points
        ? nextTier.requirements.points - member.points.lifetime
        : 0;
    }
  }

  private async initializeLeaderboards(programId: string): Promise<void> {
    const periods: Leaderboard['period'][] = ['daily', 'weekly', 'monthly', 'allTime'];
    const metrics: Leaderboard['metric'][] = ['points', 'visits', 'spend', 'referrals'];

    for (const period of periods) {
      for (const metric of metrics) {
        const leaderboard: Leaderboard = {
          leaderboardId: `lb_${programId}_${period}_${metric}`,
          name: `${period} ${metric} Leaderboard`,
          period,
          metric,
          entries: [],
          prizes: this.getLeaderboardPrizes(period, metric),
          updatedAt: new Date()
        };

        await this.redis.set(
          `leaderboard:${leaderboard.leaderboardId}`,
          JSON.stringify(leaderboard)
        );
      }
    }
  }

  private getLeaderboardPrizes(
    period: Leaderboard['period'],
    metric: Leaderboard['metric']
  ): Leaderboard['prizes'] {
    if (period === 'daily') {
      return [
        { rank: 1, reward: '50 bonus points' },
        { rank: [2, 3], reward: '25 bonus points' }
      ];
    } else if (period === 'weekly') {
      return [
        { rank: 1, reward: '200 bonus points' },
        { rank: [2, 5], reward: '100 bonus points' },
        { rank: [6, 10], reward: '50 bonus points' }
      ];
    } else if (period === 'monthly') {
      return [
        { rank: 1, reward: '1000 bonus points + Gold status' },
        { rank: [2, 3], reward: '500 bonus points' },
        { rank: [4, 10], reward: '250 bonus points' },
        { rank: [11, 25], reward: '100 bonus points' }
      ];
    } else {
      return [
        { rank: 1, reward: 'Lifetime Platinum status' },
        { rank: [2, 3], reward: '5000 bonus points' },
        { rank: [4, 10], reward: '2500 bonus points' }
      ];
    }
  }

  private async updateLeaderboardEntry(
    programId: string,
    memberId: string,
    points: number
  ): Promise<void> {
    // Update all relevant leaderboards
    const periods: Leaderboard['period'][] = ['daily', 'weekly', 'monthly', 'allTime'];

    for (const period of periods) {
      const leaderboardId = `lb_${programId}_${period}_points`;
      const key = `leaderboard:${leaderboardId}:scores`;

      // Update score
      await this.redis.zincrby(key, points, memberId);
    }
  }

  private async updateAllLeaderboards(): Promise<void> {
    const leaderboardKeys = await this.redis.keys('leaderboard:lb_*');

    for (const key of leaderboardKeys) {
      const leaderboardData = await this.redis.get(key);
      if (!leaderboardData) continue;

      const leaderboard: Leaderboard = JSON.parse(leaderboardData);
      const scoresKey = `leaderboard:${leaderboard.leaderboardId}:scores`;

      // Get top entries
      const topEntries = await this.redis.zrevrange(
        scoresKey,
        0,
        99,
        'WITHSCORES'
      );

      // Parse entries
      const entries: Leaderboard['entries'] = [];
      for (let i = 0; i < topEntries.length; i += 2) {
        const memberId = topEntries[i];
        const score = parseInt(topEntries[i + 1]);
        const member = await this.getMember(memberId);

        entries.push({
          rank: Math.floor(i / 2) + 1,
          memberId,
          displayName: await this.getMemberDisplayName(member),
          value: score,
          change: 0, // Would need historical data to calculate
          prize: this.getPrizeForRank(leaderboard.prizes, Math.floor(i / 2) + 1)
        });
      }

      leaderboard.entries = entries;
      leaderboard.updatedAt = new Date();

      await this.redis.set(
        `leaderboard:${leaderboard.leaderboardId}`,
        JSON.stringify(leaderboard)
      );
    }
  }

  private getPrizeForRank(
    prizes: Leaderboard['prizes'],
    rank: number
  ): string | undefined {
    for (const prize of prizes) {
      if (typeof prize.rank === 'number' && prize.rank === rank) {
        return prize.reward;
      } else if (Array.isArray(prize.rank) &&
                 rank >= prize.rank[0] &&
                 rank <= prize.rank[1]) {
        return prize.reward;
      }
    }
    return undefined;
  }

  private async getMemberDisplayName(member: LoyaltyMember): Promise<string> {
    // Get user display name
    return `User_${member.userId.substring(0, 8)}`;
  }

  private async processExpiringPoints(): Promise<void> {
    const members = await this.getAllMembers();

    for (const member of members) {
      const expiredPoints = member.points.expiring.filter(
        exp => exp.date <= new Date()
      );

      if (expiredPoints.length > 0) {
        const totalExpired = expiredPoints.reduce((sum, exp) => sum + exp.amount, 0);

        // Create expiration transaction
        const transaction: Transaction = {
          transactionId: `txn_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`,
          type: 'expire',
          points: -totalExpired,
          balance: member.points.current - totalExpired,
          description: 'Points expired',
          timestamp: new Date()
        };

        // Update member
        member.points.current -= totalExpired;
        member.points.expiring = member.points.expiring.filter(
          exp => exp.date > new Date()
        );
        member.history.push(transaction);

        await this.redis.set(
          `loyalty:member:${member.memberId}`,
          JSON.stringify(member)
        );

        // Send notification
        await this.notificationQueue.add('send-notification', {
          memberId: member.memberId,
          notification: {
            type: 'points_expired',
            title: 'Points Expired',
            message: `${totalExpired} points have expired`,
            data: { expiredPoints: totalExpired, currentBalance: member.points.current }
          }
        });
      }
    }
  }

  private async checkStreaks(): Promise<void> {
    const members = await this.getAllMembers();

    for (const member of members) {
      for (const streak of member.achievements.streaks) {
        const daysSinceLastActivity = moment().diff(streak.lastActivity, 'days');

        if (daysSinceLastActivity > 1) {
          // Streak broken
          streak.current = 0;
        }
      }

      await this.redis.set(
        `loyalty:member:${member.memberId}`,
        JSON.stringify(member)
      );
    }
  }

  private async evaluateTierProgressions(): Promise<void> {
    const programs = await this.getAllPrograms();

    for (const program of programs) {
      const members = await this.getProgramMembers(program.programId);

      for (const member of members) {
        await this.checkTierProgression(member, program);

        await this.redis.set(
          `loyalty:member:${member.memberId}`,
          JSON.stringify(member)
        );
      }
    }
  }

  private async processReferral(referralCode: string, newMemberId: string): Promise<void> {
    // Process referral rewards
    const referrerId = await this.redis.get(`referral:${referralCode}`);
    if (!referrerId) return;

    const referrer = await this.getMember(referrerId);

    // Award referral points
    await this.earnPoints(referrerId, {
      type: 'referral',
      referenceId: newMemberId,
      description: 'Referral bonus'
    });
  }

  private async processTransaction(
    memberId: string,
    transaction: Transaction
  ): Promise<void> {
    // Process points transaction
    const member = await this.getMember(memberId);

    member.points.current += transaction.points;
    if (transaction.type === 'earn') {
      member.points.lifetime += transaction.points;
    }

    member.history.push(transaction);
    member.lastActivity = new Date();

    await this.redis.set(
      `loyalty:member:${memberId}`,
      JSON.stringify(member)
    );
  }

  private async sendNotification(
    memberId: string,
    notification: any
  ): Promise<void> {
    // Send notification through appropriate channels
    console.log(`Sending notification to ${memberId}:`, notification);
  }

  private async updateAnalytics(programId: string): Promise<void> {
    const program = await this.getProgram(programId);
    const members = await this.getProgramMembers(programId);

    const activeMembers = members.filter(
      m => moment().diff(m.lastActivity, 'days') <= 30
    );

    program.analytics = {
      totalMembers: members.length,
      activeMembers: activeMembers.length,
      averagePointsBalance: members.reduce((sum, m) => sum + m.points.current, 0) / members.length,
      redemptionRate: this.calculateRedemptionRate(members),
      customerLifetimeValue: this.calculateCLTV(members),
      churnRate: this.calculateChurnRate(members)
    };

    await this.redis.set(
      `loyalty:program:${programId}`,
      JSON.stringify(program)
    );
  }

  private calculateRedemptionRate(members: LoyaltyMember[]): number {
    const redemptions = members.reduce((sum, m) =>
      sum + m.history.filter(t => t.type === 'redeem').length, 0
    );
    const earnings = members.reduce((sum, m) =>
      sum + m.history.filter(t => t.type === 'earn').length, 0
    );

    return earnings > 0 ? (redemptions / earnings) * 100 : 0;
  }

  private calculateCLTV(members: LoyaltyMember[]): number {
    // Simplified CLTV calculation
    return members.reduce((sum, m) => sum + m.tierProgress.qualifyingSpend, 0) / members.length;
  }

  private calculateChurnRate(members: LoyaltyMember[]): number {
    const churned = members.filter(
      m => moment().diff(m.lastActivity, 'days') > 90
    ).length;

    return members.length > 0 ? (churned / members.length) * 100 : 0;
  }

  // Helper methods
  private async getProgram(programId: string): Promise<LoyaltyProgram> {
    const data = await this.redis.get(`loyalty:program:${programId}`);
    return JSON.parse(data!);
  }

  private async getMember(memberId: string): Promise<LoyaltyMember> {
    const data = await this.redis.get(`loyalty:member:${memberId}`);
    return JSON.parse(data!);
  }

  private async getAllMembers(): Promise<LoyaltyMember[]> {
    const keys = await this.redis.keys('loyalty:member:*');
    const members: LoyaltyMember[] = [];

    for (const key of keys) {
      const data = await this.redis.get(key);
      if (data) {
        members.push(JSON.parse(data));
      }
    }

    return members;
  }

  private async getAllPrograms(): Promise<LoyaltyProgram[]> {
    const keys = await this.redis.keys('loyalty:program:*');
    const programs: LoyaltyProgram[] = [];

    for (const key of keys) {
      const data = await this.redis.get(key);
      if (data) {
        programs.push(JSON.parse(data));
      }
    }

    return programs;
  }

  private async getProgramMembers(programId: string): Promise<LoyaltyMember[]> {
    const memberIds = await this.redis.smembers(`loyalty:program:${programId}:members`);
    const members: LoyaltyMember[] = [];

    for (const memberId of memberIds) {
      const member = await this.getMember(memberId);
      members.push(member);
    }

    return members;
  }
}