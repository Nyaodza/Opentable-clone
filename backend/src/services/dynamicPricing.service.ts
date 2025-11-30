import { Restaurant } from '../models/Restaurant';
import { Reservation } from '../models/Reservation';
import { sequelize } from '../config/database';
import { Op, QueryTypes } from 'sequelize';
import Redis from 'ioredis';
import { logger } from '../utils/logger';
import * as ml from 'ml-regression';
import { Queue } from 'bull';

interface PricingRule {
  id: string;
  restaurantId: number;
  name: string;
  type: 'surge' | 'discount' | 'dynamic' | 'seasonal' | 'event';
  priority: number;
  conditions: PricingCondition[];
  adjustment: PricingAdjustment;
  isActive: boolean;
  validFrom?: Date;
  validUntil?: Date;
  metadata?: Record<string, any>;
}

interface PricingCondition {
  type: 'time' | 'occupancy' | 'demand' | 'weather' | 'event' | 'day' | 'season';
  operator: 'equals' | 'greater' | 'less' | 'between' | 'in';
  value: any;
  weight?: number;
}

interface PricingAdjustment {
  type: 'percentage' | 'fixed' | 'multiplier';
  value: number;
  minimum?: number;
  maximum?: number;
  roundTo?: number;
}

interface DemandMetrics {
  restaurantId: number;
  timestamp: Date;
  occupancyRate: number;
  reservationVelocity: number; // Reservations per hour
  searchVolume: number;
  cancellationRate: number;
  walkInRate: number;
  averagePartySize: number;
  peakHourMultiplier: number;
}

interface PricePoint {
  restaurantId: number;
  dateTime: Date;
  basePrice: number;
  adjustedPrice: number;
  demandScore: number;
  appliedRules: string[];
  factors: {
    timeOfDay: number;
    dayOfWeek: number;
    occupancy: number;
    seasonality: number;
    competition: number;
    weather: number;
    events: number;
  };
}

interface CompetitorPricing {
  restaurantId: number;
  competitors: {
    id: number;
    name: string;
    distance: number; // km
    cuisine: string;
    pricePoint: number;
    occupancy: number;
  }[];
  marketAverage: number;
  marketPosition: 'below' | 'at' | 'above';
  recommendedAdjustment: number;
}

export class DynamicPricingService {
  private redis: Redis;
  private pricingQueue: Queue;
  private priceCache: Map<string, PricePoint> = new Map();
  private demandModel: any; // ML model for demand prediction

  constructor() {
    this.redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
    this.pricingQueue = new Queue('dynamic-pricing', {
      redis: process.env.REDIS_URL || 'redis://localhost:6379',
    });

    this.initializePricingEngine();
    this.setupQueueProcessors();
  }

  private async initializePricingEngine(): Promise<void> {
    // Load or train demand prediction model
    await this.trainDemandModel();

    // Schedule regular price updates
    setInterval(() => this.updateAllPrices(), 15 * 60 * 1000); // Every 15 minutes
  }

  private setupQueueProcessors(): void {
    this.pricingQueue.process('update-price', async (job) => {
      const { restaurantId, dateTime } = job.data;
      await this.calculatePrice(restaurantId, dateTime);
    });

    this.pricingQueue.process('analyze-demand', async (job) => {
      const { restaurantId } = job.data;
      await this.analyzeDemand(restaurantId);
    });
  }

