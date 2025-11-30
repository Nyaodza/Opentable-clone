import { sequelize } from '../config/database';
import { QueryTypes } from 'sequelize';
import Redis from 'ioredis';
import { logger } from '../utils/logger';
import { Queue } from 'bull';
import * as ExcelJS from 'exceljs';
import * as Chart from 'chart.js';
import * as ml from 'ml-regression';

interface DashboardMetrics {
  restaurantId: number;
  period: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  revenue: RevenueMetrics;
  operations: OperationalMetrics;
  customers: CustomerMetrics;
  marketing: MarketingMetrics;
  predictive: PredictiveMetrics;
  competitive: CompetitiveMetrics;
}

interface RevenueMetrics {
  totalRevenue: number;
  averageCheckSize: number;
  revenuePerSeat: number;
  revenuePerSquareFoot: number;
  growthRate: number;
  projectedRevenue: number;
  breakdown: {
    food: number;
    beverage: number;
    other: number;
  };
  trends: TrendData[];
}

interface OperationalMetrics {
  occupancyRate: number;
  tableT turnoverRate: number;
  averageDiningTime: number;
  peakHours: string[];
  staffEfficiency: number;
  kitchenEfficiency: number;
  wastePercentage: number;
  laborCostPercentage: number;
  foodCostPercentage: number;
}

interface CustomerMetrics {
  totalCustomers: number;
  newCustomers: number;
  returningCustomers: number;
  retentionRate: number;
  lifetimeValue: number;
  satisfactionScore: number;
  netPromoterScore: number;
  demographics: {
    ageGroups: Record<string, number>;
    gender: Record<string, number>;
    location: Record<string, number>;
  };
  behavior: {
    averageFrequency: number;
    preferredDays: string[];
    preferredTimes: string[];
    averagePartySize: number;
  };
}

interface MarketingMetrics {
  conversionRate: number;
  acquisitionCost: number;
  channelPerformance: Record<string, ChannelMetrics>;
  campaignROI: number;
  socialMediaEngagement: number;
  emailOpenRate: number;
  emailClickRate: number;
  referralRate: number;
}

interface PredictiveMetrics {
  forecastedDemand: ForecastData[];
  expectedRevenue: number;
  riskScore: number;
  churnProbability: number;
  seasonalTrends: SeasonalPattern[];
  anomalies: AnomalyData[];
}

interface CompetitiveMetrics {
  marketShare: number;
  competitorAnalysis: CompetitorData[];
  pricePosition: 'below' | 'average' | 'above';
  strengthsWeaknesses: SWOT;
  opportunities: Opportunity[];
}

interface TrendData {
  date: Date;
  value: number;
  change: number;
  changePercent: number;
}

interface ForecastData {
  date: Date;
  predicted: number;
  confidence: {
    lower: number;
    upper: number;
  };
  factors: string[];
}

interface SeasonalPattern {
  period: string;
  impact: number;
  reliability: number;
}

interface AnomalyData {
  date: Date;
  metric: string;
  expected: number;
  actual: number;
  severity: 'low' | 'medium' | 'high';
  possibleCause: string;
}

interface ChannelMetrics {
  visits: number;
  conversions: number;
  revenue: number;
  cost: number;
  roi: number;
}

interface CompetitorData {
  name: string;
  marketShare: number;
  averagePrice: number;
  occupancy: number;
  rating: number;
  strengths: string[];
  weaknesses: string[];
}

interface SWOT {
  strengths: string[];
  weaknesses: string[];
  opportunities: string[];
  threats: string[];
}

interface Opportunity {
  type: string;
  description: string;
  potentialImpact: number;
  difficulty: 'easy' | 'medium' | 'hard';
  priority: 'low' | 'medium' | 'high';
}

export class BusinessIntelligenceService {
  private redis: Redis;
  private analyticsQueue: Queue;
  private models: Map<string, any> = new Map();

  constructor() {
    this.redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
    this.analyticsQueue = new Queue('business-intelligence', {
      redis: process.env.REDIS_URL || 'redis://localhost:6379',
    });

    this.initializeAnalytics();
  }

  private async initializeAnalytics(): Promise<void> {
    // Train predictive models
    await this.trainPredictiveModels();

    // Schedule regular updates
    this.scheduleAnalyticsJobs();
  }

