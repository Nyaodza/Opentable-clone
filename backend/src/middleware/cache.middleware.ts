import { Request, Response, NextFunction } from 'express';
import { cache, CACHE_TTL, CACHE_KEYS } from '../config/redis';

interface CacheOptions {
  ttl?: number;
  keyGenerator?: (req: Request) => string;
  condition?: (req: Request) => boolean;
  varyBy?: string[];
}

// Generic cache middleware
export const cacheMiddleware = (options: CacheOptions = {}) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Skip caching for non-GET requests
    if (req.method !== 'GET') {
      return next();
    }

    // Check condition if provided
    if (options.condition && !options.condition(req)) {
      return next();
    }

    try {
      // Generate cache key
      const cacheKey = options.keyGenerator 
        ? options.keyGenerator(req)
        : generateDefaultCacheKey(req, options.varyBy);

      // Try to get from cache
      const cachedData = await cache.get(cacheKey);
      
      if (cachedData) {
        // Add cache headers
        res.set({
          'X-Cache': 'HIT',
          'X-Cache-Key': cacheKey,
        });
        
        return res.json(cachedData);
      }

      // Store original json method
      const originalJson = res.json;
      
      // Override json method to cache response
      res.json = function(data: any) {
        // Cache the response
        const ttl = options.ttl || CACHE_TTL.MEDIUM;
        cache.set(cacheKey, data, ttl).catch(err => 
          console.error('Cache set error:', err)
        );

        // Add cache headers
        res.set({
          'X-Cache': 'MISS',
          'X-Cache-Key': cacheKey,
        });

        // Call original json method
        return originalJson.call(this, data);
      };

      next();
    } catch (error) {
      console.error('Cache middleware error:', error);
      next();
    }
  };
};

// Generate default cache key
const generateDefaultCacheKey = (req: Request, varyBy: string[] = []): string => {
  const baseKey = `${req.method}:${req.path}`;
  const queryString = Object.keys(req.query).length > 0 
    ? JSON.stringify(req.query) 
    : '';
  
  const varyData = varyBy.map(field => {
    if (field === 'user') {
      return req.user?.id || 'anonymous';
    }
    if (field === 'ip') {
      return req.ip;
    }
    if (field.startsWith('header:')) {
      const headerName = field.replace('header:', '');
      return req.get(headerName) || '';
    }
    return '';
  }).join(':');

  return `api:${baseKey}:${queryString}:${varyData}`;
};

// Specific cache middleware for restaurants
export const restaurantListCache = cacheMiddleware({
  ttl: CACHE_TTL.MEDIUM,
  keyGenerator: (req) => {
    const params = JSON.stringify({
      cuisine: req.query.cuisine,
      location: req.query.location,
      priceRange: req.query.priceRange,
      rating: req.query.rating,
      page: req.query.page,
      limit: req.query.limit,
    });
    return CACHE_KEYS.RESTAURANT_LIST(params);
  },
});

export const restaurantDetailsCache = cacheMiddleware({
  ttl: CACHE_TTL.LONG,
  keyGenerator: (req) => CACHE_KEYS.RESTAURANT(req.params.id),
});

export const restaurantHoursCache = cacheMiddleware({
  ttl: CACHE_TTL.VERY_LONG,
  keyGenerator: (req) => CACHE_KEYS.RESTAURANT_HOURS(req.params.id),
});

export const restaurantReviewsCache = cacheMiddleware({
  ttl: CACHE_TTL.SHORT,
  keyGenerator: (req) => CACHE_KEYS.RESTAURANT_REVIEWS(req.params.id),
});

export const menuCache = cacheMiddleware({
  ttl: CACHE_TTL.LONG,
  keyGenerator: (req) => CACHE_KEYS.MENU(req.params.id),
});

// User-specific cache middleware
export const userProfileCache = cacheMiddleware({
  ttl: CACHE_TTL.MEDIUM,
  keyGenerator: (req) => CACHE_KEYS.USER_PROFILE(req.user?.id || ''),
  condition: (req) => !!req.user,
  varyBy: ['user'],
});

export const userReservationsCache = cacheMiddleware({
  ttl: CACHE_TTL.SHORT,
  keyGenerator: (req) => CACHE_KEYS.RESERVATION_LIST(req.user?.id || ''),
  condition: (req) => !!req.user,
  varyBy: ['user'],
});

export const loyaltyPointsCache = cacheMiddleware({
  ttl: CACHE_TTL.SHORT,
  keyGenerator: (req) => CACHE_KEYS.LOYALTY_POINTS(req.user?.id || ''),
  condition: (req) => !!req.user,
  varyBy: ['user'],
});

// Availability cache middleware
export const availabilityCache = cacheMiddleware({
  ttl: CACHE_TTL.SHORT,
  keyGenerator: (req) => {
    const date = req.query.date as string || new Date().toISOString().split('T')[0];
    return CACHE_KEYS.AVAILABILITY(req.params.restaurantId, date);
  },
});

// Search cache middleware
export const searchCache = cacheMiddleware({
  ttl: CACHE_TTL.MEDIUM,
  keyGenerator: (req) => {
    const query = JSON.stringify({
      q: req.query.q,
      location: req.query.location,
      cuisine: req.query.cuisine,
      filters: req.query.filters,
    });
    return CACHE_KEYS.SEARCH_RESULTS(query);
  },
});

