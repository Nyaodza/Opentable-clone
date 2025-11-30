// Advanced Analytics & Benchmarking Service
import { EventEmitter } from 'events';
import * as tf from '@tensorflow/tfjs-node';
import { createLogger } from '../../utils/logger';
import { Redis } from 'ioredis';
import { Pool } from 'pg';

export interface AnalyticsMetric {
  id: string;
  name: string;
  value: number;
  trend: 'up' | 'down' | 'stable';
  percentageChange: number;
  benchmark: number;
  industryAverage: number;
  percentile: number;
}

export interface RestaurantAnalytics {
  restaurantId: string;
  period: string;
  metrics: {
    revenue: RevenueMetrics;
    operations: OperationalMetrics;
    customer: CustomerMetrics;
    marketing: MarketingMetrics;
    competitive: CompetitiveMetrics;
  };
  predictions: PredictiveAnalytics;
  recommendations: string[];
}

export interface RevenueMetrics {
  totalRevenue: number;
  averageCheckSize: number;
  revenuePerSeat: number;
  revenuePerSquareFoot: number;
  laborCostPercentage: number;
  foodCostPercentage: number;
  profitMargin: number;
  yearOverYearGrowth: number;
}

export interface OperationalMetrics {
  tableOccupancy: number;
  averageTurnTime: number;
  peakHourUtilization: number;
  noShowRate: number;
  cancellationRate: number;
  walkInPercentage: number;
  staffProductivity: number;
  kitchenEfficiency: number;
}

export interface CustomerMetrics {
  totalCustomers: number;
  newCustomers: number;
  returningCustomers: number;
  customerLifetimeValue: number;
  averageRating: number;
  netPromoterScore: number;
  customerChurnRate: number;
  averagePartySize: number;
}

export interface MarketingMetrics {
  conversionRate: number;
  costPerAcquisition: number;
  returnOnAdSpend: number;
  emailOpenRate: number;
  emailClickRate: number;
  socialMediaEngagement: number;
  websiteTraffic: number;
  bookingSourceDistribution: Record<string, number>;
}

export interface CompetitiveMetrics {
  marketShare: number;
  priceCompetitiveness: number;
  menuDiversity: number;
  serviceSpeed: number;
  onlinePresence: number;
  competitorComparison: Record<string, any>;
}

export interface PredictiveAnalytics {
  demandForecast: DemandForecast[];
  revenueProjection: number;
  customerFlowPrediction: HourlyPrediction[];
  seasonalTrends: SeasonalTrend[];
  riskAssessment: RiskFactor[];
}

export interface DemandForecast {
  date: Date;
  predictedCovers: number;
  confidence: number;
  factors: string[];
}

export interface HourlyPrediction {
  hour: number;
  predictedGuests: number;
  recommendedStaffing: number;
  confidence: number;
}

export interface SeasonalTrend {
  period: string;
  trend: 'increase' | 'decrease' | 'stable';
  impact: number;
  recommendations: string[];
}

export interface RiskFactor {
  type: string;
  probability: number;
  impact: number;
  mitigation: string;
}

export class AdvancedAnalyticsService extends EventEmitter {
  private logger: any;
  private redis: Redis;
  private db: Pool;
  private mlModels: Map<string, tf.LayersModel>;
  private industryBenchmarks: Map<string, number>;

