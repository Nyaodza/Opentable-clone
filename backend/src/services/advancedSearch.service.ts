import { Restaurant } from '../models/Restaurant';
import { Op, Sequelize, QueryTypes } from 'sequelize';
import { sequelize } from '../config/database';
import Redis from 'ioredis';
import { logger } from '../utils/logger';

export interface AdvancedSearchFilters {
  // Basic filters
  location?: {
    lat: number;
    lng: number;
    radius: number; // in km
  };
  city?: string;
  cuisine?: string[];
  priceRange?: number[];
  rating?: number;

  // Advanced filters
  noiseLevel?: 'quiet' | 'moderate' | 'lively' | 'very_lively';
  dressCode?: 'casual' | 'smart_casual' | 'business' | 'formal';
  ambiance?: string[];
  dining?: {
    breakfast?: boolean;
    lunch?: boolean;
    dinner?: boolean;
    brunch?: boolean;
    lateNight?: boolean;
  };

  // Features & Amenities
  features?: {
    outdoorSeating?: boolean;
    privateRooms?: boolean;
    wheelchairAccessible?: boolean;
    parking?: 'street' | 'valet' | 'garage' | 'lot';
    wifi?: boolean;
    fullBar?: boolean;
    happyHour?: boolean;
    liveMusic?: boolean;
    dancing?: boolean;
    karaoke?: boolean;
    poolTable?: boolean;
    sportsTv?: boolean;
    fireplace?: boolean;
    smoking?: boolean;
    dogFriendly?: boolean;
  };

  // Occasion & Atmosphere
  occasion?: {
    romantic?: boolean;
    businessMeeting?: boolean;
    groupDining?: boolean;
    familyFriendly?: boolean;
    specialOccasion?: boolean;
    dateNight?: boolean;
    quickBite?: boolean;
    fineDining?: boolean;
  };

  // Dietary & Health
  dietary?: {
    vegetarian?: boolean;
    vegan?: boolean;
    glutenFree?: boolean;
    halal?: boolean;
    kosher?: boolean;
    organic?: boolean;
    farmToTable?: boolean;
    sustainable?: boolean;
  };

  // Service & Policies
  service?: {
    reservationRequired?: boolean;
    walkInsWelcome?: boolean;
    takeout?: boolean;
    delivery?: boolean;
    curbsidePickup?: boolean;
    contactlessPayment?: boolean;
    byob?: boolean;
    corkageFee?: number;
  };

  // Availability
  availability?: {
    date: Date;
    time: string;
    partySize: number;
    flexibleTime?: boolean; // +/- 30 minutes
  };

  // Sorting & Pagination
  sortBy?: 'relevance' | 'rating' | 'distance' | 'price' | 'availability' | 'popularity' | 'newest';
  ascending?: boolean;
  limit?: number;
  offset?: number;
}

export interface SearchResult {
  restaurants: any[];
  total: number;
  filters: {
    applied: string[];
    available: Record<string, any>;
  };
  suggestions?: {
    similar?: any[];
    nearby?: any[];
    trending?: any[];
  };
  metadata: {
    searchTime: number;
    resultsFrom: 'cache' | 'database';
    score?: number;
  };
}

export class AdvancedSearchService {
  private redis: Redis;
  private searchCache: Map<string, SearchResult> = new Map();

  constructor() {
    this.redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
  }

  async search(filters: AdvancedSearchFilters): Promise<SearchResult> {
    const startTime = Date.now();
    const cacheKey = this.generateCacheKey(filters);

    // Check cache first
    const cached = await this.getFromCache(cacheKey);
    if (cached) {
      return {
        ...cached,
        metadata: {
          ...cached.metadata,
          searchTime: Date.now() - startTime,
          resultsFrom: 'cache',
        },
      };
    }

    // Build the query
    const query = this.buildSearchQuery(filters);

    // Execute search
    const restaurants = await this.executeSearch(query, filters);

    // Get available filters for refinement
    const availableFilters = await this.getAvailableFilters(filters);

    // Get suggestions
    const suggestions = await this.generateSuggestions(filters, restaurants);

    // Build result
    const result: SearchResult = {
      restaurants,
      total: restaurants.length,
      filters: {
        applied: this.getAppliedFilters(filters),
        available: availableFilters,
      },
      suggestions,
      metadata: {
        searchTime: Date.now() - startTime,
        resultsFrom: 'database',
        score: this.calculateSearchQuality(restaurants, filters),
      },
    };

    // Cache the result
    await this.cacheResult(cacheKey, result);

    return result;
  }

