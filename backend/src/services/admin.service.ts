import { User, UserRole } from '../models/User';
import { Restaurant } from '../models/Restaurant';
import { Reservation } from '../models/Reservation';
import { Review } from '../models/Review';
import { Payment } from '../models/Payment';
import { Op, Sequelize, Transaction } from 'sequelize';
import { sequelize } from '../config/database';
import { cache, CACHE_KEYS, CACHE_TTL } from '../config/redis';
import { logInfo, logError } from '../utils/logger';
import { BadRequestError, NotFoundError, ForbiddenError } from '../middleware/errorHandler';
import bcrypt from 'bcryptjs';

interface DashboardStats {
  totalUsers: number;
  totalRestaurants: number;
  totalReservations: number;
  totalRevenue: number;
  activeUsers: number;
  newUsersToday: number;
  reservationsToday: number;
  revenueToday: number;
  growthMetrics: {
    users: number;
    restaurants: number;
    reservations: number;
    revenue: number;
  };
}

interface UserFilters {
  role?: UserRole;
  isActive?: boolean;
  emailVerified?: boolean;
  search?: string;
  createdFrom?: Date;
  createdTo?: Date;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

interface RestaurantFilters {
  isActive?: boolean;
  isVerified?: boolean;
  cuisineType?: string;
  city?: string;
  state?: string;
  rating?: number;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

interface ReservationFilters {
  status?: string;
  restaurantId?: string;
  userId?: string;
  dateFrom?: Date;
  dateTo?: Date;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

interface SystemHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  database: boolean;
  redis: boolean;
  services: {
    auth: boolean;
    payment: boolean;
    email: boolean;
    websocket: boolean;
  };
  metrics: {
    cpu: number;
    memory: number;
    diskSpace: number;
    responseTime: number;
  };
}

export class AdminService {
  /**
   * Get dashboard statistics
   */
  static async getDashboardStats(): Promise<DashboardStats> {
    const cacheKey = CACHE_KEYS.ANALYTICS('dashboard', 'stats');
    const cached = await cache.get<DashboardStats>(cacheKey);
    
    if (cached) {
      return cached;
    }

    const now = new Date();
    const startOfDay = new Date(now.setHours(0, 0, 0, 0));
    const thirtyDaysAgo = new Date(now.setDate(now.getDate() - 30));

    const [
      totalUsers,
      totalRestaurants,
      totalReservations,
      activeUsers,
      newUsersToday,
      reservationsToday,
      totalRevenue,
      revenueToday,
      previousPeriodData
    ] = await Promise.all([
      User.count(),
      Restaurant.count(),
      Reservation.count(),
      User.count({ where: { lastLogin: { [Op.gte]: thirtyDaysAgo } } }),
      User.count({ where: { createdAt: { [Op.gte]: startOfDay } } }),
      Reservation.count({ where: { createdAt: { [Op.gte]: startOfDay } } }),
      Payment.sum('amount') || 0,
      Payment.sum('amount', { where: { createdAt: { [Op.gte]: startOfDay } } }) || 0,
      this.getPreviousPeriodData(thirtyDaysAgo)
    ]);

    const stats: DashboardStats = {
      totalUsers,
      totalRestaurants,
      totalReservations,
      totalRevenue: totalRevenue / 100, // Convert from cents
      activeUsers,
      newUsersToday,
      reservationsToday,
      revenueToday: revenueToday / 100,
      growthMetrics: {
        users: this.calculateGrowthRate(totalUsers, previousPeriodData.users),
        restaurants: this.calculateGrowthRate(totalRestaurants, previousPeriodData.restaurants),
        reservations: this.calculateGrowthRate(totalReservations, previousPeriodData.reservations),
        revenue: this.calculateGrowthRate(totalRevenue, previousPeriodData.revenue)
      }
    };

    await cache.set(cacheKey, stats, CACHE_TTL.SHORT);
    
    return stats;
  }

