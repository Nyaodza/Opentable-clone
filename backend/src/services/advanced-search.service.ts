import { Client as ElasticsearchClient } from '@elastic/elasticsearch';
import { Op, Sequelize, QueryTypes } from 'sequelize';
import { Restaurant, Cuisine, Review, Reservation, Table } from '../models';
import { redis } from '../config/redis';
import { logger } from '../utils/logger';
import axios from 'axios';

interface SearchFilters {
  // Basic filters
  query?: string;
  cuisine?: string[];
  priceRange?: number[];
  rating?: number;

  // Location filters
  location?: {
    lat: number;
    lng: number;
    radius: number;
  };
  neighborhood?: string[];
  city?: string;

  // Availability filters
  date?: Date;
  time?: string;
  partySize?: number;

  // Advanced filters
  ambiance?: string[];
  diningStyle?: string[];
  dressCode?: string[];
  parking?: string[];
  features?: string[];

  // Dietary restrictions
  dietary?: string[];

  // Special features
  hasPrivateDining?: boolean;
  hasOutdoorSeating?: boolean;
  hasBar?: boolean;
  acceptsReservations?: boolean;
  isWheelchairAccessible?: boolean;
  hasLiveMusic?: boolean;

  // Sorting
  sortBy?: 'relevance' | 'rating' | 'price' | 'distance' | 'availability' | 'trending';

  // Pagination
  page?: number;
  limit?: number;
}

interface SearchResult {
  restaurants: any[];
  totalCount: number;
  facets: any;
  suggestions: string[];
  mapBounds?: any;
  hotTables?: any[];
  collections?: any[];
}

interface HotTable {
  restaurantId: string;
  restaurantName: string;
  time: string;
  discount: number;
  originalPrice: number;
  discountedPrice: number;
  availableSlots: number;
}

interface Collection {
  id: string;
  name: string;
  description: string;
  restaurants: any[];
  image: string;
}

export class AdvancedSearchService {
  private elasticsearch: ElasticsearchClient;
  private readonly CACHE_TTL = 600; // 10 minutes
  private readonly SEARCH_INDEX = 'restaurants';
  private readonly GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;

  constructor() {
    this.elasticsearch = new ElasticsearchClient({
      node: process.env.ELASTICSEARCH_URL || 'http://localhost:9200',
      auth: {
        username: process.env.ELASTICSEARCH_USERNAME || 'elastic',
        password: process.env.ELASTICSEARCH_PASSWORD || 'password'
      }
    });

    this.initializeSearchIndex();
  }

  // Initialize Elasticsearch index with mappings
  private async initializeSearchIndex(): Promise<void> {
    try {
      const indexExists = await this.elasticsearch.indices.exists({
        index: this.SEARCH_INDEX
      });

      if (!indexExists) {
        await this.elasticsearch.indices.create({
          index: this.SEARCH_INDEX,
          body: {
            mappings: {
              properties: {
                id: { type: 'keyword' },
                name: {
                  type: 'text',
                  fields: {
                    keyword: { type: 'keyword' },
                    suggest: { type: 'completion' }
                  }
                },
                description: { type: 'text' },
                cuisine: {
                  type: 'keyword',
                  fields: { text: { type: 'text' } }
                },
                subcuisines: { type: 'keyword' },
                priceRange: { type: 'integer' },
                rating: { type: 'float' },
                reviewCount: { type: 'integer' },
                location: { type: 'geo_point' },
                address: {
                  properties: {
                    street: { type: 'text' },
                    city: { type: 'keyword' },
                    state: { type: 'keyword' },
                    zipCode: { type: 'keyword' },
                    neighborhood: { type: 'keyword' },
                    country: { type: 'keyword' }
                  }
                },
                ambiance: { type: 'keyword' },
                diningStyle: { type: 'keyword' },
                dressCode: { type: 'keyword' },
                parking: { type: 'keyword' },
                features: { type: 'keyword' },
                dietary: { type: 'keyword' },
                hasPrivateDining: { type: 'boolean' },
                hasOutdoorSeating: { type: 'boolean' },
                hasBar: { type: 'boolean' },
                acceptsReservations: { type: 'boolean' },
                isWheelchairAccessible: { type: 'boolean' },
                hasLiveMusic: { type: 'boolean' },
                popularTimes: { type: 'object' },
                tags: { type: 'keyword' },
                images: { type: 'keyword' },
                menuUrl: { type: 'keyword' },
                website: { type: 'keyword' },
                phone: { type: 'keyword' },
                operatingHours: { type: 'object' },
                createdAt: { type: 'date' },
                updatedAt: { type: 'date' },
                trendingScore: { type: 'float' },
                bookingCount30Days: { type: 'integer' }
              }
            },
            settings: {
              analysis: {
                analyzer: {
                  autocomplete: {
                    tokenizer: 'autocomplete',
                    filter: ['lowercase']
                  },
                  autocomplete_search: {
                    tokenizer: 'lowercase'
                  }
                },
                tokenizer: {
                  autocomplete: {
                    type: 'edge_ngram',
                    min_gram: 2,
                    max_gram: 10,
                    token_chars: ['letter']
                  }
                }
              }
            }
          }
        });

        logger.info('Elasticsearch index created successfully');
      }
    } catch (error) {
      logger.error('Error initializing Elasticsearch index:', error);
    }
  }

