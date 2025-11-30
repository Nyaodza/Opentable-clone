import { Client } from '@elastic/elasticsearch';
import { Op } from 'sequelize';
import { Restaurant } from '../models/Restaurant';
import { CacheService } from './cache.service';
import { logger } from '../utils/logger';

export interface SearchFilters {
  cuisineTypes?: string[];
  priceRanges?: string[];
  cities?: string[];
  features?: string[];
  dietaryRestrictions?: string[];
  minRating?: number;
  maxDistance?: number;
  isOpen?: boolean;
  hasAvailability?: boolean;
}

export interface SearchOptions {
  query?: string;
  location?: {
    lat: number;
    lng: number;
  };
  filters?: SearchFilters;
  sortBy?: 'relevance' | 'rating' | 'distance' | 'price_low' | 'price_high' | 'popularity';
  limit?: number;
  offset?: number;
  cursor?: string;
  tenantId?: string;
  userId?: string;
}

export class SearchService {
  private static elasticClient: Client | null = null;
  private static readonly INDEX_NAME = 'restaurants';
  private static readonly SEARCH_CACHE_TTL = 300; // 5 minutes

  static initialize(): void {
    if (process.env.ELASTICSEARCH_URL) {
      this.elasticClient = new Client({
        node: process.env.ELASTICSEARCH_URL,
        auth: {
          username: process.env.ELASTICSEARCH_USERNAME || 'elastic',
          password: process.env.ELASTICSEARCH_PASSWORD || '',
        },
      });

      this.createIndex().catch(err => {
        logger.error('Failed to create Elasticsearch index:', err);
      });
    }
  }

  private static async createIndex(): Promise<void> {
    if (!this.elasticClient) return;

    const indexExists = await this.elasticClient.indices.exists({
      index: this.INDEX_NAME,
    });

    if (!indexExists) {
      await this.elasticClient.indices.create({
        index: this.INDEX_NAME,
        body: {
          mappings: {
            properties: {
              id: { type: 'keyword' },
              tenantId: { type: 'keyword' },
              name: { 
                type: 'text',
                fields: {
                  keyword: { type: 'keyword' },
                  suggest: { type: 'completion' },
                },
              },
              description: { type: 'text' },
              cuisineType: { type: 'keyword' },
              priceRange: { type: 'keyword' },
              city: { 
                type: 'text',
                fields: {
                  keyword: { type: 'keyword' },
                },
              },
              state: { type: 'keyword' },
              country: { type: 'keyword' },
              location: { type: 'geo_point' },
              features: { type: 'keyword' },
              dietaryRestrictions: { type: 'keyword' },
              averageRating: { type: 'float' },
              totalReviews: { type: 'integer' },
              isActive: { type: 'boolean' },
              isVerified: { type: 'boolean' },
              createdAt: { type: 'date' },
              updatedAt: { type: 'date' },
            },
          },
          settings: {
            analysis: {
              analyzer: {
                restaurant_analyzer: {
                  type: 'custom',
                  tokenizer: 'standard',
                  filter: ['lowercase', 'stop', 'snowball'],
                },
              },
            },
          },
        },
      });
    }
  }

  static async indexRestaurant(restaurant: Restaurant): Promise<void> {
    if (!this.elasticClient) {
      logger.warn('Elasticsearch not configured, skipping indexing');
      return;
    }

    try {
      await this.elasticClient.index({
        index: this.INDEX_NAME,
        id: restaurant.id,
        body: {
          id: restaurant.id,
          tenantId: restaurant.tenantId,
          name: restaurant.name,
          description: restaurant.description,
          cuisineType: restaurant.cuisineType,
          priceRange: restaurant.priceRange,
          city: restaurant.city,
          state: restaurant.state,
          country: restaurant.country,
          location: restaurant.latitude && restaurant.longitude ? {
            lat: restaurant.latitude,
            lon: restaurant.longitude,
          } : null,
          features: restaurant.features,
          dietaryRestrictions: restaurant.dietaryRestrictions,
          averageRating: restaurant.averageRating,
          totalReviews: restaurant.totalReviews,
          isActive: restaurant.isActive,
          isVerified: restaurant.isVerified,
          createdAt: restaurant.createdAt,
          updatedAt: restaurant.updatedAt,
        },
      });
    } catch (error) {
      logger.error('Failed to index restaurant:', error);
    }
  }

  static async removeRestaurant(restaurantId: string): Promise<void> {
    if (!this.elasticClient) return;

    try {
      await this.elasticClient.delete({
        index: this.INDEX_NAME,
        id: restaurantId,
      });
    } catch (error) {
      logger.error('Failed to remove restaurant from index:', error);
    }
  }

