import { Op, WhereOptions, QueryTypes } from 'sequelize';
import { sequelize } from '../config/database';
import { ServiceType } from '../models/UnifiedListing';
import { CacheManager } from '../config/redis';
import { logger } from '../utils/logger';

export interface AdvancedFilterOptions {
  // Basic filters
  serviceType?: ServiceType;
  location?: string;
  minPrice?: number;
  maxPrice?: number;
  minRating?: number;
  maxRating?: number;
  
  // Advanced filters
  amenities?: string[];
  categories?: string[];
  instantConfirmation?: boolean;
  cancellationPolicy?: 'free' | 'flexible' | 'moderate' | 'strict' | 'super_strict';
  accessibility?: {
    wheelchairAccessible?: boolean;
    hearingImpaired?: boolean;
    visuallyImpaired?: boolean;
    mobilityAssistance?: boolean;
  };
  languagesSupported?: string[];
  ageRestrictions?: {
    minAge?: number;
    maxAge?: number;
    adultsOnly?: boolean;
  };
  groupSize?: {
    min?: number;
    max?: number;
  };
  difficulty?: 'easy' | 'moderate' | 'challenging' | 'difficult' | 'extreme';
  duration?: {
    min?: number; // in minutes
    max?: number; // in minutes
  };
  tags?: string[];
  highlights?: string[];
  included?: string[];
  excluded?: string[];
  requirements?: string[];
  
  // Availability filters
  availableFrom?: Date;
  availableTo?: Date;
  timeSlots?: string[];
  
  // Sorting and pagination
  sortBy?: 'price' | 'rating' | 'distance' | 'popularity' | 'newest';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export interface FilterPreset {
  id: string;
  name: string;
  description?: string;
  serviceType: ServiceType;
  filters: Partial<AdvancedFilterOptions>;
  isPublic: boolean;
  usageCount: number;
  createdBy?: string;
}

export interface SavedFilter {
  id: string;
  userId: string;
  name: string;
  serviceType: ServiceType;
  filters: Partial<AdvancedFilterOptions>;
  isDefault: boolean;
  lastUsed?: Date;
}

export class AdvancedFilterService {
  private static instance: AdvancedFilterService;
  private cache: CacheManager;

  private constructor() {
    this.cache = CacheManager.getInstance();
  }

  static getInstance(): AdvancedFilterService {
    if (!AdvancedFilterService.instance) {
      AdvancedFilterService.instance = new AdvancedFilterService();
    }
    return AdvancedFilterService.instance;
  }

  /**
   * Apply advanced filters to listing search
   */
  async applyFilters(options: AdvancedFilterOptions): Promise<{
    listings: any[];
    totalCount: number;
    appliedFilters: Partial<AdvancedFilterOptions>;
    suggestions?: string[];
  }> {
    try {
      const cacheKey = this.generateCacheKey(options);
      const cached = await this.cache.get(cacheKey);
      
      if (cached) {
        return cached;
      }

      const whereConditions: WhereOptions = {};
      const havingConditions: string[] = [];
      const replacements: any = {};

      // Build WHERE clause
      this.buildWhereConditions(options, whereConditions, replacements);

      // Build query with joins and filters
      const query = this.buildFilterQuery(whereConditions, options, replacements);
      
      // Execute query
      const [listings, countResult] = await Promise.all([
        sequelize.query(query.main, {
          replacements,
          type: QueryTypes.SELECT,
        }),
        sequelize.query(query.count, {
          replacements,
          type: QueryTypes.SELECT,
        }),
      ]);

      const totalCount = parseInt((countResult[0] as any).count);
      
      // Get filter suggestions if results are limited
      const suggestions = totalCount < 5 ? await this.getFilterSuggestions(options) : undefined;

      const result = {
        listings,
        totalCount,
        appliedFilters: this.getAppliedFilters(options),
        suggestions,
      };

      // Cache for 5 minutes
      await this.cache.set(cacheKey, result, 300);
      
      return result;
    } catch (error) {
      logger.error('Error applying advanced filters:', error);
      throw error;
    }
  }

