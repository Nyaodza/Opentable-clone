import { Op } from 'sequelize';
import { Restaurant } from '../models/Restaurant';
import { User } from '../models/User';
import { Reservation } from '../models/Reservation';
import { Review } from '../models/Review';
import { redisClient } from '../config/redis';
import { AppError } from '../utils/errors';
import * as tf from '@tensorflow/tfjs-node';
import axios from 'axios';

export interface UserPreferences {
  cuisineTypes: string[];
  priceRanges: string[];
  dietaryRestrictions: string[];
  avgRating: number;
  preferredTimes: string[];
  preferredDays: number[];
  avgPartySize: number;
  preferredLocations: { lat: number; lng: number }[];
  maxDistance: number;
}

export interface RestaurantFeatures {
  cuisineType: string;
  priceRange: string;
  avgRating: number;
  totalReviews: number;
  popularTimes: string[];
  features: string[];
  dietaryOptions: string[];
  location: { lat: number; lng: number };
}

export interface RecommendationScore {
  restaurantId: string;
  score: number;
  reasons: string[];
  matchPercentage: number;
}

export class RecommendationService {
  private static model: tf.LayersModel | null = null;
  private static readonly CACHE_TTL = 3600; // 1 hour

  static async initialize(): Promise<void> {
    try {
      // Load pre-trained model
      this.model = await tf.loadLayersModel('file://./models/recommendation-model.json');
    } catch (error) {
      console.error('Failed to load recommendation model:', error);
      // Continue without model - will use rule-based recommendations
    }
  }

  static async getPersonalizedRecommendations(
    userId: string,
    options: {
      limit?: number;
      location?: { lat: number; lng: number };
      date?: Date;
      time?: string;
      partySize?: number;
    } = {}
  ): Promise<RecommendationScore[]> {
    // Check cache first
    const cacheKey = `recommendations:${userId}:${JSON.stringify(options)}`;
    const cached = await redisClient.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    // Get user preferences
    const userPreferences = await this.getUserPreferences(userId);

    // Get candidate restaurants
    const candidates = await this.getCandidateRestaurants(userId, options);

    // Score each restaurant
    const recommendations = await Promise.all(
      candidates.map(async (restaurant) => {
        const score = await this.scoreRestaurant(
          restaurant,
          userPreferences,
          options
        );
        return score;
      })
    );

    // Sort by score
    recommendations.sort((a, b) => b.score - a.score);

    // Limit results
    const limited = recommendations.slice(0, options.limit || 20);

    // Cache results
    await redisClient.setex(cacheKey, this.CACHE_TTL, JSON.stringify(limited));

    return limited;
  }

  static async getUserPreferences(userId: string): Promise<UserPreferences> {
    // Get user's dining history
    const reservations = await Reservation.findAll({
      where: {
        userId,
        status: 'completed',
      },
      include: [
        {
          model: Restaurant,
          attributes: [
            'cuisineType',
            'priceRange',
            'latitude',
            'longitude',
            'dietaryRestrictions',
          ],
        },
      ],
      order: [['createdAt', 'DESC']],
      limit: 100,
    });

    // Get user's reviews
    const reviews = await Review.findAll({
      where: { userId },
      attributes: ['rating'],
    });

    // Analyze preferences
    const cuisineTypes = this.getMostFrequent(
      reservations.map(r => r.restaurant.cuisineType)
    );
    
    const priceRanges = this.getMostFrequent(
      reservations.map(r => r.restaurant.priceRange)
    );

    const dietaryRestrictions = new Set<string>();
    reservations.forEach(r => {
      r.restaurant.dietaryRestrictions?.forEach(d => dietaryRestrictions.add(d));
    });

    const avgRating = reviews.length > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
      : 4.0;

    const times = reservations.map(r => r.time);
    const preferredTimes = this.getMostFrequent(times);

    const days = reservations.map(r => new Date(r.date).getDay());
    const preferredDays = this.getMostFrequent(days);

    const partySizes = reservations.map(r => r.partySize);
    const avgPartySize = partySizes.length > 0
      ? Math.round(partySizes.reduce((sum, size) => sum + size, 0) / partySizes.length)
      : 2;

    const locations = reservations
      .filter(r => r.restaurant.latitude && r.restaurant.longitude)
      .map(r => ({
        lat: r.restaurant.latitude!,
        lng: r.restaurant.longitude!,
      }));

    return {
      cuisineTypes,
      priceRanges,
      dietaryRestrictions: Array.from(dietaryRestrictions),
      avgRating,
      preferredTimes,
      preferredDays,
      avgPartySize,
      preferredLocations: locations,
      maxDistance: 10, // Default 10km
    };
  }