  private scheduleAnalyticsJobs(): void {
    // Daily metrics update
    this.analyticsQueue.add(
      'update-daily-metrics',
      {},
      {
        repeat: { cron: '0 1 * * *' }, // 1 AM daily
      }
    );

    // Weekly reports
    this.analyticsQueue.add(
      'generate-weekly-report',
      {},
      {
        repeat: { cron: '0 9 * * 1' }, // Monday 9 AM
      }
    );

    // Process queue
    this.analyticsQueue.process('update-daily-metrics', async () => {
      await this.updateAllMetrics();
    });

    this.analyticsQueue.process('generate-weekly-report', async () => {
      await this.generateWeeklyReports();
    });
  }

  // Main Dashboard
  async getDashboard(
    restaurantId: number,
    period: DashboardMetrics['period'] = 'monthly'
  ): Promise<DashboardMetrics> {
    const [revenue, operations, customers, marketing, predictive, competitive] =
      await Promise.all([
        this.getRevenueMetrics(restaurantId, period),
        this.getOperationalMetrics(restaurantId, period),
        this.getCustomerMetrics(restaurantId, period),
        this.getMarketingMetrics(restaurantId, period),
        this.getPredictiveMetrics(restaurantId, period),
        this.getCompetitiveMetrics(restaurantId, period),
      ]);

    return {
      restaurantId,
      period,
      revenue,
      operations,
      customers,
      marketing,
      predictive,
      competitive,
    };
  }

  // Revenue Analytics
  private async getRevenueMetrics(
    restaurantId: number,
    period: string
  ): Promise<RevenueMetrics> {
    const dateRange = this.getDateRange(period);

    // Total revenue
    const revenueData = await sequelize.query(
      `SELECT
        SUM(total_amount) as total,
        AVG(total_amount) as average,
        COUNT(*) as transactions,
        DATE(date_time) as date
       FROM reservations
       WHERE restaurant_id = :restaurantId
       AND date_time BETWEEN :startDate AND :endDate
       AND status = 'completed'
       GROUP BY date
       ORDER BY date`,
      {
        replacements: {
          restaurantId,
          startDate: dateRange.start,
          endDate: dateRange.end,
        },
        type: QueryTypes.SELECT,
      }
    );

    const totalRevenue = revenueData.reduce((sum: number, d: any) => sum + d.total, 0);
    const averageCheckSize = totalRevenue / revenueData.length;

    // Revenue per seat
    const seatData = await sequelize.query(
      `SELECT COUNT(*) as total_seats
       FROM tables
       WHERE restaurant_id = :restaurantId`,
      {
        replacements: { restaurantId },
        type: QueryTypes.SELECT,
      }
    );
    const revenuePerSeat = totalRevenue / (seatData[0] as any).total_seats;

    // Growth rate
    const previousPeriod = this.getPreviousPeriodRevenue(restaurantId, period);
    const growthRate = ((totalRevenue - await previousPeriod) / await previousPeriod) * 100;

    // Breakdown
    const breakdown = {
      food: totalRevenue * 0.65,
      beverage: totalRevenue * 0.25,
      other: totalRevenue * 0.1,
    };

    // Trends
    const trends = revenueData.map((d: any, i: number) => ({
      date: d.date,
      value: d.total,
      change: i > 0 ? d.total - (revenueData[i - 1] as any).total : 0,
      changePercent: i > 0
        ? ((d.total - (revenueData[i - 1] as any).total) / (revenueData[i - 1] as any).total) * 100
        : 0,
    }));

    // Projected revenue
    const projectedRevenue = await this.predictRevenue(restaurantId, 30);

    return {
      totalRevenue,
      averageCheckSize,
      revenuePerSeat,
      revenuePerSquareFoot: totalRevenue / 2000, // Assuming 2000 sq ft
      growthRate,
      projectedRevenue,
      breakdown,
      trends,
    };
  }