  /**
   * Get popular filter presets
   */
  async getFilterPresets(serviceType?: ServiceType): Promise<FilterPreset[]> {
    try {
      const cacheKey = `filter_presets:${serviceType || 'all'}`;
      const cached = await this.cache.get(cacheKey);
      
      if (cached) {
        return cached;
      }

      const whereConditions = ['\"isPublic\" = true'];
      const replacements: any[] = [];

      if (serviceType) {
        whereConditions.push('\"serviceType\" = ?');
        replacements.push(serviceType);
      }

      const result = await sequelize.query(
        `
        SELECT id, name, description, \"serviceType\", filters, \"usageCount\", \"createdBy\"
        FROM filter_presets
        WHERE ${whereConditions.join(' AND ')}
        ORDER BY \"usageCount\" DESC, \"createdAt\" DESC
        LIMIT 20
        `,
        {
          replacements,
          type: QueryTypes.SELECT,
        }
      );

      const presets = (result as any[]).map(row => ({
        ...row,
        filters: JSON.parse(row.filters || '{}'),
      }));

      // Cache for 10 minutes
      await this.cache.set(cacheKey, presets, 600);
      
      return presets;
    } catch (error) {
      logger.error('Error getting filter presets:', error);
      throw error;
    }
  }

  /**
   * Create filter preset
   */
  async createFilterPreset(
    name: string,
    description: string,
    serviceType: ServiceType,
    filters: Partial<AdvancedFilterOptions>,
    createdBy?: string,
    isPublic = true
  ): Promise<FilterPreset> {
    try {
      const id = require('crypto').randomUUID();
      
      await sequelize.query(
        `
        INSERT INTO filter_presets (id, name, description, \"serviceType\", filters, \"isPublic\", \"createdBy\", \"createdAt\", \"updatedAt\")
        VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
        `,
        {
          replacements: [id, name, description, serviceType, JSON.stringify(filters), isPublic, createdBy],
        }
      );

      // Clear cache
      await this.cache.del(`filter_presets:${serviceType}`);
      await this.cache.del('filter_presets:all');

      return {
        id,
        name,
        description,
        serviceType,
        filters,
        isPublic,
        usageCount: 0,
        createdBy,
      };
    } catch (error) {
      logger.error('Error creating filter preset:', error);
      throw error;
    }
  }

  /**
   * Get user's saved filters
   */
  async getSavedFilters(userId: string, serviceType?: ServiceType): Promise<SavedFilter[]> {
    try {
      const whereConditions = ['\"userId\" = ?'];
      const replacements = [userId];

      if (serviceType) {
        whereConditions.push('\"serviceType\" = ?');
        replacements.push(serviceType);
      }

      const result = await sequelize.query(
        `
        SELECT id, \"userId\", name, \"serviceType\", filters, \"isDefault\", \"lastUsed\"
        FROM saved_filters
        WHERE ${whereConditions.join(' AND ')}
        ORDER BY \"isDefault\" DESC, \"lastUsed\" DESC, \"createdAt\" DESC
        `,
        {
          replacements,
          type: QueryTypes.SELECT,
        }
      );

      return (result as any[]).map(row => ({
        ...row,
        filters: JSON.parse(row.filters || '{}'),
      }));
    } catch (error) {
      logger.error('Error getting saved filters:', error);
      throw error;
    }
  }

  /**
   * Save user filter
   */
  async saveFilter(
    userId: string,
    name: string,
    serviceType: ServiceType,
    filters: Partial<AdvancedFilterOptions>,
    isDefault = false
  ): Promise<SavedFilter> {
    try {
      const id = require('crypto').randomUUID();
      
      // If setting as default, unset other defaults for this service type
      if (isDefault) {
        await sequelize.query(
          'UPDATE saved_filters SET \"isDefault\" = false WHERE \"userId\" = ? AND \"serviceType\" = ?',
          { replacements: [userId, serviceType] }
        );
      }

      await sequelize.query(
        `
        INSERT INTO saved_filters (id, \"userId\", name, \"serviceType\", filters, \"isDefault\", \"createdAt\", \"updatedAt\")
        VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())
        `,
        {
          replacements: [id, userId, name, serviceType, JSON.stringify(filters), isDefault],
        }
      );

      return {
        id,
        userId,
        name,
        serviceType,
        filters,
        isDefault,
      };
    } catch (error) {
      logger.error('Error saving filter:', error);
      throw error;
    }
  }