  // Main search function
  async search(filters: SearchFilters): Promise<SearchResult> {
    const cacheKey = this.generateCacheKey(filters);
    const cached = await redis.get(cacheKey);

    if (cached && !filters.date) {
      return JSON.parse(cached);
    }

    try {
      // Build Elasticsearch query
      const query = this.buildElasticsearchQuery(filters);

      // Execute search
      const response = await this.elasticsearch.search({
        index: this.SEARCH_INDEX,
        body: query
      });

      // Process results
      let restaurants = await this.processSearchResults(response.hits.hits, filters);

      // Apply availability filter if provided
      if (filters.date && filters.time && filters.partySize) {
        restaurants = await this.filterByAvailability(
          restaurants,
          filters.date,
          filters.time,
          filters.partySize
        );
      }

      // Get facets for filtering
      const facets = this.extractFacets(response.aggregations);

      // Get search suggestions
      const suggestions = await this.getSearchSuggestions(filters.query || '');

      // Get hot tables (last-minute deals)
      const hotTables = await this.getHotTables(filters);

      // Get curated collections
      const collections = await this.getCuratedCollections(filters);

      // Calculate map bounds if location search
      const mapBounds = filters.location
        ? this.calculateMapBounds(restaurants)
        : undefined;

      const result: SearchResult = {
        restaurants,
        totalCount: typeof response.hits.total === 'number'
          ? response.hits.total
          : response.hits.total?.value || 0,
        facets,
        suggestions,
        mapBounds,
        hotTables,
        collections
      };

      // Cache result if not filtering by availability
      if (!filters.date) {
        await redis.setex(cacheKey, this.CACHE_TTL, JSON.stringify(result));
      }

      return result;
    } catch (error) {
      logger.error('Search error:', error);
      throw new Error('Search failed');
    }
  }