  static async getCandidateRestaurants(
    userId: string,
    options: any
  ): Promise<Restaurant[]> {
    const where: any = {
      isActive: true,
      isVerified: true,
    };

    // Location filter
    if (options.location) {
      // Get restaurants within radius
      const nearbyRestaurants = await this.getNearbyRestaurants(
        options.location.lat,
        options.location.lng,
        options.maxDistance || 10
      );
      where.id = { [Op.in]: nearbyRestaurants.map(r => r.id) };
    }

    // Exclude restaurants user has visited recently
    const recentVisits = await Reservation.findAll({
      where: {
        userId,
        createdAt: {
          [Op.gte]: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days
        },
      },
      attributes: ['restaurantId'],
      group: ['restaurantId'],
    });

    if (recentVisits.length > 0) {
      where.id = {
        ...where.id,
        [Op.notIn]: recentVisits.map(r => r.restaurantId),
      };
    }

    return Restaurant.findAll({
      where,
      limit: 100,
    });
  }

  static async scoreRestaurant(
    restaurant: Restaurant,
    userPreferences: UserPreferences,
    options: any
  ): Promise<RecommendationScore> {
    let score = 0;
    const reasons: string[] = [];
    const weights = {
      cuisine: 0.25,
      price: 0.15,
      rating: 0.20,
      distance: 0.15,
      dietary: 0.10,
      availability: 0.10,
      trending: 0.05,
    };

    // Cuisine match
    if (userPreferences.cuisineTypes.includes(restaurant.cuisineType)) {
      score += weights.cuisine;
      reasons.push(`Matches your preferred cuisine: ${restaurant.cuisineType}`);
    }

    // Price range match
    if (userPreferences.priceRanges.includes(restaurant.priceRange)) {
      score += weights.price;
      reasons.push('In your preferred price range');
    }

    // Rating match
    if (restaurant.averageRating >= userPreferences.avgRating) {
      score += weights.rating * (restaurant.averageRating / 5);
      reasons.push(`Highly rated: ${restaurant.averageRating.toFixed(1)} stars`);
    }

    // Distance score (if location provided)
    if (options.location && restaurant.latitude && restaurant.longitude) {
      const distance = this.calculateDistance(
        options.location.lat,
        options.location.lng,
        restaurant.latitude,
        restaurant.longitude
      );
      
      if (distance <= 2) {
        score += weights.distance;
        reasons.push('Very close to you');
      } else if (distance <= 5) {
        score += weights.distance * 0.7;
        reasons.push('Nearby');
      } else if (distance <= 10) {
        score += weights.distance * 0.4;
      }
    }

    // Dietary restrictions match
    const matchingDietary = userPreferences.dietaryRestrictions.filter(d =>
      restaurant.dietaryRestrictions?.includes(d)
    );
    if (matchingDietary.length > 0) {
      score += weights.dietary;
      reasons.push(`Accommodates: ${matchingDietary.join(', ')}`);
    }

    // Availability check
    if (options.date && options.time) {
      const isAvailable = await this.checkAvailability(
        restaurant.id,
        options.date,
        options.time,
        options.partySize || 2
      );
      if (isAvailable) {
        score += weights.availability;
        reasons.push('Available at your preferred time');
      }
    }

    // Trending bonus
    if (await this.isTrending(restaurant.id)) {
      score += weights.trending;
      reasons.push('Trending restaurant');
    }

    // Use ML model if available
    if (this.model) {
      const mlScore = await this.getMLScore(restaurant, userPreferences);
      score = score * 0.7 + mlScore * 0.3; // Blend rule-based and ML scores
    }

    return {
      restaurantId: restaurant.id,
      score,
      reasons,
      matchPercentage: Math.round(score * 100),
    };
  }