  /**
   * Get available filter options for a service type
   */
  async getAvailableFilters(serviceType: ServiceType): Promise<{
    amenities: string[];
    categories: string[];
    languages: string[];
    tags: string[];
    priceRange: { min: number; max: number };
    ratingRange: { min: number; max: number };
    durationRange: { min: number; max: number };
  }> {
    try {
      const cacheKey = `available_filters:${serviceType}`;
      const cached = await this.cache.get(cacheKey);
      
      if (cached) {
        return cached;
      }

      const result = await sequelize.query(
        `
        SELECT 
          array_agg(DISTINCT amenity) FILTER (WHERE amenity IS NOT NULL) as amenities,
          array_agg(DISTINCT category) FILTER (WHERE category IS NOT NULL) as categories,
          array_agg(DISTINCT language) FILTER (WHERE language IS NOT NULL) as languages,
          array_agg(DISTINCT tag) FILTER (WHERE tag IS NOT NULL) as tags,
          MIN(price) as min_price,
          MAX(price) as max_price,
          MIN(rating) as min_rating,
          MAX(rating) as max_rating,
          MIN(duration_min) as min_duration,
          MAX(duration_max) as max_duration
        FROM (
          SELECT 
            jsonb_array_elements_text(amenities) as amenity,
            unnest(categories) as category,
            unnest(\"languagesSupported\") as language,
            unnest(tags) as tag,
            price,
            rating,
            CASE 
              WHEN duration ? 'min' THEN (duration->>'min')::integer
              ELSE NULL 
            END as duration_min,
            CASE 
              WHEN duration ? 'max' THEN (duration->>'max')::integer
              ELSE NULL 
            END as duration_max
          FROM unified_listings
          WHERE \"serviceType\" = ? AND \"isAvailable\" = true
        ) subquery
        `,
        {
          replacements: [serviceType],
          type: QueryTypes.SELECT,
        }
      );

      const data = result[0] as any;
      const availableFilters = {
        amenities: data.amenities || [],
        categories: data.categories || [],
        languages: data.languages || [],
        tags: data.tags || [],
        priceRange: {
          min: parseFloat(data.min_price) || 0,
          max: parseFloat(data.max_price) || 1000,
        },
        ratingRange: {
          min: parseFloat(data.min_rating) || 0,
          max: parseFloat(data.max_rating) || 5,
        },
        durationRange: {
          min: parseInt(data.min_duration) || 0,
          max: parseInt(data.max_duration) || 480,
        },
      };

      // Cache for 30 minutes
      await this.cache.set(cacheKey, availableFilters, 1800);
      
      return availableFilters;
    } catch (error) {
      logger.error('Error getting available filters:', error);
      throw error;
    }
  }

  /**
   * Build WHERE conditions for filtering
   */
  private buildWhereConditions(
    options: AdvancedFilterOptions,
    whereConditions: any,
    replacements: any
  ): void {
    if (options.serviceType) {
      (whereConditions as any).serviceType = options.serviceType;
    }

    if (options.minPrice !== undefined) {
      (whereConditions as any).price = { [Op.gte]: options.minPrice };
    }

    if (options.maxPrice !== undefined) {
      (whereConditions as any).price = { 
        ...(whereConditions as any).price,
        [Op.lte]: options.maxPrice 
      };
    }

    if (options.minRating !== undefined) {
      (whereConditions as any).rating = { [Op.gte]: options.minRating };
    }

    if (options.maxRating !== undefined) {
      (whereConditions as any).rating = { 
        ...(whereConditions as any).rating,
        [Op.lte]: options.maxRating 
      };
    }

    if (options.instantConfirmation !== undefined) {
      (whereConditions as any).instantConfirmation = options.instantConfirmation;
    }

    if (options.cancellationPolicy) {
      (whereConditions as any).cancellationPolicy = options.cancellationPolicy;
    }

    if (options.difficulty) {
      (whereConditions as any).difficulty = options.difficulty;
    }

    // Always filter for available listings
    (whereConditions as any).isAvailable = true;
  }