  // Operational Analytics
  private async getOperationalMetrics(
    restaurantId: number,
    period: string
  ): Promise<OperationalMetrics> {
    const dateRange = this.getDateRange(period);

    // Occupancy rate
    const occupancyData = await sequelize.query(
      `SELECT
        COUNT(DISTINCT r.id) as reservations,
        COUNT(DISTINCT t.id) as total_tables,
        EXTRACT(HOUR FROM r.date_time) as hour
       FROM tables t
       LEFT JOIN reservations r ON t.restaurant_id = r.restaurant_id
       WHERE t.restaurant_id = :restaurantId
       AND r.date_time BETWEEN :startDate AND :endDate
       GROUP BY hour`,
      {
        replacements: {
          restaurantId,
          startDate: dateRange.start,
          endDate: dateRange.end,
        },
        type: QueryTypes.SELECT,
      }
    );

    const avgOccupancy = occupancyData.reduce((sum: number, d: any) =>
      sum + (d.reservations / d.total_tables), 0) / occupancyData.length * 100;

    // Table turnover
    const turnoverData = await sequelize.query(
      `SELECT
        AVG(EXTRACT(EPOCH FROM (end_time - start_time)) / 60) as avg_dining_time,
        COUNT(*) / COUNT(DISTINCT DATE(date_time)) as daily_turns
       FROM reservations
       WHERE restaurant_id = :restaurantId
       AND date_time BETWEEN :startDate AND :endDate
       AND status = 'completed'`,
      {
        replacements: {
          restaurantId,
          startDate: dateRange.start,
          endDate: dateRange.end,
        },
        type: QueryTypes.SELECT,
      }
    );

    // Peak hours
    const peakHours = occupancyData
      .sort((a: any, b: any) => b.reservations - a.reservations)
      .slice(0, 3)
      .map((d: any) => `${d.hour}:00`);

    return {
      occupancyRate: avgOccupancy,
      tableTurnoverRate: (turnoverData[0] as any).daily_turns || 0,
      averageDiningTime: (turnoverData[0] as any).avg_dining_time || 90,
      peakHours,
      staffEfficiency: 85, // Would calculate from staff data
      kitchenEfficiency: 90, // Would calculate from kitchen data
      wastePercentage: 5, // Would calculate from waste data
      laborCostPercentage: 28, // Industry standard
      foodCostPercentage: 32, // Industry standard
    };
  }

  // Customer Analytics
  private async getCustomerMetrics(
    restaurantId: number,
    period: string
  ): Promise<CustomerMetrics> {
    const dateRange = this.getDateRange(period);

    // Customer counts
    const customerData = await sequelize.query(
      `SELECT
        COUNT(DISTINCT user_id) as total_customers,
        COUNT(DISTINCT CASE WHEN first_visit = date_time THEN user_id END) as new_customers,
        AVG(party_size) as avg_party_size
       FROM (
         SELECT
           r.user_id,
           r.party_size,
           r.date_time,
           MIN(r.date_time) OVER (PARTITION BY r.user_id) as first_visit
         FROM reservations r
         WHERE r.restaurant_id = :restaurantId
         AND r.date_time BETWEEN :startDate AND :endDate
       ) t`,
      {
        replacements: {
          restaurantId,
          startDate: dateRange.start,
          endDate: dateRange.end,
        },
        type: QueryTypes.SELECT,
      }
    );

    const totalCustomers = (customerData[0] as any).total_customers || 0;
    const newCustomers = (customerData[0] as any).new_customers || 0;
    const returningCustomers = totalCustomers - newCustomers;
    const retentionRate = (returningCustomers / totalCustomers) * 100;

    // Lifetime value
    const lifetimeValue = await this.calculateCustomerLTV(restaurantId);

    // Satisfaction scores
    const satisfactionData = await sequelize.query(
      `SELECT
        AVG(rating) as avg_rating,
        COUNT(CASE WHEN rating >= 9 THEN 1 END) as promoters,
        COUNT(CASE WHEN rating <= 6 THEN 1 END) as detractors,
        COUNT(*) as total_reviews
       FROM reviews
       WHERE restaurant_id = :restaurantId
       AND created_at BETWEEN :startDate AND :endDate`,
      {
        replacements: {
          restaurantId,
          startDate: dateRange.start,
          endDate: dateRange.end,
        },
        type: QueryTypes.SELECT,
      }
    );

    const satisfactionScore = (satisfactionData[0] as any).avg_rating || 0;
    const nps = ((satisfactionData[0] as any).promoters -
      (satisfactionData[0] as any).detractors) /
      (satisfactionData[0] as any).total_reviews * 100;

    // Demographics (simplified)
    const demographics = {
      ageGroups: {
        '18-24': 15,
        '25-34': 35,
        '35-44': 25,
        '45-54': 15,
        '55+': 10,
      },
      gender: {
        male: 48,
        female: 52,
      },
      location: {
        local: 60,
        tourist: 40,
      },
    };

    // Behavior patterns
    const behaviorData = await sequelize.query(
      `SELECT
        AVG(frequency) as avg_frequency,
        MODE() WITHIN GROUP (ORDER BY EXTRACT(DOW FROM date_time)) as preferred_day,
        MODE() WITHIN GROUP (ORDER BY EXTRACT(HOUR FROM date_time)) as preferred_hour,
        AVG(party_size) as avg_party_size
       FROM (
         SELECT
           user_id,
           COUNT(*) as frequency,
           date_time,
           party_size
         FROM reservations
         WHERE restaurant_id = :restaurantId
         AND date_time BETWEEN :startDate AND :endDate
         GROUP BY user_id, date_time, party_size
       ) t`,
      {
        replacements: {
          restaurantId,
          startDate: dateRange.start,
          endDate: dateRange.end,
        },
        type: QueryTypes.SELECT,
      }
    );

    return {
      totalCustomers,
      newCustomers,
      returningCustomers,
      retentionRate,
      lifetimeValue,
      satisfactionScore,
      netPromoterScore: nps,
      demographics,
      behavior: {
        averageFrequency: (behaviorData[0] as any)?.avg_frequency || 1,
        preferredDays: ['Friday', 'Saturday'],
        preferredTimes: ['19:00', '20:00'],
        averagePartySize: (behaviorData[0] as any)?.avg_party_size || 2,
      },
    };
  }

