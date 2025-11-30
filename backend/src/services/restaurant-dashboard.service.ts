import { EventEmitter } from 'events';
import { Op, QueryTypes, Sequelize } from 'sequelize';
import {
  Restaurant,
  Reservation,
  Table,
  Review,
  User,
  Staff,
  MenuItem,
  Revenue
} from '../models';
import { redis } from '../config/redis';
import { websocketService } from './websocket.service';
import { logger } from '../utils/logger';
import moment from 'moment-timezone';
import { Parser } from 'json2csv';
import PDFDocument from 'pdfkit';
import ExcelJS from 'exceljs';

interface DashboardMetrics {
  overview: {
    todayReservations: number;
    weekReservations: number;
    monthReservations: number;
    todayRevenue: number;
    weekRevenue: number;
    monthRevenue: number;
    avgRating: number;
    occupancyRate: number;
    noShowRate: number;
    repeatGuestRate: number;
  };
  realtime: {
    currentGuests: number;
    upcomingReservations: any[];
    tablesStatus: any[];
    waitlistCount: number;
    staffOnDuty: any[];
  };
  analytics: {
    revenueByPeriod: any[];
    reservationsByHour: any[];
    popularDishes: any[];
    guestDemographics: any;
    channelPerformance: any[];
    turnTimeAnalysis: any;
  };
  forecasting: {
    expectedCovers: number;
    projectedRevenue: number;
    staffingNeeds: any;
    inventoryAlerts: any[];
  };
}

interface RevenueReport {
  period: string;
  grossRevenue: number;
  netRevenue: number;
  averageCheck: number;
  covers: number;
  categories: any[];
  topItems: any[];
  paymentMethods: any[];
  taxes: number;
  tips: number;
  discounts: number;
}

interface GuestAnalytics {
  totalGuests: number;
  newGuests: number;
  returningGuests: number;
  vipGuests: number;
  averageVisitFrequency: number;
  lifetimeValue: any[];
  segmentation: any[];
  preferences: any[];
  feedback: any[];
}

export class RestaurantDashboardService extends EventEmitter {
  private readonly CACHE_TTL = 60; // 1 minute for real-time data
  private readonly ANALYTICS_CACHE_TTL = 300; // 5 minutes for analytics
  private metricsUpdateInterval: NodeJS.Timer | null = null;

  constructor() {
    super();
    this.initializeMetricsUpdates();
  }

  // Get comprehensive dashboard data
  async getDashboardData(restaurantId: string, timezone: string = 'UTC'): Promise<DashboardMetrics> {
    const cacheKey = `dashboard:${restaurantId}`;
    const cached = await redis.get(cacheKey);

    if (cached) {
      return JSON.parse(cached);
    }

    try {
      const [overview, realtime, analytics, forecasting] = await Promise.all([
        this.getOverviewMetrics(restaurantId, timezone),
        this.getRealtimeMetrics(restaurantId),
        this.getAnalyticsData(restaurantId, timezone),
        this.getForecastingData(restaurantId, timezone)
      ]);

      const dashboardData: DashboardMetrics = {
        overview,
        realtime,
        analytics,
        forecasting
      };

      await redis.setex(cacheKey, this.CACHE_TTL, JSON.stringify(dashboardData));

      return dashboardData;
    } catch (error) {
      logger.error('Error getting dashboard data:', error);
      throw error;
    }
  }