  static async searchRestaurants(options: SearchOptions): Promise<any> {
    // Try cache first
    const cacheKey = CacheService.getRestaurantSearchKey(options);
    const cached = await CacheService.get(cacheKey);
    if (cached) {
      return cached;
    }

    let results;
    
    if (this.elasticClient) {
      results = await this.elasticSearchRestaurants(options);
    } else {
      results = await this.databaseSearchRestaurants(options);
    }

    // Cache results
    await CacheService.set(cacheKey, results, { ttl: this.SEARCH_CACHE_TTL });

    return results;
  }

  private static async elasticSearchRestaurants(options: SearchOptions): Promise<any> {
    const { query, location, filters, sortBy, limit = 20, offset = 0 } = options;

    const must: any[] = [];
    const filter: any[] = [];

    // Add tenant filter
    if (options.tenantId) {
      filter.push({ term: { tenantId: options.tenantId } });
    }

    // Add active and verified filters
    filter.push({ term: { isActive: true } });
    filter.push({ term: { isVerified: true } });

    // Add text query
    if (query) {
      must.push({
        multi_match: {
          query,
          fields: ['name^3', 'description', 'cuisineType^2', 'city^2'],
          type: 'best_fields',
          fuzziness: 'AUTO',
        },
      });
    }

    // Add filters
    if (filters) {
      if (filters.cuisineTypes?.length) {
        filter.push({ terms: { cuisineType: filters.cuisineTypes } });
      }
      if (filters.priceRanges?.length) {
        filter.push({ terms: { priceRange: filters.priceRanges } });
      }
      if (filters.cities?.length) {
        filter.push({ terms: { 'city.keyword': filters.cities } });
      }
      if (filters.features?.length) {
        filter.push({ terms: { features: filters.features } });
      }
      if (filters.dietaryRestrictions?.length) {
        filter.push({ terms: { dietaryRestrictions: filters.dietaryRestrictions } });
      }
      if (filters.minRating) {
        filter.push({ range: { averageRating: { gte: filters.minRating } } });
      }
    }

    // Build sort
    const sort: any[] = [];
    
    if (location && sortBy === 'distance') {
      sort.push({
        _geo_distance: {
          location: {
            lat: location.lat,
            lon: location.lng,
          },
          order: 'asc',
          unit: 'km',
        },
      });
    } else if (sortBy === 'rating') {
      sort.push({ averageRating: { order: 'desc' } });
    } else if (sortBy === 'price_low') {
      sort.push({ priceRange: { order: 'asc' } });
    } else if (sortBy === 'price_high') {
      sort.push({ priceRange: { order: 'desc' } });
    } else if (sortBy === 'popularity') {
      sort.push({ totalReviews: { order: 'desc' } });
    } else {
      sort.push({ _score: { order: 'desc' } });
    }

    const body: any = {
      query: {
        bool: {
          must: must.length > 0 ? must : { match_all: {} },
          filter,
        },
      },
      sort,
      from: offset,
      size: limit + 1,
    };

    // Add distance script field if location provided
    if (location) {
      body.script_fields = {
        distance: {
          script: {
            params: {
              lat: location.lat,
              lon: location.lng,
            },
            source: "doc['location'].arcDistance(params.lat, params.lon) / 1000",
          },
        },
      };
    }

    const response = await this.elasticClient!.search({
      index: this.INDEX_NAME,
      body,
    });

    const hits = response.hits.hits;
    const hasNextPage = hits.length > limit;
    const restaurants = hits.slice(0, limit).map((hit: any) => ({
      ...hit._source,
      _score: hit._score,
      distance: hit.fields?.distance?.[0],
    }));

    // Get facets for filters
    const facets = await this.getSearchFacets(options);

    return {
      edges: restaurants.map((r: any) => ({
        node: r,
        cursor: r.id,
      })),
      pageInfo: {
        hasNextPage,
        hasPreviousPage: offset > 0,
        startCursor: restaurants[0]?.id,
        endCursor: restaurants[restaurants.length - 1]?.id,
      },
      totalCount: response.hits.total.value,
      facets,
    };
  }