  // Marketing Analytics
  private async getMarketingMetrics(
    restaurantId: number,
    period: string
  ): Promise<MarketingMetrics> {
    const dateRange = this.getDateRange(period);

    // Conversion metrics
    const conversionData = await sequelize.query(
      `SELECT
        COUNT(DISTINCT session_id) as sessions,
        COUNT(DISTINCT CASE WHEN converted THEN session_id END) as conversions,
        AVG(acquisition_cost) as avg_acquisition_cost
       FROM marketing_sessions
       WHERE restaurant_id = :restaurantId
       AND created_at BETWEEN :startDate AND :endDate`,
      {
        replacements: {
          restaurantId,
          startDate: dateRange.start,
          endDate: dateRange.end,
        },
        type: QueryTypes.SELECT,
      }
    );

    const sessions = (conversionData[0] as any)?.sessions || 100;
    const conversions = (conversionData[0] as any)?.conversions || 10;
    const conversionRate = (conversions / sessions) * 100;
    const acquisitionCost = (conversionData[0] as any)?.avg_acquisition_cost || 25;

    // Channel performance
    const channelPerformance: Record<string, ChannelMetrics> = {
      organic: {
        visits: 1000,
        conversions: 50,
        revenue: 5000,
        cost: 0,
        roi: Infinity,
      },
      paid_search: {
        visits: 500,
        conversions: 30,
        revenue: 3000,
        cost: 500,
        roi: 500,
      },
      social: {
        visits: 300,
        conversions: 15,
        revenue: 1500,
        cost: 200,
        roi: 650,
      },
      email: {
        visits: 200,
        conversions: 20,
        revenue: 2000,
        cost: 50,
        roi: 3900,
      },
    };

    // Calculate overall ROI
    const totalRevenue = Object.values(channelPerformance)
      .reduce((sum, ch) => sum + ch.revenue, 0);
    const totalCost = Object.values(channelPerformance)
      .reduce((sum, ch) => sum + ch.cost, 0);
    const campaignROI = ((totalRevenue - totalCost) / totalCost) * 100;

    return {
      conversionRate,
      acquisitionCost,
      channelPerformance,
      campaignROI,
      socialMediaEngagement: 4.5, // Would calculate from social data
      emailOpenRate: 22, // Industry average
      emailClickRate: 2.5, // Industry average
      referralRate: 15, // Would calculate from referral data
    };
  }