  static async getMLScore(
    restaurant: Restaurant,
    userPreferences: UserPreferences
  ): Promise<number> {
    if (!this.model) return 0.5;

    try {
      // Prepare features
      const features = this.prepareFeatures(restaurant, userPreferences);
      
      // Make prediction
      const input = tf.tensor2d([features]);
      const prediction = this.model.predict(input) as tf.Tensor;
      const score = await prediction.data();
      
      input.dispose();
      prediction.dispose();
      
      return score[0];
    } catch (error) {
      console.error('ML prediction failed:', error);
      return 0.5;
    }
  }

  static prepareFeatures(
    restaurant: Restaurant,
    userPreferences: UserPreferences
  ): number[] {
    // Convert categorical features to numerical
    const cuisineMatch = userPreferences.cuisineTypes.includes(restaurant.cuisineType) ? 1 : 0;
    const priceMatch = userPreferences.priceRanges.includes(restaurant.priceRange) ? 1 : 0;
    
    // Normalize numerical features
    const ratingDiff = Math.abs(restaurant.averageRating - userPreferences.avgRating) / 5;
    const popularityScore = Math.min(restaurant.totalReviews / 1000, 1);
    
    return [
      cuisineMatch,
      priceMatch,
      restaurant.averageRating / 5,
      1 - ratingDiff,
      popularityScore,
      // Add more features as needed
    ];
  }

  static async getSimilarRestaurants(
    restaurantId: string,
    limit: number = 10
  ): Promise<Restaurant[]> {
    const restaurant = await Restaurant.findByPk(restaurantId);
    if (!restaurant) {
      throw new AppError('Restaurant not found', 404);
    }

    // Find similar restaurants based on features
    const similar = await Restaurant.findAll({
      where: {
        id: { [Op.ne]: restaurantId },
        isActive: true,
        [Op.or]: [
          { cuisineType: restaurant.cuisineType },
          { priceRange: restaurant.priceRange },
        ],
      },
      order: [[sequelize.literal(`
        ABS(average_rating - ${restaurant.averageRating}) +
        CASE WHEN cuisine_type = '${restaurant.cuisineType}' THEN 0 ELSE 1 END +
        CASE WHEN price_range = '${restaurant.priceRange}' THEN 0 ELSE 1 END
      `), 'ASC']],
      limit,
    });

    return similar;
  }

  static async getCollaborativeRecommendations(
    userId: string,
    limit: number = 10
  ): Promise<Restaurant[]> {
    // Find users with similar dining patterns
    const similarUsers = await this.findSimilarUsers(userId);
    
    // Get restaurants liked by similar users
    const restaurantScores = new Map<string, number>();
    
    for (const similarUser of similarUsers) {
      const theirReservations = await Reservation.findAll({
        where: {
          userId: similarUser.id,
          status: 'completed',
        },
        include: [{
          model: Review,
          where: { rating: { [Op.gte]: 4 } },
          required: true,
        }],
      });
      
      theirReservations.forEach(reservation => {
        const currentScore = restaurantScores.get(reservation.restaurantId) || 0;
        restaurantScores.set(
          reservation.restaurantId,
          currentScore + similarUser.similarity * reservation.review.rating
        );
      });
    }
    
    // Sort by score and get top restaurants
    const sortedRestaurants = Array.from(restaurantScores.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([restaurantId]) => restaurantId);
    
    return Restaurant.findAll({
      where: { id: { [Op.in]: sortedRestaurants } },
    });
  }

