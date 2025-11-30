import { Op, Transaction } from 'sequelize';
import { Review } from '../models/Review';
import { Restaurant } from '../models/Restaurant';
import { Reservation, ReservationStatus } from '../models/Reservation';
import { User } from '../models/User';
import { NotFoundError, BadRequestError, ForbiddenError } from '../middleware/errorHandler';
import { cache, CACHE_KEYS, CACHE_TTL } from '../config/redis';
import { logInfo, logError } from '../utils/logger';
import { sequelize } from '../config/database';

interface CreateReviewData {
  reservationId: string;
  userId: string;
  rating: number;
  foodRating: number;
  serviceRating: number;
  ambianceRating: number;
  valueRating: number;
  title: string;
  content: string;
  wouldRecommend: boolean;
  photos?: string[];
  verifiedDining?: boolean;
}

interface UpdateReviewData {
  rating?: number;
  foodRating?: number;
  serviceRating?: number;
  ambianceRating?: number;
  valueRating?: number;
  title?: string;
  content?: string;
  wouldRecommend?: boolean;
  photos?: string[];
}

interface ReviewSearchParams {
  restaurantId?: string;
  userId?: string;
  minRating?: number;
  maxRating?: number;
  verified?: boolean;
  hasPhotos?: boolean;
  startDate?: Date;
  endDate?: Date;
  page?: number;
  limit?: number;
  sort?: 'newest' | 'oldest' | 'highest' | 'lowest';
}

interface ReviewStats {
  totalReviews: number;
  averageRating: number;
  averageFoodRating: number;
  averageServiceRating: number;
  averageAmbianceRating: number;
  averageValueRating: number;
  recommendPercentage: number;
  ratingDistribution: { [key: number]: number };
}

export class ReviewService {
  /**
   * Create a new review
   */
  static async createReview(data: CreateReviewData): Promise<Review> {
    const transaction = await sequelize.transaction();

    try {
      // Check if reservation exists and belongs to user
      const reservation = await Reservation.findByPk(data.reservationId, {
        include: [{ model: Restaurant, as: 'restaurant' }],
        transaction
      });

      if (!reservation) {
        throw new NotFoundError('Reservation not found');
      }

      if (reservation.userId !== data.userId) {
        throw new ForbiddenError('You can only review your own reservations');
      }

      // Check if reservation is completed
      if (reservation.status !== ReservationStatus.COMPLETED) {
        throw new BadRequestError('You can only review completed reservations');
      }

      // Check if review already exists
      const existingReview = await Review.findOne({
        where: { reservationId: data.reservationId },
        transaction
      });

      if (existingReview) {
        throw new BadRequestError('You have already reviewed this reservation');
      }

      // Verify the user actually dined (within reasonable time)
      const now = new Date();
      const reservationDate = new Date(reservation.dateTime);
      const daysSinceDining = Math.floor((now.getTime() - reservationDate.getTime()) / (1000 * 60 * 60 * 24));

      if (daysSinceDining > 30) {
        throw new BadRequestError('Reviews must be submitted within 30 days of dining');
      }

      // Create review
      const review = await Review.create({
        ...data,
        restaurantId: reservation.restaurantId,
        verifiedDining: true,
        isPublished: true, // Auto-publish verified reviews
        publishedAt: new Date()
      }, { transaction });

      // Update restaurant ratings
      await this.updateRestaurantRatings(reservation.restaurantId, transaction);

      // Update user review count
      await User.increment('totalReviews', {
        where: { id: data.userId },
        transaction
      });

      await transaction.commit();

      // Clear caches
      await cache.del([
        CACHE_KEYS.RESTAURANT(reservation.restaurantId),
        CACHE_KEYS.RESTAURANT_REVIEWS(reservation.restaurantId),
        CACHE_KEYS.USER_REVIEWS(data.userId)
      ]);

      logInfo('Review created successfully', {
        reviewId: review.id,
        restaurantId: reservation.restaurantId,
        userId: data.userId
      });

      return await this.getReviewById(review.id);
    } catch (error) {
      await transaction.rollback();
      logError('Failed to create review', error);
      throw error;
    }
  }