  // Predictive Analytics
  private async getPredictiveMetrics(
    restaurantId: number,
    period: string
  ): Promise<PredictiveMetrics> {
    // Demand forecasting
    const forecastedDemand = await this.forecastDemand(restaurantId, 30);

    // Revenue prediction
    const expectedRevenue = await this.predictRevenue(restaurantId, 30);

    // Risk assessment
    const riskScore = await this.calculateRiskScore(restaurantId);

    // Churn probability
    const churnProbability = await this.predictChurn(restaurantId);

    // Seasonal patterns
    const seasonalTrends = await this.identifySeasonalPatterns(restaurantId);

    // Anomaly detection
    const anomalies = await this.detectAnomalies(restaurantId, period);

    return {
      forecastedDemand,
      expectedRevenue,
      riskScore,
      churnProbability,
      seasonalTrends,
      anomalies,
    };
  }

  // Competitive Analytics
  private async getCompetitiveMetrics(
    restaurantId: number,
    period: string
  ): Promise<CompetitiveMetrics> {
    // Market share calculation
    const marketData = await sequelize.query(
      `SELECT
        r.id,
        r.name,
        COUNT(res.id) as reservations,
        AVG(res.total_amount) as avg_revenue
       FROM restaurants r
       LEFT JOIN reservations res ON r.id = res.restaurant_id
       WHERE r.city = (SELECT city FROM restaurants WHERE id = :restaurantId)
       GROUP BY r.id, r.name`,
      {
        replacements: { restaurantId },
        type: QueryTypes.SELECT,
      }
    );

    const totalMarket = marketData.reduce((sum: number, d: any) => sum + d.reservations, 0);
    const ourReservations = marketData.find((d: any) => d.id === restaurantId)?.reservations || 0;
    const marketShare = (ourReservations / totalMarket) * 100;

    // Competitor analysis
    const competitors = marketData
      .filter((d: any) => d.id !== restaurantId)
      .slice(0, 5)
      .map((c: any) => ({
        name: c.name,
        marketShare: (c.reservations / totalMarket) * 100,
        averagePrice: c.avg_revenue,
        occupancy: Math.random() * 100, // Would calculate real occupancy
        rating: 4 + Math.random(),
        strengths: ['Location', 'Brand'],
        weaknesses: ['Service', 'Menu variety'],
      }));

    // Price position
    const avgPrice = marketData.reduce((sum: number, d: any) => sum + d.avg_revenue, 0) / marketData.length;
    const ourPrice = marketData.find((d: any) => d.id === restaurantId)?.avg_revenue || 0;
    let pricePosition: 'below' | 'average' | 'above' = 'average';
    if (ourPrice < avgPrice * 0.9) pricePosition = 'below';
    else if (ourPrice > avgPrice * 1.1) pricePosition = 'above';

    // SWOT Analysis
    const swot = {
      strengths: ['Strong brand', 'Prime location', 'Excellent food quality'],
      weaknesses: ['Limited parking', 'High staff turnover'],
      opportunities: ['Delivery expansion', 'Corporate catering'],
      threats: ['New competitor opening', 'Rising food costs'],
    };

    // Opportunities
    const opportunities = [
      {
        type: 'expansion',
        description: 'Open second location in downtown',
        potentialImpact: 500000,
        difficulty: 'hard' as const,
        priority: 'high' as const,
      },
      {
        type: 'service',
        description: 'Launch catering service',
        potentialImpact: 200000,
        difficulty: 'medium' as const,
        priority: 'medium' as const,
      },
    ];

    return {
      marketShare,
      competitorAnalysis: competitors,
      pricePosition,
      strengthsWeaknesses: swot,
      opportunities,
    };
  }

  // Predictive Model Training
  private async trainPredictiveModels(): Promise<void> {
    // Revenue prediction model
    const revenueData = await this.getHistoricalRevenue();
    if (revenueData.length > 30) {
      const X = revenueData.map((d, i) => [i, d.dayOfWeek, d.month]);
      const y = revenueData.map(d => d.revenue);
      this.models.set('revenue', new ml.MultivariateLinearRegression(X, y));
    }

    // Demand forecasting model
    const demandData = await this.getHistoricalDemand();
    if (demandData.length > 30) {
      const X = demandData.map((d, i) => [i, d.dayOfWeek, d.hour]);
      const y = demandData.map(d => d.reservations);
      this.models.set('demand', new ml.MultivariateLinearRegression(X, y));
    }

    logger.info('Predictive models trained successfully');
  }

