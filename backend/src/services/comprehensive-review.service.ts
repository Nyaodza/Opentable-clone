import { Injectable, BadRequestException, UnauthorizedException, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, In, MoreThanOrEqual, LessThanOrEqual, Between, Not, IsNull } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Review, Photo, Vote, Restaurant, User, Reservation } from '../entities';
import * as sharp from 'sharp';
import * as AWS from 'aws-sdk';
import { v4 as uuidv4 } from 'uuid';
import * as Redis from 'ioredis';
import * as natural from 'natural';
import * as toxicity from '@tensorflow-models/toxicity';

interface ReviewRequest {
  reservationId: string;
  userId: string;
  restaurantId: string;
  overallRating: number; // 1-5
  foodRating: number;
  serviceRating: number;
  ambianceRating: number;
  valueRating: number;
  title: string;
  content: string;
  visitDate: Date;
  visitType: 'breakfast' | 'lunch' | 'dinner' | 'brunch' | 'drinks';
  tags?: string[];
  wouldRecommend?: boolean;
  privateNote?: string; // Private note for restaurant
}

interface PhotoUpload {
  reviewId: string;
  userId: string;
  file: Buffer;
  caption?: string;
  category?: 'food' | 'interior' | 'exterior' | 'menu' | 'other';
  dishName?: string;
}

interface ModerationResult {
  approved: boolean;
  flags: string[];
  toxicityScore: number;
  sentimentScore: number;
  requiresManualReview: boolean;
  autoRejectionReason?: string;
  suggestedEdits?: string[];
}

interface RestaurantResponse {
  reviewId: string;
  restaurantId: string;
  managerId: string;
  responseText: string;
}

interface ReviewAnalytics {
  restaurantId: string;
  period: 'week' | 'month' | 'quarter' | 'year';
  averageRating: number;
  ratingBreakdown: {
    overall: number;
    food: number;
    service: number;
    ambiance: number;
    value: number;
  };
  totalReviews: number;
  responseRate: number;
  averageResponseTime: number;
  sentimentAnalysis: {
    positive: number;
    neutral: number;
    negative: number;
  };
  commonThemes: Array<{
    theme: string;
    count: number;
    sentiment: 'positive' | 'negative' | 'neutral';
  }>;
  photoInsights: {
    totalPhotos: number;
    mostPhotographedDishes: Array<{ dish: string; count: number }>;
    photoEngagementRate: number;
  };
  competitorComparison?: {
    yourRating: number;
    areaAverage: number;
    ranking: number;
    totalRestaurantsInArea: number;
  };
}

@Injectable()
export class ComprehensiveReviewService {
  private redis: Redis.Redis;
  private s3: AWS.S3;
  private toxicityModel: any;
  private sentimentAnalyzer: any;