  /**
   * Update review
   */
  static async updateReview(
    reviewId: string,
    userId: string,
    data: UpdateReviewData,
    isAdmin: boolean = false
  ): Promise<Review> {
    const transaction = await sequelize.transaction();

    try {
      const review = await Review.findByPk(reviewId, { transaction });

      if (!review) {
        throw new NotFoundError('Review not found');
      }

      // Check ownership
      if (!isAdmin && review.userId !== userId) {
        throw new ForbiddenError('You can only update your own reviews');
      }

      // Check if review can be edited (within 7 days)
      const daysSinceCreation = Math.floor((new Date().getTime() - review.createdAt.getTime()) / (1000 * 60 * 60 * 24));
      if (daysSinceCreation > 7 && !isAdmin) {
        throw new BadRequestError('Reviews can only be edited within 7 days of posting');
      }

      // Update review
      await review.update({
        ...data,
        editedAt: new Date()
      }, { transaction });

      // Update restaurant ratings if ratings changed
      if (data.rating || data.foodRating || data.serviceRating || data.ambianceRating || data.valueRating) {
        await this.updateRestaurantRatings(review.restaurantId, transaction);
      }

      await transaction.commit();

      // Clear caches
      await cache.del([
        CACHE_KEYS.RESTAURANT(review.restaurantId),
        CACHE_KEYS.RESTAURANT_REVIEWS(review.restaurantId),
        CACHE_KEYS.USER_REVIEWS(userId)
      ]);

      logInfo('Review updated successfully', { reviewId });

      return await this.getReviewById(reviewId);
    } catch (error) {
      await transaction.rollback();
      logError('Failed to update review', error);
      throw error;
    }
  }

  /**
   * Delete review
   */
  static async deleteReview(
    reviewId: string,
    userId: string,
    isAdmin: boolean = false
  ): Promise<void> {
    const transaction = await sequelize.transaction();

    try {
      const review = await Review.findByPk(reviewId, { transaction });

      if (!review) {
        throw new NotFoundError('Review not found');
      }

      // Check ownership
      if (!isAdmin && review.userId !== userId) {
        throw new ForbiddenError('You can only delete your own reviews');
      }

      const restaurantId = review.restaurantId;

      // Soft delete
      await review.update({
        isPublished: false,
        deletedAt: new Date()
      }, { transaction });

      // Update restaurant ratings
      await this.updateRestaurantRatings(restaurantId, transaction);

      // Update user review count
      await User.decrement('totalReviews', {
        where: { id: review.userId },
        transaction
      });

      await transaction.commit();

      // Clear caches
      await cache.del([
        CACHE_KEYS.RESTAURANT(restaurantId),
        CACHE_KEYS.RESTAURANT_REVIEWS(restaurantId),
        CACHE_KEYS.USER_REVIEWS(review.userId)
      ]);

      logInfo('Review deleted successfully', { reviewId });
    } catch (error) {
      await transaction.rollback();
      logError('Failed to delete review', error);
      throw error;
    }
  }

