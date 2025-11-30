import { Op } from 'sequelize';
import { Reservation } from '../models/Reservation';
import { Restaurant } from '../models/Restaurant';
import { User } from '../models/User';
import { Review } from '../models/Review';
import { redisClient } from '../config/redis';
import { pubsub, EVENTS } from '../config/pubsub';
import { logInfo, logError } from '../utils/logger';

interface RealTimeMetrics {
  activeUsers: number;
  totalReservations: number;
  todayReservations: number;
  pendingReservations: number;
  completedReservations: number;
  cancelledReservations: number;
  averageRating: number;
  totalRevenue: number;
  topRestaurants: Array<{
    id: string;
    name: string;
    reservations: number;
    rating: number;
  }>;
  hourlyBookings: Array<{
    hour: number;
    count: number;
  }>;
  popularCuisines: Array<{
    cuisine: string;
    count: number;
    percentage: number;
  }>;
  userGrowth: Array<{
    date: string;
    newUsers: number;
    totalUsers: number;
  }>;
}

interface RestaurantMetrics {
  restaurantId: string;
  todayReservations: number;
  weekReservations: number;
  monthReservations: number;
  averagePartySize: number;
  peakHours: Array<{
    hour: number;
    count: number;
  }>;
  noShowRate: number;
  averageRating: number;
  totalReviews: number;
  revenue: {
    today: number;
    week: number;
    month: number;
  };
  tableUtilization: Array<{
    tableId: string;
    tableNumber: string;
    utilizationRate: number;
    totalBookings: number;
  }>;
}

interface UserBehaviorMetrics {
  totalUsers: number;
  activeUsers: number;
  newUsersToday: number;
  averageSessionTime: number;
  topSearchTerms: Array<{
    term: string;
    count: number;
  }>;
  conversionRate: number;
  repeatCustomerRate: number;
  averageBookingsPerUser: number;
}

export class RealTimeAnalyticsService {
  private static readonly CACHE_TTL = 60; // 1 minute cache
  private static readonly METRICS_UPDATE_INTERVAL = 30000; // 30 seconds

  static async initialize(): Promise<void> {
    // Start real-time metrics updates
    setInterval(async () => {
      try {
        await this.updateRealTimeMetrics();
      } catch (error) {
        logError('Error updating real-time metrics:', error);
      }
    }, this.METRICS_UPDATE_INTERVAL);

    logInfo('Real-time analytics service initialized');
  }

  static async getRealTimeMetrics(): Promise<RealTimeMetrics> {
    const cacheKey = 'analytics:realtime:metrics';
    const cached = await redisClient.get(cacheKey);
    
    if (cached) {
      return JSON.parse(cached);
    }

    const metrics = await this.calculateRealTimeMetrics();
    await redisClient.setex(cacheKey, this.CACHE_TTL, JSON.stringify(metrics));
    
    return metrics;
  }

  static async getRestaurantMetrics(restaurantId: string): Promise<RestaurantMetrics> {
    const cacheKey = `analytics:restaurant:${restaurantId}`;
    const cached = await redisClient.get(cacheKey);
    
    if (cached) {
      return JSON.parse(cached);
    }

    const metrics = await this.calculateRestaurantMetrics(restaurantId);
    await redisClient.setex(cacheKey, this.CACHE_TTL, JSON.stringify(metrics));
    
    return metrics;
  }

  static async getUserBehaviorMetrics(): Promise<UserBehaviorMetrics> {
    const cacheKey = 'analytics:user:behavior';
    const cached = await redisClient.get(cacheKey);
    
    if (cached) {
      return JSON.parse(cached);
    }

    const metrics = await this.calculateUserBehaviorMetrics();
    await redisClient.setex(cacheKey, this.CACHE_TTL, JSON.stringify(metrics));
    
    return metrics;
  }