  constructor() {
    super();
    this.logger = createLogger('Advanced-Analytics');
    
    // Initialize Redis for caching
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD
    });
    
    // Initialize PostgreSQL connection
    this.db = new Pool({
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD
    });
    
    this.mlModels = new Map();
    this.industryBenchmarks = new Map();
    
    this.initializeModels();
    this.loadIndustryBenchmarks();
  }

  private async initializeModels(): Promise<void> {
    // Load or create ML models for predictions
    await this.loadDemandForecastModel();
    await this.loadCustomerChurnModel();
    await this.loadRevenuePredictionModel();
    await this.loadAnomalyDetectionModel();
  }

  private async loadDemandForecastModel(): Promise<void> {
    try {
      // Try to load existing model
      const model = await tf.loadLayersModel('file://./models/demand-forecast/model.json');
      this.mlModels.set('demand-forecast', model);
    } catch {
      // Create new model if not exists
      const model = this.createDemandForecastModel();
      this.mlModels.set('demand-forecast', model);
    }
  }

  private createDemandForecastModel(): tf.LayersModel {
    const model = tf.sequential({
      layers: [
        tf.layers.lstm({
          units: 50,
          returnSequences: true,
          inputShape: [7, 10] // 7 days, 10 features
        }),
        tf.layers.lstm({
          units: 50,
          returnSequences: false
        }),
        tf.layers.dense({
          units: 25,
          activation: 'relu'
        }),
        tf.layers.dropout({ rate: 0.2 }),
        tf.layers.dense({
          units: 1
        })
      ]
    });

    model.compile({
      optimizer: tf.train.adam(0.001),
      loss: 'meanSquaredError',
      metrics: ['mae']
    });

    return model;
  }

  private async loadCustomerChurnModel(): Promise<void> {
    // Similar implementation for customer churn prediction
  }

  private async loadRevenuePredictionModel(): Promise<void> {
    // Similar implementation for revenue prediction
  }

  private async loadAnomalyDetectionModel(): Promise<void> {
    // Similar implementation for anomaly detection
  }

  private async loadIndustryBenchmarks(): Promise<void> {
    // Load industry benchmarks for comparison
    this.industryBenchmarks.set('tableOccupancy', 0.75);
    this.industryBenchmarks.set('averageTurnTime', 90); // minutes
    this.industryBenchmarks.set('noShowRate', 0.05);
    this.industryBenchmarks.set('cancellationRate', 0.10);
    this.industryBenchmarks.set('laborCostPercentage', 0.30);
    this.industryBenchmarks.set('foodCostPercentage', 0.28);
    this.industryBenchmarks.set('profitMargin', 0.06);
    this.industryBenchmarks.set('customerRetentionRate', 0.20);
    this.industryBenchmarks.set('averageRating', 4.2);
    this.industryBenchmarks.set('conversionRate', 0.025);
  }

  // Main analytics generation method
  async generateAnalytics(
    restaurantId: string,
    startDate: Date,
    endDate: Date,
    options: {
      includePredictions?: boolean;
      includeCompetitors?: boolean;
      includeBenchmarks?: boolean;
    } = {}
  ): Promise<RestaurantAnalytics> {
    const cacheKey = `analytics:${restaurantId}:${startDate.toISOString()}:${endDate.toISOString()}`;
    
    // Check cache first
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    // Generate comprehensive analytics
    const [revenue, operations, customer, marketing, competitive] = await Promise.all([
      this.calculateRevenueMetrics(restaurantId, startDate, endDate),
      this.calculateOperationalMetrics(restaurantId, startDate, endDate),
      this.calculateCustomerMetrics(restaurantId, startDate, endDate),
      this.calculateMarketingMetrics(restaurantId, startDate, endDate),
      options.includeCompetitors ? 
        this.calculateCompetitiveMetrics(restaurantId, startDate, endDate) :
        this.getEmptyCompetitiveMetrics()
    ]);

    const predictions = options.includePredictions ?
      await this.generatePredictions(restaurantId, { revenue, operations, customer }) :
      this.getEmptyPredictions();

    const recommendations = await this.generateRecommendations({
      revenue, operations, customer, marketing, competitive
    });

    const analytics: RestaurantAnalytics = {
      restaurantId,
      period: `${startDate.toISOString()} - ${endDate.toISOString()}`,
      metrics: {
        revenue,
        operations,
        customer,
        marketing,
        competitive
      },
      predictions,
      recommendations
    };

    // Cache for 1 hour
    await this.redis.setex(cacheKey, 3600, JSON.stringify(analytics));

    return analytics;
  }

  private async calculateRevenueMetrics(
    restaurantId: string,
    startDate: Date,
    endDate: Date
  ): Promise<RevenueMetrics> {
    const query = `
      SELECT 
        SUM(total_amount) as total_revenue,
        AVG(total_amount) as avg_check,
        COUNT(DISTINCT customer_id) as unique_customers,
        SUM(guest_count) as total_guests,
        AVG(tip_amount) as avg_tip
      FROM reservations r
      JOIN payments p ON r.id = p.reservation_id
      WHERE r.restaurant_id = $1
        AND r.reservation_date BETWEEN $2 AND $3
        AND r.status = 'completed'
    `;

    const result = await this.db.query(query, [restaurantId, startDate, endDate]);
    const data = result.rows[0];

    // Get restaurant details for calculations
    const restaurantQuery = `
      SELECT seat_count, square_footage, average_labor_cost, average_food_cost
      FROM restaurants
      WHERE id = $1
    `;
    const restaurantResult = await this.db.query(restaurantQuery, [restaurantId]);
    const restaurant = restaurantResult.rows[0];

    // Calculate year-over-year growth
    const lastYearStart = new Date(startDate);
    lastYearStart.setFullYear(lastYearStart.getFullYear() - 1);
    const lastYearEnd = new Date(endDate);
    lastYearEnd.setFullYear(lastYearEnd.getFullYear() - 1);
    
    const lastYearResult = await this.db.query(query, [restaurantId, lastYearStart, lastYearEnd]);
    const lastYearRevenue = lastYearResult.rows[0]?.total_revenue || 0;

    const yearOverYearGrowth = lastYearRevenue > 0 ?
      ((data.total_revenue - lastYearRevenue) / lastYearRevenue) * 100 : 0;

    return {
      totalRevenue: data.total_revenue || 0,
      averageCheckSize: data.avg_check || 0,
      revenuePerSeat: restaurant.seat_count ? 
        (data.total_revenue || 0) / restaurant.seat_count : 0,
      revenuePerSquareFoot: restaurant.square_footage ?
        (data.total_revenue || 0) / restaurant.square_footage : 0,
      laborCostPercentage: restaurant.average_labor_cost || 30,
      foodCostPercentage: restaurant.average_food_cost || 28,
      profitMargin: this.calculateProfitMargin(
        data.total_revenue,
        restaurant.average_labor_cost,
        restaurant.average_food_cost
      ),
      yearOverYearGrowth
    };
  }

  private calculateProfitMargin(
    revenue: number,
    laborCost: number,
    foodCost: number
  ): number {
    if (!revenue) return 0;
    const totalCosts = (revenue * laborCost / 100) + (revenue * foodCost / 100);
    const otherCosts = revenue * 0.25; // Estimate other costs at 25%
    const profit = revenue - totalCosts - otherCosts;
    return (profit / revenue) * 100;
  }

  private async calculateOperationalMetrics(
    restaurantId: string,
    startDate: Date,
    endDate: Date
  ): Promise<OperationalMetrics> {
    const query = `
      SELECT 
        COUNT(*) as total_reservations,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
        COUNT(CASE WHEN status = 'no_show' THEN 1 END) as no_shows,
        COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled,
        COUNT(CASE WHEN booking_source = 'walk_in' THEN 1 END) as walk_ins,
        AVG(EXTRACT(EPOCH FROM (end_time - start_time))/60) as avg_duration,
        AVG(guest_count) as avg_party_size
      FROM reservations
      WHERE restaurant_id = $1
        AND reservation_date BETWEEN $2 AND $3
    `;

    const result = await this.db.query(query, [restaurantId, startDate, endDate]);
    const data = result.rows[0];

    // Calculate peak hour utilization
    const peakQuery = `
      SELECT 
        EXTRACT(HOUR FROM reservation_time) as hour,
        COUNT(*) as count,
        SUM(guest_count) as guests
      FROM reservations
      WHERE restaurant_id = $1
        AND reservation_date BETWEEN $2 AND $3
        AND status = 'completed'
      GROUP BY EXTRACT(HOUR FROM reservation_time)
      ORDER BY count DESC
      LIMIT 3
    `;

    const peakResult = await this.db.query(peakQuery, [restaurantId, startDate, endDate]);
    const peakHours = peakResult.rows;

    // Get table capacity
    const capacityQuery = `
      SELECT 
        SUM(capacity) as total_capacity,
        COUNT(*) as table_count
      FROM tables
      WHERE restaurant_id = $1
    `;
    const capacityResult = await this.db.query(capacityQuery, [restaurantId]);
    const capacity = capacityResult.rows[0];

    const totalSlots = capacity.table_count * 12 * 
      Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    
    const tableOccupancy = (data.completed || 0) / totalSlots;

    return {
      tableOccupancy,
      averageTurnTime: data.avg_duration || 90,
      peakHourUtilization: this.calculatePeakUtilization(peakHours, capacity.total_capacity),
      noShowRate: (data.no_shows || 0) / (data.total_reservations || 1),
      cancellationRate: (data.cancelled || 0) / (data.total_reservations || 1),
      walkInPercentage: (data.walk_ins || 0) / (data.total_reservations || 1),
      staffProductivity: await this.calculateStaffProductivity(restaurantId, startDate, endDate),
      kitchenEfficiency: await this.calculateKitchenEfficiency(restaurantId, startDate, endDate)
    };
  }

  private calculatePeakUtilization(
    peakHours: any[],
    totalCapacity: number
  ): number {
    if (!peakHours.length || !totalCapacity) return 0;
    
    const avgPeakGuests = peakHours.reduce((sum, hour) => 
      sum + hour.guests, 0) / peakHours.length;
    
    return avgPeakGuests / totalCapacity;
  }

  private async calculateStaffProductivity(
    restaurantId: string,
    startDate: Date,
    endDate: Date
  ): Promise<number> {
    // Calculate revenue per staff hour
    const query = `
      SELECT 
        SUM(p.total_amount) / SUM(s.hours_worked) as revenue_per_hour
      FROM payments p
      JOIN reservations r ON p.reservation_id = r.id
      JOIN staff_shifts s ON s.restaurant_id = r.restaurant_id
        AND DATE(s.shift_date) = DATE(r.reservation_date)
      WHERE r.restaurant_id = $1
        AND r.reservation_date BETWEEN $2 AND $3
    `;

    const result = await this.db.query(query, [restaurantId, startDate, endDate]);
    return result.rows[0]?.revenue_per_hour || 0;
  }

  private async calculateKitchenEfficiency(
    restaurantId: string,
    startDate: Date,
    endDate: Date
  ): Promise<number> {
    // Calculate average order preparation time
    const query = `
      SELECT 
        AVG(EXTRACT(EPOCH FROM (order_ready_time - order_placed_time))/60) as avg_prep_time
      FROM orders
      WHERE restaurant_id = $1
        AND order_date BETWEEN $2 AND $3
    `;

    const result = await this.db.query(query, [restaurantId, startDate, endDate]);
    const avgPrepTime = result.rows[0]?.avg_prep_time || 20;
    
    // Efficiency score: lower prep time = higher efficiency
    // Benchmark: 15 minutes = 100%, 30 minutes = 50%
    return Math.max(0, Math.min(100, 100 - ((avgPrepTime - 15) * 3.33)));
  }

  private async calculateCustomerMetrics(
    restaurantId: string,
    startDate: Date,
    endDate: Date
  ): Promise<CustomerMetrics> {
    const query = `
      SELECT 
        COUNT(DISTINCT customer_id) as total_customers,
        COUNT(DISTINCT CASE 
          WHEN first_visit_date BETWEEN $2 AND $3 THEN customer_id 
        END) as new_customers,
        AVG(rating) as avg_rating,
        AVG(guest_count) as avg_party_size
      FROM reservations r
      LEFT JOIN reviews rev ON r.id = rev.reservation_id
      LEFT JOIN (
        SELECT customer_id, MIN(reservation_date) as first_visit_date
        FROM reservations
        WHERE restaurant_id = $1
        GROUP BY customer_id
      ) first_visits ON r.customer_id = first_visits.customer_id
      WHERE r.restaurant_id = $1
        AND r.reservation_date BETWEEN $2 AND $3
        AND r.status = 'completed'
    `;

    const result = await this.db.query(query, [restaurantId, startDate, endDate]);
    const data = result.rows[0];

    // Calculate customer lifetime value
    const clvQuery = `
      SELECT 
        AVG(customer_total) as avg_clv
      FROM (
        SELECT 
          customer_id,
          SUM(p.total_amount) as customer_total
        FROM reservations r
        JOIN payments p ON r.id = p.reservation_id
        WHERE r.restaurant_id = $1
        GROUP BY customer_id
      ) customer_totals
    `;

    const clvResult = await this.db.query(clvQuery, [restaurantId]);
    const clv = clvResult.rows[0]?.avg_clv || 0;

    // Calculate NPS
    const nps = await this.calculateNPS(restaurantId, startDate, endDate);

    // Calculate churn rate
    const churnRate = await this.calculateChurnRate(restaurantId, startDate, endDate);

    return {
      totalCustomers: data.total_customers || 0,
      newCustomers: data.new_customers || 0,
      returningCustomers: (data.total_customers || 0) - (data.new_customers || 0),
      customerLifetimeValue: clv,
      averageRating: data.avg_rating || 0,
      netPromoterScore: nps,
      customerChurnRate: churnRate,
      averagePartySize: data.avg_party_size || 2
    };
  }

  private async calculateNPS(
    restaurantId: string,
    startDate: Date,
    endDate: Date
  ): Promise<number> {
    const query = `
      SELECT 
        COUNT(CASE WHEN rating >= 9 THEN 1 END) as promoters,
        COUNT(CASE WHEN rating <= 6 THEN 1 END) as detractors,
        COUNT(*) as total
      FROM reviews
      WHERE restaurant_id = $1
        AND created_at BETWEEN $2 AND $3
    `;

    const result = await this.db.query(query, [restaurantId, startDate, endDate]);
    const data = result.rows[0];

    if (!data.total) return 0;

    const promoterPercentage = (data.promoters / data.total) * 100;
    const detractorPercentage = (data.detractors / data.total) * 100;

    return promoterPercentage - detractorPercentage;
  }

  private async calculateChurnRate(
    restaurantId: string,
    startDate: Date,
    endDate: Date
  ): Promise<number> {
    // Customers who visited in previous period but not in current period
    const query = `
      WITH previous_period AS (
        SELECT DISTINCT customer_id
        FROM reservations
        WHERE restaurant_id = $1
          AND reservation_date BETWEEN $2::date - INTERVAL '3 months' AND $2
          AND status = 'completed'
      ),
      current_period AS (
        SELECT DISTINCT customer_id
        FROM reservations
        WHERE restaurant_id = $1
          AND reservation_date BETWEEN $2 AND $3
          AND status = 'completed'
      )
      SELECT 
        COUNT(p.customer_id) as previous_customers,
        COUNT(p.customer_id) - COUNT(c.customer_id) as churned
      FROM previous_period p
      LEFT JOIN current_period c ON p.customer_id = c.customer_id
    `;

    const result = await this.db.query(query, [restaurantId, startDate, endDate]);
    const data = result.rows[0];

    if (!data.previous_customers) return 0;

    return (data.churned / data.previous_customers) * 100;
  }

  private async calculateMarketingMetrics(
    restaurantId: string,
    startDate: Date,
    endDate: Date
  ): Promise<MarketingMetrics> {
    // Get conversion metrics
    const conversionQuery = `
      SELECT 
        COUNT(DISTINCT session_id) as total_sessions,
        COUNT(DISTINCT CASE WHEN converted THEN session_id END) as conversions,
        AVG(marketing_spend) as avg_spend
      FROM marketing_analytics
      WHERE restaurant_id = $1
        AND date BETWEEN $2 AND $3
    `;

    const conversionResult = await this.db.query(conversionQuery, [restaurantId, startDate, endDate]);
    const conversionData = conversionResult.rows[0];

    // Get email metrics
    const emailQuery = `
      SELECT 
        AVG(open_rate) as avg_open_rate,
        AVG(click_rate) as avg_click_rate
      FROM email_campaigns
      WHERE restaurant_id = $1
        AND sent_date BETWEEN $2 AND $3
    `;

    const emailResult = await this.db.query(emailQuery, [restaurantId, startDate, endDate]);
    const emailData = emailResult.rows[0];

    // Get booking source distribution
    const sourceQuery = `
      SELECT 
        booking_source,
        COUNT(*) as count
      FROM reservations
      WHERE restaurant_id = $1
        AND reservation_date BETWEEN $2 AND $3
      GROUP BY booking_source
    `;

    const sourceResult = await this.db.query(sourceQuery, [restaurantId, startDate, endDate]);
    const bookingSourceDistribution: Record<string, number> = {};
    sourceResult.rows.forEach(row => {
      bookingSourceDistribution[row.booking_source] = row.count;
    });

    return {
      conversionRate: conversionData.total_sessions ?
        (conversionData.conversions / conversionData.total_sessions) : 0,
      costPerAcquisition: conversionData.conversions ?
        (conversionData.avg_spend / conversionData.conversions) : 0,
      returnOnAdSpend: conversionData.avg_spend ?
        ((conversionData.conversions * 50) / conversionData.avg_spend) : 0, // Assuming $50 avg value
      emailOpenRate: emailData.avg_open_rate || 0,
      emailClickRate: emailData.avg_click_rate || 0,
      socialMediaEngagement: await this.getSocialMediaEngagement(restaurantId),
      websiteTraffic: conversionData.total_sessions || 0,
      bookingSourceDistribution
    };
  }

  private async getSocialMediaEngagement(restaurantId: string): Promise<number> {
    // This would integrate with social media APIs
    // For now, return a mock value
    return Math.random() * 10;
  }

  private async calculateCompetitiveMetrics(
    restaurantId: string,
    startDate: Date,
    endDate: Date
  ): Promise<CompetitiveMetrics> {
    // Get restaurant details
    const restaurantQuery = `
      SELECT cuisine_type, price_range, location, rating
      FROM restaurants
      WHERE id = $1
    `;
    const restaurantResult = await this.db.query(restaurantQuery, [restaurantId]);
    const restaurant = restaurantResult.rows[0];

    // Get competitors
    const competitorQuery = `
      SELECT 
        r.id,
        r.name,
        r.rating,
        r.price_range,
        COUNT(res.id) as reservation_count,
        AVG(p.total_amount) as avg_revenue
      FROM restaurants r
      LEFT JOIN reservations res ON r.id = res.restaurant_id
        AND res.reservation_date BETWEEN $2 AND $3
      LEFT JOIN payments p ON res.id = p.reservation_id
      WHERE r.cuisine_type = $4
        AND r.location = $5
        AND r.id != $1
      GROUP BY r.id, r.name, r.rating, r.price_range
    `;

    const competitorResult = await this.db.query(
      competitorQuery,
      [restaurantId, startDate, endDate, restaurant.cuisine_type, restaurant.location]
    );

    const competitors = competitorResult.rows;
    const totalMarket = competitors.reduce((sum, c) => sum + (c.reservation_count || 0), 0);

    // Get our restaurant's metrics
    const ourMetricsQuery = `
      SELECT 
        COUNT(*) as reservation_count,
        AVG(total_amount) as avg_revenue
      FROM reservations r
      JOIN payments p ON r.id = p.reservation_id
      WHERE r.restaurant_id = $1
        AND r.reservation_date BETWEEN $2 AND $3
    `;

    const ourResult = await this.db.query(ourMetricsQuery, [restaurantId, startDate, endDate]);
    const ourMetrics = ourResult.rows[0];

    const marketShare = totalMarket ? 
      (ourMetrics.reservation_count / (totalMarket + ourMetrics.reservation_count)) * 100 : 0;

    const competitorComparison: Record<string, any> = {};
    competitors.forEach(comp => {
      competitorComparison[comp.name] = {
        rating: comp.rating,
        priceRange: comp.price_range,
        marketShare: totalMarket ? (comp.reservation_count / totalMarket) * 100 : 0
      };
    });

    return {
      marketShare,
      priceCompetitiveness: this.calculatePriceCompetitiveness(
        restaurant.price_range,
        competitors.map(c => c.price_range)
      ),
      menuDiversity: await this.calculateMenuDiversity(restaurantId),
      serviceSpeed: await this.calculateServiceSpeed(restaurantId, startDate, endDate),
      onlinePresence: await this.calculateOnlinePresence(restaurantId),
      competitorComparison
    };
  }

  private calculatePriceCompetitiveness(
    ourPrice: number,
    competitorPrices: number[]
  ): number {
    if (!competitorPrices.length) return 50;
    
    const avgCompetitorPrice = competitorPrices.reduce((a, b) => a + b, 0) / competitorPrices.length;
    const difference = ((avgCompetitorPrice - ourPrice) / avgCompetitorPrice) * 100;
    
    // Convert to 0-100 scale where 50 is average
    return Math.max(0, Math.min(100, 50 + difference));
  }

  private async calculateMenuDiversity(restaurantId: string): Promise<number> {
    const query = `
      SELECT COUNT(DISTINCT category) as categories, COUNT(*) as total_items
      FROM menu_items
      WHERE restaurant_id = $1
    `;

    const result = await this.db.query(query, [restaurantId]);
    const data = result.rows[0];

    // Diversity score based on categories and items
    const categoryScore = Math.min(data.categories * 10, 50);
    const itemScore = Math.min(data.total_items / 2, 50);

    return categoryScore + itemScore;
  }

  private async calculateServiceSpeed(
    restaurantId: string,
    startDate: Date,
    endDate: Date
  ): Promise<number> {
    const query = `
      SELECT AVG(EXTRACT(EPOCH FROM (end_time - start_time))/60) as avg_service_time
      FROM reservations
      WHERE restaurant_id = $1
        AND reservation_date BETWEEN $2 AND $3
        AND status = 'completed'
    `;

    const result = await this.db.query(query, [restaurantId, startDate, endDate]);
    const avgTime = result.rows[0]?.avg_service_time || 90;

    // Convert to score: 60 min = 100, 120 min = 0
    return Math.max(0, Math.min(100, 100 - ((avgTime - 60) * 1.67)));
  }

  private async calculateOnlinePresence(restaurantId: string): Promise<number> {
    // Check various online presence factors
    const query = `
      SELECT 
        website_url IS NOT NULL as has_website,
        facebook_url IS NOT NULL as has_facebook,
        instagram_url IS NOT NULL as has_instagram,
        google_business_id IS NOT NULL as has_google,
        online_ordering_enabled,
        mobile_app_enabled
      FROM restaurants
      WHERE id = $1
    `;

    const result = await this.db.query(query, [restaurantId]);
    const data = result.rows[0];

    let score = 0;
    if (data.has_website) score += 20;
    if (data.has_facebook) score += 15;
    if (data.has_instagram) score += 15;
    if (data.has_google) score += 20;
    if (data.online_ordering_enabled) score += 15;
    if (data.mobile_app_enabled) score += 15;

    return score;
  }

  private getEmptyCompetitiveMetrics(): CompetitiveMetrics {
    return {
      marketShare: 0,
      priceCompetitiveness: 0,
      menuDiversity: 0,
      serviceSpeed: 0,
      onlinePresence: 0,
      competitorComparison: {}
    };
  }

  private async generatePredictions(
    restaurantId: string,
    metrics: any
  ): Promise<PredictiveAnalytics> {
    const demandForecast = await this.predictDemand(restaurantId, metrics);
    const revenueProjection = await this.predictRevenue(restaurantId, metrics);
    const customerFlowPrediction = await this.predictCustomerFlow(restaurantId);
    const seasonalTrends = await this.analyzeSeasonalTrends(restaurantId);
    const riskAssessment = await this.assessRisks(metrics);

    return {
      demandForecast,
      revenueProjection,
      customerFlowPrediction,
      seasonalTrends,
      riskAssessment
    };
  }

  private async predictDemand(
    restaurantId: string,
    metrics: any
  ): Promise<DemandForecast[]> {
    const model = this.mlModels.get('demand-forecast');
    if (!model) return [];

    // Prepare input data for the next 7 days
    const forecasts: DemandForecast[] = [];
    const baseDate = new Date();

    for (let i = 0; i < 7; i++) {
      const targetDate = new Date(baseDate);
      targetDate.setDate(targetDate.getDate() + i);

      // Prepare features
      const features = tf.tensor2d([[
        targetDate.getDay(), // Day of week
        targetDate.getMonth() + 1, // Month
        metrics.operations.tableOccupancy || 0.5,
        metrics.customer.averageRating || 4,
        metrics.operations.averageTurnTime || 90,
        targetDate.getDate() === 0 || targetDate.getDate() === 6 ? 1 : 0, // Weekend
        0, // Holiday (would check holiday calendar)
        Math.random() * 30 + 15, // Weather (would use weather API)
        metrics.marketing.conversionRate || 0.02,
        i // Days ahead
      ]]);

      const prediction = model.predict(features) as tf.Tensor;
      const predictedCovers = (await prediction.data())[0];

      // Identify influencing factors
      const factors = [];
      if (targetDate.getDay() === 0 || targetDate.getDay() === 6) {
        factors.push('Weekend');
      }
      if (targetDate.getDay() === 5) {
        factors.push('Friday night');
      }
      // Add more factor logic

      forecasts.push({
        date: targetDate,
        predictedCovers: Math.round(predictedCovers),
        confidence: 0.75 + Math.random() * 0.2, // Mock confidence
        factors
      });

      features.dispose();
      prediction.dispose();
    }

    return forecasts;
  }

  private async predictRevenue(
    restaurantId: string,
    metrics: any
  ): Promise<number> {
    // Simple projection based on trends
    const dailyRevenue = metrics.revenue.totalRevenue / 30; // Assuming 30-day period
    const growthRate = metrics.revenue.yearOverYearGrowth / 100;
    const projectedDailyRevenue = dailyRevenue * (1 + growthRate / 365);
    
    return projectedDailyRevenue * 30; // Next month projection
  }

  private async predictCustomerFlow(restaurantId: string): Promise<HourlyPrediction[]> {
    // Get historical hourly patterns
    const query = `
      SELECT 
        EXTRACT(HOUR FROM reservation_time) as hour,
        AVG(guest_count) as avg_guests,
        COUNT(*) as reservation_count
      FROM reservations
      WHERE restaurant_id = $1
        AND reservation_date > CURRENT_DATE - INTERVAL '30 days'
        AND status = 'completed'
      GROUP BY EXTRACT(HOUR FROM reservation_time)
      ORDER BY hour
    `;

    const result = await this.db.query(query, [restaurantId]);
    
    const predictions: HourlyPrediction[] = [];
    
    for (let hour = 11; hour <= 22; hour++) {
      const historicalData = result.rows.find(r => r.hour === hour);
      const predictedGuests = historicalData?.avg_guests || 0;
      
      // Calculate recommended staffing (1 staff per 5 guests)
      const recommendedStaffing = Math.ceil(predictedGuests / 5);
      
      predictions.push({
        hour,
        predictedGuests: Math.round(predictedGuests),
        recommendedStaffing,
        confidence: historicalData ? 0.8 : 0.5
      });
    }

    return predictions;
  }

  private async analyzeSeasonalTrends(restaurantId: string): Promise<SeasonalTrend[]> {
    const trends: SeasonalTrend[] = [];

    // Analyze monthly trends
    const monthlyQuery = `
      SELECT 
        EXTRACT(MONTH FROM reservation_date) as month,
        COUNT(*) as reservations,
        AVG(guest_count) as avg_guests
      FROM reservations
      WHERE restaurant_id = $1
        AND reservation_date > CURRENT_DATE - INTERVAL '1 year'
        AND status = 'completed'
      GROUP BY EXTRACT(MONTH FROM reservation_date)
    `;

    const monthlyResult = await this.db.query(monthlyQuery, [restaurantId]);
    
    // Identify patterns
    const avgMonthly = monthlyResult.rows.reduce((sum, r) => 
      sum + r.reservations, 0) / monthlyResult.rows.length;

    // Holiday season
    const holidayMonths = monthlyResult.rows.filter(r => 
      [11, 12].includes(r.month)
    );
    const holidayAvg = holidayMonths.reduce((sum, r) => 
      sum + r.reservations, 0) / holidayMonths.length;

    if (holidayAvg > avgMonthly * 1.2) {
      trends.push({
        period: 'Holiday Season (Nov-Dec)',
        trend: 'increase',
        impact: ((holidayAvg - avgMonthly) / avgMonthly) * 100,
        recommendations: [
          'Increase staffing levels',
          'Extend operating hours',
          'Create holiday-specific menus',
          'Implement reservation deposits'
        ]
      });
    }

    // Summer season
    const summerMonths = monthlyResult.rows.filter(r => 
      [6, 7, 8].includes(r.month)
    );
    const summerAvg = summerMonths.reduce((sum, r) => 
      sum + r.reservations, 0) / summerMonths.length;

    if (Math.abs(summerAvg - avgMonthly) / avgMonthly > 0.15) {
      trends.push({
        period: 'Summer Season (Jun-Aug)',
        trend: summerAvg > avgMonthly ? 'increase' : 'decrease',
        impact: ((summerAvg - avgMonthly) / avgMonthly) * 100,
        recommendations: summerAvg > avgMonthly ? [
          'Expand outdoor seating',
          'Create summer menu specials',
          'Increase marketing efforts'
        ] : [
          'Run summer promotions',
          'Focus on local residents',
          'Adjust staffing levels'
        ]
      });
    }

    return trends;
  }

  private async assessRisks(metrics: any): Promise<RiskFactor[]> {
    const risks: RiskFactor[] = [];

    // High no-show rate risk
    if (metrics.operations.noShowRate > 0.1) {
      risks.push({
        type: 'High No-Show Rate',
        probability: 0.8,
        impact: 0.6,
        mitigation: 'Implement reservation deposits or credit card holds'
      });
    }

    // Low customer retention risk
    if (metrics.customer.customerChurnRate > 30) {
      risks.push({
        type: 'Customer Retention',
        probability: 0.7,
        impact: 0.8,
        mitigation: 'Enhance loyalty program and personalized marketing'
      });
    }

    // Labor cost risk
    if (metrics.revenue.laborCostPercentage > 35) {
      risks.push({
        type: 'High Labor Costs',
        probability: 0.9,
        impact: 0.7,
        mitigation: 'Optimize scheduling and improve staff productivity'
      });
    }

    // Competition risk
    if (metrics.competitive.marketShare < 10) {
      risks.push({
        type: 'Market Competition',
        probability: 0.6,
        impact: 0.7,
        mitigation: 'Differentiate offerings and enhance marketing'
      });
    }

    // Rating decline risk
    if (metrics.customer.averageRating < 4) {
      risks.push({
        type: 'Reputation Risk',
        probability: 0.5,
        impact: 0.9,
        mitigation: 'Focus on service quality and address negative reviews'
      });
    }

    return risks;
  }

  private getEmptyPredictions(): PredictiveAnalytics {
    return {
      demandForecast: [],
      revenueProjection: 0,
      customerFlowPrediction: [],
      seasonalTrends: [],
      riskAssessment: []
    };
  }

  private async generateRecommendations(metrics: any): Promise<string[]> {
    const recommendations: string[] = [];

    // Revenue recommendations
    if (metrics.revenue.averageCheckSize < this.industryBenchmarks.get('averageCheck')!) {
      recommendations.push('Consider upselling strategies and menu optimization to increase average check size');
    }

    if (metrics.revenue.profitMargin < 5) {
      recommendations.push('Review cost structure and pricing strategy to improve profit margins');
    }

    // Operational recommendations
    if (metrics.operations.tableOccupancy < 0.7) {
      recommendations.push('Implement dynamic pricing or promotions during off-peak hours');
    }

    if (metrics.operations.averageTurnTime > 100) {
      recommendations.push('Optimize service flow and kitchen operations to reduce table turn time');
    }

    if (metrics.operations.noShowRate > 0.05) {
      recommendations.push('Implement reservation deposits or confirmation requirements');
    }

    // Customer recommendations
    if (metrics.customer.customerChurnRate > 25) {
      recommendations.push('Enhance loyalty program and personalized communication');
    }

    if (metrics.customer.netPromoterScore < 30) {
      recommendations.push('Focus on service quality improvements and guest feedback implementation');
    }

    // Marketing recommendations
    if (metrics.marketing.conversionRate < 0.02) {
      recommendations.push('Optimize website user experience and booking flow');
    }

    if (metrics.marketing.emailOpenRate < 20) {
      recommendations.push('Improve email subject lines and segmentation strategies');
    }

    // Competitive recommendations
    if (metrics.competitive.marketShare < 15) {
      recommendations.push('Develop unique value propositions and differentiation strategies');
    }

    if (metrics.competitive.onlinePresence < 70) {
      recommendations.push('Enhance digital presence across social media and review platforms');
    }

    return recommendations.slice(0, 5); // Return top 5 recommendations
  }

  // Benchmarking methods
  async getBenchmarks(
    restaurantId: string,
    category: 'all' | 'revenue' | 'operations' | 'customer' | 'marketing' = 'all'
  ): Promise<Record<string, AnalyticsMetric>> {
    const benchmarks: Record<string, AnalyticsMetric> = {};

    // Get restaurant details for proper comparison
    const restaurantQuery = `
      SELECT cuisine_type, price_range, location, seat_count
      FROM restaurants
      WHERE id = $1
    `;
    const restaurantResult = await this.db.query(restaurantQuery, [restaurantId]);
    const restaurant = restaurantResult.rows[0];

    // Get peer group metrics
    const peerQuery = `
      SELECT 
        AVG(metrics.value) as peer_avg,
        PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY metrics.value) as peer_median,
        PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY metrics.value) as peer_75th
      FROM restaurant_metrics metrics
      JOIN restaurants r ON metrics.restaurant_id = r.id
      WHERE r.cuisine_type = $1
        AND r.price_range = $2
        AND r.location = $3
        AND metrics.metric_name = $4
    `;

    const metricsList = this.getMetricsList(category);

    for (const metric of metricsList) {
      const currentValue = await this.getCurrentMetricValue(restaurantId, metric);
      const peerResult = await this.db.query(
        peerQuery,
        [restaurant.cuisine_type, restaurant.price_range, restaurant.location, metric]
      );
      const peerData = peerResult.rows[0];

      const percentile = await this.calculatePercentile(
        restaurantId,
        metric,
        currentValue,
        restaurant
      );

      benchmarks[metric] = {
        id: metric,
        name: this.getMetricDisplayName(metric),
        value: currentValue,
        trend: await this.getMetricTrend(restaurantId, metric),
        percentageChange: await this.getMetricChange(restaurantId, metric),
        benchmark: peerData?.peer_median || 0,
        industryAverage: this.industryBenchmarks.get(metric) || peerData?.peer_avg || 0,
        percentile
      };
    }

    return benchmarks;
  }

  private getMetricsList(category: string): string[] {
    const metrics: Record<string, string[]> = {
      revenue: [
        'totalRevenue', 'averageCheckSize', 'revenuePerSeat',
        'profitMargin', 'yearOverYearGrowth'
      ],
      operations: [
        'tableOccupancy', 'averageTurnTime', 'noShowRate',
        'cancellationRate', 'staffProductivity'
      ],
      customer: [
        'customerLifetimeValue', 'averageRating', 'netPromoterScore',
        'customerRetentionRate', 'averagePartySize'
      ],
      marketing: [
        'conversionRate', 'costPerAcquisition', 'returnOnAdSpend',
        'emailOpenRate', 'socialMediaEngagement'
      ]
    };

    if (category === 'all') {
      return Object.values(metrics).flat();
    }

    return metrics[category] || [];
  }

  private async getCurrentMetricValue(
    restaurantId: string,
    metric: string
  ): Promise<number> {
    // This would fetch the current value from the database
    // Implementation depends on specific metric
    return 0;
  }

  private async getMetricTrend(
    restaurantId: string,
    metric: string
  ): Promise<'up' | 'down' | 'stable'> {
    // Compare current period to previous period
    return 'stable';
  }

  private async getMetricChange(
    restaurantId: string,
    metric: string
  ): Promise<number> {
    // Calculate percentage change from previous period
    return 0;
  }

  private async calculatePercentile(
    restaurantId: string,
    metric: string,
    value: number,
    restaurant: any
  ): Promise<number> {
    // Calculate where this restaurant ranks among peers
    const query = `
      SELECT COUNT(*) as total,
             COUNT(CASE WHEN value <= $4 THEN 1 END) as below
      FROM restaurant_metrics m
      JOIN restaurants r ON m.restaurant_id = r.id
      WHERE r.cuisine_type = $1
        AND r.price_range = $2
        AND r.location = $3
        AND m.metric_name = $5
    `;

    const result = await this.db.query(
      query,
      [restaurant.cuisine_type, restaurant.price_range, restaurant.location, value, metric]
    );

    const data = result.rows[0];
    if (!data.total) return 50;

    return (data.below / data.total) * 100;
  }

  private getMetricDisplayName(metric: string): string {
    const names: Record<string, string> = {
      totalRevenue: 'Total Revenue',
      averageCheckSize: 'Average Check Size',
      revenuePerSeat: 'Revenue Per Seat',
      profitMargin: 'Profit Margin',
      yearOverYearGrowth: 'Year-over-Year Growth',
      tableOccupancy: 'Table Occupancy Rate',
      averageTurnTime: 'Average Table Turn Time',
      noShowRate: 'No-Show Rate',
      cancellationRate: 'Cancellation Rate',
      staffProductivity: 'Staff Productivity',
      customerLifetimeValue: 'Customer Lifetime Value',
      averageRating: 'Average Rating',
      netPromoterScore: 'Net Promoter Score',
      customerRetentionRate: 'Customer Retention Rate',
      averagePartySize: 'Average Party Size',
      conversionRate: 'Website Conversion Rate',
      costPerAcquisition: 'Cost Per Acquisition',
      returnOnAdSpend: 'Return on Ad Spend',
      emailOpenRate: 'Email Open Rate',
      socialMediaEngagement: 'Social Media Engagement'
    };

    return names[metric] || metric;
  }
}

export const analyticsService = new AdvancedAnalyticsService();