  // Overview Metrics
  private async getOverviewMetrics(restaurantId: string, timezone: string): Promise<any> {
    const today = moment().tz(timezone).startOf('day');
    const weekStart = moment().tz(timezone).startOf('week');
    const monthStart = moment().tz(timezone).startOf('month');

    // Reservations count
    const [todayReservations, weekReservations, monthReservations] = await Promise.all([
      Reservation.count({
        where: {
          restaurantId,
          date: today.toDate(),
          status: { [Op.in]: ['confirmed', 'seated', 'completed'] }
        }
      }),
      Reservation.count({
        where: {
          restaurantId,
          date: { [Op.gte]: weekStart.toDate() },
          status: { [Op.in]: ['confirmed', 'seated', 'completed'] }
        }
      }),
      Reservation.count({
        where: {
          restaurantId,
          date: { [Op.gte]: monthStart.toDate() },
          status: { [Op.in]: ['confirmed', 'seated', 'completed'] }
        }
      })
    ]);

    // Revenue calculations
    const revenueQuery = `
      SELECT
        SUM(CASE WHEN DATE(created_at) = :today THEN amount ELSE 0 END) as today_revenue,
        SUM(CASE WHEN created_at >= :weekStart THEN amount ELSE 0 END) as week_revenue,
        SUM(CASE WHEN created_at >= :monthStart THEN amount ELSE 0 END) as month_revenue
      FROM payments
      WHERE restaurant_id = :restaurantId
        AND status = 'completed'
    `;

    const [revenueData] = await Restaurant.sequelize!.query(revenueQuery, {
      replacements: {
        restaurantId,
        today: today.toDate(),
        weekStart: weekStart.toDate(),
        monthStart: monthStart.toDate()
      },
      type: QueryTypes.SELECT
    }) as any[];

    // Average rating
    const avgRating = await Review.findOne({
      where: { restaurantId },
      attributes: [[Sequelize.fn('AVG', Sequelize.col('rating')), 'avgRating']],
      raw: true
    });

    // Occupancy rate
    const totalTables = await Table.count({ where: { restaurantId, isActive: true } });
    const occupiedTables = await Table.count({
      where: {
        restaurantId,
        status: 'occupied',
        isActive: true
      }
    });
    const occupancyRate = totalTables > 0 ? (occupiedTables / totalTables) * 100 : 0;

    // No-show rate
    const totalReservationsMonth = await Reservation.count({
      where: {
        restaurantId,
        date: { [Op.gte]: monthStart.toDate() }
      }
    });
    const noShows = await Reservation.count({
      where: {
        restaurantId,
        date: { [Op.gte]: monthStart.toDate() },
        status: 'no_show'
      }
    });
    const noShowRate = totalReservationsMonth > 0 ? (noShows / totalReservationsMonth) * 100 : 0;

    // Repeat guest rate
    const repeatGuestQuery = `
      SELECT COUNT(DISTINCT user_id) as repeat_guests
      FROM reservations
      WHERE restaurant_id = :restaurantId
        AND created_at >= :monthStart
      GROUP BY user_id
      HAVING COUNT(*) > 1
    `;

    const repeatGuests = await Restaurant.sequelize!.query(repeatGuestQuery, {
      replacements: { restaurantId, monthStart: monthStart.toDate() },
      type: QueryTypes.SELECT
    });

    const totalGuests = await Reservation.count({
      where: {
        restaurantId,
        date: { [Op.gte]: monthStart.toDate() }
      },
      distinct: true,
      col: 'user_id'
    });

    const repeatGuestRate = totalGuests > 0 ? (repeatGuests.length / totalGuests) * 100 : 0;

    return {
      todayReservations,
      weekReservations,
      monthReservations,
      todayRevenue: revenueData?.today_revenue || 0,
      weekRevenue: revenueData?.week_revenue || 0,
      monthRevenue: revenueData?.month_revenue || 0,
      avgRating: avgRating?.avgRating || 0,
      occupancyRate,
      noShowRate,
      repeatGuestRate
    };
  }