// Analytics cache middleware (longer TTL for reports)
export const analyticsCache = cacheMiddleware({
  ttl: CACHE_TTL.VERY_LONG,
  keyGenerator: (req) => {
    const type = req.params.type || 'general';
    const period = req.query.period as string || 'daily';
    return CACHE_KEYS.ANALYTICS(type, period);
  },
});

// Cache invalidation helpers
export class CacheInvalidator {
  // Invalidate restaurant-related caches
  static async invalidateRestaurant(restaurantId: string) {
    await Promise.all([
      cache.del(CACHE_KEYS.RESTAURANT(restaurantId)),
      cache.del(CACHE_KEYS.RESTAURANT_HOURS(restaurantId)),
      cache.del(CACHE_KEYS.RESTAURANT_REVIEWS(restaurantId)),
      cache.del(CACHE_KEYS.MENU(restaurantId)),
      cache.del(CACHE_KEYS.FLOOR_PLAN(restaurantId)),
      cache.delPattern('restaurants:list:*'),
      cache.delPattern('search:*'),
    ]);
  }

  // Invalidate user-related caches
  static async invalidateUser(userId: string) {
    await Promise.all([
      cache.del(CACHE_KEYS.USER(userId)),
      cache.del(CACHE_KEYS.USER_PROFILE(userId)),
      cache.del(CACHE_KEYS.RESERVATION_LIST(userId)),
      cache.del(CACHE_KEYS.LOYALTY_POINTS(userId)),
    ]);
  }

  // Invalidate reservation-related caches
  static async invalidateReservation(reservationId: string, userId: string, restaurantId: string) {
    const today = new Date().toISOString().split('T')[0];
    await Promise.all([
      cache.del(CACHE_KEYS.RESERVATION(reservationId)),
      cache.del(CACHE_KEYS.RESERVATION_LIST(userId)),
      cache.del(CACHE_KEYS.AVAILABILITY(restaurantId, today)),
      cache.delPattern(`availability:${restaurantId}:*`),
    ]);
  }

  // Invalidate availability caches
  static async invalidateAvailability(restaurantId: string, date?: string) {
    if (date) {
      await cache.del(CACHE_KEYS.AVAILABILITY(restaurantId, date));
    } else {
      await cache.delPattern(`availability:${restaurantId}:*`);
    }
  }

  // Invalidate search caches
  static async invalidateSearch() {
    await cache.delPattern('search:*');
  }

  // Invalidate all caches (use with caution)
  static async invalidateAll() {
    await cache.flush();
  }
}

// Cache warming helpers
export class CacheWarmer {
  // Warm popular restaurant caches
  static async warmRestaurantCaches(restaurantIds: string[]) {
    console.log('Warming restaurant caches...');
    
    for (const id of restaurantIds) {
      try {
        // This would typically call the actual service methods
        // For now, we'll just pre-populate with placeholder data
        await cache.set(CACHE_KEYS.RESTAURANT(id), { id, warmed: true }, CACHE_TTL.LONG);
      } catch (error) {
        console.error(`Failed to warm cache for restaurant ${id}:`, error);
      }
    }
  }

  // Warm search result caches for popular queries
  static async warmSearchCaches(popularQueries: string[]) {
    console.log('Warming search caches...');
    
    for (const query of popularQueries) {
      try {
        await cache.set(CACHE_KEYS.SEARCH_RESULTS(query), { query, warmed: true }, CACHE_TTL.MEDIUM);
      } catch (error) {
        console.error(`Failed to warm cache for query ${query}:`, error);
      }
    }
  }
}

// Cache statistics middleware
export const cacheStatsMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  if (req.path === '/api/admin/cache/stats') {
    try {
      const stats = await cache.getStats();
      return res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        error: 'Failed to get cache statistics',
      });
    }
  }
  next();
};

// Cache management middleware
export const cacheManagementMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  if (req.path.startsWith('/api/admin/cache')) {
    const action = req.path.split('/').pop();
    
    try {
      switch (action) {
        case 'clear':
          await cache.flush();
          return res.json({ success: true, message: 'Cache cleared successfully' });
          
        case 'invalidate':
          const { pattern } = req.body;
          if (pattern) {
            const deleted = await cache.delPattern(pattern);
            return res.json({ success: true, message: `Invalidated ${deleted} keys` });
          }
          return res.status(400).json({ success: false, error: 'Pattern required' });
          
        case 'warm':
          const { type, data } = req.body;
          if (type === 'restaurants' && Array.isArray(data)) {
            await CacheWarmer.warmRestaurantCaches(data);
            return res.json({ success: true, message: 'Restaurant caches warmed' });
          }
          if (type === 'search' && Array.isArray(data)) {
            await CacheWarmer.warmSearchCaches(data);
            return res.json({ success: true, message: 'Search caches warmed' });
          }
          return res.status(400).json({ success: false, error: 'Invalid warm request' });
          
        default:
          return next();
      }
    } catch (error) {
      return res.status(500).json({
        success: false,
        error: 'Cache operation failed',
      });
    }
  }
  next();
};

export default {
  cacheMiddleware,
  restaurantListCache,
  restaurantDetailsCache,
  restaurantHoursCache,
  restaurantReviewsCache,
  menuCache,
  userProfileCache,
  userReservationsCache,
  loyaltyPointsCache,
  availabilityCache,
  searchCache,
  analyticsCache,
  CacheInvalidator,
  CacheWarmer,
  cacheStatsMiddleware,
  cacheManagementMiddleware,
};