  // Main Pricing Calculation
  async calculatePrice(
    restaurantId: number,
    dateTime: Date,
    partySize?: number
  ): Promise<PricePoint> {
    const cacheKey = `price:${restaurantId}:${dateTime.toISOString()}:${partySize || 'any'}`;

    // Check cache
    const cached = this.priceCache.get(cacheKey);
    if (cached && this.isCacheValid(cached)) {
      return cached;
    }

    // Get base pricing
    const restaurant = await Restaurant.findByPk(restaurantId);
    if (!restaurant) throw new Error('Restaurant not found');

    const basePrice = await this.getBasePrice(restaurant, dateTime, partySize);

    // Calculate demand metrics
    const demand = await this.calculateDemandMetrics(restaurantId, dateTime);

    // Get applicable pricing rules
    const rules = await this.getApplicablePricingRules(restaurantId, dateTime);

    // Calculate factors
    const factors = await this.calculatePricingFactors(restaurantId, dateTime, demand);

    // Apply adjustments
    let adjustedPrice = basePrice;
    const appliedRules: string[] = [];

    for (const rule of rules) {
      if (await this.evaluateRule(rule, demand, factors)) {
        adjustedPrice = this.applyAdjustment(adjustedPrice, rule.adjustment);
        appliedRules.push(rule.name);
      }
    }

    // Apply ML-based demand pricing
    const demandMultiplier = await this.getDemandMultiplier(demand);
    adjustedPrice *= demandMultiplier;

    // Apply constraints
    adjustedPrice = this.applyPriceConstraints(adjustedPrice, basePrice, restaurant);

    const pricePoint: PricePoint = {
      restaurantId,
      dateTime,
      basePrice,
      adjustedPrice: Math.round(adjustedPrice * 100) / 100,
      demandScore: demand.reservationVelocity * demand.occupancyRate,
      appliedRules,
      factors,
    };

    // Cache the result
    this.priceCache.set(cacheKey, pricePoint);
    await this.redis.set(cacheKey, JSON.stringify(pricePoint), 'EX', 900); // 15 min cache

    // Log pricing decision
    await this.logPricingDecision(pricePoint);

    return pricePoint;
  }

  private async getBasePrice(
    restaurant: any,
    dateTime: Date,
    partySize?: number
  ): Promise<number> {
    // Base price can vary by:
    // - Time of day (lunch vs dinner)
    // - Day of week
    // - Party size
    // - Season

    let basePrice = restaurant.averagePrice || 50;

    const hour = dateTime.getHours();
    const dayOfWeek = dateTime.getDay();

    // Time-based pricing
    if (hour >= 17 && hour <= 21) {
      basePrice *= 1.2; // Dinner premium
    } else if (hour >= 11 && hour <= 14) {
      basePrice *= 0.9; // Lunch discount
    }

    // Weekend pricing
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      basePrice *= 1.15;
    }

    // Party size pricing
    if (partySize) {
      if (partySize >= 6) {
        basePrice *= 1.1; // Large party premium
      } else if (partySize === 1) {
        basePrice *= 0.95; // Solo diner discount
      }
    }