  // Real-time Metrics
  private async getRealtimeMetrics(restaurantId: string): Promise<any> {
    // Current guests
    const currentGuests = await Reservation.count({
      where: {
        restaurantId,
        status: 'seated',
        date: new Date()
      }
    });

    // Upcoming reservations (next 3 hours)
    const upcomingReservations = await Reservation.findAll({
      where: {
        restaurantId,
        status: 'confirmed',
        startTime: {
          [Op.between]: [
            new Date(),
            new Date(Date.now() + 3 * 60 * 60 * 1000)
          ]
        }
      },
      include: [{
        model: User,
        attributes: ['firstName', 'lastName', 'email', 'phoneNumber']
      }],
      order: [['startTime', 'ASC']],
      limit: 10
    });

    // Table status
    const tablesStatus = await Table.findAll({
      where: { restaurantId, isActive: true },
      attributes: ['id', 'tableNumber', 'capacity', 'status', 'position'],
      include: [{
        model: Reservation,
        as: 'currentReservation',
        where: { status: 'seated' },
        required: false,
        attributes: ['id', 'guestFirstName', 'guestLastName', 'partySize', 'seatedAt']
      }]
    });

    // Waitlist count
    const waitlistCount = await redis.zcard(`waitlist:${restaurantId}`);

    // Staff on duty
    const staffOnDuty = await Staff.findAll({
      where: {
        restaurantId,
        status: 'on_duty'
      },
      attributes: ['id', 'firstName', 'lastName', 'role', 'section', 'clockInTime']
    });

    return {
      currentGuests,
      upcomingReservations: upcomingReservations.map(r => ({
        id: r.id,
        time: r.startTime,
        partySize: r.partySize,
        guestName: `${r.guestFirstName} ${r.guestLastName}`,
        phone: r.User?.phoneNumber,
        specialRequests: r.specialRequests,
        tablePreference: r.preferredSeating
      })),
      tablesStatus: tablesStatus.map(t => ({
        id: t.id,
        number: t.tableNumber,
        capacity: t.capacity,
        status: t.status,
        position: t.position,
        currentGuest: t.currentReservation ? {
          name: `${t.currentReservation.guestFirstName} ${t.currentReservation.guestLastName}`,
          partySize: t.currentReservation.partySize,
          seatedAt: t.currentReservation.seatedAt,
          duration: moment().diff(moment(t.currentReservation.seatedAt), 'minutes')
        } : null
      })),
      waitlistCount,
      staffOnDuty: staffOnDuty.map(s => ({
        id: s.id,
        name: `${s.firstName} ${s.lastName}`,
        role: s.role,
        section: s.section,
        hoursWorked: moment().diff(moment(s.clockInTime), 'hours', true).toFixed(1)
      }))
    };
  }

  // Analytics Data
  private async getAnalyticsData(restaurantId: string, timezone: string): Promise<any> {
    const cacheKey = `analytics:${restaurantId}`;
    const cached = await redis.get(cacheKey);

    if (cached) {
      return JSON.parse(cached);
    }

    const [
      revenueByPeriod,
      reservationsByHour,
      popularDishes,
      guestDemographics,
      channelPerformance,
      turnTimeAnalysis
    ] = await Promise.all([
      this.getRevenueByPeriod(restaurantId, timezone),
      this.getReservationsByHour(restaurantId),
      this.getPopularDishes(restaurantId),
      this.getGuestDemographics(restaurantId),
      this.getChannelPerformance(restaurantId),
      this.getTurnTimeAnalysis(restaurantId)
    ]);

    const analytics = {
      revenueByPeriod,
      reservationsByHour,
      popularDishes,
      guestDemographics,
      channelPerformance,
      turnTimeAnalysis
    };

    await redis.setex(cacheKey, this.ANALYTICS_CACHE_TTL, JSON.stringify(analytics));

    return analytics;
  }

  // Revenue by Period
  private async getRevenueByPeriod(restaurantId: string, timezone: string): Promise<any[]> {
    const query = `
      SELECT
        DATE(created_at) as date,
        SUM(amount) as revenue,
        COUNT(DISTINCT reservation_id) as transactions,
        AVG(amount) as avg_transaction
      FROM payments
      WHERE restaurant_id = :restaurantId
        AND status = 'completed'
        AND created_at >= :startDate
      GROUP BY DATE(created_at)
      ORDER BY date DESC
      LIMIT 30
    `;

    const results = await Restaurant.sequelize!.query(query, {
      replacements: {
        restaurantId,
        startDate: moment().tz(timezone).subtract(30, 'days').toDate()
      },
      type: QueryTypes.SELECT
    });

    return results;
  }