  /**
   * Build complete filter query
   */
  private buildFilterQuery(
    whereConditions: any,
    options: AdvancedFilterOptions,
    replacements: any
  ): { main: string; count: string } {
    const selectFields = `
      id, title, description, price, currency, rating, \"serviceType\", source,
      location, images, amenities, categories, \"instantConfirmation\", 
      \"cancellationPolicy\", accessibility, \"languagesSupported\", 
      \"ageRestrictions\", \"groupSize\", highlights, included, excluded,
      requirements, tags, difficulty, duration, schedule, \"createdAt\"
    `;

    let whereClause = 'WHERE "isAvailable" = true';
    const params: any[] = [];

    // Add basic conditions
    if (options.serviceType) {
      whereClause += ' AND "serviceType" = ?';
      params.push(options.serviceType);
    }

    if (options.minPrice !== undefined) {
      whereClause += ' AND price >= ?';
      params.push(options.minPrice);
    }

    if (options.maxPrice !== undefined) {
      whereClause += ' AND price <= ?';
      params.push(options.maxPrice);
    }

    if (options.minRating !== undefined) {
      whereClause += ' AND rating >= ?';
      params.push(options.minRating);
    }

    if (options.maxRating !== undefined) {
      whereClause += ' AND rating <= ?';
      params.push(options.maxRating);
    }

    if (options.instantConfirmation !== undefined) {
      whereClause += ' AND "instantConfirmation" = ?';
      params.push(options.instantConfirmation);
    }

    if (options.cancellationPolicy) {
      whereClause += ' AND "cancellationPolicy" = ?';
      params.push(options.cancellationPolicy);
    }

    if (options.difficulty) {
      whereClause += ' AND difficulty = ?';
      params.push(options.difficulty);
    }

    // Array and JSON filters
    if (options.amenities && options.amenities.length > 0) {
      whereClause += ' AND amenities ?& ?';
      params.push(options.amenities);
    }

    if (options.categories && options.categories.length > 0) {
      whereClause += ' AND categories && ?';
      params.push(options.categories);
    }

    if (options.tags && options.tags.length > 0) {
      whereClause += ' AND tags && ?';
      params.push(options.tags);
    }

    if (options.languagesSupported && options.languagesSupported.length > 0) {
      whereClause += ' AND "languagesSupported" && ?';
      params.push(options.languagesSupported);
    }

    if (options.highlights && options.highlights.length > 0) {
      whereClause += ' AND highlights && ?';
      params.push(options.highlights);
    }

    // Duration filter
    if (options.duration?.min !== undefined || options.duration?.max !== undefined) {
      if (options.duration.min !== undefined) {
        whereClause += ' AND (duration->\'min\')::integer >= ?';
        params.push(options.duration.min);
      }
      if (options.duration.max !== undefined) {
        whereClause += ' AND (duration->\'max\')::integer <= ?';
        params.push(options.duration.max);
      }
    }

    // Age restrictions
    if (options.ageRestrictions) {
      if (options.ageRestrictions.minAge !== undefined) {
        whereClause += ' AND (("ageRestrictions"->\'minAge\')::integer IS NULL OR ("ageRestrictions"->\'minAge\')::integer <= ?)';
        params.push(options.ageRestrictions.minAge);
      }
      if (options.ageRestrictions.maxAge !== undefined) {
        whereClause += ' AND (("ageRestrictions"->\'maxAge\')::integer IS NULL OR ("ageRestrictions"->\'maxAge\')::integer >= ?)';
        params.push(options.ageRestrictions.maxAge);
      }
      if (options.ageRestrictions.adultsOnly !== undefined) {
        whereClause += ' AND (("ageRestrictions"->\'adultsOnly\')::boolean = ? OR ("ageRestrictions"->\'adultsOnly\')::boolean IS NULL)';
        params.push(options.ageRestrictions.adultsOnly);
      }
    }

    // Group size
    if (options.groupSize) {
      if (options.groupSize.min !== undefined) {
        whereClause += ' AND (("groupSize"->\'min\')::integer IS NULL OR ("groupSize"->\'min\')::integer <= ?)';
        params.push(options.groupSize.min);
      }
      if (options.groupSize.max !== undefined) {
        whereClause += ' AND (("groupSize"->\'max\')::integer IS NULL OR ("groupSize"->\'max\')::integer >= ?)';
        params.push(options.groupSize.max);
      }
    }

    // Accessibility
    if (options.accessibility) {
      Object.entries(options.accessibility).forEach(([key, value]) => {
        if (value !== undefined) {
          whereClause += ` AND (accessibility->>'${key}')::boolean = ?`;
          params.push(value);
        }
      });
    }

    // Sorting
    let orderBy = 'ORDER BY rating DESC, price ASC';
    if (options.sortBy) {
      const sortOrder = options.sortOrder || 'asc';
      switch (options.sortBy) {
        case 'price':
          orderBy = `ORDER BY price ${sortOrder}`;
          break;
        case 'rating':
          orderBy = `ORDER BY rating ${sortOrder}`;
          break;
        case 'newest':
          orderBy = `ORDER BY "createdAt" ${sortOrder}`;
          break;
        case 'popularity':
          orderBy = `ORDER BY rating ${sortOrder}, price ASC`;
          break;
      }
    }

    // Pagination
    const limit = options.limit || 20;
    const offset = ((options.page || 1) - 1) * limit;

    // Update replacements
    Object.assign(replacements, params.reduce((acc, param, index) => {
      acc[`param${index}`] = param;
      return acc;
    }, {}));

    // Build parameterized query
    const parameterizedWhere = whereClause.replace(/\?/g, (match, index) => {
      return `:param${params.indexOf(params[index]) >= 0 ? params.indexOf(params[index]) : index}`;
    });

    const mainQuery = `
      SELECT ${selectFields}
      FROM unified_listings
      ${parameterizedWhere}
      ${orderBy}
      LIMIT ${limit} OFFSET ${offset}
    `;

    const countQuery = `
      SELECT COUNT(*) as count
      FROM unified_listings
      ${parameterizedWhere}
    `;

    return {
      main: mainQuery,
      count: countQuery,
    };
  }

