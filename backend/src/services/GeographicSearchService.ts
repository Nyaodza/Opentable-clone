import { QueryInterface, DataTypes, Op, QueryTypes } from 'sequelize';
import { UnifiedListing, ServiceType, ListingStatus } from '../models/UnifiedListing';
import { sequelize } from '../config/database';
import { logger } from '../utils/logger';
import { SearchParams } from '../types/api-providers.types';

export interface GeoSearchParams {
  lat: number;
  lng: number;
  radius: number; // in kilometers
  serviceType?: ServiceType;
  limit?: number;
  offset?: number;
  minRating?: number;
  maxPrice?: number;
  minPrice?: number;
}

export interface GeoSearchResult {
  id: string;
  title: string;
  serviceType: ServiceType;
  location: {
    lat: number;
    lng: number;
    city?: string;
    country?: string;
  };
  distance: number; // in kilometers
  rating?: number;
  price?: number;
  currency?: string;
  thumbnailUrl?: string;
  url: string;
}

export interface NearbyListingsResponse {
  items: GeoSearchResult[];
  center: { lat: number; lng: number };
  radius: number;
  totalCount: number;
  averageDistance: number;
  bounds: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
}

export class GeographicSearchService {
  private static instance: GeographicSearchService;

  private constructor() {}

  static getInstance(): GeographicSearchService {
    if (!GeographicSearchService.instance) {
      GeographicSearchService.instance = new GeographicSearchService();
    }
    return GeographicSearchService.instance;
  }

  /**
   * Search for listings within a radius of a point
   */
  async searchNearby(params: GeoSearchParams): Promise<NearbyListingsResponse> {
    try {
      const {
        lat,
        lng,
        radius,
        serviceType,
        limit = 50,
        offset = 0,
        minRating,
        maxPrice,
        minPrice,
      } = params;

      // Build WHERE conditions
      const whereConditions: string[] = [
        'status = :status',
        'location_point IS NOT NULL',
        `ST_DWithin(
          location_point::geography,
          ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography,
          :radiusMeters
        )`,
      ];

      const replacements: Record<string, any> = {
        lat,
        lng,
        radiusMeters: radius * 1000, // Convert km to meters
        status: ListingStatus.ACTIVE,
        limit,
        offset,
      };

      if (serviceType) {
        whereConditions.push('"serviceType" = :serviceType');
        replacements.serviceType = serviceType;
      }

      if (minRating) {
        whereConditions.push('rating >= :minRating');
        replacements.minRating = minRating;
      }

      if (minPrice) {
        whereConditions.push('price >= :minPrice');
        replacements.minPrice = minPrice;
      }

      if (maxPrice) {
        whereConditions.push('price <= :maxPrice');
        replacements.maxPrice = maxPrice;
      }

      const whereClause = whereConditions.join(' AND ');

      // Execute the spatial query
      const results = await sequelize.query(
        `
        SELECT 
          id,
          title,
          "serviceType",
          location,
          rating,
          price,
          currency,
          "thumbnailUrl",
          url,
          ST_Distance(
            location_point::geography,
            ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography
          ) / 1000 as distance
        FROM unified_listings
        WHERE ${whereClause}
        ORDER BY distance ASC
        LIMIT :limit
        OFFSET :offset
        `,
        {
          replacements,
          type: QueryTypes.SELECT,
        }
      );

      // Get total count for pagination
      const countResult = await sequelize.query(
        `
        SELECT COUNT(*) as total
        FROM unified_listings
        WHERE ${whereClause}
        `,
        {
          replacements: { ...replacements, limit: undefined, offset: undefined },
          type: QueryTypes.SELECT,
        }
      );

      const totalCount = parseInt((countResult[0] as any).total);

      // Format results
      const geoResults: GeoSearchResult[] = (results as any[]).map(row => ({
        id: row.id,
        title: row.title,
        serviceType: row.serviceType,
        location: {
          lat: row.location.lat,
          lng: row.location.lng,
          city: row.location.city,
          country: row.location.country,
        },
        distance: Math.round(row.distance * 100) / 100, // Round to 2 decimal places
        rating: row.rating,
        price: row.price,
        currency: row.currency,
        thumbnailUrl: row.thumbnailUrl,
        url: row.url,
      }));

      // Calculate average distance and bounds
      const averageDistance = geoResults.length > 0
        ? geoResults.reduce((sum, item) => sum + item.distance, 0) / geoResults.length
        : 0;

      const bounds = this.calculateBounds(lat, lng, radius);

      return {
        items: geoResults,
        center: { lat, lng },
        radius,
        totalCount,
        averageDistance: Math.round(averageDistance * 100) / 100,
        bounds,
      };
    } catch (error) {
      logger.error('Error in geographic search:', error);
      throw error;
    }
  }