  // Reservations by Hour
  private async getReservationsByHour(restaurantId: string): Promise<any[]> {
    const query = `
      SELECT
        EXTRACT(HOUR FROM start_time) as hour,
        COUNT(*) as count,
        AVG(party_size) as avg_party_size,
        SUM(party_size) as total_covers
      FROM reservations
      WHERE restaurant_id = :restaurantId
        AND status IN ('completed', 'seated')
        AND date >= CURRENT_DATE - INTERVAL '30 days'
      GROUP BY EXTRACT(HOUR FROM start_time)
      ORDER BY hour
    `;

    const results = await Restaurant.sequelize!.query(query, {
      replacements: { restaurantId },
      type: QueryTypes.SELECT
    });

    return results;
  }

  // Popular Dishes
  private async getPopularDishes(restaurantId: string): Promise<any[]> {
    const query = `
      SELECT
        mi.name,
        mi.category,
        COUNT(oi.id) as order_count,
        SUM(oi.quantity) as total_quantity,
        SUM(oi.price * oi.quantity) as total_revenue,
        AVG(oi.rating) as avg_rating
      FROM order_items oi
      INNER JOIN menu_items mi ON oi.menu_item_id = mi.id
      WHERE mi.restaurant_id = :restaurantId
        AND oi.created_at >= CURRENT_DATE - INTERVAL '30 days'
      GROUP BY mi.id, mi.name, mi.category
      ORDER BY order_count DESC
      LIMIT 10
    `;

    const results = await Restaurant.sequelize!.query(query, {
      replacements: { restaurantId },
      type: QueryTypes.SELECT
    });

    return results;
  }

  // Guest Demographics
  private async getGuestDemographics(restaurantId: string): Promise<any> {
    const query = `
      SELECT
        COUNT(DISTINCT u.id) as total_guests,
        COUNT(DISTINCT CASE WHEN u.created_at >= CURRENT_DATE - INTERVAL '30 days' THEN u.id END) as new_guests,
        AVG(EXTRACT(YEAR FROM AGE(u.birth_date))) as avg_age,
        COUNT(DISTINCT CASE WHEN u.gender = 'male' THEN u.id END) as male_guests,
        COUNT(DISTINCT CASE WHEN u.gender = 'female' THEN u.id END) as female_guests,
        COUNT(DISTINCT CASE WHEN u.loyalty_tier = 'platinum' THEN u.id END) as platinum_guests,
        COUNT(DISTINCT CASE WHEN u.loyalty_tier = 'gold' THEN u.id END) as gold_guests,
        AVG(r.party_size) as avg_party_size
      FROM reservations r
      INNER JOIN users u ON r.user_id = u.id
      WHERE r.restaurant_id = :restaurantId
        AND r.created_at >= CURRENT_DATE - INTERVAL '30 days'
    `;

    const [demographics] = await Restaurant.sequelize!.query(query, {
      replacements: { restaurantId },
      type: QueryTypes.SELECT
    }) as any[];

    // Location distribution
    const locationQuery = `
      SELECT
        u.city,
        COUNT(DISTINCT u.id) as guest_count
      FROM reservations r
      INNER JOIN users u ON r.user_id = u.id
      WHERE r.restaurant_id = :restaurantId
        AND r.created_at >= CURRENT_DATE - INTERVAL '30 days'
      GROUP BY u.city
      ORDER BY guest_count DESC
      LIMIT 10
    `;

    const locations = await Restaurant.sequelize!.query(locationQuery, {
      replacements: { restaurantId },
      type: QueryTypes.SELECT
    });

    return {
      ...demographics,
      topLocations: locations
    };
  }

