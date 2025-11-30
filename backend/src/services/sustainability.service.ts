import { Op } from 'sequelize';
import { SustainabilityMetrics } from '../models/SustainabilityMetrics';
import { UserSustainabilityProfile } from '../models/UserSustainabilityProfile';
import { Restaurant } from '../models/Restaurant';
import { User } from '../models/User';
import { Reservation } from '../models/Reservation';
import { NotificationService } from './notification.service';
import { EmailService } from './email.service';
import { redisClient } from '../config/redis';
import { pubsub, EVENTS } from '../config/pubsub';
import { BadRequestError, NotFoundError } from '../middleware/errorHandler';
import { logInfo, logError } from '../utils/logger';

interface SustainabilityUpdateData {
  carbonFootprint?: {
    energyUsage?: number;
    renewableEnergyPercent?: number;
    wasteReduction?: number;
    transportationImpact?: number;
  };
  localSourcing?: {
    localSupplierPercent?: number;
    averageSupplierDistance?: number;
    organicPercent?: number;
    seasonalMenuPercent?: number;
  };
  wasteManagement?: {
    foodWasteReduction?: number;
    recyclingRate?: number;
    compostingProgram?: boolean;
    plasticReductionEfforts?: number;
  };
  communityImpact?: {
    localEmployment?: number;
    fairWagesPractice?: boolean;
    communityPartnership?: number;
    charitableContributions?: number;
  };
  certifications?: Array<{
    name: string;
    issuedBy: string;
    validUntil: Date;
    verificationUrl?: string;
  }>;
}

interface SustainabilityInsights {
  userImpact: {
    totalCarbonSaved: number;
    localBusinessesSupported: number;
    sustainabilityScore: number;
    monthlyProgress: any[];
  };
  recommendations: Array<{
    restaurantId: string;
    name: string;
    sustainabilityScore: number;
    strongPoints: string[];
    distance?: number;
  }>;
  achievements: any[];
  tips: string[];
}

export class SustainabilityService {
  private static readonly CACHE_TTL = 3600; // 1 hour

  /**
   * Initialize or get user sustainability profile
   */
  static async getUserProfile(userId: string): Promise<UserSustainabilityProfile> {
    let profile = await UserSustainabilityProfile.findOne({
      where: { userId },
    });

    if (!profile) {
      profile = await UserSustainabilityProfile.create({
        userId,
        preferences: {
          prioritizeLocalSourcing: true,
          prioritizeLowCarbon: true,
          prioritizeWasteReduction: false,
          prioritizeCommunityImpact: false,
          minimumSustainabilityScore: 50,
          certificationPreferences: [],
        },
        impact: {
          totalDiningEvents: 0,
          sustainableDiningEvents: 0,
          carbonFootprintSaved: 0,
          localBusinessesSupported: 0,
          wasteReduced: 0,
          communityImpactScore: 0,
        },
        achievements: [],
        goals: {
          monthlyTarget: 50,
          yearlyTarget: 60,
          currentStreak: 0,
          longestStreak: 0,
        },
        insights: {
          favoriteEcoFriendlyRestaurants: [],
          topSustainabilityCategories: [],
          monthlyProgress: [],
        },
        notifications: {
          sustainabilityTips: true,
          achievementAlerts: true,
          monthlyReports: true,
          newSustainableRestaurants: true,
        },
        isActive: true,
      });

      logInfo('Created sustainability profile for user', { userId });
    }

    return profile;
  }