  /**
   * Get review by ID
   */
  static async getReviewById(reviewId: string): Promise<Review> {
    const review = await Review.findByPk(reviewId, {
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'firstName', 'lastName', 'totalReviews']
        },
        {
          model: Restaurant,
          as: 'restaurant',
          attributes: ['id', 'name', 'city']
        },
        {
          model: Reservation,
          as: 'reservation',
          attributes: ['id', 'dateTime', 'partySize']
        }
      ]
    });

    if (!review || !review.isPublished) {
      throw new NotFoundError('Review not found');
    }

    return review;
  }

  /**
   * Search reviews
   */
  static async searchReviews(params: ReviewSearchParams): Promise<{
    reviews: Review[];
    total: number;
    page: number;
    pages: number;
    stats?: ReviewStats;
  }> {
    const {
      restaurantId,
      userId,
      minRating,
      maxRating,
      verified,
      hasPhotos,
      startDate,
      endDate,
      page = 1,
      limit = 20,
      sort = 'newest'
    } = params;

    const where: any = { isPublished: true };

    if (restaurantId) where.restaurantId = restaurantId;
    if (userId) where.userId = userId;
    if (verified !== undefined) where.verifiedDining = verified;
    if (hasPhotos) where.photos = { [Op.ne]: [] };

    if (minRating || maxRating) {
      where.rating = {};
      if (minRating) where.rating[Op.gte] = minRating;
      if (maxRating) where.rating[Op.lte] = maxRating;
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt[Op.gte] = startDate;
      if (endDate) where.createdAt[Op.lte] = endDate;
    }

    // Determine sort order
    let order: any = [];
    switch (sort) {
      case 'newest':
        order = [['createdAt', 'DESC']];
        break;
      case 'oldest':
        order = [['createdAt', 'ASC']];
        break;
      case 'highest':
        order = [['rating', 'DESC']];
        break;
      case 'lowest':
        order = [['rating', 'ASC']];
        break;
    }

    const offset = (page - 1) * limit;

    const { rows: reviews, count: total } = await Review.findAndCountAll({
      where,
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'firstName', 'lastName', 'totalReviews']
        },
        {
          model: Reservation,
          as: 'reservation',
          attributes: ['dateTime', 'partySize']
        }
      ],
      limit,
      offset,
      order,
      distinct: true
    });

    const pages = Math.ceil(total / limit);

    // Get stats if restaurant-specific
    let stats;
    if (restaurantId) {
      stats = await this.getRestaurantReviewStats(restaurantId);
    }

    return {
      reviews,
      total,
      page,
      pages,
      stats
    };
  }

  /**
   * Get restaurant review statistics
   */
  static async getRestaurantReviewStats(restaurantId: string): Promise<ReviewStats> {
    const cacheKey = CACHE_KEYS.RESTAURANT_REVIEW_STATS(restaurantId);
    const cached = await cache.get<ReviewStats>(cacheKey);

    if (cached) {
      return cached;
    }

    const reviews = await Review.findAll({
      where: {
        restaurantId,
        isPublished: true
      },
      attributes: [
        'rating',
        'foodRating',
        'serviceRating',
        'ambianceRating',
        'valueRating',
        'wouldRecommend'
      ]
    });

    if (reviews.length === 0) {
      return {
        totalReviews: 0,
        averageRating: 0,
        averageFoodRating: 0,
        averageServiceRating: 0,
        averageAmbianceRating: 0,
        averageValueRating: 0,
        recommendPercentage: 0,
        ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
      };
    }

    // Calculate averages
    const sum = reviews.reduce((acc, review) => ({
      rating: acc.rating + review.rating,
      foodRating: acc.foodRating + review.foodRating,
      serviceRating: acc.serviceRating + review.serviceRating,
      ambianceRating: acc.ambianceRating + review.ambianceRating,
      valueRating: acc.valueRating + review.valueRating,
      wouldRecommend: acc.wouldRecommend + (review.wouldRecommend ? 1 : 0)
    }), {
      rating: 0,
      foodRating: 0,
      serviceRating: 0,
      ambianceRating: 0,
      valueRating: 0,
      wouldRecommend: 0
    });

    // Calculate rating distribution
    const ratingDistribution = reviews.reduce((acc, review) => {
      const rating = Math.round(review.rating);
      acc[rating] = (acc[rating] || 0) + 1;
      return acc;
    }, {} as { [key: number]: number });

    // Ensure all ratings 1-5 are present
    for (let i = 1; i <= 5; i++) {
      if (!ratingDistribution[i]) {
        ratingDistribution[i] = 0;
      }
    }

    const stats: ReviewStats = {
      totalReviews: reviews.length,
      averageRating: Math.round((sum.rating / reviews.length) * 10) / 10,
      averageFoodRating: Math.round((sum.foodRating / reviews.length) * 10) / 10,
      averageServiceRating: Math.round((sum.serviceRating / reviews.length) * 10) / 10,
      averageAmbianceRating: Math.round((sum.ambianceRating / reviews.length) * 10) / 10,
      averageValueRating: Math.round((sum.valueRating / reviews.length) * 10) / 10,
      recommendPercentage: Math.round((sum.wouldRecommend / reviews.length) * 100),
      ratingDistribution
    };

    await cache.set(cacheKey, stats, CACHE_TTL.MEDIUM);

    return stats;
  }

  /**
   * Get user review summary
   */
  static async getUserReviewSummary(userId: string): Promise<{
    totalReviews: number;
    averageRating: number;
    restaurantsReviewed: number;
    helpfulVotes: number;
    eliteStatus: boolean;
  }> {
    const reviews = await Review.findAll({
      where: {
        userId,
        isPublished: true
      },
      attributes: ['rating', 'helpfulVotes', 'restaurantId']
    });

    if (reviews.length === 0) {
      return {
        totalReviews: 0,
        averageRating: 0,
        restaurantsReviewed: 0,
        helpfulVotes: 0,
        eliteStatus: false
      };
    }

    const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
    const totalHelpfulVotes = reviews.reduce((sum, review) => sum + (review.helpfulVotes || 0), 0);
    const uniqueRestaurants = new Set(reviews.map(r => r.restaurantId)).size;

    return {
      totalReviews: reviews.length,
      averageRating: Math.round((totalRating / reviews.length) * 10) / 10,
      restaurantsReviewed: uniqueRestaurants,
      helpfulVotes: totalHelpfulVotes,
      eliteStatus: reviews.length >= 50 && totalHelpfulVotes >= 100
    };
  }

  /**
   * Mark review as helpful/unhelpful
   */
  static async voteReview(
    reviewId: string,
    userId: string,
    isHelpful: boolean
  ): Promise<Review> {
    const review = await Review.findByPk(reviewId);

    if (!review || !review.isPublished) {
      throw new NotFoundError('Review not found');
    }

    if (review.userId === userId) {
      throw new BadRequestError('You cannot vote on your own review');
    }

    // Track vote (in production, use a separate votes table)
    const votes = review.votes || {};
    votes[userId] = isHelpful;

    const helpfulVotes = Object.values(votes).filter(v => v === true).length;
    const unhelpfulVotes = Object.values(votes).filter(v => v === false).length;

    await review.update({
      votes,
      helpfulVotes,
      unhelpfulVotes
    });

    logInfo('Review vote recorded', { reviewId, userId, isHelpful });

    return review;
  }

  /**
   * Report review
   */
  static async reportReview(
    reviewId: string,
    userId: string,
    reason: string,
    details?: string
  ): Promise<void> {
    const review = await Review.findByPk(reviewId);

    if (!review || !review.isPublished) {
      throw new NotFoundError('Review not found');
    }

    // In production, store reports in a separate table
    const reports = review.reports || [];
    reports.push({
      userId,
      reason,
      details,
      reportedAt: new Date()
    });

    await review.update({
      reports,
      reportCount: reports.length
    });

    // Auto-unpublish if too many reports
    if (reports.length >= 3) {
      await review.update({
        isPublished: false,
        unpublishedReason: 'Multiple reports'
      });

      logInfo('Review auto-unpublished due to reports', { reviewId });
    }

    logInfo('Review reported', { reviewId, userId, reason });
  }

  /**
   * Update restaurant ratings
   */
  private static async updateRestaurantRatings(
    restaurantId: string,
    transaction?: Transaction
  ): Promise<void> {
    const stats = await this.getRestaurantReviewStats(restaurantId);

    await Restaurant.update({
      averageRating: stats.averageRating,
      totalReviews: stats.totalReviews,
      averageFoodRating: stats.averageFoodRating,
      averageServiceRating: stats.averageServiceRating,
      averageAmbianceRating: stats.averageAmbianceRating,
      averageValueRating: stats.averageValueRating
    }, {
      where: { id: restaurantId },
      transaction
    });

    // Clear stats cache
    await cache.del(CACHE_KEYS.RESTAURANT_REVIEW_STATS(restaurantId));
  }
}