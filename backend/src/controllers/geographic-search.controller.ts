import { Request, Response } from 'express';
import { GeographicSearchService, GeoSearchParams } from '../services/GeographicSearchService';
import { ServiceType } from '../models/UnifiedListing';
import { logger } from '../utils/logger';
import { validationResult } from 'express-validator';

export class GeographicSearchController {
  private static geoSearchService = GeographicSearchService.getInstance();

  /**
   * Search for listings within a radius of a point
   */
  static async searchNearby(req: Request, res: Response) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const {
        lat,
        lng,
        radius = 25,
        serviceType,
        limit = 50,
        page = 1,
        minRating,
        maxPrice,
        minPrice,
      } = req.query;

      const params: GeoSearchParams = {
        lat: parseFloat(lat as string),
        lng: parseFloat(lng as string),
        radius: parseFloat(radius as string),
        serviceType: serviceType as ServiceType,
        limit: parseInt(limit as string),
        offset: (parseInt(page as string) - 1) * parseInt(limit as string),
        minRating: minRating ? parseFloat(minRating as string) : undefined,
        maxPrice: maxPrice ? parseFloat(maxPrice as string) : undefined,
        minPrice: minPrice ? parseFloat(minPrice as string) : undefined,
      };

      const results = await GeographicSearchController.geoSearchService.searchNearby(params);

