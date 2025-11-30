import { Request, Response, NextFunction } from 'express';
import Redis from 'ioredis';
import { logger } from '../config/logger';
import crypto from 'crypto';

/**
 * Advanced caching middleware with Redis
 * Implements caching strategies for API responses
 */

// Redis client
let redisClient: Redis | null = null;

// Initialize Redis connection
export const initializeRedis = (): Redis => {
  if (redisClient) {
    return redisClient;
  }

  redisClient = new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
    db: parseInt(process.env.REDIS_DB || '0'),
    retryStrategy: (times) => {
      const delay = Math.min(times * 50, 2000);
      return delay;
    },
    maxRetriesPerRequest: 3,
  });

  redisClient.on('connect', () => {
    logger.info('Redis connected successfully');
  });

  redisClient.on('error', (error) => {
    logger.error('Redis connection error:', error);
  });

  return redisClient;
};

// Get Redis client instance
export const getRedisClient = (): Redis | null => {
  return redisClient;
};

/**
 * Generate cache key from request
 */
const generateCacheKey = (req: Request, prefix: string = 'api'): string => {
  const { path, query, method, user } = req;
  const userId = user?.id || 'anonymous';
  
  // Create a hash of query parameters for consistent keys
  const queryString = JSON.stringify(query);
  const queryHash = crypto.createHash('md5').update(queryString).digest('hex');
  
  return `${prefix}:${method}:${path}:${userId}:${queryHash}`;
};

/**
 * Cache configuration interface
 */
interface CacheConfig {
  ttl: number; // Time to live in seconds
  prefix?: string;
  vary?: string[]; // Headers to vary cache by
  conditions?: (req: Request) => boolean; // Conditional caching
  invalidateOn?: string[]; // Methods that invalidate cache
}

/**
 * Default cache configuration
 */
const defaultConfig: CacheConfig = {
  ttl: 300, // 5 minutes
  prefix: 'api',
  vary: [],
  invalidateOn: ['POST', 'PUT', 'DELETE', 'PATCH'],
};

/**
 * Generic cache middleware factory
 */
export const cacheMiddleware = (config: Partial<CacheConfig> = {}) => {
  const finalConfig = { ...defaultConfig, ...config };

  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const redis = getRedisClient();
      
      if (!redis) {
        logger.warn('Redis not available, skipping cache');
        return next();
      }

      // Check if caching conditions are met
      if (finalConfig.conditions && !finalConfig.conditions(req)) {
        return next();
      }

      // Only cache GET requests by default
      if (req.method !== 'GET') {
        // Invalidate cache for write operations
        if (finalConfig.invalidateOn?.includes(req.method)) {
          const pattern = `${finalConfig.prefix}:*${req.path}*`;
          await invalidateCache(pattern);
        }
        return next();
      }

      // Generate cache key
      const cacheKey = generateCacheKey(req, finalConfig.prefix);

      // Try to get cached response
      const cachedData = await redis.get(cacheKey);
      
      if (cachedData) {
        logger.debug(`Cache hit: ${cacheKey}`);
        
        const parsed = JSON.parse(cachedData);
        
        // Set cache headers
        res.setHeader('X-Cache', 'HIT');
        res.setHeader('X-Cache-Key', cacheKey);
        
        return res.status(parsed.status || 200).json(parsed.data);
      }

      logger.debug(`Cache miss: ${cacheKey}`);
      
      // Store original json method
      const originalJson = res.json.bind(res);

      // Override json method to cache response
      res.json = function (data: any) {
        // Cache the response
        const responseData = {
          status: res.statusCode,
          data,
          cachedAt: new Date().toISOString(),
        };

        redis.setex(cacheKey, finalConfig.ttl, JSON.stringify(responseData))
          .catch(err => logger.error('Error caching response:', err));

        // Set cache headers
        res.setHeader('X-Cache', 'MISS');
        res.setHeader('X-Cache-Key', cacheKey);

        return originalJson(data);
      };

      next();
    } catch (error) {
      logger.error('Cache middleware error:', error);
      next(); // Continue without caching on error
    }
  };
};

/**
 * Invalidate cache by pattern
 */
export const invalidateCache = async (pattern: string): Promise<number> => {
  try {
    const redis = getRedisClient();
    if (!redis) return 0;

    const keys = await redis.keys(pattern);
    
    if (keys.length === 0) {
      return 0;
    }

    const result = await redis.del(...keys);
    logger.info(`Invalidated ${result} cache entries matching pattern: ${pattern}`);
    
    return result;
  } catch (error) {
    logger.error('Error invalidating cache:', error);
    return 0;
  }
};

/**
 * Clear all cache
 */