  private static async calculateRealTimeMetrics(): Promise<RealTimeMetrics> {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Active users (users with activity in last 30 minutes)
    const activeUsers = await this.getActiveUsersCount();

    // Reservation counts
    const [
      totalReservations,
      todayReservations,
      pendingReservations,
      completedReservations,
      cancelledReservations
    ] = await Promise.all([
      Reservation.count(),
      Reservation.count({
        where: {
          createdAt: { [Op.gte]: todayStart }
        }
      }),
      Reservation.count({
        where: { status: 'PENDING' }
      }),
      Reservation.count({
        where: { status: 'COMPLETED' }
      }),
      Reservation.count({
        where: { status: 'CANCELLED' }
      })
    ]);

    // Average rating
    const avgRatingResult = await Review.findOne({
      attributes: [
        [Review.sequelize!.fn('AVG', Review.sequelize!.col('rating')), 'avgRating']
      ],
      raw: true
    }) as any;
    const averageRating = parseFloat(avgRatingResult?.avgRating || '0');

    // Total revenue (sum of all completed reservations)
    const revenueResult = await Reservation.findOne({
      attributes: [
        [Reservation.sequelize!.fn('SUM', Reservation.sequelize!.col('totalAmount')), 'totalRevenue']
      ],
      where: {
        status: 'COMPLETED',
        totalAmount: { [Op.not]: null }
      },
      raw: true
    }) as any;
    const totalRevenue = parseFloat(revenueResult?.totalRevenue || '0');

    // Top restaurants by reservations this week
    const topRestaurants = await Restaurant.findAll({
      attributes: [
        'id',
        'name',
        'rating',
        [Restaurant.sequelize!.fn('COUNT', Restaurant.sequelize!.col('reservations.id')), 'reservationCount']
      ],
      include: [{
        model: Reservation,
        attributes: [],
        where: {
          createdAt: { [Op.gte]: weekStart }
        },
        required: false
      }],
      group: ['Restaurant.id'],
      order: [[Restaurant.sequelize!.literal('reservationCount'), 'DESC']],
      limit: 10,
      raw: true
    }) as any[];

    // Hourly bookings for today
    const hourlyBookings = await this.getHourlyBookings(todayStart);

    // Popular cuisines
    const popularCuisines = await this.getPopularCuisines();

    // User growth (last 7 days)
    const userGrowth = await this.getUserGrowthData();

    return {
      activeUsers,
      totalReservations,
      todayReservations,
      pendingReservations,
      completedReservations,
      cancelledReservations,
      averageRating,
      totalRevenue,
      topRestaurants: topRestaurants.map(r => ({
        id: r.id,
        name: r.name,
        reservations: parseInt(r.reservationCount || '0'),
        rating: r.rating || 0
      })),
      hourlyBookings,
      popularCuisines,
      userGrowth
    };
  }

  private static async calculateRestaurantMetrics(restaurantId: string): Promise<RestaurantMetrics> {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    // Reservation counts
    const [todayReservations, weekReservations, monthReservations] = await Promise.all([
      Reservation.count({
        where: {
          restaurantId,
          createdAt: { [Op.gte]: todayStart }
        }
      }),
      Reservation.count({
        where: {
          restaurantId,
          createdAt: { [Op.gte]: weekStart }
        }
      }),
      Reservation.count({
        where: {
          restaurantId,
          createdAt: { [Op.gte]: monthStart }
        }
      })
    ]);

    // Average party size
    const avgPartySizeResult = await Reservation.findOne({
      attributes: [
        [Reservation.sequelize!.fn('AVG', Reservation.sequelize!.col('partySize')), 'avgPartySize']
      ],
      where: { restaurantId },
      raw: true
    }) as any;
    const averagePartySize = parseFloat(avgPartySizeResult?.avgPartySize || '0');

    // Peak hours
    const peakHours = await this.getRestaurantPeakHours(restaurantId);

    // No-show rate
    const noShowRate = await this.calculateNoShowRate(restaurantId);

    // Rating and reviews
    const [avgRatingResult, totalReviews] = await Promise.all([
      Review.findOne({
        attributes: [
          [Review.sequelize!.fn('AVG', Review.sequelize!.col('rating')), 'avgRating']
        ],
        where: { restaurantId },
        raw: true
      }) as any,
      Review.count({ where: { restaurantId } })
    ]);
    const averageRating = parseFloat(avgRatingResult?.avgRating || '0');

    // Revenue
    const revenue = await this.calculateRestaurantRevenue(restaurantId);

    // Table utilization
    const tableUtilization = await this.calculateTableUtilization(restaurantId);

    return {
      restaurantId,
      todayReservations,
      weekReservations,
      monthReservations,
      averagePartySize,
      peakHours,
      noShowRate,
      averageRating,
      totalReviews,
      revenue,
      tableUtilization
    };
  }