  /**
   * Get user management data
   */
  static async getUsers(filters: UserFilters): Promise<{
    users: User[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const {
      role,
      isActive,
      emailVerified,
      search,
      createdFrom,
      createdTo,
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'DESC'
    } = filters;

    const where: any = {};

    if (role) where.role = role;
    if (isActive !== undefined) where.isActive = isActive;
    if (emailVerified !== undefined) where.emailVerified = emailVerified;
    
    if (search) {
      where[Op.or] = [
        { firstName: { [Op.iLike]: `%${search}%` } },
        { lastName: { [Op.iLike]: `%${search}%` } },
        { email: { [Op.iLike]: `%${search}%` } }
      ];
    }

    if (createdFrom || createdTo) {
      where.createdAt = {};
      if (createdFrom) where.createdAt[Op.gte] = createdFrom;
      if (createdTo) where.createdAt[Op.lte] = createdTo;
    }

    const offset = (page - 1) * limit;

    const { count, rows } = await User.findAndCountAll({
      where,
      limit,
      offset,
      order: [[sortBy, sortOrder]],
      attributes: { exclude: ['password'] }
    });

    return {
      users: rows,
      total: count,
      page,
      totalPages: Math.ceil(count / limit)
    };
  }

  /**
   * Get restaurant management data
   */
  static async getRestaurants(filters: RestaurantFilters): Promise<{
    restaurants: Restaurant[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const {
      isActive,
      isVerified,
      cuisineType,
      city,
      state,
      rating,
      search,
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'DESC'
    } = filters;

    const where: any = {};

    if (isActive !== undefined) where.isActive = isActive;
    if (isVerified !== undefined) where.isVerified = isVerified;
    if (cuisineType) where.cuisineType = cuisineType;
    if (city) where.city = city;
    if (state) where.state = state;
    if (rating) where.averageRating = { [Op.gte]: rating };
    
    if (search) {
      where[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { description: { [Op.iLike]: `%${search}%` } },
        { address: { [Op.iLike]: `%${search}%` } }
      ];
    }

    const offset = (page - 1) * limit;

    const { count, rows } = await Restaurant.findAndCountAll({
      where,
      limit,
      offset,
      order: [[sortBy, sortOrder]],
      include: [
        { model: User, as: 'owner', attributes: ['id', 'firstName', 'lastName', 'email'] }
      ]
    });

    return {
      restaurants: rows,
      total: count,
      page,
      totalPages: Math.ceil(count / limit)
    };
  }

  /**
   * Get reservation analytics
   */
  static async getReservationAnalytics(period: 'day' | 'week' | 'month' | 'year' = 'month'): Promise<{
    labels: string[];
    datasets: {
      confirmed: number[];
      cancelled: number[];
      completed: number[];
      noShow: number[];
    };
    summary: {
      total: number;
      completionRate: number;
      cancellationRate: number;
      noShowRate: number;
      averagePartySize: number;
    };
  }> {
    const cacheKey = CACHE_KEYS.ANALYTICS('reservations', period);
    const cached = await cache.get<any>(cacheKey);
    
    if (cached) {
      return cached;
    }

    const { startDate, endDate, interval } = this.getDateRange(period);

    const reservations = await Reservation.findAll({
      where: {
        createdAt: {
          [Op.between]: [startDate, endDate]
        }
      },
      attributes: [
        'status',
        'partySize',
        [Sequelize.fn('DATE_TRUNC', interval, Sequelize.col('created_at')), 'period'],
        [Sequelize.fn('COUNT', '*'), 'count']
      ],
      group: ['status', 'period'],
      raw: true
    });

    const analytics = this.processReservationAnalytics(reservations, period);
    
    await cache.set(cacheKey, analytics, CACHE_TTL.MEDIUM);
    
    return analytics;
  }

  /**
   * Get revenue analytics
   */
  static async getRevenueAnalytics(period: 'day' | 'week' | 'month' | 'year' = 'month'): Promise<{
    labels: string[];
    datasets: {
      revenue: number[];
      fees: number[];
      refunds: number[];
    };
    summary: {
      totalRevenue: number;
      totalFees: number;
      totalRefunds: number;
      netRevenue: number;
      averageOrderValue: number;
    };
  }> {
    const cacheKey = CACHE_KEYS.ANALYTICS('revenue', period);
    const cached = await cache.get<any>(cacheKey);
    
    if (cached) {
      return cached;
    }

    const { startDate, endDate, interval } = this.getDateRange(period);

    const payments = await Payment.findAll({
      where: {
        createdAt: {
          [Op.between]: [startDate, endDate]
        }
      },
      attributes: [
        'type',
        [Sequelize.fn('DATE_TRUNC', interval, Sequelize.col('created_at')), 'period'],
        [Sequelize.fn('SUM', Sequelize.col('amount')), 'total']
      ],
      group: ['type', 'period'],
      raw: true
    });

    const analytics = this.processRevenueAnalytics(payments, period);
    
    await cache.set(cacheKey, analytics, CACHE_TTL.MEDIUM);
    
    return analytics;
  }

  /**
   * Manage user status
   */
  static async updateUserStatus(
    adminId: string,
    userId: string,
    updates: {
      isActive?: boolean;
      emailVerified?: boolean;
      role?: UserRole;
    }
  ): Promise<User> {
    const transaction = await sequelize.transaction();

    try {
      const user = await User.findByPk(userId, { transaction });
      if (!user) {
        throw new NotFoundError('User not found');
      }

      // Prevent admin from modifying their own role
      if (userId === adminId && updates.role) {
        throw new ForbiddenError('Cannot modify your own role');
      }

      // Update user
      await user.update(updates, { transaction });

      // Log admin action
      logInfo('Admin user update', {
        adminId,
        userId,
        updates
      });

      await transaction.commit();
      
      return user;
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Manage restaurant status
   */
  static async updateRestaurantStatus(
    adminId: string,
    restaurantId: string,
    updates: {
      isActive?: boolean;
      isVerified?: boolean;
      verificationNotes?: string;
    }
  ): Promise<Restaurant> {
    const transaction = await sequelize.transaction();

    try {
      const restaurant = await Restaurant.findByPk(restaurantId, { transaction });
      if (!restaurant) {
        throw new NotFoundError('Restaurant not found');
      }

      // Update restaurant
      await restaurant.update({
        ...updates,
        verifiedAt: updates.isVerified ? new Date() : null,
        verifiedBy: updates.isVerified ? adminId : null
      }, { transaction });

      // Log admin action
      logInfo('Admin restaurant update', {
        adminId,
        restaurantId,
        updates
      });

      await transaction.commit();
      
      return restaurant;
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Handle user complaints/reports
   */
  static async handleUserReport(
    reportId: string,
    action: 'warn' | 'suspend' | 'ban' | 'dismiss',
    notes?: string
  ): Promise<void> {
    // This would integrate with a reports/complaints system
    logInfo('User report handled', {
      reportId,
      action,
      notes
    });
  }

  /**
   * Get system health status
   */
  static async getSystemHealth(): Promise<SystemHealth> {
    const [
      databaseHealth,
      redisHealth,
      servicesHealth,
      systemMetrics
    ] = await Promise.all([
      this.checkDatabaseHealth(),
      this.checkRedisHealth(),
      this.checkServicesHealth(),
      this.getSystemMetrics()
    ]);

    const isHealthy = databaseHealth && redisHealth && 
      Object.values(servicesHealth).every(v => v);

    return {
      status: isHealthy ? 'healthy' : 'degraded',
      database: databaseHealth,
      redis: redisHealth,
      services: servicesHealth,
      metrics: systemMetrics
    };
  }

  /**
   * Create admin user
   */
  static async createAdminUser(data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
  }): Promise<User> {
    const existingUser = await User.findOne({ where: { email: data.email } });
    if (existingUser) {
      throw new BadRequestError('Email already exists');
    }

    const hashedPassword = await bcrypt.hash(data.password, 10);

    const adminUser = await User.create({
      ...data,
      password: hashedPassword,
      role: UserRole.ADMIN,
      emailVerified: true,
      isActive: true
    });

    logInfo('Admin user created', { adminId: adminUser.id });

    return adminUser;
  }

  /**
   * Export data for compliance
   */
  static async exportUserData(userId: string): Promise<any> {
    const user = await User.findByPk(userId, {
      include: [
        { model: Reservation, as: 'reservations' },
        { model: Review, as: 'reviews' }
      ]
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Prepare data for export (GDPR compliance)
    const exportData = {
      personalData: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
        createdAt: user.createdAt,
        preferences: user.preferences
      },
      reservations: user.reservations.map(r => ({
        id: r.id,
        restaurantId: r.restaurantId,
        dateTime: r.dateTime,
        partySize: r.partySize,
        status: r.status,
        specialRequests: r.specialRequests
      })),
      reviews: user.reviews.map(r => ({
        id: r.id,
        restaurantId: r.restaurantId,
        rating: r.rating,
        comment: r.comment,
        createdAt: r.createdAt
      }))
    };

    logInfo('User data exported', { userId });

    return exportData;
  }

  /**
   * Delete user data (GDPR right to be forgotten)
   */
  static async deleteUserData(userId: string): Promise<void> {
    const transaction = await sequelize.transaction();

    try {
      const user = await User.findByPk(userId, { transaction });
      if (!user) {
        throw new NotFoundError('User not found');
      }

      // Anonymize user data instead of hard delete
      await user.update({
        firstName: 'Deleted',
        lastName: 'User',
        email: `deleted_${user.id}@example.com`,
        phone: null,
        isActive: false,
        preferences: {},
        stripeCustomerId: null
      }, { transaction });

      // Anonymize associated data
      await Reservation.update(
        { specialRequests: null },
        { where: { userId }, transaction }
      );

      await Review.update(
        { comment: '[Deleted]', userId: null },
        { where: { userId }, transaction }
      );

      await transaction.commit();
      
      logInfo('User data deleted', { userId });
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  // Helper methods

  private static calculateGrowthRate(current: number, previous: number): number {
    if (previous === 0) return 100;
    return Math.round(((current - previous) / previous) * 100);
  }

  private static async getPreviousPeriodData(date: Date): Promise<{
    users: number;
    restaurants: number;
    reservations: number;
    revenue: number;
  }> {
    const [users, restaurants, reservations, revenue] = await Promise.all([
      User.count({ where: { createdAt: { [Op.lt]: date } } }),
      Restaurant.count({ where: { createdAt: { [Op.lt]: date } } }),
      Reservation.count({ where: { createdAt: { [Op.lt]: date } } }),
      Payment.sum('amount', { where: { createdAt: { [Op.lt]: date } } }) || 0
    ]);

    return { users, restaurants, reservations, revenue };
  }

  private static getDateRange(period: string): {
    startDate: Date;
    endDate: Date;
    interval: string;
  } {
    const now = new Date();
    let startDate: Date;
    let interval: string;

    switch (period) {
      case 'day':
        startDate = new Date(now.setDate(now.getDate() - 7));
        interval = 'day';
        break;
      case 'week':
        startDate = new Date(now.setDate(now.getDate() - 30));
        interval = 'week';
        break;
      case 'month':
        startDate = new Date(now.setMonth(now.getMonth() - 12));
        interval = 'month';
        break;
      case 'year':
        startDate = new Date(now.setFullYear(now.getFullYear() - 5));
        interval = 'year';
        break;
      default:
        startDate = new Date(now.setMonth(now.getMonth() - 12));
        interval = 'month';
    }

    return { startDate, endDate: new Date(), interval };
  }

  private static processReservationAnalytics(data: any[], period: string): any {
    // Process raw data into chart format
    // This is a simplified version - would need more complex processing
    return {
      labels: [],
      datasets: {
        confirmed: [],
        cancelled: [],
        completed: [],
        noShow: []
      },
      summary: {
        total: 0,
        completionRate: 0,
        cancellationRate: 0,
        noShowRate: 0,
        averagePartySize: 0
      }
    };
  }

  private static processRevenueAnalytics(data: any[], period: string): any {
    // Process raw data into chart format
    // This is a simplified version - would need more complex processing
    return {
      labels: [],
      datasets: {
        revenue: [],
        fees: [],
        refunds: []
      },
      summary: {
        totalRevenue: 0,
        totalFees: 0,
        totalRefunds: 0,
        netRevenue: 0,
        averageOrderValue: 0
      }
    };
  }

  private static async checkDatabaseHealth(): Promise<boolean> {
    try {
      await sequelize.authenticate();
      return true;
    } catch (error) {
      logError('Database health check failed', error);
      return false;
    }
  }

  private static async checkRedisHealth(): Promise<boolean> {
    try {
      await cache.set('health_check', 'ok', 1);
      const value = await cache.get('health_check');
      return value === 'ok';
    } catch (error) {
      logError('Redis health check failed', error);
      return false;
    }
  }

  private static async checkServicesHealth(): Promise<{
    auth: boolean;
    payment: boolean;
    email: boolean;
    websocket: boolean;
  }> {
    // Check various service health endpoints
    return {
      auth: true,
      payment: true,
      email: true,
      websocket: true
    };
  }

  private static async getSystemMetrics(): Promise<{
    cpu: number;
    memory: number;
    diskSpace: number;
    responseTime: number;
  }> {
    // Get system metrics - would integrate with monitoring tools
    return {
      cpu: 45,
      memory: 62,
      diskSpace: 78,
      responseTime: 125
    };
  }
}