  private buildSearchQuery(filters: AdvancedSearchFilters): any {
    const where: any = {};
    const include: any[] = [];
    const having: any = {};

    // Basic filters
    if (filters.city) {
      where.city = filters.city;
    }

    if (filters.cuisine && filters.cuisine.length > 0) {
      where.cuisine = { [Op.in]: filters.cuisine };
    }

    if (filters.priceRange && filters.priceRange.length === 2) {
      where.priceRange = {
        [Op.between]: filters.priceRange,
      };
    }

    if (filters.rating) {
      where.averageRating = { [Op.gte]: filters.rating };
    }

    // Location-based search
    if (filters.location) {
      const { lat, lng, radius } = filters.location;
      // Using Haversine formula for distance calculation
      having.distance = Sequelize.literal(`
        (6371 * acos(cos(radians(${lat})) * cos(radians(latitude)) *
        cos(radians(longitude) - radians(${lng})) +
        sin(radians(${lat})) * sin(radians(latitude)))) <= ${radius}
      `);
    }

    // Advanced filters
    if (filters.noiseLevel) {
      where['metadata.noiseLevel'] = filters.noiseLevel;
    }

    if (filters.dressCode) {
      where['metadata.dressCode'] = filters.dressCode;
    }

    if (filters.ambiance && filters.ambiance.length > 0) {
      where['metadata.ambiance'] = {
        [Op.overlap]: filters.ambiance,
      };
    }

    // Features
    if (filters.features) {
      for (const [feature, value] of Object.entries(filters.features)) {
        if (value !== undefined) {
          where[`features.${feature}`] = value;
        }
      }
    }

    // Dietary restrictions
    if (filters.dietary) {
      for (const [restriction, value] of Object.entries(filters.dietary)) {
        if (value) {
          where[`dietary.${restriction}`] = true;
        }
      }
    }

    // Service options
    if (filters.service) {
      for (const [service, value] of Object.entries(filters.service)) {
        if (value !== undefined) {
          where[`service.${service}`] = value;
        }
      }
    }

    return { where, include, having };
  }

  private async executeSearch(query: any, filters: AdvancedSearchFilters): Promise<any[]> {
    // Build the SQL query with all filters
    let sql = `
      SELECT
        r.*,
        ${filters.location ? `
        (6371 * acos(cos(radians(:lat)) * cos(radians(r.latitude)) *
        cos(radians(r.longitude) - radians(:lng)) +
        sin(radians(:lat)) * sin(radians(r.latitude)))) AS distance,
        ` : ''}
        COUNT(DISTINCT res.id) as total_reservations,
        AVG(rev.rating) as avg_rating,
        COUNT(DISTINCT rev.id) as review_count
      FROM restaurants r
      LEFT JOIN reservations res ON r.id = res.restaurant_id
      LEFT JOIN reviews rev ON r.id = rev.restaurant_id
      WHERE 1=1
    `;

    const replacements: any = {};

    // Add location parameters
    if (filters.location) {
      replacements.lat = filters.location.lat;
      replacements.lng = filters.location.lng;
      replacements.radius = filters.location.radius;
      sql += ` HAVING distance <= :radius`;
    }

    // Add other conditions
    if (filters.city) {
      sql += ` AND r.city = :city`;
      replacements.city = filters.city;
    }

    if (filters.cuisine && filters.cuisine.length > 0) {
      sql += ` AND r.cuisine IN (:cuisine)`;
      replacements.cuisine = filters.cuisine;
    }

    if (filters.priceRange) {
      sql += ` AND r.price_range BETWEEN :minPrice AND :maxPrice`;
      replacements.minPrice = filters.priceRange[0];
      replacements.maxPrice = filters.priceRange[1];
    }

    // Availability check
    if (filters.availability) {
      sql += ` AND r.id IN (
        SELECT DISTINCT restaurant_id
        FROM tables t
        WHERE t.capacity >= :partySize
        AND t.id NOT IN (
          SELECT table_id FROM reservations
          WHERE date = :date
          AND time_slot = :time
          AND status IN ('confirmed', 'pending')
        )
      )`;
      replacements.partySize = filters.availability.partySize;
      replacements.date = filters.availability.date;
      replacements.time = filters.availability.time;
    }

    // Group by
    sql += ` GROUP BY r.id`;

    // Sorting
    const sortColumn = this.getSortColumn(filters.sortBy);
    const sortOrder = filters.ascending ? 'ASC' : 'DESC';
    sql += ` ORDER BY ${sortColumn} ${sortOrder}`;

    // Pagination
    if (filters.limit) {
      sql += ` LIMIT :limit`;
      replacements.limit = filters.limit;
    }
    if (filters.offset) {
      sql += ` OFFSET :offset`;
      replacements.offset = filters.offset;
    }

    // Execute query
    const results = await sequelize.query(sql, {
      replacements,
      type: QueryTypes.SELECT,
    });

    return results;
  }