  private static async calculateUserBehaviorMetrics(): Promise<UserBehaviorMetrics> {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const [totalUsers, activeUsers, newUsersToday] = await Promise.all([
      User.count(),
      this.getActiveUsersCount(),
      User.count({
        where: {
          createdAt: { [Op.gte]: todayStart }
        }
      })
    ]);

    // Calculate conversion rate (users who made reservations / total users)
    const usersWithReservations = await User.count({
      include: [{
        model: Reservation,
        required: true
      }]
    });
    const conversionRate = totalUsers > 0 ? (usersWithReservations / totalUsers) * 100 : 0;

    // Calculate repeat customer rate
    const repeatCustomers = await User.count({
      include: [{
        model: Reservation,
        required: true,
        having: Reservation.sequelize!.where(
          Reservation.sequelize!.fn('COUNT', Reservation.sequelize!.col('reservations.id')),
          Op.gt,
          1
        )
      }],
      group: ['User.id']
    });
    const repeatCustomerRate = totalUsers > 0 ? (repeatCustomers / totalUsers) * 100 : 0;

    // Average bookings per user
    const totalReservations = await Reservation.count();
    const averageBookingsPerUser = totalUsers > 0 ? totalReservations / totalUsers : 0;

    // Mock data for session time and search terms (would come from tracking)
    const averageSessionTime = 8.5; // minutes
    const topSearchTerms = [
      { term: 'italian', count: 1250 },
      { term: 'pizza', count: 980 },
      { term: 'sushi', count: 850 },
      { term: 'romantic', count: 720 },
      { term: 'brunch', count: 650 }
    ];

    return {
      totalUsers,
      activeUsers,
      newUsersToday,
      averageSessionTime,
      topSearchTerms,
      conversionRate,
      repeatCustomerRate,
      averageBookingsPerUser
    };
  }

  private static async getActiveUsersCount(): Promise<number> {
    // Get active users from Redis (users with recent activity)
    const activeUserKeys = await redisClient.keys('user:activity:*');
    return activeUserKeys.length;
  }

  private static async getHourlyBookings(startDate: Date): Promise<Array<{ hour: number; count: number }>> {
    const hourlyData = await Reservation.findAll({
      attributes: [
        [Reservation.sequelize!.fn('EXTRACT', Reservation.sequelize!.literal('HOUR FROM "createdAt"')), 'hour'],
        [Reservation.sequelize!.fn('COUNT', Reservation.sequelize!.col('id')), 'count']
      ],
      where: {
        createdAt: { [Op.gte]: startDate }
      },
      group: [Reservation.sequelize!.fn('EXTRACT', Reservation.sequelize!.literal('HOUR FROM "createdAt"'))],
      order: [[Reservation.sequelize!.literal('hour'), 'ASC']],
      raw: true
    }) as any[];

    // Fill in missing hours with 0 count
    const result = [];
    for (let hour = 0; hour < 24; hour++) {
      const data = hourlyData.find(h => parseInt(h.hour) === hour);
      result.push({
        hour,
        count: data ? parseInt(data.count) : 0
      });
    }

    return result;
  }

  private static async getPopularCuisines(): Promise<Array<{ cuisine: string; count: number; percentage: number }>> {
    const cuisineData = await Restaurant.findAll({
      attributes: [
        'cuisine',
        [Restaurant.sequelize!.fn('COUNT', Restaurant.sequelize!.col('reservations.id')), 'count']
      ],
      include: [{
        model: Reservation,
        attributes: [],
        required: false
      }],
      group: ['cuisine'],
      order: [[Restaurant.sequelize!.literal('count'), 'DESC']],
      limit: 10,
      raw: true
    }) as any[];

    const totalCount = cuisineData.reduce((sum, item) => sum + parseInt(item.count || '0'), 0);

    return cuisineData.map(item => ({
      cuisine: item.cuisine,
      count: parseInt(item.count || '0'),
      percentage: totalCount > 0 ? (parseInt(item.count || '0') / totalCount) * 100 : 0
    }));
  }

  private static async getUserGrowthData(): Promise<Array<{ date: string; newUsers: number; totalUsers: number }>> {
    const result = [];
    const now = new Date();
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dateStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      const dateEnd = new Date(dateStart.getTime() + 24 * 60 * 60 * 1000);

      const [newUsers, totalUsers] = await Promise.all([
        User.count({
          where: {
            createdAt: {
              [Op.gte]: dateStart,
              [Op.lt]: dateEnd
            }
          }
        }),
        User.count({
          where: {
            createdAt: { [Op.lt]: dateEnd }
          }
        })
      ]);

      result.push({
        date: dateStart.toISOString().split('T')[0],
        newUsers,
        totalUsers
      });
    }