  // Build Elasticsearch query from filters
  private buildElasticsearchQuery(filters: SearchFilters): any {
    const must: any[] = [];
    const filter: any[] = [];
    const should: any[] = [];

    // Text search
    if (filters.query) {
      must.push({
        multi_match: {
          query: filters.query,
          fields: [
            'name^3',
            'description^2',
            'cuisine.text^2',
            'subcuisines',
            'tags',
            'address.neighborhood',
            'ambiance',
            'features'
          ],
          type: 'best_fields',
          fuzziness: 'AUTO'
        }
      });
    }

    // Cuisine filter
    if (filters.cuisine && filters.cuisine.length > 0) {
      filter.push({
        terms: { cuisine: filters.cuisine }
      });
    }

    // Price range filter
    if (filters.priceRange && filters.priceRange.length > 0) {
      filter.push({
        terms: { priceRange: filters.priceRange }
      });
    }

    // Rating filter
    if (filters.rating) {
      filter.push({
        range: { rating: { gte: filters.rating } }
      });
    }

    // Location-based search
    if (filters.location) {
      filter.push({
        geo_distance: {
          distance: `${filters.location.radius}km`,
          location: {
            lat: filters.location.lat,
            lon: filters.location.lng
          }
        }
      });
    }

    // Neighborhood filter
    if (filters.neighborhood && filters.neighborhood.length > 0) {
      filter.push({
        terms: { 'address.neighborhood': filters.neighborhood }
      });
    }

    // City filter
    if (filters.city) {
      filter.push({
        term: { 'address.city': filters.city }
      });
    }

    // Ambiance filter
    if (filters.ambiance && filters.ambiance.length > 0) {
      filter.push({
        terms: { ambiance: filters.ambiance }
      });
    }

    // Dining style filter
    if (filters.diningStyle && filters.diningStyle.length > 0) {
      filter.push({
        terms: { diningStyle: filters.diningStyle }
      });
    }

    // Dress code filter
    if (filters.dressCode && filters.dressCode.length > 0) {
      filter.push({
        terms: { dressCode: filters.dressCode }
      });
    }

    // Parking filter
    if (filters.parking && filters.parking.length > 0) {
      filter.push({
        terms: { parking: filters.parking }
      });
    }

    // Features filter
    if (filters.features && filters.features.length > 0) {
      filter.push({
        terms: { features: filters.features }
      });
    }

    // Dietary restrictions filter
    if (filters.dietary && filters.dietary.length > 0) {
      filter.push({
        terms: { dietary: filters.dietary }
      });
    }

    // Boolean filters
    if (filters.hasPrivateDining !== undefined) {
      filter.push({ term: { hasPrivateDining: filters.hasPrivateDining } });
    }
    if (filters.hasOutdoorSeating !== undefined) {
      filter.push({ term: { hasOutdoorSeating: filters.hasOutdoorSeating } });
    }
    if (filters.hasBar !== undefined) {
      filter.push({ term: { hasBar: filters.hasBar } });
    }
    if (filters.acceptsReservations !== undefined) {
      filter.push({ term: { acceptsReservations: filters.acceptsReservations } });
    }
    if (filters.isWheelchairAccessible !== undefined) {
      filter.push({ term: { isWheelchairAccessible: filters.isWheelchairAccessible } });
    }
    if (filters.hasLiveMusic !== undefined) {
      filter.push({ term: { hasLiveMusic: filters.hasLiveMusic } });
    }

    // Build sort
    const sort = this.buildSort(filters);

    // Build aggregations for facets
    const aggs = this.buildAggregations();

    // Pagination
    const from = ((filters.page || 1) - 1) * (filters.limit || 20);
    const size = filters.limit || 20;

    return {
      query: {
        bool: {
          must: must.length > 0 ? must : [{ match_all: {} }],
          filter,
          should
        }
      },
      sort,
      aggs,
      from,
      size,
      _source: true,
      highlight: {
        fields: {
          name: {},
          description: {}
        }
      }
    };
  }

  // Build sort criteria
  private buildSort(filters: SearchFilters): any[] {
    const sort: any[] = [];

    switch (filters.sortBy) {
      case 'rating':
        sort.push({ rating: { order: 'desc' } });
        break;
      case 'price':
        sort.push({ priceRange: { order: 'asc' } });
        break;
      case 'distance':
        if (filters.location) {
          sort.push({
            _geo_distance: {
              location: {
                lat: filters.location.lat,
                lon: filters.location.lng
              },
              order: 'asc',
              unit: 'km'
            }
          });
        }
        break;
      case 'trending':
        sort.push({ trendingScore: { order: 'desc' } });
        break;
      case 'availability':
        // This will be handled post-search
        sort.push({ bookingCount30Days: { order: 'asc' } });
        break;
      case 'relevance':
      default:
        sort.push({ _score: { order: 'desc' } });
        break;
    }

    // Add secondary sort
    sort.push({ rating: { order: 'desc' } });
    sort.push({ reviewCount: { order: 'desc' } });

    return sort;
  }

  // Build aggregations for faceted search
  private buildAggregations(): any {
    return {
      cuisines: {
        terms: { field: 'cuisine', size: 20 }
      },
      priceRanges: {
        terms: { field: 'priceRange' }
      },
      neighborhoods: {
        terms: { field: 'address.neighborhood', size: 30 }
      },
      ambiances: {
        terms: { field: 'ambiance', size: 15 }
      },
      diningStyles: {
        terms: { field: 'diningStyle', size: 10 }
      },
      features: {
        terms: { field: 'features', size: 20 }
      },
      dietary: {
        terms: { field: 'dietary', size: 15 }
      },
      avgRating: {
        avg: { field: 'rating' }
      },
      ratingRanges: {
        range: {
          field: 'rating',
          ranges: [
            { from: 4.5, key: '4.5+' },
            { from: 4.0, to: 4.5, key: '4.0-4.5' },
            { from: 3.5, to: 4.0, key: '3.5-4.0' },
            { from: 3.0, to: 3.5, key: '3.0-3.5' }
          ]
        }
      }
    };
  }