  constructor(
    @InjectRepository(Review)
    private reviewRepository: Repository<Review>,
    @InjectRepository(Photo)
    private photoRepository: Repository<Photo>,
    @InjectRepository(Vote)
    private voteRepository: Repository<Vote>,
    @InjectRepository(Restaurant)
    private restaurantRepository: Repository<Restaurant>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Reservation)
    private reservationRepository: Repository<Reservation>,
    private dataSource: DataSource,
    private eventEmitter: EventEmitter2,
  ) {
    this.redis = new Redis({
      host: process.env.REDIS_HOST,
      port: parseInt(process.env.REDIS_PORT),
    });

    this.s3 = new AWS.S3({
      accessKeyId: process.env.AWS_ACCESS_KEY,
      secretAccessKey: process.env.AWS_SECRET_KEY,
      region: process.env.AWS_REGION,
    });

    // Initialize NLP tools
    this.sentimentAnalyzer = new natural.SentimentAnalyzer('English', natural.PorterStemmer, 'afinn');
    this.initializeToxicityModel();
  }

  private async initializeToxicityModel() {
    try {
      this.toxicityModel = await toxicity.load();
    } catch (error) {
      console.error('Failed to load toxicity model:', error);
    }
  }

  // Create a new review with automatic moderation
  async createReview(request: ReviewRequest): Promise<any> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Verify user has a completed reservation at this restaurant
      const reservation = await this.reservationRepository.findOne({
        where: {
          id: request.reservationId,
          userId: request.userId,
          restaurantId: request.restaurantId,
          status: 'completed',
        },
      });

      if (!reservation) {
        throw new BadRequestException('You can only review restaurants you have visited');
      }

      // Check if review already exists for this reservation
      const existingReview = await this.reviewRepository.findOne({
        where: { reservationId: request.reservationId },
      });

      if (existingReview) {
        throw new ConflictException('You have already reviewed this visit');
      }

      // Moderate the review content
      const moderationResult = await this.moderateReview(request);

      if (!moderationResult.approved && moderationResult.autoRejectionReason) {
        await queryRunner.rollbackTransaction();
        return {
          success: false,
          reason: moderationResult.autoRejectionReason,
          suggestedEdits: moderationResult.suggestedEdits,
        };
      }

      // Create the review
      const review = this.reviewRepository.create({
        ...request,
        status: moderationResult.requiresManualReview ? 'pending_moderation' : 'published',
        moderationFlags: moderationResult.flags,
        toxicityScore: moderationResult.toxicityScore,
        sentimentScore: moderationResult.sentimentScore,
        verifiedDiner: true, // Since we verified the reservation
        helpfulVotes: 0,
        responseFromRestaurant: null,
        createdAt: new Date(),
      });

      await queryRunner.manager.save(review);

      // Update restaurant ratings
      await this.updateRestaurantRatings(request.restaurantId, queryRunner);

      // Award points for the review
      this.eventEmitter.emit('loyalty.points.earned', {
        userId: request.userId,
        points: 100,
        source: 'review_submitted',
        metadata: { reviewId: review.id },
      });

      // Check for Elite status qualification
      await this.checkEliteStatus(request.userId);

      // Send notifications
      this.eventEmitter.emit('notification.send', {
        type: 'review_received',
        recipientId: restaurant.ownerId,
        data: {
          reviewId: review.id,
          restaurantName: restaurant.name,
          rating: request.overallRating,
        },
      });

      await queryRunner.commitTransaction();

      // Invalidate caches
      await this.invalidateReviewCaches(request.restaurantId);

      return {
        success: true,
        review,
        moderationStatus: review.status,
        pointsEarned: 100,
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  // Upload photos for a review
  async uploadReviewPhoto(upload: PhotoUpload): Promise<any> {
    try {
      // Verify the review exists and belongs to the user
      const review = await this.reviewRepository.findOne({
        where: { id: upload.reviewId, userId: upload.userId },
      });

      if (!review) {
        throw new NotFoundException('Review not found');
      }

      // Process the image
      const processedImages = await this.processImage(upload.file);
      const photoId = uuidv4();

      // Upload to S3
      const uploadPromises = Object.entries(processedImages).map(([size, buffer]) => {
        const key = `reviews/${upload.reviewId}/${photoId}_${size}.jpg`;
        return this.s3.upload({
          Bucket: process.env.AWS_BUCKET,
          Key: key,
          Body: buffer,
          ContentType: 'image/jpeg',
        }).promise();
      });

      await Promise.all(uploadPromises);

      // Save photo metadata
      const photo = this.photoRepository.create({
        id: photoId,
        reviewId: upload.reviewId,
        userId: upload.userId,
        url: `https://${process.env.AWS_BUCKET}.s3.amazonaws.com/reviews/${upload.reviewId}/${photoId}_large.jpg`,
        thumbnailUrl: `https://${process.env.AWS_BUCKET}.s3.amazonaws.com/reviews/${upload.reviewId}/${photoId}_thumb.jpg`,
        caption: upload.caption,
        category: upload.category,
        dishName: upload.dishName,
        helpfulVotes: 0,
        verified: true, // Since user has verified reservation
        createdAt: new Date(),
      });

      await this.photoRepository.save(photo);

      // Award points for photo upload
      this.eventEmitter.emit('loyalty.points.earned', {
        userId: upload.userId,
        points: 50,
        source: 'photo_uploaded',
        metadata: { photoId: photo.id },
      });

      return {
        success: true,
        photo,
        pointsEarned: 50,
      };
    } catch (error) {
      throw error;
    }
  }

  // Process uploaded images
  private async processImage(buffer: Buffer): Promise<any> {
    const sizes = {
      thumb: { width: 150, height: 150 },
      medium: { width: 600, height: 400 },
      large: { width: 1200, height: 800 },
    };

    const processedImages = {};

    for (const [size, dimensions] of Object.entries(sizes)) {
      processedImages[size] = await sharp(buffer)
        .resize(dimensions.width, dimensions.height, {
          fit: 'cover',
          position: 'center',
        })
        .jpeg({ quality: size === 'thumb' ? 70 : 85 })
        .toBuffer();
    }

    return processedImages;
  }

  // Moderate review content
  private async moderateReview(review: ReviewRequest): Promise<ModerationResult> {
    const result: ModerationResult = {
      approved: true,
      flags: [],
      toxicityScore: 0,
      sentimentScore: 0,
      requiresManualReview: false,
    };

    // Check for profanity and toxicity
    if (this.toxicityModel) {
      const predictions = await this.toxicityModel.classify([review.content]);

      for (const prediction of predictions) {
        if (prediction.results[0].match) {
          result.flags.push(prediction.label);
          result.toxicityScore = Math.max(result.toxicityScore, prediction.results[0].probabilities[1]);
        }
      }

      if (result.toxicityScore > 0.8) {
        result.approved = false;
        result.autoRejectionReason = 'Review contains inappropriate content';
        return result;
      } else if (result.toxicityScore > 0.5) {
        result.requiresManualReview = true;
      }
    }

    // Sentiment analysis
    const tokens = new natural.WordTokenizer().tokenize(review.content);
    result.sentimentScore = this.sentimentAnalyzer.getSentiment(tokens);

    // Check for suspicious patterns
    const suspiciousPatterns = [
      /\b(fake|scam|fraud|ripoff)\b/gi,
      /\b(competitor|other restaurant)\b/gi,
      /\b(sue|lawsuit|legal action)\b/gi,
    ];

    for (const pattern of suspiciousPatterns) {
      if (pattern.test(review.content)) {
        result.flags.push('suspicious_content');
        result.requiresManualReview = true;
      }
    }

    // Check review length
    if (review.content.length < 50) {
      result.flags.push('too_short');
      result.suggestedEdits = ['Please provide more details about your experience'];
    } else if (review.content.length > 5000) {
      result.flags.push('too_long');
      result.suggestedEdits = ['Please consider shortening your review'];
    }

    // Check for all caps
    const capsRatio = (review.content.match(/[A-Z]/g) || []).length / review.content.length;
    if (capsRatio > 0.5) {
      result.flags.push('excessive_caps');
      result.suggestedEdits = ['Please avoid using all capital letters'];
    }

    return result;
  }

  // Restaurant response to review
  async respondToReview(response: RestaurantResponse): Promise<any> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Verify restaurant manager
      const restaurant = await this.restaurantRepository.findOne({
        where: { id: response.restaurantId },
        relations: ['managers'],
      });

      if (!restaurant.managers.some(m => m.id === response.managerId)) {
        throw new UnauthorizedException('Not authorized to respond for this restaurant');
      }

      // Get the review
      const review = await this.reviewRepository.findOne({
        where: { id: response.reviewId, restaurantId: response.restaurantId },
      });

      if (!review) {
        throw new NotFoundException('Review not found');
      }

      if (review.responseFromRestaurant) {
        throw new ConflictException('Review already has a response');
      }

      // Moderate the response
      const moderationResult = await this.moderateResponse(response.responseText);

      if (!moderationResult.approved) {
        await queryRunner.rollbackTransaction();
        return {
          success: false,
          reason: moderationResult.reason,
        };
      }

      // Save the response
      review.responseFromRestaurant = response.responseText;
      review.responseDate = new Date();
      review.respondedBy = response.managerId;

      await queryRunner.manager.save(review);

      // Notify the reviewer
      this.eventEmitter.emit('notification.send', {
        type: 'review_response',
        recipientId: review.userId,
        data: {
          reviewId: review.id,
          restaurantName: restaurant.name,
        },
      });

      await queryRunner.commitTransaction();

      return {
        success: true,
        response: response.responseText,
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  // Moderate restaurant response
  private async moderateResponse(text: string): Promise<any> {
    // Basic moderation for restaurant responses
    const inappropriatePatterns = [
      /\b(stupid|idiot|moron|liar)\b/gi,
      /\b(fake review|paid review)\b/gi,
      /\b(sue|legal|lawyer)\b/gi,
    ];

    for (const pattern of inappropriatePatterns) {
      if (pattern.test(text)) {
        return {
          approved: false,
          reason: 'Response contains inappropriate content',
        };
      }
    }

    return { approved: true };
  }

  // Vote on review helpfulness
  async voteHelpful(reviewId: string, userId: string, isHelpful: boolean): Promise<any> {
    try {
      // Check if user already voted
      const existingVote = await this.voteRepository.findOne({
        where: { reviewId, userId },
      });

      if (existingVote) {
        // Update existing vote
        existingVote.isHelpful = isHelpful;
        existingVote.updatedAt = new Date();
        await this.voteRepository.save(existingVote);
      } else {
        // Create new vote
        const vote = this.voteRepository.create({
          reviewId,
          userId,
          isHelpful,
          createdAt: new Date(),
        });
        await this.voteRepository.save(vote);
      }

      // Update review helpful count
      const helpfulCount = await this.voteRepository.count({
        where: { reviewId, isHelpful: true },
      });

      await this.reviewRepository.update(reviewId, {
        helpfulVotes: helpfulCount,
      });

      return {
        success: true,
        helpfulCount,
      };
    } catch (error) {
      throw error;
    }
  }

  // Get review analytics for restaurant
  async getReviewAnalytics(restaurantId: string, period: string): Promise<ReviewAnalytics> {
    const cacheKey = `analytics:reviews:${restaurantId}:${period}`;
    const cached = await this.redis.get(cacheKey);

    if (cached) {
      return JSON.parse(cached);
    }

    const startDate = this.getStartDateForPeriod(period);

    // Get reviews for the period
    const reviews = await this.reviewRepository.find({
      where: {
        restaurantId,
        createdAt: MoreThanOrEqual(startDate),
        status: 'published',
      },
      relations: ['photos'],
    });

    // Calculate metrics
    const analytics: ReviewAnalytics = {
      restaurantId,
      period: period as any,
      averageRating: 0,
      ratingBreakdown: {
        overall: 0,
        food: 0,
        service: 0,
        ambiance: 0,
        value: 0,
      },
      totalReviews: reviews.length,
      responseRate: 0,
      averageResponseTime: 0,
      sentimentAnalysis: {
        positive: 0,
        neutral: 0,
        negative: 0,
      },
      commonThemes: [],
      photoInsights: {
        totalPhotos: 0,
        mostPhotographedDishes: [],
        photoEngagementRate: 0,
      },
    };

    if (reviews.length > 0) {
      // Calculate average ratings
      const ratingTotals = reviews.reduce((acc, review) => ({
        overall: acc.overall + review.overallRating,
        food: acc.food + review.foodRating,
        service: acc.service + review.serviceRating,
        ambiance: acc.ambiance + review.ambianceRating,
        value: acc.value + review.valueRating,
      }), { overall: 0, food: 0, service: 0, ambiance: 0, value: 0 });

      analytics.averageRating = ratingTotals.overall / reviews.length;
      analytics.ratingBreakdown = {
        overall: ratingTotals.overall / reviews.length,
        food: ratingTotals.food / reviews.length,
        service: ratingTotals.service / reviews.length,
        ambiance: ratingTotals.ambiance / reviews.length,
        value: ratingTotals.value / reviews.length,
      };

      // Calculate response rate
      const reviewsWithResponses = reviews.filter(r => r.responseFromRestaurant);
      analytics.responseRate = (reviewsWithResponses.length / reviews.length) * 100;

      // Calculate average response time
      if (reviewsWithResponses.length > 0) {
        const totalResponseTime = reviewsWithResponses.reduce((acc, review) => {
          const responseTime = review.responseDate.getTime() - review.createdAt.getTime();
          return acc + responseTime;
        }, 0);
        analytics.averageResponseTime = totalResponseTime / reviewsWithResponses.length / (1000 * 60 * 60); // in hours
      }

      // Sentiment analysis
      reviews.forEach(review => {
        if (review.sentimentScore > 0.5) {
          analytics.sentimentAnalysis.positive++;
        } else if (review.sentimentScore < -0.5) {
          analytics.sentimentAnalysis.negative++;
        } else {
          analytics.sentimentAnalysis.neutral++;
        }
      });

      // Extract common themes (simplified version)
      analytics.commonThemes = await this.extractCommonThemes(reviews);

      // Photo insights
      const allPhotos = reviews.flatMap(r => r.photos || []);
      analytics.photoInsights.totalPhotos = allPhotos.length;

      // Count dish mentions
      const dishCounts = {};
      allPhotos.forEach(photo => {
        if (photo.dishName) {
          dishCounts[photo.dishName] = (dishCounts[photo.dishName] || 0) + 1;
        }
      });

      analytics.photoInsights.mostPhotographedDishes = Object.entries(dishCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
        .map(([dish, count]) => ({ dish, count }));

      // Photo engagement rate
      const photosWithVotes = allPhotos.filter(p => p.helpfulVotes > 0);
      analytics.photoInsights.photoEngagementRate =
        allPhotos.length > 0 ? (photosWithVotes.length / allPhotos.length) * 100 : 0;
    }

    // Get competitor comparison (simplified)
    analytics.competitorComparison = await this.getCompetitorComparison(restaurantId);

    // Cache for 1 hour
    await this.redis.setex(cacheKey, 3600, JSON.stringify(analytics));

    return analytics;
  }

  // Extract common themes from reviews
  private async extractCommonThemes(reviews: any[]): Promise<any[]> {
    const themes = {
      service: { positive: 0, negative: 0 },
      food: { positive: 0, negative: 0 },
      ambiance: { positive: 0, negative: 0 },
      value: { positive: 0, negative: 0 },
      wait_time: { positive: 0, negative: 0 },
    };

    const themeKeywords = {
      service: ['service', 'waiter', 'staff', 'attentive', 'friendly', 'rude'],
      food: ['food', 'dish', 'meal', 'delicious', 'tasty', 'bland', 'cold'],
      ambiance: ['ambiance', 'atmosphere', 'decor', 'music', 'noisy', 'cozy'],
      value: ['value', 'price', 'expensive', 'affordable', 'worth', 'overpriced'],
      wait_time: ['wait', 'slow', 'quick', 'fast', 'delayed'],
    };

    reviews.forEach(review => {
      const content = review.content.toLowerCase();
      const isPositive = review.sentimentScore > 0;

      Object.entries(themeKeywords).forEach(([theme, keywords]) => {
        if (keywords.some(keyword => content.includes(keyword))) {
          themes[theme][isPositive ? 'positive' : 'negative']++;
        }
      });
    });

    // Format themes
    return Object.entries(themes)
      .map(([theme, counts]) => {
        const total = counts.positive + counts.negative;
        if (total === 0) return null;

        const sentiment = counts.positive > counts.negative ? 'positive' :
                         counts.negative > counts.positive ? 'negative' : 'neutral';

        return {
          theme: theme.replace('_', ' '),
          count: total,
          sentiment,
        };
      })
      .filter(Boolean)
      .sort((a, b) => b.count - a.count);
  }

  // Get competitor comparison
  private async getCompetitorComparison(restaurantId: string): Promise<any> {
    const restaurant = await this.restaurantRepository.findOne({
      where: { id: restaurantId },
    });

    if (!restaurant) {
      return null;
    }

    // Get nearby restaurants (simplified - would use geo queries in production)
    const nearbyRestaurants = await this.restaurantRepository.find({
      where: {
        city: restaurant.city,
        cuisineType: restaurant.cuisineType,
        id: Not(restaurantId),
      },
    });

    if (nearbyRestaurants.length === 0) {
      return null;
    }

    // Calculate area average
    const areaTotal = nearbyRestaurants.reduce((acc, r) => acc + r.averageRating, 0);
    const areaAverage = areaTotal / nearbyRestaurants.length;

    // Determine ranking
    const allRestaurants = [...nearbyRestaurants, restaurant]
      .sort((a, b) => b.averageRating - a.averageRating);

    const ranking = allRestaurants.findIndex(r => r.id === restaurantId) + 1;

    return {
      yourRating: restaurant.averageRating,
      areaAverage,
      ranking,
      totalRestaurantsInArea: allRestaurants.length,
    };
  }

  // Check if user qualifies for Elite status
  private async checkEliteStatus(userId: string): Promise<void> {
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    // Count user's reviews in the past year
    const reviewCount = await this.reviewRepository.count({
      where: {
        userId,
        createdAt: MoreThanOrEqual(oneYearAgo),
        status: 'published',
      },
    });

    // Count helpful votes
    const reviews = await this.reviewRepository.find({
      where: { userId },
      select: ['helpfulVotes'],
    });

    const totalHelpfulVotes = reviews.reduce((acc, r) => acc + r.helpfulVotes, 0);

    // Check Elite criteria (25+ reviews, 100+ helpful votes)
    if (reviewCount >= 25 && totalHelpfulVotes >= 100) {
      const user = await this.userRepository.findOne({
        where: { id: userId },
      });

      if (!user.isElite) {
        user.isElite = true;
        user.eliteSince = new Date();
        await this.userRepository.save(user);

        // Award Elite badge
        this.eventEmitter.emit('user.badge.awarded', {
          userId,
          badge: 'elite_reviewer',
          reason: 'Achieved Elite status',
        });
      }
    }
  }

  // Update restaurant ratings
  private async updateRestaurantRatings(restaurantId: string, queryRunner: any): Promise<void> {
    const reviews = await queryRunner.manager.find(Review, {
      where: { restaurantId, status: 'published' },
    });

    if (reviews.length === 0) return;

    const totals = reviews.reduce((acc, review) => ({
      overall: acc.overall + review.overallRating,
      food: acc.food + review.foodRating,
      service: acc.service + review.serviceRating,
      ambiance: acc.ambiance + review.ambianceRating,
      value: acc.value + review.valueRating,
    }), { overall: 0, food: 0, service: 0, ambiance: 0, value: 0 });

    const count = reviews.length;

    await queryRunner.manager.update(Restaurant, restaurantId, {
      averageRating: totals.overall / count,
      foodRating: totals.food / count,
      serviceRating: totals.service / count,
      ambianceRating: totals.ambiance / count,
      valueRating: totals.value / count,
      reviewCount: count,
    });
  }

  // Helper methods
  private getStartDateForPeriod(period: string): Date {
    const now = new Date();
    switch (period) {
      case 'week':
        return new Date(now.setDate(now.getDate() - 7));
      case 'month':
        return new Date(now.setMonth(now.getMonth() - 1));
      case 'quarter':
        return new Date(now.setMonth(now.getMonth() - 3));
      case 'year':
        return new Date(now.setFullYear(now.getFullYear() - 1));
      default:
        return new Date(now.setMonth(now.getMonth() - 1));
    }
  }

  private async invalidateReviewCaches(restaurantId: string): Promise<void> {
    const patterns = [
      `reviews:${restaurantId}:*`,
      `analytics:reviews:${restaurantId}:*`,
      `restaurant:${restaurantId}:ratings`,
    ];

    for (const pattern of patterns) {
      const keys = await this.redis.keys(pattern);
      if (keys.length > 0) {
        await this.redis.del(...keys);
      }
    }
  }
}