  private getSortColumn(sortBy?: string): string {
    switch (sortBy) {
      case 'rating':
        return 'avg_rating';
      case 'distance':
        return 'distance';
      case 'price':
        return 'r.price_range';
      case 'popularity':
        return 'total_reservations';
      case 'newest':
        return 'r.created_at';
      default:
        return 'avg_rating'; // Default to rating
    }
  }

  private async getAvailableFilters(currentFilters: AdvancedSearchFilters): Promise<Record<string, any>> {
    // Get aggregate data for filter refinement
    const availableFilters: Record<string, any> = {};

    // Get available cuisines
    const cuisines = await sequelize.query(
      `SELECT DISTINCT cuisine, COUNT(*) as count
       FROM restaurants
       GROUP BY cuisine
       ORDER BY count DESC`,
      { type: QueryTypes.SELECT }
    );
    availableFilters.cuisines = cuisines;

    // Get price ranges
    const priceRanges = await sequelize.query(
      `SELECT price_range, COUNT(*) as count
       FROM restaurants
       GROUP BY price_range
       ORDER BY price_range`,
      { type: QueryTypes.SELECT }
    );
    availableFilters.priceRanges = priceRanges;

    // Get features
    const features = await sequelize.query(
      `SELECT
        SUM(CASE WHEN features->>'outdoorSeating' = 'true' THEN 1 ELSE 0 END) as outdoor_seating,
        SUM(CASE WHEN features->>'wheelchairAccessible' = 'true' THEN 1 ELSE 0 END) as wheelchair_accessible,
        SUM(CASE WHEN features->>'wifi' = 'true' THEN 1 ELSE 0 END) as wifi,
        SUM(CASE WHEN features->>'fullBar' = 'true' THEN 1 ELSE 0 END) as full_bar
       FROM restaurants`,
      { type: QueryTypes.SELECT }
    );
    availableFilters.features = features[0];

    // Get ambiance options
    const ambiance = await sequelize.query(
      `SELECT DISTINCT jsonb_array_elements_text(metadata->'ambiance') as ambiance, COUNT(*) as count
       FROM restaurants
       WHERE metadata->'ambiance' IS NOT NULL
       GROUP BY ambiance
       ORDER BY count DESC`,
      { type: QueryTypes.SELECT }
    );
    availableFilters.ambiance = ambiance;

    return availableFilters;
  }

  private async generateSuggestions(
    filters: AdvancedSearchFilters,
    results: any[]
  ): Promise<any> {
    const suggestions: any = {};

    // Similar restaurants
    if (results.length > 0 && results.length < 5) {
      const topResult = results[0];
      suggestions.similar = await this.findSimilarRestaurants(topResult, filters);
    }

    // Nearby restaurants if location is provided
    if (filters.location && results.length < 10) {
      suggestions.nearby = await this.findNearbyRestaurants(filters.location, filters);
    }

    // Trending restaurants
    suggestions.trending = await this.getTrendingRestaurants(filters.city);

    return suggestions;
  }