  // Process search results
  private async processSearchResults(hits: any[], filters: SearchFilters): Promise<any[]> {
    const restaurants = [];

    for (const hit of hits) {
      const restaurant = hit._source;
      restaurant.searchScore = hit._score;

      // Add distance if location search
      if (hit.sort && filters.location) {
        restaurant.distance = hit.sort[0]; // Distance in km
      }

      // Add highlight if text search
      if (hit.highlight) {
        restaurant.highlight = hit.highlight;
      }

      // Get additional data from database
      const dbRestaurant = await Restaurant.findByPk(restaurant.id, {
        include: [
          {
            model: Review,
            as: 'reviews',
            limit: 3,
            order: [['rating', 'DESC']]
          }
        ]
      });

      if (dbRestaurant) {
        restaurant.recentReviews = dbRestaurant.reviews;
        restaurant.photosCount = await this.getPhotosCount(restaurant.id);
      }

      restaurants.push(restaurant);
    }

    return restaurants;
  }

  // Filter restaurants by availability
  private async filterByAvailability(
    restaurants: any[],
    date: Date,
    time: string,
    partySize: number
  ): Promise<any[]> {
    const availableRestaurants = [];

    for (const restaurant of restaurants) {
      const availability = await this.checkRestaurantAvailability(
        restaurant.id,
        date,
        time,
        partySize
      );

      if (availability.hasAvailability) {
        restaurant.availableSlots = availability.slots;
        restaurant.nextAvailable = availability.nextAvailable;
        availableRestaurants.push(restaurant);
      } else if (availability.alternativeTimes && availability.alternativeTimes.length > 0) {
        restaurant.alternativeTimes = availability.alternativeTimes;
        restaurant.isAlternative = true;
        availableRestaurants.push(restaurant);
      }
    }

    return availableRestaurants;
  }

  // Check restaurant availability
  private async checkRestaurantAvailability(
    restaurantId: string,
    date: Date,
    time: string,
    partySize: number
  ): Promise<any> {
    const cacheKey = `availability:${restaurantId}:${date.toISOString()}:${time}:${partySize}`;
    const cached = await redis.get(cacheKey);

    if (cached) {
      return JSON.parse(cached);
    }

    // Get restaurant's tables
    const tables = await Table.findAll({
      where: {
        restaurantId,
        isActive: true,
        capacity: { [Op.gte]: partySize }
      }
    });

    if (tables.length === 0) {
      return { hasAvailability: false };
    }

    // Parse requested time
    const [hours, minutes] = time.split(':').map(Number);
    const requestedTime = new Date(date);
    requestedTime.setHours(hours, minutes, 0, 0);

    // Check for existing reservations
    const existingReservations = await Reservation.findAll({
      where: {
        restaurantId,
        date,
        status: { [Op.in]: ['confirmed', 'seated'] },
        startTime: {
          [Op.between]: [
            new Date(requestedTime.getTime() - 2 * 60 * 60 * 1000), // 2 hours before
            new Date(requestedTime.getTime() + 2 * 60 * 60 * 1000)  // 2 hours after
          ]
        }
      }
    });

    // Calculate available slots
    const occupiedTableIds = new Set(existingReservations.map(r => r.tableId));
    const availableTables = tables.filter(t => !occupiedTableIds.has(t.id));

    const slots = [];
    const alternativeTimes = [];

    // Check specific time slot
    if (availableTables.length > 0) {
      slots.push({
        time,
        tablesAvailable: availableTables.length,
        tables: availableTables.map(t => ({
          id: t.id,
          number: t.tableNumber,
          capacity: t.capacity
        }))
      });
    }

    // Find alternative times (15-minute increments)
    for (let offset = -90; offset <= 90; offset += 15) {
      if (offset === 0) continue; // Skip the requested time

      const altTime = new Date(requestedTime.getTime() + offset * 60 * 1000);
      const altTimeString = `${altTime.getHours().toString().padStart(2, '0')}:${altTime.getMinutes().toString().padStart(2, '0')}`;

      const altReservations = await Reservation.count({
        where: {
          restaurantId,
          date,
          startTime: altTime,
          status: { [Op.in]: ['confirmed', 'seated'] }
        }
      });

      if (tables.length - altReservations > 0) {
        alternativeTimes.push({
          time: altTimeString,
          available: tables.length - altReservations
        });
      }
    }

    const availability = {
      hasAvailability: slots.length > 0,
      slots,
      alternativeTimes: alternativeTimes.slice(0, 6), // Limit to 6 alternatives
      nextAvailable: null
    };

    await redis.setex(cacheKey, 300, JSON.stringify(availability)); // Cache for 5 minutes

    return availability;
  }

