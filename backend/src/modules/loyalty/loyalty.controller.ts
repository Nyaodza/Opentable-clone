import { Controller, Get, Post, Put, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('loyalty')
@Controller('loyalty')
export class LoyaltyController {

  @Get('profile/:userId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user loyalty profile' })
  @ApiResponse({ status: 200 })
  async getLoyaltyProfile(@Param('userId') userId: string, @Req() req: any) {
    const profile = {
      userId,
      currentPoints: 2450,
      lifetimePoints: 5670,
      currentTier: 'gold',
      nextTier: 'platinum',
      pointsToNextTier: 1050,
      tierBenefits: {
        current: [
          'Priority reservations',
          '10% discount on meals',
          'Free appetizer on birthday',
          'Exclusive event invitations',
        ],
        next: [
          'Complimentary valet parking',
          '15% discount on meals',
          'Free dessert with every meal',
          'VIP customer service',
        ],
      },
      memberSince: new Date('2022-03-15'),
      lastActivity: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      achievements: [
        {
          id: 'foodie_explorer',
          name: 'Foodie Explorer',
          description: 'Dined at 10 different restaurants',
          earnedAt: new Date('2023-06-15'),
          icon: '🍽️',
        },
        {
          id: 'loyal_customer',
          name: 'Loyal Customer',
          description: 'Made 25 reservations',
          earnedAt: new Date('2023-08-20'),
          icon: '⭐',
        },
      ],
    };

    return {
      success: true,
      data: profile,
    };
  }

  @Get('history/:userId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user points history' })
  @ApiResponse({ status: 200 })
  async getPointsHistory(
    @Param('userId') userId: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
    @Query('type') type?: 'earned' | 'redeemed' | 'expired',
  ) {
    const mockHistory = Array.from({ length: limit }, (_, idx) => {
      const types = ['earned', 'redeemed', 'expired'];
      const selectedType = type || types[Math.floor(Math.random() * types.length)];
      const pointsAmount = Math.floor(Math.random() * 500) + 50;

      return {
        id: `history-${idx}`,
        type: selectedType,
        points: selectedType === 'redeemed' ? -pointsAmount : pointsAmount,
        description: selectedType === 'earned'
          ? `Earned from dining at Restaurant ${idx + 1}`
          : selectedType === 'redeemed'
          ? `Redeemed for discount at Restaurant ${idx + 1}`
          : `Points expired`,
        restaurantId: selectedType !== 'expired' ? `restaurant-${idx}` : null,
        restaurantName: selectedType !== 'expired' ? `Restaurant ${idx + 1}` : null,
        reservationId: selectedType === 'earned' ? `reservation-${idx}` : null,
        multiplier: selectedType === 'earned' ? Math.random() > 0.7 ? 2 : 1 : null,
        createdAt: new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000),
      };
    });

    return {
      success: true,
      data: {
        history: mockHistory,
        pagination: {
          page,
          limit,
          total: 156,
          totalPages: Math.ceil(156 / limit),
        },
        summary: {
          totalEarned: 5670,
          totalRedeemed: 3220,
          totalExpired: 150,
          currentBalance: 2450,
        },
      },
    };
  }

  @Post('points/earn')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Earn loyalty points' })
  @ApiResponse({ status: 201 })
  async earnPoints(
    @Body() body: {
      userId: string;
      reservationId: string;
      amount: number;
      multiplier?: number;
      source?: string;
    },
    @Req() req: any,
  ) {
    const earnedPoints = Math.floor(body.amount * (body.multiplier || 1));

    return {
      success: true,
      data: {
        pointsEarned: earnedPoints,
        currentBalance: 2450 + earnedPoints,
        multiplierApplied: body.multiplier || 1,
        source: body.source || 'dining',
        reservationId: body.reservationId,
        earnedAt: new Date(),
      },
      message: `You earned ${earnedPoints} points!`,
    };
  }

  @Post('points/redeem')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Redeem loyalty points' })
  @ApiResponse({ status: 200 })
  async redeemPoints(
    @Body() body: {
      userId: string;
      points: number;
      rewardId: string;
      reservationId?: string;
    },
    @Req() req: any,
  ) {
    const currentBalance = 2450;
    if (body.points > currentBalance) {
      return {
        success: false,
        message: 'Insufficient points balance',
        data: { currentBalance, requested: body.points },
      };
    }

    return {
      success: true,
      data: {
        pointsRedeemed: body.points,
        currentBalance: currentBalance - body.points,
        rewardId: body.rewardId,
        reservationId: body.reservationId,
        redeemedAt: new Date(),
        discountValue: Math.floor(body.points / 10), // 10 points = $1
      },
      message: `Successfully redeemed ${body.points} points!`,
    };
  }

  @Get('rewards')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get available rewards' })
  @ApiResponse({ status: 200 })
  async getRewards(@Query('category') category?: string) {
    const mockRewards = [
      {
        id: 'reward-discount-10',
        name: '10% Off Meal',
        description: 'Get 10% off your entire meal',
        pointsCost: 500,
        category: 'discount',
        value: '$5-50 value',
        terms: 'Valid for 30 days. Cannot be combined with other offers.',
        available: true,
        icon: '💰',
      },
      {
        id: 'reward-appetizer-free',
        name: 'Free Appetizer',
        description: 'Complimentary appetizer with any entrée',
        pointsCost: 750,
        category: 'food',
        value: 'Up to $15 value',
        terms: 'Valid for 30 days. Limited to appetizers under $15.',
        available: true,
        icon: '🥗',
      },
      {
        id: 'reward-dessert-free',
        name: 'Free Dessert',
        description: 'Complimentary dessert with dinner',
        pointsCost: 600,
        category: 'food',
        value: 'Up to $12 value',
        terms: 'Valid for dinner reservations only.',
        available: true,
        icon: '🍰',
      },
      {
        id: 'reward-priority-seating',
        name: 'Priority Seating',
        description: 'Skip the wait with priority seating',
        pointsCost: 300,
        category: 'experience',
        value: 'Priceless',
        terms: 'Valid for 7 days. Subject to availability.',
        available: true,
        icon: '⭐',
      },
      {
        id: 'reward-wine-bottle',
        name: 'Complimentary Wine',
        description: 'Free bottle of house wine',
        pointsCost: 1200,
        category: 'beverage',
        value: 'Up to $30 value',
        terms: 'Valid for dinner reservations. Must be 21+.',
        available: true,
        icon: '🍷',
      },
    ];

    const filteredRewards = category
      ? mockRewards.filter(reward => reward.category === category)
      : mockRewards;

    return {
      success: true,
      data: {
        rewards: filteredRewards,
        categories: ['discount', 'food', 'beverage', 'experience'],
      },
    };
  }

  @Get('tiers')
  @ApiOperation({ summary: 'Get loyalty tier information' })
  @ApiResponse({ status: 200 })
  async getTiers() {
    const tiers = [
      {
        name: 'bronze',
        minPoints: 0,
        maxPoints: 999,
        color: '#CD7F32',
        benefits: [
          'Earn 1 point per $1 spent',
          'Birthday reward',
          'Member-only promotions',
        ],
        welcomeBonus: 100,
      },
      {
        name: 'silver',
        minPoints: 1000,
        maxPoints: 2499,
        color: '#C0C0C0',
        benefits: [
          'Earn 1.25 points per $1 spent',
          'Priority customer service',
          'Free appetizer on birthday',
          'Early access to reservations',
        ],
        welcomeBonus: 250,
      },
      {
        name: 'gold',
        minPoints: 2500,
        maxPoints: 4999,
        color: '#FFD700',
        benefits: [
          'Earn 1.5 points per $1 spent',
          'Priority reservations',
          '10% discount on meals',
          'Free appetizer on birthday',
          'Exclusive event invitations',
        ],
        welcomeBonus: 500,
      },
      {
        name: 'platinum',
        minPoints: 5000,
        maxPoints: null,
        color: '#E5E4E2',
        benefits: [
          'Earn 2 points per $1 spent',
          'Complimentary valet parking',
          '15% discount on meals',
          'Free dessert with every meal',
          'VIP customer service',
          'Annual dining credit',
        ],
        welcomeBonus: 1000,
      },
    ];

    return {
      success: true,
      data: tiers,
    };
  }

  @Get('leaderboard')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get loyalty leaderboard' })
  @ApiResponse({ status: 200 })
  async getLeaderboard(
    @Query('period') period: 'monthly' | 'yearly' | 'all-time' = 'monthly',
    @Query('limit') limit: number = 10,
  ) {
    const mockLeaderboard = Array.from({ length: limit }, (_, idx) => ({
      rank: idx + 1,
      userId: `user-${idx}`,
      userName: `User ${idx + 1}`,
      userAvatar: `https://ui-avatars.com/api/?name=User+${idx + 1}`,
      points: Math.floor(Math.random() * 5000) + 1000,
      tier: ['bronze', 'silver', 'gold', 'platinum'][Math.floor(Math.random() * 4)],
      reservations: Math.floor(Math.random() * 50) + 5,
    }));

    // Sort by points descending
    mockLeaderboard.sort((a, b) => b.points - a.points);

    // Update ranks
    mockLeaderboard.forEach((user, idx) => {
      user.rank = idx + 1;
    });

    return {
      success: true,
      data: {
        leaderboard: mockLeaderboard,
        period,
        userRank: Math.floor(Math.random() * 100) + 1, // Current user's rank
        metadata: {
          totalParticipants: 1247,
          lastUpdated: new Date(),
        },
      },
    };
  }

  @Post('refer-friend')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Refer a friend for bonus points' })
  @ApiResponse({ status: 201 })
  async referFriend(
    @Body() body: { email: string; name?: string },
    @Req() req: any,
  ) {
    const referralCode = 'REF' + Math.random().toString(36).substring(2, 8).toUpperCase();

    return {
      success: true,
      data: {
        referralCode,
        bonusPoints: 500,
        friendBonus: 250,
        referralLink: `https://app.opentable.com/signup?ref=${referralCode}`,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      },
      message: 'Referral sent successfully! You\'ll earn 500 points when they make their first reservation.',
    };
  }

  @Get('analytics/restaurant/:restaurantId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('restaurant_owner', 'restaurant_staff', 'admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get loyalty analytics for restaurant' })
  @ApiResponse({ status: 200 })
  async getLoyaltyAnalytics(@Param('restaurantId') restaurantId: string) {
    return {
      success: true,
      data: {
        totalLoyaltyMembers: 1247,
        activeMembers: 856,
        membersByTier: {
          bronze: 523,
          silver: 412,
          gold: 234,
          platinum: 78,
        },
        pointsIssuedThisMonth: 25640,
        pointsRedeemedThisMonth: 18450,
        averagePointsPerMember: 2340,
        memberRetentionRate: 78.5,
        loyaltyProgramROI: 340, // 340% ROI
        topRewards: [
          { name: '10% Off Meal', redemptions: 45 },
          { name: 'Free Appetizer', redemptions: 32 },
          { name: 'Free Dessert', redemptions: 28 },
        ],
        membershipGrowth: [
          { month: 'Jan', newMembers: 67, totalMembers: 1134 },
          { month: 'Feb', newMembers: 78, totalMembers: 1212 },
          { month: 'Mar', newMembers: 35, totalMembers: 1247 },
        ],
      },
    };
  }

  @Put('preferences/:userId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update loyalty program preferences' })
  @ApiResponse({ status: 200 })
  async updatePreferences(
    @Param('userId') userId: string,
    @Body() body: {
      emailNotifications?: boolean;
      smsNotifications?: boolean;
      pointsExpiryReminder?: boolean;
      tierUpgradeNotification?: boolean;
      specialOffers?: boolean;
    },
    @Req() req: any,
  ) {
    return {
      success: true,
      data: {
        userId,
        preferences: {
          emailNotifications: body.emailNotifications ?? true,
          smsNotifications: body.smsNotifications ?? false,
          pointsExpiryReminder: body.pointsExpiryReminder ?? true,
          tierUpgradeNotification: body.tierUpgradeNotification ?? true,
          specialOffers: body.specialOffers ?? true,
        },
        updatedAt: new Date(),
      },
      message: 'Preferences updated successfully',
    };
  }
}