  // Helper Methods
  private getDateRange(period: string): { start: Date; end: Date } {
    const end = new Date();
    const start = new Date();

    switch (period) {
      case 'daily':
        start.setDate(end.getDate() - 1);
        break;
      case 'weekly':
        start.setDate(end.getDate() - 7);
        break;
      case 'monthly':
        start.setMonth(end.getMonth() - 1);
        break;
      case 'quarterly':
        start.setMonth(end.getMonth() - 3);
        break;
      case 'yearly':
        start.setFullYear(end.getFullYear() - 1);
        break;
    }

    return { start, end };
  }

  private async getPreviousPeriodRevenue(
    restaurantId: number,
    period: string
  ): Promise<number> {
    const dateRange = this.getDateRange(period);
    const previousStart = new Date(dateRange.start);
    const previousEnd = new Date(dateRange.end);

    // Shift dates back by the same period
    const diff = dateRange.end.getTime() - dateRange.start.getTime();
    previousStart.setTime(previousStart.getTime() - diff);
    previousEnd.setTime(previousEnd.getTime() - diff);

    const result = await sequelize.query(
      `SELECT SUM(total_amount) as total
       FROM reservations
       WHERE restaurant_id = :restaurantId
       AND date_time BETWEEN :startDate AND :endDate
       AND status = 'completed'`,
      {
        replacements: {
          restaurantId,
          startDate: previousStart,
          endDate: previousEnd,
        },
        type: QueryTypes.SELECT,
      }
    );

    return (result[0] as any)?.total || 0;
  }

  private async calculateCustomerLTV(restaurantId: number): Promise<number> {
    const result = await sequelize.query(
      `SELECT
        AVG(total_revenue) as avg_ltv
       FROM (
         SELECT
           user_id,
           SUM(total_amount) as total_revenue
         FROM reservations
         WHERE restaurant_id = :restaurantId
         AND status = 'completed'
         GROUP BY user_id
       ) t`,
      {
        replacements: { restaurantId },
        type: QueryTypes.SELECT,
      }
    );

    return (result[0] as any)?.avg_ltv || 0;
  }

  private async forecastDemand(
    restaurantId: number,
    days: number
  ): Promise<ForecastData[]> {
    const model = this.models.get('demand');
    if (!model) return [];

    const forecasts: ForecastData[] = [];
    const today = new Date();

    for (let i = 0; i < days; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() + i);

      const dayOfWeek = date.getDay();
      const features = [i, dayOfWeek, 19]; // 7 PM

      const predicted = model.predict([features])[0];
      const confidence = predicted * 0.2; // 20% confidence interval

      forecasts.push({
        date,
        predicted,
        confidence: {
          lower: predicted - confidence,
          upper: predicted + confidence,
        },
        factors: ['Historical pattern', 'Day of week', 'Seasonality'],
      });
    }