  private static async databaseSearchRestaurants(options: SearchOptions): Promise<any> {
    const { query, location, filters, sortBy, limit = 20, offset = 0 } = options;
    
    const where: any = {
      isActive: true,
      isVerified: true,
    };

    if (options.tenantId) {
      where.tenantId = options.tenantId;
    }

    // Add text search
    if (query) {
      where[Op.or] = [
        { name: { [Op.iLike]: `%${query}%` } },
        { description: { [Op.iLike]: `%${query}%` } },
        { cuisineType: { [Op.iLike]: `%${query}%` } },
        { city: { [Op.iLike]: `%${query}%` } },
      ];
    }

    // Add filters
    if (filters) {
      if (filters.cuisineTypes?.length) {
        where.cuisineType = { [Op.in]: filters.cuisineTypes };
      }
      if (filters.priceRanges?.length) {
        where.priceRange = { [Op.in]: filters.priceRanges };
      }
      if (filters.cities?.length) {
        where.city = { [Op.in]: filters.cities };
      }
      if (filters.features?.length) {
        where.features = { [Op.overlap]: filters.features };
      }
      if (filters.dietaryRestrictions?.length) {
        where.dietaryRestrictions = { [Op.overlap]: filters.dietaryRestrictions };
      }
      if (filters.minRating) {
        where.averageRating = { [Op.gte]: filters.minRating };
      }
    }

    // Build order
    let order: any[] = [];
    
    if (sortBy === 'rating') {
      order = [['averageRating', 'DESC']];
    } else if (sortBy === 'price_low') {
      order = [['priceRange', 'ASC']];
    } else if (sortBy === 'price_high') {
      order = [['priceRange', 'DESC']];
    } else if (sortBy === 'popularity') {
      order = [['totalReviews', 'DESC']];
    } else {
      order = [['createdAt', 'DESC']];
    }

    const restaurants = await Restaurant.findAll({
      where,
      order,
      limit: limit + 1,
      offset,
    });

    const hasNextPage = restaurants.length > limit;
    const results = restaurants.slice(0, limit);

    // Calculate distances if location provided
    if (location) {
      results.forEach((restaurant: any) => {
        if (restaurant.latitude && restaurant.longitude) {
          restaurant.distance = this.calculateDistance(
            location.lat,
            location.lng,
            restaurant.latitude,
            restaurant.longitude
          );
        }
      });

      // Sort by distance if requested
      if (sortBy === 'distance') {
        results.sort((a: any, b: any) => (a.distance || Infinity) - (b.distance || Infinity));
      }
    }

    return {
      edges: results.map(r => ({
        node: r,
        cursor: r.id,
      })),
      pageInfo: {
        hasNextPage,
        hasPreviousPage: offset > 0,
        startCursor: results[0]?.id,
        endCursor: results[results.length - 1]?.id,
      },
      totalCount: await Restaurant.count({ where }),
    };
  }

  static async findNearbyRestaurants(
    latitude: number,
    longitude: number,
    radiusKm: number,
    options: {
      tenantId?: string;
      limit?: number;
      cursor?: string;
    } = {}
  ): Promise<Restaurant[]> {
    if (this.elasticClient) {
      const response = await this.elasticClient.search({
        index: this.INDEX_NAME,
        body: {
          query: {
            bool: {
              must: { match_all: {} },
              filter: [
                { term: { isActive: true } },
                { term: { isVerified: true } },
                ...(options.tenantId ? [{ term: { tenantId: options.tenantId } }] : []),
                {
                  geo_distance: {
                    distance: `${radiusKm}km`,
                    location: {
                      lat: latitude,
                      lon: longitude,
                    },
                  },
                },
              ],
            },
          },
          sort: [
            {
              _geo_distance: {
                location: {
                  lat: latitude,
                  lon: longitude,
                },
                order: 'asc',
                unit: 'km',
              },
            },
          ],
          size: options.limit || 20,
        },
      });

      return response.hits.hits.map((hit: any) => ({
        ...hit._source,
        distance: hit.sort[0],
      }));
    }

    // Fallback to database with PostGIS
    const query = `
      SELECT *, 
        ST_Distance(
          ST_MakePoint(longitude, latitude)::geography,
          ST_MakePoint(:lng, :lat)::geography
        ) / 1000 as distance
      FROM restaurants
      WHERE ST_DWithin(
        ST_MakePoint(longitude, latitude)::geography,
        ST_MakePoint(:lng, :lat)::geography,
        :radius
      )
      AND is_active = true
      AND is_verified = true
      ${options.tenantId ? 'AND tenant_id = :tenantId' : ''}
      ORDER BY distance
      LIMIT :limit
    `;

    return Restaurant.sequelize!.query(query, {
      replacements: {
        lat: latitude,
        lng: longitude,
        radius: radiusKm * 1000,
        tenantId: options.tenantId,
        limit: options.limit || 20,
      },
      model: Restaurant,
      mapToModel: true,
    });
  }