    return basePrice;
  }

  private async calculateDemandMetrics(
    restaurantId: number,
    dateTime: Date
  ): Promise<DemandMetrics> {
    const startDate = new Date(dateTime);
    startDate.setHours(startDate.getHours() - 24);

    // Get recent reservation data
    const recentReservations = await Reservation.count({
      where: {
        restaurantId,
        createdAt: { [Op.gte]: startDate },
      },
    });

    // Calculate occupancy
    const totalTables = await sequelize.query(
      `SELECT COUNT(*) as total FROM tables WHERE restaurant_id = :restaurantId`,
      {
        replacements: { restaurantId },
        type: QueryTypes.SELECT,
      }
    );

    const occupiedTables = await Reservation.count({
      where: {
        restaurantId,
        dateTime: {
          [Op.between]: [
            new Date(dateTime.getTime() - 2 * 60 * 60 * 1000),
            new Date(dateTime.getTime() + 2 * 60 * 60 * 1000),
          ],
        },
        status: ['confirmed', 'seated'],
      },
    });

    const occupancyRate = (occupiedTables / (totalTables[0] as any).total) || 0;

    // Calculate reservation velocity
    const reservationVelocity = recentReservations / 24; // per hour

    // Get search volume from Redis
    const searchVolume = await this.getSearchVolume(restaurantId);

    // Calculate cancellation rate
    const cancellations = await Reservation.count({
      where: {
        restaurantId,
        status: 'cancelled',
        updatedAt: { [Op.gte]: startDate },
      },
    });

    const cancellationRate = recentReservations > 0
      ? cancellations / recentReservations
      : 0;

    // Estimate walk-in rate
    const walkInRate = await this.estimateWalkInRate(restaurantId, dateTime);

    // Calculate average party size
    const avgPartySize = await Reservation.findOne({
      attributes: [[sequelize.fn('AVG', sequelize.col('party_size')), 'avg']],
      where: {
        restaurantId,
        dateTime: { [Op.gte]: startDate },
      },
    });

    // Peak hour multiplier
    const hour = dateTime.getHours();
    const peakHourMultiplier = this.getPeakHourMultiplier(hour);

    return {
      restaurantId,
      timestamp: new Date(),
      occupancyRate,
      reservationVelocity,
      searchVolume,
      cancellationRate,
      walkInRate,
      averagePartySize: (avgPartySize as any)?.dataValues?.avg || 2,
      peakHourMultiplier,
    };
  }

  private async calculatePricingFactors(
    restaurantId: number,
    dateTime: Date,
    demand: DemandMetrics
  ): Promise<PricePoint['factors']> {
    const factors: PricePoint['factors'] = {
      timeOfDay: this.getTimeOfDayFactor(dateTime),
      dayOfWeek: this.getDayOfWeekFactor(dateTime),
      occupancy: demand.occupancyRate,
      seasonality: await this.getSeasonalityFactor(dateTime),
      competition: await this.getCompetitionFactor(restaurantId),
      weather: await this.getWeatherFactor(dateTime),
      events: await this.getEventsFactor(restaurantId, dateTime),
    };

    return factors;
  }

  private getTimeOfDayFactor(dateTime: Date): number {
    const hour = dateTime.getHours();

    // Peak dinner time (6-9 PM)
    if (hour >= 18 && hour <= 21) return 1.3;
    // Late dinner (9-11 PM)
    if (hour >= 21 && hour <= 23) return 1.1;
    // Lunch time (12-2 PM)
    if (hour >= 12 && hour <= 14) return 1.15;
    // Early bird (5-6 PM)
    if (hour >= 17 && hour < 18) return 0.9;
    // Off-peak
    return 0.8;
  }

  private getDayOfWeekFactor(dateTime: Date): number {
    const day = dateTime.getDay();

    // Friday & Saturday
    if (day === 5 || day === 6) return 1.25;
    // Sunday
    if (day === 0) return 1.1;
    // Thursday
    if (day === 4) return 1.05;
    // Monday-Wednesday
    return 0.95;
  }

  private async getSeasonalityFactor(dateTime: Date): Promise<number> {
    const month = dateTime.getMonth();

    // Holiday season (November-December)
    if (month === 10 || month === 11) return 1.3;
    // Summer (June-August)
    if (month >= 5 && month <= 7) return 1.15;
    // Valentine's/Mother's Day season
    if (month === 1 || month === 4) return 1.2;
    // Regular season
    return 1.0;
  }

  private async getCompetitionFactor(restaurantId: number): Promise<number> {
    const competitors = await this.getCompetitorPricing(restaurantId);

    if (competitors.marketPosition === 'below') return 0.95;
    if (competitors.marketPosition === 'above') return 1.05;
    return 1.0;
  }

  private async getWeatherFactor(dateTime: Date): Promise<number> {
    // Integrate with weather API
    // For now, return neutral factor
    return 1.0;
  }

  private async getEventsFactor(restaurantId: number, dateTime: Date): Promise<number> {
    // Check for nearby events that might affect demand
    const events = await this.getNearbyEvents(restaurantId, dateTime);

    if (events.length > 0) {
      const majorEvent = events.some(e => e.attendance > 10000);
      if (majorEvent) return 1.4;
      return 1.2;
    }

    return 1.0;
  }

  private getPeakHourMultiplier(hour: number): number {
    if (hour >= 18 && hour <= 21) return 1.5;
    if (hour >= 12 && hour <= 14) return 1.2;
    if (hour >= 11 && hour < 12) return 1.1;
    if (hour >= 21 && hour <= 22) return 1.1;
    return 1.0;
  }

  // Competitor Analysis
  async getCompetitorPricing(restaurantId: number): Promise<CompetitorPricing> {
    const restaurant = await Restaurant.findByPk(restaurantId);
    if (!restaurant) throw new Error('Restaurant not found');

    // Find nearby competitors
    const competitors = await sequelize.query(
      `SELECT r.*,
        (6371 * acos(cos(radians(:lat)) * cos(radians(r.latitude)) *
        cos(radians(r.longitude) - radians(:lng)) +
        sin(radians(:lat)) * sin(radians(r.latitude)))) AS distance
       FROM restaurants r
       WHERE r.id != :restaurantId
       AND r.cuisine = :cuisine
       HAVING distance <= 5
       ORDER BY distance
       LIMIT 10`,
      {
        replacements: {
          restaurantId,
          lat: restaurant.latitude,
          lng: restaurant.longitude,
          cuisine: restaurant.cuisine,
        },
        type: QueryTypes.SELECT,
      }
    );

    const competitorData = competitors.map((c: any) => ({
      id: c.id,
      name: c.name,
      distance: c.distance,
      cuisine: c.cuisine,
      pricePoint: c.average_price || 50,
      occupancy: Math.random() * 100, // Would fetch real occupancy
    }));

    const marketAverage = competitorData.reduce((sum, c) => sum + c.pricePoint, 0) /
      competitorData.length;

    const restaurantPrice = restaurant.averagePrice || 50;
    let marketPosition: 'below' | 'at' | 'above' = 'at';

    if (restaurantPrice < marketAverage * 0.9) marketPosition = 'below';
    else if (restaurantPrice > marketAverage * 1.1) marketPosition = 'above';

    const recommendedAdjustment = (marketAverage - restaurantPrice) / restaurantPrice;

    return {
      restaurantId,
      competitors: competitorData,
      marketAverage,
      marketPosition,
      recommendedAdjustment,
    };
  }

  // Rule Evaluation
  private async getApplicablePricingRules(
    restaurantId: number,
    dateTime: Date
  ): Promise<PricingRule[]> {
    const rulesKey = `pricing:rules:${restaurantId}`;
    const rulesData = await this.redis.get(rulesKey);

    let rules: PricingRule[] = [];

    if (rulesData) {
      rules = JSON.parse(rulesData);
    } else {
      // Load default rules
      rules = this.getDefaultPricingRules(restaurantId);
      await this.redis.set(rulesKey, JSON.stringify(rules), 'EX', 3600);
    }

    // Filter active and valid rules
    const now = new Date();
    return rules.filter(rule =>
      rule.isActive &&
      (!rule.validFrom || rule.validFrom <= now) &&
      (!rule.validUntil || rule.validUntil >= now)
    ).sort((a, b) => b.priority - a.priority);
  }

  private getDefaultPricingRules(restaurantId: number): PricingRule[] {
    return [
      {
        id: 'surge-high-demand',
        restaurantId,
        name: 'High Demand Surge',
        type: 'surge',
        priority: 10,
        conditions: [
          { type: 'occupancy', operator: 'greater', value: 80 },
          { type: 'demand', operator: 'greater', value: 0.7 },
        ],
        adjustment: { type: 'percentage', value: 25, maximum: 50 },
        isActive: true,
      },
      {
        id: 'early-bird-discount',
        restaurantId,
        name: 'Early Bird Special',
        type: 'discount',
        priority: 5,
        conditions: [
          { type: 'time', operator: 'between', value: [17, 18] },
          { type: 'occupancy', operator: 'less', value: 40 },
        ],
        adjustment: { type: 'percentage', value: -15 },
        isActive: true,
      },
      {
        id: 'last-minute-discount',
        restaurantId,
        name: 'Last Minute Deal',
        type: 'discount',
        priority: 8,
        conditions: [
          { type: 'time', operator: 'less', value: 2 }, // Within 2 hours
          { type: 'occupancy', operator: 'less', value: 60 },
        ],
        adjustment: { type: 'percentage', value: -20 },
        isActive: true,
      },
    ];
  }

  private async evaluateRule(
    rule: PricingRule,
    demand: DemandMetrics,
    factors: PricePoint['factors']
  ): Promise<boolean> {
    for (const condition of rule.conditions) {
      if (!await this.evaluateCondition(condition, demand, factors)) {
        return false;
      }
    }
    return true;
  }

  private async evaluateCondition(
    condition: PricingCondition,
    demand: DemandMetrics,
    factors: PricePoint['factors']
  ): Promise<boolean> {
    let value: any;

    switch (condition.type) {
      case 'occupancy':
        value = demand.occupancyRate;
        break;
      case 'demand':
        value = demand.reservationVelocity;
        break;
      case 'time':
        value = new Date().getHours();
        break;
      default:
        return false;
    }

    switch (condition.operator) {
      case 'equals':
        return value === condition.value;
      case 'greater':
        return value > condition.value;
      case 'less':
        return value < condition.value;
      case 'between':
        return value >= condition.value[0] && value <= condition.value[1];
      case 'in':
        return condition.value.includes(value);
      default:
        return false;
    }
  }

  private applyAdjustment(price: number, adjustment: PricingAdjustment): number {
    let adjusted = price;

    switch (adjustment.type) {
      case 'percentage':
        adjusted = price * (1 + adjustment.value / 100);
        break;
      case 'fixed':
        adjusted = price + adjustment.value;
        break;
      case 'multiplier':
        adjusted = price * adjustment.value;
        break;
    }

    if (adjustment.minimum !== undefined && adjusted < adjustment.minimum) {
      adjusted = adjustment.minimum;
    }
    if (adjustment.maximum !== undefined && adjusted > adjustment.maximum) {
      adjusted = adjustment.maximum;
    }
    if (adjustment.roundTo !== undefined) {
      adjusted = Math.round(adjusted / adjustment.roundTo) * adjustment.roundTo;
    }

    return adjusted;
  }

  // Machine Learning
  private async trainDemandModel(): Promise<void> {
    // Fetch historical data
    const historicalData = await this.fetchHistoricalDemandData();

    if (historicalData.length < 100) {
      logger.warn('Insufficient data for ML model training');
      return;
    }

    // Prepare training data
    const X = historicalData.map(d => [
      d.hour,
      d.dayOfWeek,
      d.occupancyRate,
      d.searchVolume,
      d.temperature,
      d.isHoliday ? 1 : 0,
    ]);

    const y = historicalData.map(d => d.actualDemand);

    // Train linear regression model
    this.demandModel = new ml.MultivariateLinearRegression(X, y);

    logger.info('Demand prediction model trained successfully');
  }

  private async getDemandMultiplier(demand: DemandMetrics): Promise<number> {
    if (!this.demandModel) return 1.0;

    // Predict demand score
    const features = [
      new Date().getHours(),
      new Date().getDay(),
      demand.occupancyRate,
      demand.searchVolume,
      20, // Default temperature
      0, // Not holiday
    ];

    const predictedDemand = this.demandModel.predict([features])[0];

    // Convert to multiplier (0.8 to 1.5)
    return Math.min(1.5, Math.max(0.8, predictedDemand / 100));
  }

  private async fetchHistoricalDemandData(): Promise<any[]> {
    // Fetch from database
    const data = await sequelize.query(
      `SELECT
        EXTRACT(HOUR FROM date_time) as hour,
        EXTRACT(DOW FROM date_time) as day_of_week,
        COUNT(*) as reservations,
        AVG(party_size) as avg_party_size
       FROM reservations
       WHERE created_at >= NOW() - INTERVAL '90 days'
       GROUP BY hour, day_of_week`,
      { type: QueryTypes.SELECT }
    );

    return data.map((d: any) => ({
      hour: d.hour,
      dayOfWeek: d.day_of_week,
      occupancyRate: Math.random() * 100, // Would calculate real occupancy
      searchVolume: Math.random() * 1000,
      temperature: 20 + Math.random() * 10,
      isHoliday: false,
      actualDemand: d.reservations,
    }));
  }

  // Helper Methods
  private applyPriceConstraints(
    price: number,
    basePrice: number,
    restaurant: any
  ): number {
    // Maximum surge: 2x base price
    const maxPrice = basePrice * 2;
    // Minimum discount: 0.5x base price
    const minPrice = basePrice * 0.5;

    return Math.min(maxPrice, Math.max(minPrice, price));
  }

  private isCacheValid(pricePoint: PricePoint): boolean {
    const age = Date.now() - pricePoint.dateTime.getTime();
    return age < 15 * 60 * 1000; // 15 minutes
  }

  private async getSearchVolume(restaurantId: number): Promise<number> {
    const searches = await this.redis.get(`search:volume:${restaurantId}`);
    return searches ? parseInt(searches) : 0;
  }

  private async estimateWalkInRate(restaurantId: number, dateTime: Date): Promise<number> {
    // Estimate based on historical walk-ins
    return Math.random() * 0.3; // 0-30% walk-in rate
  }

  private async getNearbyEvents(restaurantId: number, dateTime: Date): Promise<any[]> {
    // Would integrate with events API
    return [];
  }

  private async logPricingDecision(pricePoint: PricePoint): Promise<void> {
    await this.redis.lpush(
      `pricing:history:${pricePoint.restaurantId}`,
      JSON.stringify(pricePoint)
    );

    // Keep only last 1000 decisions
    await this.redis.ltrim(`pricing:history:${pricePoint.restaurantId}`, 0, 999);
  }

  private async updateAllPrices(): Promise<void> {
    const restaurants = await Restaurant.findAll({ where: { isActive: true } });

    for (const restaurant of restaurants) {
      await this.pricingQueue.add('update-price', {
        restaurantId: restaurant.id,
        dateTime: new Date(),
      });
    }
  }
}

export default new DynamicPricingService();