  /**
   * Update restaurant sustainability metrics
   */
  static async updateRestaurantMetrics(
    restaurantId: string,
    data: SustainabilityUpdateData
  ): Promise<SustainabilityMetrics> {
    const restaurant = await Restaurant.findByPk(restaurantId);
    if (!restaurant) {
      throw new NotFoundError('Restaurant not found');
    }

    let metrics = await SustainabilityMetrics.findOne({
      where: { restaurantId },
    });

    if (!metrics) {
      metrics = await SustainabilityMetrics.create({
        restaurantId,
        carbonFootprint: {
          totalScore: 0,
          energyUsage: 0,
          renewableEnergyPercent: 0,
          wasteReduction: 0,
          transportationImpact: 0,
          lastUpdated: new Date(),
        },
        localSourcing: {
          totalScore: 0,
          localSupplierPercent: 0,
          averageSupplierDistance: 0,
          organicPercent: 0,
          seasonalMenuPercent: 0,
          lastUpdated: new Date(),
        },
        wasteManagement: {
          totalScore: 0,
          foodWasteReduction: 0,
          recyclingRate: 0,
          compostingProgram: false,
          plasticReductionEfforts: 0,
          lastUpdated: new Date(),
        },
        communityImpact: {
          totalScore: 0,
          localEmployment: 0,
          fairWagesPractice: false,
          communityPartnership: 0,
          charitableContributions: 0,
          lastUpdated: new Date(),
        },
        certifications: [],
        overallScore: 0,
        lastAuditDate: new Date(),
        nextAuditDate: new Date(Date.now() + 6 * 30 * 24 * 60 * 60 * 1000), // 6 months
        isVerified: false,
      });
    }

    // Update metrics
    const updates: any = {};

    if (data.carbonFootprint) {
      const carbonScore = this.calculateCarbonScore(data.carbonFootprint);
      updates.carbonFootprint = {
        ...metrics.carbonFootprint,
        ...data.carbonFootprint,
        totalScore: carbonScore,
        lastUpdated: new Date(),
      };
    }

    if (data.localSourcing) {
      const localScore = this.calculateLocalSourcingScore(data.localSourcing);
      updates.localSourcing = {
        ...metrics.localSourcing,
        ...data.localSourcing,
        totalScore: localScore,
        lastUpdated: new Date(),
      };
    }

    if (data.wasteManagement) {
      const wasteScore = this.calculateWasteScore(data.wasteManagement);
      updates.wasteManagement = {
        ...metrics.wasteManagement,
        ...data.wasteManagement,
        totalScore: wasteScore,
        lastUpdated: new Date(),
      };
    }

    if (data.communityImpact) {
      const communityScore = this.calculateCommunityScore(data.communityImpact);
      updates.communityImpact = {
        ...metrics.communityImpact,
        ...data.communityImpact,
        totalScore: communityScore,
        lastUpdated: new Date(),
      };
    }

    if (data.certifications) {
      updates.certifications = data.certifications;
    }

    await metrics.update(updates);

    // Clear cache
    await redisClient.del(`sustainability:restaurant:${restaurantId}`);

    logInfo('Updated restaurant sustainability metrics', { restaurantId, overallScore: metrics.overallScore });

    // Notify users who have this restaurant in favorites
    await this.notifyUsersOfSustainabilityUpdate(restaurantId, metrics.overallScore);

    return metrics;
  }

  /**
   * Get restaurant sustainability metrics
   */
  static async getRestaurantMetrics(restaurantId: string): Promise<SustainabilityMetrics | null> {
    const cacheKey = `sustainability:restaurant:${restaurantId}`;
    const cached = await redisClient.get(cacheKey);
    
    if (cached) {
      return JSON.parse(cached);
    }

    const metrics = await SustainabilityMetrics.findOne({
      where: { restaurantId },
      include: [{
        model: Restaurant,
        as: 'restaurant',
        attributes: ['id', 'name', 'address'],
      }],
    });

    if (metrics) {
      await redisClient.setex(cacheKey, this.CACHE_TTL, JSON.stringify(metrics));
    }

    return metrics;
  }