  // Channel Performance
  private async getChannelPerformance(restaurantId: string): Promise<any[]> {
    const query = `
      SELECT
        source as channel,
        COUNT(*) as bookings,
        SUM(party_size) as total_covers,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
        COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled,
        COUNT(CASE WHEN status = 'no_show' THEN 1 END) as no_shows,
        AVG(CASE WHEN actual_spend IS NOT NULL THEN actual_spend END) as avg_spend
      FROM reservations
      WHERE restaurant_id = :restaurantId
        AND created_at >= CURRENT_DATE - INTERVAL '30 days'
      GROUP BY source
      ORDER BY bookings DESC
    `;

    const results = await Restaurant.sequelize!.query(query, {
      replacements: { restaurantId },
      type: QueryTypes.SELECT
    });

    return results.map((r: any) => ({
      channel: r.channel,
      bookings: r.bookings,
      totalCovers: r.total_covers,
      completionRate: r.bookings > 0 ? (r.completed / r.bookings) * 100 : 0,
      cancellationRate: r.bookings > 0 ? (r.cancelled / r.bookings) * 100 : 0,
      noShowRate: r.bookings > 0 ? (r.no_shows / r.bookings) * 100 : 0,
      avgSpend: r.avg_spend || 0
    }));
  }

  // Turn Time Analysis
  private async getTurnTimeAnalysis(restaurantId: string): Promise<any> {
    const query = `
      SELECT
        party_size,
        AVG(EXTRACT(EPOCH FROM (actual_end_time - actual_start_time)) / 60) as avg_duration,
        MIN(EXTRACT(EPOCH FROM (actual_end_time - actual_start_time)) / 60) as min_duration,
        MAX(EXTRACT(EPOCH FROM (actual_end_time - actual_start_time)) / 60) as max_duration,
        COUNT(*) as sample_size
      FROM reservations
      WHERE restaurant_id = :restaurantId
        AND status = 'completed'
        AND actual_start_time IS NOT NULL
        AND actual_end_time IS NOT NULL
        AND created_at >= CURRENT_DATE - INTERVAL '30 days'
      GROUP BY party_size
      ORDER BY party_size
    `;

    const byPartySize = await Restaurant.sequelize!.query(query, {
      replacements: { restaurantId },
      type: QueryTypes.SELECT
    });

    // By day of week
    const dayQuery = `
      SELECT
        EXTRACT(DOW FROM date) as day_of_week,
        AVG(EXTRACT(EPOCH FROM (actual_end_time - actual_start_time)) / 60) as avg_duration,
        COUNT(*) as sample_size
      FROM reservations
      WHERE restaurant_id = :restaurantId
        AND status = 'completed'
        AND actual_start_time IS NOT NULL
        AND actual_end_time IS NOT NULL
        AND created_at >= CURRENT_DATE - INTERVAL '30 days'
      GROUP BY EXTRACT(DOW FROM date)
      ORDER BY day_of_week
    `;

    const byDayOfWeek = await Restaurant.sequelize!.query(dayQuery, {
      replacements: { restaurantId },
      type: QueryTypes.SELECT
    });

    return {
      byPartySize,
      byDayOfWeek
    };
  }

