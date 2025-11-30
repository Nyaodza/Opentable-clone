import { Reservation } from '../models/Reservation';
import { Restaurant } from '../models/Restaurant';
import { Review } from '../models/Review';
import { Op } from 'sequelize';
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

export interface SocialProofData {
  bookedToday: number;
  bookedThisWeek: number;
  viewing: number;
  trendingScore: number;
  popularityRank?: number;
  recentBookings: Array<{ time: string; partySize: number }>;
  similarRestaurants: string[];
}

export class SocialProofService {
  /**
   * Get social proof indicators for a restaurant
   */
  async getSocialProof(restaurantId: string): Promise<SocialProofData> {
    const now = new Date();
    const todayStart = new Date(now.setHours(0, 0, 0, 0));
    const weekStart = new Date(now.setDate(now.getDate() - 7));

    // Get bookings today
    const bookedToday = await Reservation.count({
      where: {
        restaurantId,
        createdAt: { [Op.gte]: todayStart },
        status: { [Op.in]: ['confirmed', 'seated'] },
      },
    });

    // Get bookings this week
    const bookedThisWeek = await Reservation.count({
      where: {
        restaurantId,
        createdAt: { [Op.gte]: weekStart },
        status: { [Op.in]: ['confirmed', 'seated'] },
      },
    });

    // Get current viewers (from Redis)
    const viewing = await this.getCurrentViewers(restaurantId);

    // Calculate trending score
    const trendingScore = await this.calculateTrendingScore(restaurantId);

    // Get recent bookings (anonymized)
    const recentBookings = await this.getRecentBookings(restaurantId);

    // Get similar restaurants
    const similarRestaurants = await this.findSimilarRestaurants(restaurantId);

    return {
      bookedToday,
      bookedThisWeek,
      viewing,
      trendingScore,
      recentBookings,
      similarRestaurants,
    };
  }

  /**
   * Track restaurant page view
   */
  async trackView(restaurantId: string, userId?: string): Promise<void> {
    const key = `restaurant:${restaurantId}:viewers`;
    const viewerId = userId || `anon-${Date.now()}`;

    // Add to viewers set with expiration
    await redis.sadd(key, viewerId);
    await redis.expire(key, 300); // 5 minutes

    // Track view count
    const viewCountKey = `restaurant:${restaurantId}:views:${this.getDateKey()}`;
    await redis.incr(viewCountKey);
    await redis.expire(viewCountKey, 86400); // 24 hours
  }

  /**
   * Get current viewers count
   */
  async getCurrentViewers(restaurantId: string): Promise<number> {
    const key = `restaurant:${restaurantId}:viewers`;
    return await redis.scard(key);
  }

  /**
   * Calculate trending score
   */
  private async calculateTrendingScore(restaurantId: string): Promise<number> {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Recent bookings
    const recentBookings = await Reservation.count({
      where: {
        restaurantId,
        createdAt: { [Op.gte]: oneDayAgo },
      },
    });

    // Weekly bookings
    const weeklyBookings = await Reservation.count({
      where: {
        restaurantId,
        createdAt: { [Op.gte]: oneWeekAgo },
      },
    });

    // Recent reviews
    const recentReviews = await Review.count({
      where: {
        restaurantId,
        createdAt: { [Op.gte]: oneWeekAgo },
      },
    });

    // Views today
    const viewsKey = `restaurant:${restaurantId}:views:${this.getDateKey()}`;
    const views = parseInt((await redis.get(viewsKey)) || '0');

    // Calculate weighted score
    const score =
      recentBookings * 10 + // Heavy weight on recent bookings
      weeklyBookings * 2 +
      recentReviews * 5 +
      views * 0.1;

    return Math.round(score);
  }

  /**
   * Get recent bookings (anonymized)
   */
  private async getRecentBookings(
    restaurantId: string
  ): Promise<Array<{ time: string; partySize: number }>> {
    const recentReservations = await Reservation.findAll({
      where: {
        restaurantId,
        createdAt: { [Op.gte]: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        status: { [Op.in]: ['confirmed', 'seated'] },
      },
      order: [['createdAt', 'DESC']],
      limit: 5,
      attributes: ['createdAt', 'partySize'],
    });

    return recentReservations.map((r) => ({
      time: this.getRelativeTime(r.createdAt),
      partySize: r.partySize,
    }));
  }

  /**
   * Find similar restaurants
   */
  private async findSimilarRestaurants(restaurantId: string): Promise<string[]> {
    const restaurant = await Restaurant.findByPk(restaurantId);
    if (!restaurant) return [];

    // Find restaurants with same cuisine and price range
    const similar = await Restaurant.findAll({
      where: {
        id: { [Op.ne]: restaurantId },
        cuisine: restaurant.cuisine,
        priceRange: restaurant.priceRange,
        isActive: true,
      },
      limit: 3,
      attributes: ['id', 'name'],
    });

    return similar.map((r) => r.id);
  }

  /**
   * Get popularity rank
   */
  async getPopularityRank(restaurantId: string, location?: string): Promise<number> {
    // Get all restaurants and their trending scores
    const restaurants = await Restaurant.findAll({
      where: { isActive: true },
      attributes: ['id'],
    });

    const scores = await Promise.all(
      restaurants.map(async (r) => ({
        id: r.id,
        score: await this.calculateTrendingScore(r.id),
      }))
    );

    // Sort by score
    scores.sort((a, b) => b.score - a.score);

    // Find rank
    const rank = scores.findIndex((s) => s.id === restaurantId) + 1;
    return rank || 999;
  }

  /**
   * Track booking (for "just booked" notifications)
   */
  async trackBooking(restaurantId: string, partySize: number): Promise<void> {
    const key = `restaurant:${restaurantId}:recent_bookings`;

    await redis.lpush(
      key,
      JSON.stringify({
        timestamp: Date.now(),
        partySize,
      })
    );

    // Keep only last 10 bookings
    await redis.ltrim(key, 0, 9);
    await redis.expire(key, 3600); // 1 hour
  }

  /**
   * Get "just booked" notifications
   */
  async getRecentBookingNotifications(restaurantId: string): Promise<any[]> {
    const key = `restaurant:${restaurantId}:recent_bookings`;
    const bookings = await redis.lrange(key, 0, 4); // Last 5

    return bookings.map((b) => JSON.parse(b)).filter((b) => {
      // Only show bookings from last 15 minutes
      return Date.now() - b.timestamp < 15 * 60 * 1000;
    });
  }

  /**
   * Helper: Get relative time string
   */
  private getRelativeTime(date: Date): string {
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);

    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
    return `${Math.floor(seconds / 86400)} days ago`;
  }

  /**
   * Helper: Get date key for Redis
   */
  private getDateKey(): string {
    const now = new Date();
    return `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
  }
}

export default new SocialProofService();