  /**
   * Track user dining event for sustainability impact
   */
  static async trackDiningEvent(userId: string, reservationId: string): Promise<void> {
    const reservation = await Reservation.findByPk(reservationId, {
      include: [{ model: Restaurant }],
    });

    if (!reservation) {
      throw new NotFoundError('Reservation not found');
    }

    const profile = await this.getUserProfile(userId);
    const restaurantMetrics = await this.getRestaurantMetrics(reservation.restaurantId);

    // Calculate impact
    const isSustainable = restaurantMetrics && 
      restaurantMetrics.overallScore >= profile.preferences.minimumSustainabilityScore;

    const carbonSaved = isSustainable && restaurantMetrics ? 
      this.calculateCarbonSavedPerMeal(restaurantMetrics) : 0;

    const wasteReduced = isSustainable && restaurantMetrics ? 
      this.calculateWasteReducedPerMeal(restaurantMetrics) : 0;

    // Update user impact
    const updatedImpact = {
      ...profile.impact,
      totalDiningEvents: profile.impact.totalDiningEvents + 1,
      sustainableDiningEvents: profile.impact.sustainableDiningEvents + (isSustainable ? 1 : 0),
      carbonFootprintSaved: profile.impact.carbonFootprintSaved + carbonSaved,
      wasteReduced: profile.impact.wasteReduced + wasteReduced,
    };

    if (isSustainable) {
      updatedImpact.localBusinessesSupported = profile.impact.localBusinessesSupported + 1;
      updatedImpact.communityImpactScore = profile.impact.communityImpactScore + 
        (restaurantMetrics?.communityImpact.totalScore || 0);
    }

    // Update streak
    const updatedGoals = { ...profile.goals };
    if (isSustainable) {
      updatedGoals.currentStreak += 1;
      updatedGoals.longestStreak = Math.max(updatedGoals.longestStreak, updatedGoals.currentStreak);
    } else {
      updatedGoals.currentStreak = 0;
    }

    await profile.update({
      impact: updatedImpact,
      goals: updatedGoals,
    });

    // Check for achievements
    await this.checkAndAwardAchievements(userId, profile);

    logInfo('Tracked dining event for sustainability', { 
      userId, 
      reservationId, 
      isSustainable,
      carbonSaved,
      wasteReduced 
    });
  }

  /**
   * Get sustainable restaurant recommendations
   */
  static async getSustainableRecommendations(
    userId: string,
    location?: { latitude: number; longitude: number },
    limit: number = 10
  ): Promise<any[]> {
    const profile = await this.getUserProfile(userId);
    
    const where: any = {};
    
    // Filter by minimum sustainability score
    where['$SustainabilityMetrics.overallScore$'] = {
      [Op.gte]: profile.preferences.minimumSustainabilityScore,
    };

    const restaurants = await Restaurant.findAll({
      where,
      include: [{
        model: SustainabilityMetrics,
        required: true,
      }],
      order: [
        [{ model: SustainabilityMetrics, as: 'SustainabilityMetrics' }, 'overallScore', 'DESC'],
        ['rating', 'DESC'],
      ],
      limit,
    });

    return restaurants.map(restaurant => ({
      ...restaurant.toJSON(),
      sustainabilityHighlights: this.getSustainabilityHighlights(restaurant.SustainabilityMetrics),
      impactPreview: {
        carbonSaved: this.calculateCarbonSavedPerMeal(restaurant.SustainabilityMetrics),
        wasteReduced: this.calculateWasteReducedPerMeal(restaurant.SustainabilityMetrics),
      },
    }));
  }

  /**
   * Get user sustainability insights
   */
  static async getUserInsights(userId: string): Promise<SustainabilityInsights> {
    const profile = await this.getUserProfile(userId);
    
    // Calculate monthly progress
    const monthlyProgress = await this.calculateMonthlyProgress(userId);
    
    // Get recommendations
    const recommendations = await this.getSustainableRecommendations(userId, undefined, 5);
    
    // Get achievements
    const achievements = profile.achievements;
    
    // Generate tips
    const tips = await this.generateSustainabilityTips(profile);

    return {
      userImpact: {
        totalCarbonSaved: profile.impact.carbonFootprintSaved,
        localBusinessesSupported: profile.impact.localBusinessesSupported,
        sustainabilityScore: this.calculateUserSustainabilityScore(profile),
        monthlyProgress,
      },
      recommendations: recommendations.map(r => ({
        restaurantId: r.id,
        name: r.name,
        sustainabilityScore: r.SustainabilityMetrics.overallScore,
        strongPoints: r.sustainabilityHighlights,
      })),
      achievements,
      tips,
    };
  }