export const clearAllCache = async (): Promise<void> => {
  try {
    const redis = getRedisClient();
    if (!redis) return;

    await redis.flushdb();
    logger.info('All cache cleared');
  } catch (error) {
    logger.error('Error clearing cache:', error);
  }
};

/**
 * Pre-configured cache strategies
 */

// Short-term cache (1 minute) for highly dynamic data
export const shortTermCache = cacheMiddleware({
  ttl: 60,
  prefix: 'short',
});

// Medium-term cache (5 minutes) for moderately dynamic data
export const mediumTermCache = cacheMiddleware({
  ttl: 300,
  prefix: 'medium',
});

// Long-term cache (1 hour) for static data
export const longTermCache = cacheMiddleware({
  ttl: 3600,
  prefix: 'long',
});

// Restaurant list cache (10 minutes)
export const restaurantListCache = cacheMiddleware({
  ttl: 600,
  prefix: 'restaurants',
  invalidateOn: ['POST', 'PUT', 'DELETE', 'PATCH'],
});

// Restaurant detail cache (15 minutes)
export const restaurantDetailCache = cacheMiddleware({
  ttl: 900,
  prefix: 'restaurant',
  invalidateOn: ['PUT', 'PATCH'],
});

// Reviews cache (5 minutes)
export const reviewsCache = cacheMiddleware({
  ttl: 300,
  prefix: 'reviews',
  invalidateOn: ['POST', 'PUT', 'DELETE'],
});

// Availability cache (2 minutes) - highly dynamic
export const availabilityCache = cacheMiddleware({
  ttl: 120,
  prefix: 'availability',
  invalidateOn: ['POST', 'DELETE'],
});

// User-specific cache (3 minutes)
export const userCache = cacheMiddleware({
  ttl: 180,
  prefix: 'user',
  conditions: (req) => !!req.user, // Only cache authenticated requests
  invalidateOn: ['POST', 'PUT', 'PATCH', 'DELETE'],
});

/**
 * Cache warming utilities
 */

// Warm cache for popular restaurants
export const warmPopularRestaurants = async (): Promise<void> => {
  try {
    logger.info('Warming cache for popular restaurants...');
    
    // This would typically fetch and cache popular restaurants
    // Implementation depends on your restaurant service
    
    logger.info('Cache warming completed');
  } catch (error) {
    logger.error('Error warming cache:', error);
  }
};

/**
 * Cache statistics
 */
export const getCacheStats = async (): Promise<{
  totalKeys: number;
  memoryUsed: string;
  hitRate?: number;
}> => {
  try {
    const redis = getRedisClient();
    if (!redis) {
      return { totalKeys: 0, memoryUsed: '0' };
    }

    const info = await redis.info('stats');
    const dbSize = await redis.dbsize();
    const memory = await redis.info('memory');

    // Parse memory usage
    const memoryMatch = memory.match(/used_memory_human:(.+)/);
    const memoryUsed = memoryMatch ? memoryMatch[1].trim() : 'Unknown';

    // Parse hit rate
    const hitsMatch = info.match(/keyspace_hits:(\d+)/);
    const missesMatch = info.match(/keyspace_misses:(\d+)/);
    
    let hitRate;
    if (hitsMatch && missesMatch) {
      const hits = parseInt(hitsMatch[1]);
      const misses = parseInt(missesMatch[1]);
      const total = hits + misses;
      hitRate = total > 0 ? (hits / total) * 100 : 0;
    }

    return {
      totalKeys: dbSize,
      memoryUsed,
      hitRate,
    };
  } catch (error) {
    logger.error('Error getting cache stats:', error);
    return { totalKeys: 0, memoryUsed: '0' };
  }
};

/**
 * Cache health check
 */
export const cacheHealthCheck = async (): Promise<boolean> => {
  try {
    const redis = getRedisClient();
    if (!redis) return false;

    const result = await redis.ping();
    return result === 'PONG';
  } catch (error) {
    logger.error('Cache health check failed:', error);
    return false;
  }
};

/**
 * Cleanup expired cache entries (for debugging)
 */
export const cleanupExpiredCache = async (): Promise<void> => {
  try {
    const redis = getRedisClient();
    if (!redis) return;

    // Redis automatically removes expired keys
    // This function is a placeholder for additional cleanup logic if needed
    
    logger.info('Cache cleanup completed');
  } catch (error) {
    logger.error('Error during cache cleanup:', error);
  }
};

export default {
  initializeRedis,
  getRedisClient,
  cacheMiddleware,
  invalidateCache,
  clearAllCache,
  shortTermCache,
  mediumTermCache,
  longTermCache,
  restaurantListCache,
  restaurantDetailCache,
  reviewsCache,
  availabilityCache,
  userCache,
  warmPopularRestaurants,
  getCacheStats,
  cacheHealthCheck,
  cleanupExpiredCache,
};