  /**
   * Find listings within a bounding box
   */
  async searchInBounds(
    north: number,
    south: number,
    east: number,
    west: number,
    filters: Partial<GeoSearchParams> = {}
  ): Promise<GeoSearchResult[]> {
    try {
      const {
        serviceType,
        limit = 100,
        offset = 0,
        minRating,
        maxPrice,
        minPrice,
      } = filters;

      const whereConditions: string[] = [
        'status = :status',
        'location_point IS NOT NULL',
        `ST_Within(
          location_point,
          ST_MakeEnvelope(:west, :south, :east, :north, 4326)
        )`,
      ];

      const replacements: Record<string, any> = {
        north,
        south,
        east,
        west,
        status: ListingStatus.ACTIVE,
        limit,
        offset,
      };

      if (serviceType) {
        whereConditions.push('"serviceType" = :serviceType');
        replacements.serviceType = serviceType;
      }

      if (minRating) {
        whereConditions.push('rating >= :minRating');
        replacements.minRating = minRating;
      }

      if (minPrice) {
        whereConditions.push('price >= :minPrice');
        replacements.minPrice = minPrice;
      }

      if (maxPrice) {
        whereConditions.push('price <= :maxPrice');
        replacements.maxPrice = maxPrice;
      }

      const whereClause = whereConditions.join(' AND ');

      const results = await sequelize.query(
        `
        SELECT 
          id,
          title,
          "serviceType",
          location,
          rating,
          price,
          currency,
          "thumbnailUrl",
          url,
          0 as distance
        FROM unified_listings
        WHERE ${whereClause}
        ORDER BY score DESC, rating DESC
        LIMIT :limit
        OFFSET :offset
        `,
        {
          replacements,
          type: QueryTypes.SELECT,
        }
      );

      return (results as any[]).map(row => ({
        id: row.id,
        title: row.title,
        serviceType: row.serviceType,
        location: {
          lat: row.location.lat,
          lng: row.location.lng,
          city: row.location.city,
          country: row.location.country,
        },
        distance: 0, // Not calculated for bounding box search
        rating: row.rating,
        price: row.price,
        currency: row.currency,
        thumbnailUrl: row.thumbnailUrl,
        url: row.url,
      }));
    } catch (error) {
      logger.error('Error in bounding box search:', error);
      throw error;
    }
  }

  /**
   * Find the closest listings to a point
   */
  async findClosest(
    lat: number,
    lng: number,
    count: number = 10,
    serviceType?: ServiceType
  ): Promise<GeoSearchResult[]> {
    try {
      const whereConditions: string[] = [
        'status = :status',
        'location_point IS NOT NULL',
      ];

      const replacements: Record<string, any> = {
        lat,
        lng,
        status: ListingStatus.ACTIVE,
        count,
      };

      if (serviceType) {
        whereConditions.push('"serviceType" = :serviceType');
        replacements.serviceType = serviceType;
      }

      const whereClause = whereConditions.join(' AND ');

      const results = await sequelize.query(
        `
        SELECT 
          id,
          title,
          "serviceType",
          location,
          rating,
          price,
          currency,
          "thumbnailUrl",
          url,
          ST_Distance(
            location_point::geography,
            ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography
          ) / 1000 as distance
        FROM unified_listings
        WHERE ${whereClause}
        ORDER BY distance ASC
        LIMIT :count
        `,
        {
          replacements,
          type: QueryTypes.SELECT,
        }
      );

      return (results as any[]).map(row => ({
        id: row.id,
        title: row.title,
        serviceType: row.serviceType,
        location: {
          lat: row.location.lat,
          lng: row.location.lng,
          city: row.location.city,
          country: row.location.country,
        },
        distance: Math.round(row.distance * 100) / 100,
        rating: row.rating,
        price: row.price,
        currency: row.currency,
        thumbnailUrl: row.thumbnailUrl,
        url: row.url,
      }));
    } catch (error) {
      logger.error('Error finding closest listings:', error);
      throw error;
    }
  }