  /**
   * Search restaurants by sustainability criteria
   */
  static async searchSustainableRestaurants(filters: {
    minSustainabilityScore?: number;
    certifications?: string[];
    prioritizeLocal?: boolean;
    prioritizeLowCarbon?: boolean;
    location?: { latitude: number; longitude: number };
    radius?: number;
    limit?: number;
  }): Promise<any[]> {
    const where: any = {};
    
    if (filters.minSustainabilityScore) {
      where['$SustainabilityMetrics.overallScore$'] = {
        [Op.gte]: filters.minSustainabilityScore,
      };
    }

    if (filters.certifications && filters.certifications.length > 0) {
      where['$SustainabilityMetrics.certifications$'] = {
        [Op.contains]: filters.certifications.map(cert => ({ name: cert })),
      };
    }

    const orderCriteria: any[] = [];
    
    if (filters.prioritizeLocal) {
      orderCriteria.push([
        { model: SustainabilityMetrics, as: 'SustainabilityMetrics' },
        'localSourcing.totalScore',
        'DESC'
      ]);
    }
    
    if (filters.prioritizeLowCarbon) {
      orderCriteria.push([
        { model: SustainabilityMetrics, as: 'SustainabilityMetrics' },
        'carbonFootprint.totalScore',
        'DESC'
      ]);
    }

    orderCriteria.push([
      { model: SustainabilityMetrics, as: 'SustainabilityMetrics' },
      'overallScore',
      'DESC'
    ]);

    const restaurants = await Restaurant.findAll({
      where,
      include: [{
        model: SustainabilityMetrics,
        required: true,
      }],
      order: orderCriteria,
      limit: filters.limit || 20,
    });

    return restaurants.map(restaurant => ({
      ...restaurant.toJSON(),
      sustainabilityHighlights: this.getSustainabilityHighlights(restaurant.SustainabilityMetrics),
      badges: this.getSustainabilityBadges(restaurant.SustainabilityMetrics),
    }));
  }

  /**
   * Calculate carbon footprint score
   */
  private static calculateCarbonScore(data: any): number {
    let score = 0;
    
    // Renewable energy (40% weight)
    score += (data.renewableEnergyPercent || 0) * 0.4;
    
    // Waste reduction (30% weight)
    score += (data.wasteReduction || 0) * 0.3;
    
    // Transportation impact (20% weight)
    score += (100 - (data.transportationImpact || 100)) * 0.2;
    
    // Energy efficiency (10% weight)
    const energyEfficiency = Math.max(0, 100 - ((data.energyUsage || 1000) / 10));
    score += energyEfficiency * 0.1;
    
    return Math.round(Math.min(100, Math.max(0, score)));
  }

  /**
   * Calculate local sourcing score
   */
  private static calculateLocalSourcingScore(data: any): number {
    let score = 0;
    
    // Local supplier percentage (40% weight)
    score += (data.localSupplierPercent || 0) * 0.4;
    
    // Organic percentage (25% weight)
    score += (data.organicPercent || 0) * 0.25;
    
    // Seasonal menu percentage (25% weight)
    score += (data.seasonalMenuPercent || 0) * 0.25;
    
    // Distance penalty (10% weight)
    const distanceScore = Math.max(0, 100 - ((data.averageSupplierDistance || 100) / 2));
    score += distanceScore * 0.1;
    
    return Math.round(Math.min(100, Math.max(0, score)));
  }

  /**
   * Calculate waste management score
   */
  private static calculateWasteScore(data: any): number {
    let score = 0;
    
    // Food waste reduction (40% weight)
    score += (data.foodWasteReduction || 0) * 0.4;
    
    // Recycling rate (30% weight)
    score += (data.recyclingRate || 0) * 0.3;
    
    // Plastic reduction efforts (20% weight)
    score += (data.plasticReductionEfforts || 0) * 0.2;
    
    // Composting program (10% weight)
    score += (data.compostingProgram ? 100 : 0) * 0.1;
    
    return Math.round(Math.min(100, Math.max(0, score)));
  }