  // Get hot tables (last-minute deals)
  private async getHotTables(filters: SearchFilters): Promise<HotTable[]> {
    const hotTables: HotTable[] = [];

    // Get restaurants offering discounts for tonight
    const tonight = new Date();
    tonight.setHours(18, 0, 0, 0);

    const query = `
      SELECT
        r.id as restaurantId,
        r.name as restaurantName,
        t.time,
        t.discount,
        r.avgPrice * 2 as originalPrice,
        COUNT(tab.id) as availableSlots
      FROM restaurants r
      INNER JOIN time_slots t ON r.id = t.restaurantId
      INNER JOIN tables tab ON r.id = tab.restaurantId
      WHERE t.date = :date
        AND t.discount > 0
        AND t.time >= :startTime
        AND tab.status = 'available'
      GROUP BY r.id, t.time, t.discount
      ORDER BY t.discount DESC
      LIMIT 10
    `;

    const results = await Restaurant.sequelize!.query(query, {
      replacements: {
        date: tonight,
        startTime: '18:00'
      },
      type: QueryTypes.SELECT
    });

    for (const result of results as any[]) {
      hotTables.push({
        restaurantId: result.restaurantId,
        restaurantName: result.restaurantName,
        time: result.time,
        discount: result.discount,
        originalPrice: result.originalPrice,
        discountedPrice: result.originalPrice * (1 - result.discount / 100),
        availableSlots: result.availableSlots
      });
    }

    return hotTables;
  }

  // Get curated collections
  private async getCuratedCollections(filters: SearchFilters): Promise<Collection[]> {
    const collections: Collection[] = [];

    // Get collections based on location or general
    const collectionData = [
      {
        id: 'romantic',
        name: 'Most Romantic',
        description: 'Perfect for date night',
        query: { ambiance: ['romantic', 'intimate'], priceRange: [3, 4] }
      },
      {
        id: 'trending',
        name: 'Trending This Week',
        description: 'Hot spots everyone\'s talking about',
        query: { sortBy: 'trending' as const }
      },
      {
        id: 'outdoor',
        name: 'Best Outdoor Dining',
        description: 'Al fresco dining at its finest',
        query: { hasOutdoorSeating: true }
      },
      {
        id: 'brunch',
        name: 'Best Brunch Spots',
        description: 'Weekend brunch favorites',
        query: { features: ['brunch'], diningStyle: ['casual'] }
      },
      {
        id: 'vegetarian',
        name: 'Vegetarian Friendly',
        description: 'Great options for plant-based dining',
        query: { dietary: ['vegetarian', 'vegan'] }
      }
    ];

    for (const collection of collectionData) {
      const searchFilters: SearchFilters = {
        ...collection.query,
        limit: 5
      };

      if (filters.location) {
        searchFilters.location = filters.location;
      }

      const results = await this.search(searchFilters);

      collections.push({
        id: collection.id,
        name: collection.name,
        description: collection.description,
        restaurants: results.restaurants.slice(0, 5),
        image: `/images/collections/${collection.id}.jpg`
      });
    }

    return collections;
  }

  // Get search suggestions
  private async getSearchSuggestions(query: string): Promise<string[]> {
    if (!query || query.length < 2) {
      return [];
    }

    try {
      const response = await this.elasticsearch.search({
        index: this.SEARCH_INDEX,
        body: {
          suggest: {
            restaurant_suggest: {
              text: query,
              completion: {
                field: 'name.suggest',
                size: 5,
                fuzzy: {
                  fuzziness: 'AUTO'
                }
              }
            },
            cuisine_suggest: {
              text: query,
              term: {
                field: 'cuisine.text',
                size: 3
              }
            }
          }
        }
      });

      const suggestions: string[] = [];

      // Add restaurant name suggestions
      if (response.suggest?.restaurant_suggest?.[0]?.options) {
        response.suggest.restaurant_suggest[0].options.forEach((option: any) => {
          suggestions.push(option.text);
        });
      }

      // Add cuisine suggestions
      if (response.suggest?.cuisine_suggest?.[0]?.options) {
        response.suggest.cuisine_suggest[0].options.forEach((option: any) => {
          suggestions.push(option.text);
        });
      }

      return [...new Set(suggestions)]; // Remove duplicates
    } catch (error) {
      logger.error('Error getting search suggestions:', error);
      return [];
    }
  }