    return result;
  }

  private static async getRestaurantPeakHours(restaurantId: string): Promise<Array<{ hour: number; count: number }>> {
    const hourlyData = await Reservation.findAll({
      attributes: [
        [Reservation.sequelize!.fn('EXTRACT', Reservation.sequelize!.literal('HOUR FROM "time"::timestamp')), 'hour'],
        [Reservation.sequelize!.fn('COUNT', Reservation.sequelize!.col('id')), 'count']
      ],
      where: { restaurantId },
      group: [Reservation.sequelize!.fn('EXTRACT', Reservation.sequelize!.literal('HOUR FROM "time"::timestamp'))],
      order: [[Reservation.sequelize!.literal('count'), 'DESC']],
      limit: 5,
      raw: true
    }) as any[];

    return hourlyData.map(item => ({
      hour: parseInt(item.hour),
      count: parseInt(item.count)
    }));
  }

  private static async calculateNoShowRate(restaurantId: string): Promise<number> {
    const [totalReservations, noShows] = await Promise.all([
      Reservation.count({
        where: {
          restaurantId,
          status: { [Op.in]: ['COMPLETED', 'NO_SHOW'] }
        }
      }),
      Reservation.count({
        where: {
          restaurantId,
          status: 'NO_SHOW'
        }
      })
    ]);

    return totalReservations > 0 ? (noShows / totalReservations) * 100 : 0;
  }

  private static async calculateRestaurantRevenue(restaurantId: string) {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [todayRevenue, weekRevenue, monthRevenue] = await Promise.all([
      this.getRevenueForPeriod(restaurantId, todayStart),
      this.getRevenueForPeriod(restaurantId, weekStart),
      this.getRevenueForPeriod(restaurantId, monthStart)
    ]);

    return {
      today: todayRevenue,
      week: weekRevenue,
      month: monthRevenue
    };
  }

  private static async getRevenueForPeriod(restaurantId: string, startDate: Date): Promise<number> {
    const result = await Reservation.findOne({
      attributes: [
        [Reservation.sequelize!.fn('SUM', Reservation.sequelize!.col('totalAmount')), 'revenue']
      ],
      where: {
        restaurantId,
        status: 'COMPLETED',
        createdAt: { [Op.gte]: startDate },
        totalAmount: { [Op.not]: null }
      },
      raw: true
    }) as any;

    return parseFloat(result?.revenue || '0');
  }

  private static async calculateTableUtilization(restaurantId: string) {
    // This would require table booking data - simplified implementation
    const tables = await Restaurant.findByPk(restaurantId, {
      include: ['tables']
    });

    if (!tables?.tables) return [];

    const utilization = await Promise.all(
      tables.tables.map(async (table: any) => {
        const totalBookings = await Reservation.count({
          where: {
            tableId: table.id,
            status: { [Op.in]: ['COMPLETED', 'SEATED'] }
          }
        });

        // Calculate utilization rate (simplified)
        const utilizationRate = Math.min((totalBookings / 30) * 100, 100); // Assume 30 is max possible bookings

        return {
          tableId: table.id,
          tableNumber: table.tableNumber,
          utilizationRate,
          totalBookings
        };
      })
    );

    return utilization;
  }

  static async updateRealTimeMetrics(): Promise<void> {
    try {
      const metrics = await this.calculateRealTimeMetrics();
      
      // Cache the metrics
      await redisClient.setex('analytics:realtime:metrics', this.CACHE_TTL, JSON.stringify(metrics));
      
      // Publish to subscribers
      pubsub.publish(EVENTS.RESTAURANT_UPDATED, {
        type: 'ANALYTICS_UPDATE',
        data: metrics
      });

      logInfo('Real-time metrics updated successfully');
    } catch (error) {
      logError('Error updating real-time metrics:', error);
    }
  }

  static async trackUserActivity(userId: string): Promise<void> {
    const key = `user:activity:${userId}`;
    await redisClient.setex(key, 1800, Date.now().toString()); // 30 minutes TTL
  }

  static async trackSearchQuery(query: string, userId?: string): Promise<void> {
    const key = 'analytics:search:queries';
    await redisClient.zincrby(key, 1, query);
    
    if (userId) {
      await this.trackUserActivity(userId);
    }
  }
}