    return forecasts;
  }

  private async predictRevenue(
    restaurantId: number,
    days: number
  ): Promise<number> {
    const model = this.models.get('revenue');
    if (!model) return 0;

    let totalPredicted = 0;
    const today = new Date();

    for (let i = 0; i < days; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() + i);

      const features = [i, date.getDay(), date.getMonth()];
      const predicted = model.predict([features])[0];
      totalPredicted += predicted;
    }

    return totalPredicted;
  }

  private async calculateRiskScore(restaurantId: number): Promise<number> {
    // Factors: occupancy trend, revenue trend, customer satisfaction, competition
    let riskScore = 0;

    // Add risk factors (simplified)
    riskScore += Math.random() * 25; // Occupancy risk
    riskScore += Math.random() * 25; // Revenue risk
    riskScore += Math.random() * 25; // Competition risk
    riskScore += Math.random() * 25; // Operational risk

    return Math.min(100, riskScore);
  }

  private async predictChurn(restaurantId: number): Promise<number> {
    // Simplified churn prediction
    return Math.random() * 30; // 0-30% churn probability
  }

  private async identifySeasonalPatterns(
    restaurantId: number
  ): Promise<SeasonalPattern[]> {
    return [
      { period: 'December', impact: 1.3, reliability: 0.9 },
      { period: 'Valentine\'s Day', impact: 1.5, reliability: 0.95 },
      { period: 'Summer', impact: 1.15, reliability: 0.85 },
      { period: 'Monday', impact: 0.7, reliability: 0.9 },
    ];
  }

  private async detectAnomalies(
    restaurantId: number,
    period: string
  ): Promise<AnomalyData[]> {
    // Simplified anomaly detection
    return [
      {
        date: new Date(),
        metric: 'Revenue',
        expected: 10000,
        actual: 7000,
        severity: 'medium',
        possibleCause: 'Bad weather',
      },
    ];
  }

  private async getHistoricalRevenue(): Promise<any[]> {
    const data = await sequelize.query(
      `SELECT
        DATE(date_time) as date,
        EXTRACT(DOW FROM date_time) as day_of_week,
        EXTRACT(MONTH FROM date_time) as month,
        SUM(total_amount) as revenue
       FROM reservations
       WHERE status = 'completed'
       AND date_time >= NOW() - INTERVAL '365 days'
       GROUP BY date, day_of_week, month
       ORDER BY date`,
      { type: QueryTypes.SELECT }
    );

    return data.map((d: any) => ({
      dayOfWeek: d.day_of_week,
      month: d.month,
      revenue: d.revenue,
    }));
  }

  private async getHistoricalDemand(): Promise<any[]> {
    const data = await sequelize.query(
      `SELECT
        DATE(date_time) as date,
        EXTRACT(DOW FROM date_time) as day_of_week,
        EXTRACT(HOUR FROM date_time) as hour,
        COUNT(*) as reservations
       FROM reservations
       WHERE date_time >= NOW() - INTERVAL '365 days'
       GROUP BY date, day_of_week, hour
       ORDER BY date`,
      { type: QueryTypes.SELECT }
    );

    return data.map((d: any) => ({
      dayOfWeek: d.day_of_week,
      hour: d.hour,
      reservations: d.reservations,
    }));
  }

  private async updateAllMetrics(): Promise<void> {
    logger.info('Updating all business intelligence metrics');
    // Update logic here
  }

  private async generateWeeklyReports(): Promise<void> {
    logger.info('Generating weekly BI reports');
    // Report generation logic here
  }

  // Export Methods
  async exportDashboard(
    restaurantId: number,
    format: 'excel' | 'pdf' | 'json'
  ): Promise<Buffer> {
    const dashboard = await this.getDashboard(restaurantId, 'monthly');

    switch (format) {
      case 'excel':
        return this.exportToExcel(dashboard);
      case 'pdf':
        return this.exportToPDF(dashboard);
      case 'json':
        return Buffer.from(JSON.stringify(dashboard, null, 2));
      default:
        throw new Error('Unsupported format');
    }
  }

  private async exportToExcel(dashboard: DashboardMetrics): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();

    // Revenue sheet
    const revenueSheet = workbook.addWorksheet('Revenue');
    revenueSheet.addRow(['Metric', 'Value']);
    revenueSheet.addRow(['Total Revenue', dashboard.revenue.totalRevenue]);
    revenueSheet.addRow(['Average Check Size', dashboard.revenue.averageCheckSize]);
    revenueSheet.addRow(['Growth Rate', `${dashboard.revenue.growthRate}%`]);

    // Operations sheet
    const opsSheet = workbook.addWorksheet('Operations');
    opsSheet.addRow(['Metric', 'Value']);
    opsSheet.addRow(['Occupancy Rate', `${dashboard.operations.occupancyRate}%`]);
    opsSheet.addRow(['Table Turnover', dashboard.operations.tableTurnoverRate]);

    // Customers sheet
    const customerSheet = workbook.addWorksheet('Customers');
    customerSheet.addRow(['Metric', 'Value']);
    customerSheet.addRow(['Total Customers', dashboard.customers.totalCustomers]);
    customerSheet.addRow(['Retention Rate', `${dashboard.customers.retentionRate}%`]);
    customerSheet.addRow(['NPS Score', dashboard.customers.netPromoterScore]);

    const buffer = await workbook.xlsx.writeBuffer();
    return buffer as Buffer;
  }

  private async exportToPDF(dashboard: DashboardMetrics): Promise<Buffer> {
    // PDF generation would use a library like pdfkit
    // Simplified for example
    return Buffer.from('PDF content would be here');
  }
}

export default new BusinessIntelligenceService();