  /**
   * Get geographic statistics for listings
   */
  async getGeoStats(serviceType?: ServiceType): Promise<{
    totalListings: number;
    averageDistance: number;
    densestAreas: Array<{
      city: string;
      country: string;
      count: number;
      center: { lat: number; lng: number };
    }>;
    bounds: {
      north: number;
      south: number;
      east: number;
      west: number;
    };
  }> {
    try {
      const whereConditions: string[] = [
        'status = :status',
        'location_point IS NOT NULL',
      ];

      const replacements: Record<string, any> = {
        status: ListingStatus.ACTIVE,
      };

      if (serviceType) {
        whereConditions.push('"serviceType" = :serviceType');
        replacements.serviceType = serviceType;
      }

      const whereClause = whereConditions.join(' AND ');

      // Get total count and bounds
      const statsResult = await sequelize.query(
        `
        SELECT 
          COUNT(*) as total,
          ST_XMin(ST_Extent(location_point)) as west,
          ST_YMin(ST_Extent(location_point)) as south,
          ST_XMax(ST_Extent(location_point)) as east,
          ST_YMax(ST_Extent(location_point)) as north
        FROM unified_listings
        WHERE ${whereClause}
        `,
        {
          replacements,
          type: QueryTypes.SELECT,
        }
      );

      // Get densest areas (cities with most listings)
      const densityResult = await sequelize.query(
        `
        SELECT 
          "cityLower" as city,
          "countryLower" as country,
          COUNT(*) as count,
          AVG((location::jsonb->>'lat')::float) as center_lat,
          AVG((location::jsonb->>'lng')::float) as center_lng
        FROM unified_listings
        WHERE ${whereClause}
        GROUP BY "cityLower", "countryLower"
        HAVING COUNT(*) > 1
        ORDER BY count DESC
        LIMIT 10
        `,
        {
          replacements,
          type: QueryTypes.SELECT,
        }
      );

      const stats = statsResult[0] as any;
      const density = densityResult as any[];

      return {
        totalListings: parseInt(stats.total),
        averageDistance: 0, // Would need center point to calculate
        densestAreas: density.map(area => ({
          city: area.city,
          country: area.country,
          count: parseInt(area.count),
          center: {
            lat: parseFloat(area.center_lat),
            lng: parseFloat(area.center_lng),
          },
        })),
        bounds: {
          north: parseFloat(stats.north || 0),
          south: parseFloat(stats.south || 0),
          east: parseFloat(stats.east || 0),
          west: parseFloat(stats.west || 0),
        },
      };
    } catch (error) {
      logger.error('Error getting geo stats:', error);
      throw error;
    }
  }

  /**
   * Calculate bounding box for a center point and radius
   */
  private calculateBounds(lat: number, lng: number, radiusKm: number) {
    const kmPerDegree = 111.32; // Approximate km per degree at equator
    const latDelta = radiusKm / kmPerDegree;
    const lngDelta = radiusKm / (kmPerDegree * Math.cos((lat * Math.PI) / 180));

    return {
      north: lat + latDelta,
      south: lat - latDelta,
      east: lng + lngDelta,
      west: lng - lngDelta,
    };
  }

  /**
   * Calculate distance between two points using Haversine formula
   */
  static calculateDistance(
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number
  ): number {
    const R = 6371; // Earth's radius in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }
}