  // Forecasting Data
  private async getForecastingData(restaurantId: string, timezone: string): Promise<any> {
    // Historical data for prediction
    const historicalQuery = `
      SELECT
        EXTRACT(DOW FROM date) as day_of_week,
        EXTRACT(HOUR FROM start_time) as hour,
        AVG(party_size) as avg_party_size,
        COUNT(*) as avg_reservations,
        AVG(actual_spend) as avg_spend
      FROM reservations
      WHERE restaurant_id = :restaurantId
        AND status = 'completed'
        AND created_at >= CURRENT_DATE - INTERVAL '90 days'
      GROUP BY EXTRACT(DOW FROM date), EXTRACT(HOUR FROM start_time)
    `;

    const historicalData = await Restaurant.sequelize!.query(historicalQuery, {
      replacements: { restaurantId },
      type: QueryTypes.SELECT
    });

    // Today's forecast
    const today = moment().tz(timezone);
    const dayOfWeek = today.day();
    const currentHour = today.hour();

    const todaysForecast = historicalData
      .filter((d: any) => d.day_of_week === dayOfWeek && d.hour >= currentHour)
      .reduce((acc: any, curr: any) => ({
        expectedCovers: acc.expectedCovers + (curr.avg_reservations * curr.avg_party_size),
        projectedRevenue: acc.projectedRevenue + (curr.avg_reservations * curr.avg_spend)
      }), { expectedCovers: 0, projectedRevenue: 0 });

    // Staffing needs based on forecast
    const staffingNeeds = this.calculateStaffingNeeds(todaysForecast.expectedCovers);

    // Inventory alerts
    const inventoryAlerts = await this.checkInventoryAlerts(restaurantId);

    return {
      expectedCovers: Math.round(todaysForecast.expectedCovers),
      projectedRevenue: Math.round(todaysForecast.projectedRevenue),
      staffingNeeds,
      inventoryAlerts
    };
  }

  // Calculate staffing needs
  private calculateStaffingNeeds(expectedCovers: number): any {
    const coversPerServer = 20;
    const coversPerHost = 50;
    const coversPerKitchen = 15;

    return {
      servers: Math.ceil(expectedCovers / coversPerServer),
      hosts: Math.ceil(expectedCovers / coversPerHost),
      kitchen: Math.ceil(expectedCovers / coversPerKitchen),
      total: Math.ceil(expectedCovers / 10) // Rough total staff estimate
    };
  }

  // Check inventory alerts
  private async checkInventoryAlerts(restaurantId: string): Promise<any[]> {
    const query = `
      SELECT
        i.item_name,
        i.current_quantity,
        i.min_quantity,
        i.unit,
        i.category
      FROM inventory i
      WHERE i.restaurant_id = :restaurantId
        AND i.current_quantity <= i.min_quantity
      ORDER BY (i.current_quantity / i.min_quantity) ASC
      LIMIT 10
    `;

    const alerts = await Restaurant.sequelize!.query(query, {
      replacements: { restaurantId },
      type: QueryTypes.SELECT
    });

    return alerts.map((item: any) => ({
      item: item.item_name,
      currentStock: item.current_quantity,
      minimumRequired: item.min_quantity,
      unit: item.unit,
      category: item.category,
      urgency: item.current_quantity === 0 ? 'critical' : 'warning'
    }));
  }

  // Generate Revenue Report
  async generateRevenueReport(
    restaurantId: string,
    startDate: Date,
    endDate: Date,
    format: 'json' | 'csv' | 'pdf' | 'excel' = 'json'
  ): Promise<any> {
    const report = await this.getRevenueReport(restaurantId, startDate, endDate);

    switch (format) {
      case 'csv':
        return this.exportToCSV(report);
      case 'pdf':
        return this.exportToPDF(report);
      case 'excel':
        return this.exportToExcel(report);
      default:
        return report;
    }
  }