  /**
   * Calculate community impact score
   */
  private static calculateCommunityScore(data: any): number {
    let score = 0;
    
    // Local employment (40% weight)
    score += (data.localEmployment || 0) * 0.4;
    
    // Fair wages practice (30% weight)
    score += (data.fairWagesPractice ? 100 : 0) * 0.3;
    
    // Community partnerships (20% weight)
    const partnershipScore = Math.min(100, (data.communityPartnership || 0) * 10);
    score += partnershipScore * 0.2;
    
    // Charitable contributions (10% weight)
    const charityScore = Math.min(100, (data.charitableContributions || 0) / 100);
    score += charityScore * 0.1;
    
    return Math.round(Math.min(100, Math.max(0, score)));
  }

  /**
   * Calculate carbon saved per meal
   */
  private static calculateCarbonSavedPerMeal(metrics: SustainabilityMetrics): number {
    // Simplified calculation - in production, use more sophisticated models
    const baseCarbon = 5; // kg CO2 per meal average
    const reduction = metrics.carbonFootprint.totalScore / 100;
    return baseCarbon * reduction;
  }

  /**
   * Calculate waste reduced per meal
   */
  private static calculateWasteReducedPerMeal(metrics: SustainabilityMetrics): number {
    // Simplified calculation
    const baseWaste = 0.5; // kg waste per meal average
    const reduction = metrics.wasteManagement.totalScore / 100;
    return baseWaste * reduction;
  }

  /**
   * Get sustainability highlights for a restaurant
   */
  private static getSustainabilityHighlights(metrics: SustainabilityMetrics): string[] {
    const highlights: string[] = [];
    
    if (metrics.carbonFootprint.renewableEnergyPercent > 50) {
      highlights.push(`${metrics.carbonFootprint.renewableEnergyPercent}% renewable energy`);
    }
    
    if (metrics.localSourcing.localSupplierPercent > 70) {
      highlights.push(`${metrics.localSourcing.localSupplierPercent}% local sourcing`);
    }
    
    if (metrics.wasteManagement.compostingProgram) {
      highlights.push('Active composting program');
    }
    
    if (metrics.communityImpact.fairWagesPractice) {
      highlights.push('Fair wage employer');
    }
    
    if (metrics.certifications.length > 0) {
      highlights.push(`${metrics.certifications.length} sustainability certifications`);
    }
    
    return highlights;
  }

  /**
   * Get sustainability badges
   */
  private static getSustainabilityBadges(metrics: SustainabilityMetrics): string[] {
    const badges: string[] = [];
    
    if (metrics.overallScore >= 90) badges.push('Sustainability Champion');
    else if (metrics.overallScore >= 75) badges.push('Eco-Friendly');
    else if (metrics.overallScore >= 60) badges.push('Sustainable Choice');
    
    if (metrics.carbonFootprint.totalScore >= 80) badges.push('Low Carbon');
    if (metrics.localSourcing.totalScore >= 80) badges.push('Local Sourcing');
    if (metrics.wasteManagement.totalScore >= 80) badges.push('Waste Conscious');
    if (metrics.communityImpact.totalScore >= 80) badges.push('Community Partner');
    
    return badges;
  }