  private async findSimilarRestaurants(restaurant: any, filters: AdvancedSearchFilters): Promise<any[]> {
    const similar = await Restaurant.findAll({
      where: {
        cuisine: restaurant.cuisine,
        priceRange: {
          [Op.between]: [restaurant.priceRange - 1, restaurant.priceRange + 1],
        },
        id: { [Op.ne]: restaurant.id },
      },
      limit: 3,
    });

    return similar;
  }

  private async findNearbyRestaurants(location: any, filters: AdvancedSearchFilters): Promise<any[]> {
    // Expand search radius
    const expandedRadius = location.radius * 1.5;
    const nearbyFilters = { ...filters, location: { ...location, radius: expandedRadius } };

    const query = this.buildSearchQuery(nearbyFilters);
    return await this.executeSearch(query, nearbyFilters);
  }

  private async getTrendingRestaurants(city?: string): Promise<any[]> {
    const sql = `
      SELECT r.*, COUNT(res.id) as recent_reservations
      FROM restaurants r
      JOIN reservations res ON r.id = res.restaurant_id
      WHERE res.created_at >= NOW() - INTERVAL '7 days'
      ${city ? 'AND r.city = :city' : ''}
      GROUP BY r.id
      ORDER BY recent_reservations DESC
      LIMIT 5
    `;

    const trending = await sequelize.query(sql, {
      replacements: city ? { city } : {},
      type: QueryTypes.SELECT,
    });

    return trending;
  }

  private getAppliedFilters(filters: AdvancedSearchFilters): string[] {
    const applied: string[] = [];

    if (filters.location) applied.push('location');
    if (filters.city) applied.push('city');
    if (filters.cuisine?.length) applied.push('cuisine');
    if (filters.priceRange) applied.push('price');
    if (filters.rating) applied.push('rating');
    if (filters.noiseLevel) applied.push('noise level');
    if (filters.dressCode) applied.push('dress code');
    if (filters.features) {
      Object.entries(filters.features).forEach(([key, value]) => {
        if (value) applied.push(key);
      });
    }
    if (filters.dietary) {
      Object.entries(filters.dietary).forEach(([key, value]) => {
        if (value) applied.push(key);
      });
    }
    if (filters.occasion) {
      Object.entries(filters.occasion).forEach(([key, value]) => {
        if (value) applied.push(key);
      });
    }

    return applied;
  }

  private calculateSearchQuality(results: any[], filters: AdvancedSearchFilters): number {
    if (results.length === 0) return 0;

    let score = 100;

    // Deduct points for few results
    if (results.length < 5) score -= 20;
    if (results.length < 3) score -= 20;

    // Add points for relevant results
    const avgRating = results.reduce((sum, r) => sum + (r.avg_rating || 0), 0) / results.length;
    score += Math.min(20, avgRating * 4);

    // Add points for filter match
    const appliedFilters = this.getAppliedFilters(filters);
    score += Math.min(30, appliedFilters.length * 5);

    return Math.min(100, Math.max(0, score));
  }

  private generateCacheKey(filters: AdvancedSearchFilters): string {
    const key = JSON.stringify(filters, Object.keys(filters).sort());
    return `search:${Buffer.from(key).toString('base64').substring(0, 64)}`;
  }

  private async getFromCache(key: string): Promise<SearchResult | null> {
    try {
      const cached = await this.redis.get(key);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (error) {
      logger.error('Cache retrieval error:', error);
    }
    return null;
  }

  private async cacheResult(key: string, result: SearchResult): Promise<void> {
    try {
      await this.redis.set(
        key,
        JSON.stringify(result),
        'EX',
        300 // Cache for 5 minutes
      );
    } catch (error) {
      logger.error('Cache storage error:', error);
    }
  }
}

export default new AdvancedSearchService();