  // Get revenue report data
  private async getRevenueReport(
    restaurantId: string,
    startDate: Date,
    endDate: Date
  ): Promise<RevenueReport> {
    const query = `
      SELECT
        SUM(amount) as gross_revenue,
        SUM(amount - tax - tip) as net_revenue,
        AVG(amount) as average_check,
        COUNT(DISTINCT reservation_id) as covers,
        SUM(tax) as taxes,
        SUM(tip) as tips,
        SUM(discount) as discounts
      FROM payments
      WHERE restaurant_id = :restaurantId
        AND created_at BETWEEN :startDate AND :endDate
        AND status = 'completed'
    `;

    const [summary] = await Restaurant.sequelize!.query(query, {
      replacements: { restaurantId, startDate, endDate },
      type: QueryTypes.SELECT
    }) as any[];

    // Category breakdown
    const categoryQuery = `
      SELECT
        mi.category,
        SUM(oi.price * oi.quantity) as revenue,
        SUM(oi.quantity) as items_sold
      FROM order_items oi
      INNER JOIN menu_items mi ON oi.menu_item_id = mi.id
      WHERE mi.restaurant_id = :restaurantId
        AND oi.created_at BETWEEN :startDate AND :endDate
      GROUP BY mi.category
      ORDER BY revenue DESC
    `;

    const categories = await Restaurant.sequelize!.query(categoryQuery, {
      replacements: { restaurantId, startDate, endDate },
      type: QueryTypes.SELECT
    });

    // Top items
    const topItemsQuery = `
      SELECT
        mi.name,
        mi.category,
        SUM(oi.quantity) as quantity_sold,
        SUM(oi.price * oi.quantity) as revenue
      FROM order_items oi
      INNER JOIN menu_items mi ON oi.menu_item_id = mi.id
      WHERE mi.restaurant_id = :restaurantId
        AND oi.created_at BETWEEN :startDate AND :endDate
      GROUP BY mi.id, mi.name, mi.category
      ORDER BY revenue DESC
      LIMIT 20
    `;

    const topItems = await Restaurant.sequelize!.query(topItemsQuery, {
      replacements: { restaurantId, startDate, endDate },
      type: QueryTypes.SELECT
    });

    // Payment methods
    const paymentMethodsQuery = `
      SELECT
        payment_method,
        COUNT(*) as count,
        SUM(amount) as total
      FROM payments
      WHERE restaurant_id = :restaurantId
        AND created_at BETWEEN :startDate AND :endDate
        AND status = 'completed'
      GROUP BY payment_method
    `;

    const paymentMethods = await Restaurant.sequelize!.query(paymentMethodsQuery, {
      replacements: { restaurantId, startDate, endDate },
      type: QueryTypes.SELECT
    });

    return {
      period: `${moment(startDate).format('YYYY-MM-DD')} to ${moment(endDate).format('YYYY-MM-DD')}`,
      grossRevenue: summary.gross_revenue || 0,
      netRevenue: summary.net_revenue || 0,
      averageCheck: summary.average_check || 0,
      covers: summary.covers || 0,
      categories,
      topItems,
      paymentMethods,
      taxes: summary.taxes || 0,
      tips: summary.tips || 0,
      discounts: summary.discounts || 0
    };
  }

  // Export functions
  private exportToCSV(data: any): string {
    const parser = new Parser();
    return parser.parse(data);
  }

  private async exportToPDF(data: any): Promise<Buffer> {
    const doc = new PDFDocument();
    const chunks: Buffer[] = [];

    doc.on('data', (chunk) => chunks.push(chunk));

    doc.fontSize(20).text('Revenue Report', { align: 'center' });
    doc.fontSize(12).text(`Period: ${data.period}`, { align: 'center' });
    doc.moveDown();

    doc.fontSize(14).text('Summary');
    doc.fontSize(10);
    doc.text(`Gross Revenue: $${data.grossRevenue.toFixed(2)}`);
    doc.text(`Net Revenue: $${data.netRevenue.toFixed(2)}`);
    doc.text(`Average Check: $${data.averageCheck.toFixed(2)}`);
    doc.text(`Total Covers: ${data.covers}`);

    doc.end();

    return new Promise((resolve) => {
      doc.on('end', () => resolve(Buffer.concat(chunks)));
    });
  }

  private async exportToExcel(data: any): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Revenue Report');

    worksheet.addRow(['Revenue Report']);
    worksheet.addRow([`Period: ${data.period}`]);
    worksheet.addRow([]);

    worksheet.addRow(['Summary']);
    worksheet.addRow(['Metric', 'Value']);
    worksheet.addRow(['Gross Revenue', data.grossRevenue]);
    worksheet.addRow(['Net Revenue', data.netRevenue]);
    worksheet.addRow(['Average Check', data.averageCheck]);
    worksheet.addRow(['Total Covers', data.covers]);