  static async findSimilarUsers(userId: string): Promise<any[]> {
    // This is a simplified version - in production, use more sophisticated algorithms
    const userReservations = await Reservation.findAll({
      where: { userId },
      attributes: ['restaurantId'],
    });
    
    const userRestaurants = new Set(userReservations.map(r => r.restaurantId));
    
    // Find users who have been to similar restaurants
    const otherUsers = await User.findAll({
      where: { id: { [Op.ne]: userId } },
      include: [{
        model: Reservation,
        where: {
          restaurantId: { [Op.in]: Array.from(userRestaurants) },
        },
        required: true,
      }],
      limit: 100,
    });
    
    // Calculate similarity scores
    return otherUsers.map(user => {
      const theirRestaurants = new Set(
        user.reservations.map(r => r.restaurantId)
      );
      const intersection = new Set(
        [...userRestaurants].filter(r => theirRestaurants.has(r))
      );
      const similarity = intersection.size / 
        Math.sqrt(userRestaurants.size * theirRestaurants.size);
      
      return { id: user.id, similarity };
    }).sort((a, b) => b.similarity - a.similarity);
  }

  static async getTrendingRestaurants(
    location?: { lat: number; lng: number },
    limit: number = 10
  ): Promise<Restaurant[]> {
    const recentDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // 7 days
    
    let query = `
      SELECT r.*, COUNT(res.id) as recent_bookings
      FROM restaurants r
      JOIN reservations res ON r.id = res.restaurant_id
      WHERE res.created_at >= :recentDate
      AND r.is_active = true
    `;
    
    if (location) {
      query += `
        AND ST_DWithin(
          ST_MakePoint(r.longitude, r.latitude)::geography,
          ST_MakePoint(:lng, :lat)::geography,
          10000
        )
      `;
    }
    
    query += `
      GROUP BY r.id
      ORDER BY recent_bookings DESC, r.average_rating DESC
      LIMIT :limit
    `;
    
    const restaurants = await Restaurant.sequelize!.query(query, {
      replacements: {
        recentDate,
        lat: location?.lat,
        lng: location?.lng,
        limit,
      },
      model: Restaurant,
      mapToModel: true,
    });
    
    return restaurants;
  }

  private static getMostFrequent<T>(items: T[], limit: number = 3): T[] {
    const frequency = new Map<T, number>();
    items.forEach(item => {
      frequency.set(item, (frequency.get(item) || 0) + 1);
    });
    
    return Array.from(frequency.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([item]) => item);
  }

  private static calculateDistance(
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number
  ): number {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  private static async getNearbyRestaurants(
    lat: number,
    lng: number,
    radiusKm: number
  ): Promise<Restaurant[]> {
    // Using PostGIS for efficient geographic queries
    const query = `
      SELECT *
      FROM restaurants
      WHERE ST_DWithin(
        ST_MakePoint(longitude, latitude)::geography,
        ST_MakePoint(:lng, :lat)::geography,
        :radius
      )
      AND is_active = true
      ORDER BY ST_Distance(
        ST_MakePoint(longitude, latitude)::geography,
        ST_MakePoint(:lng, :lat)::geography
      )
    `;
    
    return Restaurant.sequelize!.query(query, {
      replacements: {
        lat,
        lng,
        radius: radiusKm * 1000, // Convert to meters
      },
      model: Restaurant,
      mapToModel: true,
    });
  }

  private static async checkAvailability(
    restaurantId: string,
    date: Date,
    time: string,
    partySize: number
  ): Promise<boolean> {
    // This would call the actual availability service
    // Simplified version here
    return true;
  }

  private static async isTrending(restaurantId: string): Promise<boolean> {
    const recentBookings = await Reservation.count({
      where: {
        restaurantId,
        createdAt: {
          [Op.gte]: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        },
      },
    });
    
    return recentBookings > 50; // Arbitrary threshold
  }
}