  // Extract facets from aggregations
  private extractFacets(aggregations: any): any {
    if (!aggregations) {
      return {};
    }

    return {
      cuisines: aggregations.cuisines?.buckets || [],
      priceRanges: aggregations.priceRanges?.buckets || [],
      neighborhoods: aggregations.neighborhoods?.buckets || [],
      ambiances: aggregations.ambiances?.buckets || [],
      diningStyles: aggregations.diningStyles?.buckets || [],
      features: aggregations.features?.buckets || [],
      dietary: aggregations.dietary?.buckets || [],
      avgRating: aggregations.avgRating?.value || 0,
      ratingRanges: aggregations.ratingRanges?.buckets || []
    };
  }

  // Calculate map bounds for search results
  private calculateMapBounds(restaurants: any[]): any {
    if (restaurants.length === 0) {
      return null;
    }

    let minLat = 90, maxLat = -90, minLng = 180, maxLng = -180;

    restaurants.forEach(r => {
      if (r.location) {
        minLat = Math.min(minLat, r.location.lat);
        maxLat = Math.max(maxLat, r.location.lat);
        minLng = Math.min(minLng, r.location.lon);
        maxLng = Math.max(maxLng, r.location.lon);
      }
    });

    return {
      northeast: { lat: maxLat, lng: maxLng },
      southwest: { lat: minLat, lng: minLng }
    };
  }

  // Get photos count for restaurant
  private async getPhotosCount(restaurantId: string): Promise<number> {
    // This would query a photos table or service
    return Math.floor(Math.random() * 100) + 10; // Placeholder
  }

  // Generate cache key from filters
  private generateCacheKey(filters: SearchFilters): string {
    return `search:${JSON.stringify(filters)}`;
  }

  // Index restaurant in Elasticsearch
  async indexRestaurant(restaurant: any): Promise<void> {
    try {
      await this.elasticsearch.index({
        index: this.SEARCH_INDEX,
        id: restaurant.id,
        body: {
          ...restaurant,
          location: {
            lat: restaurant.latitude,
            lon: restaurant.longitude
          }
        }
      });

      logger.info(`Restaurant ${restaurant.id} indexed successfully`);
    } catch (error) {
      logger.error(`Error indexing restaurant ${restaurant.id}:`, error);
      throw error;
    }
  }

  // Update restaurant in index
  async updateRestaurantIndex(restaurantId: string, updates: any): Promise<void> {
    try {
      await this.elasticsearch.update({
        index: this.SEARCH_INDEX,
        id: restaurantId,
        body: {
          doc: updates
        }
      });

      logger.info(`Restaurant ${restaurantId} updated in index`);
    } catch (error) {
      logger.error(`Error updating restaurant ${restaurantId} in index:`, error);
      throw error;
    }
  }

  // Delete restaurant from index
  async deleteRestaurantFromIndex(restaurantId: string): Promise<void> {
    try {
      await this.elasticsearch.delete({
        index: this.SEARCH_INDEX,
        id: restaurantId
      });

      logger.info(`Restaurant ${restaurantId} removed from index`);
    } catch (error) {
      logger.error(`Error deleting restaurant ${restaurantId} from index:`, error);
      throw error;
    }
  }

  // Geocode address using Google Maps API
  async geocodeAddress(address: string): Promise<{ lat: number; lng: number }> {
    try {
      const response = await axios.get(
        'https://maps.googleapis.com/maps/api/geocode/json',
        {
          params: {
            address,
            key: this.GOOGLE_MAPS_API_KEY
          }
        }
      );

      if (response.data.results && response.data.results.length > 0) {
        const location = response.data.results[0].geometry.location;
        return {
          lat: location.lat,
          lng: location.lng
        };
      }

      throw new Error('Address not found');
    } catch (error) {
      logger.error('Geocoding error:', error);
      throw error;
    }
  }

  // Get nearby restaurants using location
  async getNearbyRestaurants(lat: number, lng: number, radius: number = 5): Promise<any[]> {
    const filters: SearchFilters = {
      location: { lat, lng, radius },
      sortBy: 'distance',
      limit: 20
    };

    const results = await this.search(filters);
    return results.restaurants;
  }
}

export const advancedSearchService = new AdvancedSearchService();