    const buffer = await workbook.xlsx.writeBuffer();
    return buffer as Buffer;
  }

  // Real-time updates
  private initializeMetricsUpdates(): void {
    // Update metrics every minute
    this.metricsUpdateInterval = setInterval(async () => {
      try {
        const restaurants = await Restaurant.findAll({
          where: { isActive: true },
          attributes: ['id']
        });

        for (const restaurant of restaurants) {
          const metrics = await this.getDashboardData(restaurant.id);
          websocketService.emitToRestaurant(restaurant.id, 'dashboard:update', metrics);
        }
      } catch (error) {
        logger.error('Error updating dashboard metrics:', error);
      }
    }, 60000); // Every minute
  }

  // Guest Analytics
  async getGuestAnalytics(restaurantId: string, period: 'week' | 'month' | 'year' = 'month'): Promise<GuestAnalytics> {
    const startDate = moment().subtract(1, period).toDate();

    const query = `
      SELECT
        COUNT(DISTINCT u.id) as total_guests,
        COUNT(DISTINCT CASE WHEN u.created_at >= :startDate THEN u.id END) as new_guests,
        COUNT(DISTINCT CASE WHEN r2.count > 1 THEN u.id END) as returning_guests,
        COUNT(DISTINCT CASE WHEN u.loyalty_tier IN ('gold', 'platinum') THEN u.id END) as vip_guests
      FROM reservations r
      INNER JOIN users u ON r.user_id = u.id
      LEFT JOIN (
        SELECT user_id, COUNT(*) as count
        FROM reservations
        WHERE restaurant_id = :restaurantId
        GROUP BY user_id
      ) r2 ON r.user_id = r2.user_id
      WHERE r.restaurant_id = :restaurantId
        AND r.created_at >= :startDate
    `;

    const [stats] = await Restaurant.sequelize!.query(query, {
      replacements: { restaurantId, startDate },
      type: QueryTypes.SELECT
    }) as any[];

    // Visit frequency
    const frequencyQuery = `
      SELECT
        user_id,
        COUNT(*) as visit_count,
        AVG(actual_spend) as avg_spend,
        SUM(actual_spend) as total_spend
      FROM reservations
      WHERE restaurant_id = :restaurantId
        AND created_at >= :startDate
        AND status = 'completed'
      GROUP BY user_id
      ORDER BY total_spend DESC
      LIMIT 100
    `;

    const visitData = await Restaurant.sequelize!.query(frequencyQuery, {
      replacements: { restaurantId, startDate },
      type: QueryTypes.SELECT
    });

    const avgVisitFrequency = visitData.length > 0
      ? visitData.reduce((sum: number, v: any) => sum + v.visit_count, 0) / visitData.length
      : 0;

    return {
      totalGuests: stats.total_guests,
      newGuests: stats.new_guests,
      returningGuests: stats.returning_guests,
      vipGuests: stats.vip_guests,
      averageVisitFrequency: avgVisitFrequency,
      lifetimeValue: visitData.slice(0, 20),
      segmentation: await this.getGuestSegmentation(restaurantId),
      preferences: await this.getGuestPreferences(restaurantId),
      feedback: await this.getGuestFeedback(restaurantId)
    };
  }

  private async getGuestSegmentation(restaurantId: string): Promise<any[]> {
    // Implementation for guest segmentation
    return [];
  }

  private async getGuestPreferences(restaurantId: string): Promise<any[]> {
    // Implementation for guest preferences
    return [];
  }

  private async getGuestFeedback(restaurantId: string): Promise<any[]> {
    // Implementation for guest feedback
    return [];
  }

  // Cleanup
  destroy(): void {
    if (this.metricsUpdateInterval) {
      clearInterval(this.metricsUpdateInterval);
    }
  }
}

export const restaurantDashboardService = new RestaurantDashboardService();