  /**
   * Generate cache key for filter options
   */
  private generateCacheKey(options: AdvancedFilterOptions): string {
    return `advanced_filters:${JSON.stringify(options)}`;
  }

  /**
   * Get applied filters summary
   */
  private getAppliedFilters(options: AdvancedFilterOptions): Partial<AdvancedFilterOptions> {
    const applied: Partial<AdvancedFilterOptions> = {};

    Object.entries(options).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        if (Array.isArray(value) && value.length > 0) {
          (applied as any)[key] = value;
        } else if (typeof value === 'object' && Object.keys(value).length > 0) {
          (applied as any)[key] = value;
        } else if (typeof value !== 'object') {
          (applied as any)[key] = value;
        }
      }
    });

    return applied;
  }

  /**
   * Get filter suggestions when results are limited
   */
  private async getFilterSuggestions(options: AdvancedFilterOptions): Promise<string[]> {
    const suggestions: string[] = [];

    try {
      // Suggest relaxing price filter
      if (options.maxPrice !== undefined && options.maxPrice < 100) {
        suggestions.push('Try increasing your maximum price');
      }

      // Suggest relaxing rating filter
      if (options.minRating !== undefined && options.minRating > 4) {
        suggestions.push('Try lowering your minimum rating requirement');
      }

      // Suggest fewer amenities
      if (options.amenities && options.amenities.length > 3) {
        suggestions.push('Try selecting fewer amenities');
      }

      // Suggest broader categories
      if (options.categories && options.categories.length > 2) {
        suggestions.push('Try selecting fewer categories');
      }

      // Suggest removing difficulty filter
      if (options.difficulty) {
        suggestions.push('Try removing the difficulty filter');
      }

      // Generic suggestions
      suggestions.push('Try expanding your search location');
      suggestions.push('Try different dates if searching for availability');

      return suggestions.slice(0, 3); // Return max 3 suggestions
    } catch (error) {
      logger.error('Error generating filter suggestions:', error);
      return [];
    }
  }
}