  private static async getSearchFacets(options: SearchOptions): Promise<any> {
    if (!this.elasticClient) {
      return this.getDatabaseFacets(options);
    }

    const baseFilter = [
      { term: { isActive: true } },
      { term: { isVerified: true } },
    ];

    if (options.tenantId) {
      baseFilter.push({ term: { tenantId: options.tenantId } });
    }

    const response = await this.elasticClient.search({
      index: this.INDEX_NAME,
      body: {
        size: 0,
        query: {
          bool: {
            filter: baseFilter,
          },
        },
        aggs: {
          cuisineTypes: {
            terms: { field: 'cuisineType', size: 20 },
          },
          priceRanges: {
            terms: { field: 'priceRange' },
          },
          cities: {
            terms: { field: 'city.keyword', size: 20 },
          },
          features: {
            terms: { field: 'features', size: 20 },
          },
          dietaryRestrictions: {
            terms: { field: 'dietaryRestrictions', size: 20 },
          },
        },
      },
    });

    const aggs = response.aggregations;
    
    return {
      cuisineTypes: aggs.cuisineTypes.buckets.map((b: any) => ({
        value: b.key,
        count: b.doc_count,
      })),
      priceRanges: aggs.priceRanges.buckets.map((b: any) => ({
        value: b.key,
        count: b.doc_count,
      })),
      cities: aggs.cities.buckets.map((b: any) => ({
        value: b.key,
        count: b.doc_count,
      })),
      features: aggs.features.buckets.map((b: any) => ({
        value: b.key,
        count: b.doc_count,
      })),
      dietaryRestrictions: aggs.dietaryRestrictions.buckets.map((b: any) => ({
        value: b.key,
        count: b.doc_count,
      })),
    };
  }

  private static async getDatabaseFacets(options: SearchOptions): Promise<any> {
    const where: any = {
      isActive: true,
      isVerified: true,
    };

    if (options.tenantId) {
      where.tenantId = options.tenantId;
    }

    const [
      cuisineTypes,
      priceRanges,
      cities,
    ] = await Promise.all([
      Restaurant.findAll({
        where,
        attributes: [
          'cuisineType',
          [Restaurant.sequelize!.fn('COUNT', '*'), 'count'],
        ],
        group: ['cuisineType'],
        raw: true,
      }),
      Restaurant.findAll({
        where,
        attributes: [
          'priceRange',
          [Restaurant.sequelize!.fn('COUNT', '*'), 'count'],
        ],
        group: ['priceRange'],
        raw: true,
      }),
      Restaurant.findAll({
        where,
        attributes: [
          'city',
          [Restaurant.sequelize!.fn('COUNT', '*'), 'count'],
        ],
        group: ['city'],
        raw: true,
      }),
    ]);

    return {
      cuisineTypes: cuisineTypes.map((c: any) => ({
        value: c.cuisineType,
        count: parseInt(c.count),
      })),
      priceRanges: priceRanges.map((p: any) => ({
        value: p.priceRange,
        count: parseInt(p.count),
      })),
      cities: cities.map((c: any) => ({
        value: c.city,
        count: parseInt(c.count),
      })),
      features: [],
      dietaryRestrictions: [],
    };
  }

  private static calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  static async reindexAll(): Promise<void> {
    if (!this.elasticClient) {
      logger.warn('Elasticsearch not configured');
      return;
    }

    logger.info('Starting full reindex');
    
    let offset = 0;
    const batchSize = 100;
    
    while (true) {
      const restaurants = await Restaurant.findAll({
        limit: batchSize,
        offset,
      });

      if (restaurants.length === 0) break;

      const bulkBody = restaurants.flatMap(restaurant => [
        { index: { _index: this.INDEX_NAME, _id: restaurant.id } },
        {
          id: restaurant.id,
          tenantId: restaurant.tenantId,
          name: restaurant.name,
          description: restaurant.description,
          cuisineType: restaurant.cuisineType,
          priceRange: restaurant.priceRange,
          city: restaurant.city,
          state: restaurant.state,
          country: restaurant.country,
          location: restaurant.latitude && restaurant.longitude ? {
            lat: restaurant.latitude,
            lon: restaurant.longitude,
          } : null,
          features: restaurant.features,
          dietaryRestrictions: restaurant.dietaryRestrictions,
          averageRating: restaurant.averageRating,
          totalReviews: restaurant.totalReviews,
          isActive: restaurant.isActive,
          isVerified: restaurant.isVerified,
          createdAt: restaurant.createdAt,
          updatedAt: restaurant.updatedAt,
        },
      ]);

      await this.elasticClient.bulk({ body: bulkBody });
      
      offset += batchSize;
      logger.info(`Indexed ${offset} restaurants`);
    }

    logger.info('Reindexing complete');
  }
}