      res.json({
        ...results,
        page: parseInt(page as string),
        pageSize: parseInt(limit as string),
        hasMore: results.totalCount > (parseInt(page as string) * parseInt(limit as string)),
      });
    } catch (error) {
      logger.error('Error in nearby search:', error);
      res.status(500).json({ error: 'Failed to search nearby listings' });
    }
  }

  /**
   * Search for listings within a bounding box
   */
  static async searchInBounds(req: Request, res: Response) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const {
        north,
        south,
        east,
        west,
        serviceType,
        limit = 100,
        page = 1,
        minRating,
        maxPrice,
        minPrice,
      } = req.query;

      const filters = {
        serviceType: serviceType as ServiceType,
        limit: parseInt(limit as string),
        offset: (parseInt(page as string) - 1) * parseInt(limit as string),
        minRating: minRating ? parseFloat(minRating as string) : undefined,
        maxPrice: maxPrice ? parseFloat(maxPrice as string) : undefined,
        minPrice: minPrice ? parseFloat(minPrice as string) : undefined,
      };

      const results = await GeographicSearchController.geoSearchService.searchInBounds(
        parseFloat(north as string),
        parseFloat(south as string),
        parseFloat(east as string),
        parseFloat(west as string),
        filters
      );

      res.json({
        items: results,
        bounds: {
          north: parseFloat(north as string),
          south: parseFloat(south as string),
          east: parseFloat(east as string),
          west: parseFloat(west as string),
        },
        page: parseInt(page as string),
        pageSize: parseInt(limit as string),
        totalCount: results.length,
      });
    } catch (error) {
      logger.error('Error in bounds search:', error);
      res.status(500).json({ error: 'Failed to search within bounds' });
    }
  }

  /**
   * Find closest listings to a point
   */
  static async findClosest(req: Request, res: Response) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const {
        lat,
        lng,
        count = 10,
        serviceType,
      } = req.query;

      const results = await GeographicSearchController.geoSearchService.findClosest(
        parseFloat(lat as string),
        parseFloat(lng as string),
        parseInt(count as string),
        serviceType as ServiceType
      );

      res.json({
        items: results,
        center: {
          lat: parseFloat(lat as string),
          lng: parseFloat(lng as string),
        },
        count: results.length,
      });
    } catch (error) {
      logger.error('Error finding closest listings:', error);
      res.status(500).json({ error: 'Failed to find closest listings' });
    }
  }

  /**
   * Get geographic statistics
   */
  static async getGeoStats(req: Request, res: Response) {
    try {
      const { serviceType } = req.query;

      const stats = await GeographicSearchController.geoSearchService.getGeoStats(
        serviceType as ServiceType
      );

      res.json(stats);
    } catch (error) {
      logger.error('Error getting geo stats:', error);
      res.status(500).json({ error: 'Failed to get geographic statistics' });
    }
  }

  /**
   * Calculate distance between two points
   */
  static async calculateDistance(req: Request, res: Response) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { lat1, lng1, lat2, lng2 } = req.query;

      const distance = GeographicSearchService.calculateDistance(
        parseFloat(lat1 as string),
        parseFloat(lng1 as string),
        parseFloat(lat2 as string),
        parseFloat(lng2 as string)
      );

      res.json({
        distance: Math.round(distance * 100) / 100, // Round to 2 decimal places
        unit: 'km',
        points: {
          from: {
            lat: parseFloat(lat1 as string),
            lng: parseFloat(lng1 as string),
          },
          to: {
            lat: parseFloat(lat2 as string),
            lng: parseFloat(lng2 as string),
          },
        },
      });
    } catch (error) {
      logger.error('Error calculating distance:', error);
      res.status(500).json({ error: 'Failed to calculate distance' });
    }
  }

  /**
   * Get listings clustered by location for map display
   */
  static async getClusters(req: Request, res: Response) {
    try {
      const {
        north,
        south,
        east,
        west,
        zoom = 10,
        serviceType,
      } = req.query;

      // Calculate cluster size based on zoom level
      const clusterSize = Math.max(0.01, 1 / Math.pow(2, parseInt(zoom as string) - 5));

      const filters = {
        serviceType: serviceType as ServiceType,
        limit: 1000, // Get more for clustering
      };

      const listings = await GeographicSearchController.geoSearchService.searchInBounds(
        parseFloat(north as string),
        parseFloat(south as string),
        parseFloat(east as string),
        parseFloat(west as string),
        filters
      );

      // Simple clustering algorithm
      const clusters = GeographicSearchController.clusterListings(listings, clusterSize);

      res.json({
        clusters,
        bounds: {
          north: parseFloat(north as string),
          south: parseFloat(south as string),
          east: parseFloat(east as string),
          west: parseFloat(west as string),
        },
        zoom: parseInt(zoom as string),
        totalListings: listings.length,
      });
    } catch (error) {
      logger.error('Error getting clusters:', error);
      res.status(500).json({ error: 'Failed to get listing clusters' });
    }
  }

  /**
   * Simple clustering algorithm for map display
   */
  private static clusterListings(listings: any[], clusterSize: number) {
    const clusters: Array<{
      center: { lat: number; lng: number };
      count: number;
      listings: any[];
      bounds: { north: number; south: number; east: number; west: number };
    }> = [];

    const processed = new Set<string>();

    for (const listing of listings) {
      if (processed.has(listing.id)) continue;

      const cluster = {
        center: { lat: listing.location.lat, lng: listing.location.lng },
        count: 1,
        listings: [listing],
        bounds: {
          north: listing.location.lat,
          south: listing.location.lat,
          east: listing.location.lng,
          west: listing.location.lng,
        },
      };

      processed.add(listing.id);

      // Find nearby listings to cluster
      for (const other of listings) {
        if (processed.has(other.id)) continue;

        const distance = GeographicSearchService.calculateDistance(
          listing.location.lat,
          listing.location.lng,
          other.location.lat,
          other.location.lng
        );

        // If within cluster size, add to cluster
        if (distance <= clusterSize) {
          cluster.count++;
          cluster.listings.push(other);
          processed.add(other.id);

          // Update bounds
          cluster.bounds.north = Math.max(cluster.bounds.north, other.location.lat);
          cluster.bounds.south = Math.min(cluster.bounds.south, other.location.lat);
          cluster.bounds.east = Math.max(cluster.bounds.east, other.location.lng);
          cluster.bounds.west = Math.min(cluster.bounds.west, other.location.lng);

          // Update center (average)
          cluster.center.lat =
            cluster.listings.reduce((sum, l) => sum + l.location.lat, 0) / cluster.listings.length;
          cluster.center.lng =
            cluster.listings.reduce((sum, l) => sum + l.location.lng, 0) / cluster.listings.length;
        }
      }

      clusters.push(cluster);
    }

    return clusters;
  }
}