  /**
   * Check and award achievements
   */
  private static async checkAndAwardAchievements(
    userId: string,
    profile: UserSustainabilityProfile
  ): Promise<void> {
    const newAchievements: any[] = [];
    
    // First sustainable meal
    if (profile.impact.sustainableDiningEvents === 1) {
      newAchievements.push({
        id: 'first_sustainable_meal',
        name: 'Eco Beginner',
        description: 'Had your first sustainable dining experience',
        earnedAt: new Date(),
        category: 'milestone',
      });
    }
    
    // Streak achievements
    if (profile.goals.currentStreak === 5) {
      newAchievements.push({
        id: 'streak_5',
        name: 'Consistency Champion',
        description: '5 sustainable meals in a row',
        earnedAt: new Date(),
        category: 'streak',
      });
    }
    
    // Carbon savings milestones
    if (profile.impact.carbonFootprintSaved >= 50 && 
        !profile.achievements.some(a => a.id === 'carbon_50kg')) {
      newAchievements.push({
        id: 'carbon_50kg',
        name: 'Carbon Saver',
        description: 'Saved 50kg of CO2 through sustainable dining',
        earnedAt: new Date(),
        category: 'carbon',
      });
    }
    
    if (newAchievements.length > 0) {
      await profile.update({
        achievements: [...profile.achievements, ...newAchievements],
      });
      
      // Send notifications
      for (const achievement of newAchievements) {
        await NotificationService.sendNotification(userId, {
          type: 'SUSTAINABILITY_ACHIEVEMENT',
          title: `Achievement Unlocked: ${achievement.name}`,
          message: achievement.description,
          data: { achievement },
        });
      }
    }
  }

  /**
   * Calculate user sustainability score
   */
  private static calculateUserSustainabilityScore(profile: UserSustainabilityProfile): number {
    if (profile.impact.totalDiningEvents === 0) return 0;
    
    const sustainablePercentage = 
      (profile.impact.sustainableDiningEvents / profile.impact.totalDiningEvents) * 100;
    
    return Math.round(sustainablePercentage);
  }

  /**
   * Calculate monthly progress
   */
  private static async calculateMonthlyProgress(userId: string): Promise<any[]> {
    // This would query actual reservation data - simplified for demo
    const months = [];
    const now = new Date();
    
    for (let i = 5; i >= 0; i--) {
      const month = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({
        month: month.toISOString().slice(0, 7),
        sustainablePercentage: Math.floor(Math.random() * 40) + 40, // Mock data
        carbonSaved: Math.floor(Math.random() * 10) + 5,
        localSupported: Math.floor(Math.random() * 5) + 2,
      });
    }
    
    return months;
  }

  /**
   * Generate sustainability tips
   */
  private static async generateSustainabilityTips(profile: UserSustainabilityProfile): Promise<string[]> {
    const tips = [
      'Look for restaurants with local sourcing to reduce transportation emissions',
      'Choose places with composting programs to minimize food waste',
      'Support restaurants that use renewable energy sources',
      'Try plant-based options to reduce your carbon footprint',
      'Visit restaurants within walking or biking distance when possible',
    ];
    
    // Personalize based on user's weak areas
    const sustainabilityRate = profile.impact.totalDiningEvents > 0 ? 
      (profile.impact.sustainableDiningEvents / profile.impact.totalDiningEvents) : 0;
    
    if (sustainabilityRate < 0.3) {
      tips.unshift('Set a goal to choose sustainable restaurants for 30% of your dining');
    }
    
    return tips.slice(0, 3);
  }

  /**
   * Notify users of sustainability updates
   */
  private static async notifyUsersOfSustainabilityUpdate(
    restaurantId: string,
    newScore: number
  ): Promise<void> {
    // Find users who have this restaurant in their favorites and want notifications
    const profiles = await UserSustainabilityProfile.findAll({
      where: {
        'insights.favoriteEcoFriendlyRestaurants': {
          [Op.contains]: [restaurantId],
        },
        'notifications.newSustainableRestaurants': true,
      },
    });

    const restaurant = await Restaurant.findByPk(restaurantId, {
      attributes: ['name'],
    });

    if (restaurant && profiles.length > 0) {
      await Promise.all(
        profiles.map(profile =>
          NotificationService.sendNotification(profile.userId, {
            type: 'SUSTAINABILITY_UPDATE',
            title: 'Sustainability Update',
            message: `${restaurant.name} updated their sustainability score to ${newScore}/100`,
            data: { restaurantId, newScore },
          })
        )
      );
    }
  }
}
