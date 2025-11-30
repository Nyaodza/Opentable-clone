import cacheManager from 'cache-manager';
import redisStore from 'cache-manager-redis-store';
import { redisClient } from '../config/redis';
import { logger } from '../utils/logger';

export interface CacheConfig {
  ttl: number; // seconds
  refreshThreshold?: number; // seconds before expiry to refresh
  compress?: boolean;
}

export class CacheService {
  private static cache = cacheManager.caching({
    store: redisStore,
    client: redisClient,
    ttl: 600, // default 10 minutes
  });

  private static readonly DEFAULT_TTL = 600;
  private static readonly CACHE_PREFIXES = {
    RESTAURANT: 'restaurant:',
    USER: 'user:',
    SEARCH: 'search:',
    RECOMMENDATION: 'recommendation:',
    AVAILABILITY: 'availability:',
    REVIEW: 'review:',
    TRANSLATION: 'translation:',
    EXCHANGE_RATE: 'exchange_rate:',
  };

  static async get<T>(key: string): Promise<T | null> {
    try {
      const value = await this.cache.get<T>(key);
      if (value) {
        logger.debug(`Cache hit: ${key}`);
      }
      return value || null;
    } catch (error) {
      logger.error('Cache get error:', error);
      return null;
    }
  }

  static async set<T>(
    key: string,
    value: T,
    config?: CacheConfig
  ): Promise<void> {
    try {
      const ttl = config?.ttl || this.DEFAULT_TTL;
      const data = config?.compress ? await this.compress(value) : value;
      
      await this.cache.set(key, data, { ttl });
      logger.debug(`Cache set: ${key} (TTL: ${ttl}s)`);

      // Set up refresh if threshold is provided
      if (config?.refreshThreshold) {
        this.scheduleRefresh(key, ttl - config.refreshThreshold);
      }
    } catch (error) {
      logger.error('Cache set error:', error);
    }
  }

  static async del(key: string | string[]): Promise<void> {
    try {
      if (Array.isArray(key)) {
        await Promise.all(key.map(k => this.cache.del(k)));
      } else {
        await this.cache.del(key);
      }
      logger.debug(`Cache delete: ${Array.isArray(key) ? key.join(', ') : key}`);
    } catch (error) {
      logger.error('Cache delete error:', error);
    }
  }

  static async clear(prefix?: string): Promise<void> {
    try {
      if (prefix) {
        const keys = await this.cache.keys(`${prefix}*`);
        if (keys.length > 0) {
          await this.del(keys);
        }
      } else {
        await this.cache.reset();
      }
      logger.info(`Cache cleared: ${prefix || 'all'}`);
    } catch (error) {
      logger.error('Cache clear error:', error);
    }
  }

  static async mget<T>(keys: string[]): Promise<(T | null)[]> {
    try {
      const results = await Promise.all(
        keys.map(key => this.get<T>(key))
      );
      return results;
    } catch (error) {
      logger.error('Cache mget error:', error);
      return keys.map(() => null);
    }
  }

  static async mset<T>(
    items: Array<{ key: string; value: T; config?: CacheConfig }>
  ): Promise<void> {
    try {
      await Promise.all(
        items.map(({ key, value, config }) => this.set(key, value, config))
      );
    } catch (error) {
      logger.error('Cache mset error:', error);
    }
  }

  static async wrap<T>(
    key: string,
    fn: () => Promise<T>,
    config?: CacheConfig
  ): Promise<T> {
    // Check cache first
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    // Execute function and cache result
    const result = await fn();
    await this.set(key, result, config);
    return result;
  }

  static async invalidatePattern(pattern: string): Promise<void> {
    try {
      const keys = await this.cache.keys(pattern);
      if (keys.length > 0) {
        await this.del(keys);
        logger.info(`Invalidated ${keys.length} keys matching pattern: ${pattern}`);
      }
    } catch (error) {
      logger.error('Cache invalidate pattern error:', error);
    }
  }

  // Restaurant-specific cache methods
  static getRestaurantKey(id: string): string {
    return `${this.CACHE_PREFIXES.RESTAURANT}${id}`;
  }

  static getRestaurantSearchKey(params: any): string {
    const sortedParams = Object.keys(params)
      .sort()
      .reduce((acc, key) => ({ ...acc, [key]: params[key] }), {});
    return `${this.CACHE_PREFIXES.SEARCH}${JSON.stringify(sortedParams)}`;
  }

  static getAvailabilityKey(restaurantId: string, date: string): string {
    return `${this.CACHE_PREFIXES.AVAILABILITY}${restaurantId}:${date}`;
  }

  static getRecommendationKey(userId: string, type: string): string {
    return `${this.CACHE_PREFIXES.RECOMMENDATION}${userId}:${type}`;
  }

  // Cache warming strategies
  static async warmRestaurantCache(restaurantIds: string[]): Promise<void> {
    logger.info(`Warming cache for ${restaurantIds.length} restaurants`);
    
    const Restaurant = require('../models/restaurant.model').default;
    const restaurants = await Restaurant.findAll({
      where: { id: restaurantIds },
    });

    await this.mset(
      restaurants.map(restaurant => ({
        key: this.getRestaurantKey(restaurant.id),
        value: restaurant.toJSON(),
        config: { ttl: 3600 }, // 1 hour
      }))
    );
  }

  // Cache invalidation strategies
  static async invalidateRestaurantCache(restaurantId: string): Promise<void> {
    const patterns = [
      `${this.CACHE_PREFIXES.RESTAURANT}${restaurantId}`,
      `${this.CACHE_PREFIXES.SEARCH}*${restaurantId}*`,
      `${this.CACHE_PREFIXES.AVAILABILITY}${restaurantId}:*`,
      `${this.CACHE_PREFIXES.REVIEW}*${restaurantId}*`,
    ];

    await Promise.all(
      patterns.map(pattern => this.invalidatePattern(pattern))
    );
  }

  static async invalidateUserCache(userId: string): Promise<void> {
    const patterns = [
      `${this.CACHE_PREFIXES.USER}${userId}`,
      `${this.CACHE_PREFIXES.RECOMMENDATION}${userId}:*`,
    ];

    await Promise.all(
      patterns.map(pattern => this.invalidatePattern(pattern))
    );
  }

  // Utility methods
  private static async compress(data: any): Promise<string> {
    const zlib = require('zlib');
    const { promisify } = require('util');
    const gzip = promisify(zlib.gzip);
    
    const compressed = await gzip(JSON.stringify(data));
    return compressed.toString('base64');
  }

  private static async decompress(data: string): Promise<any> {
    const zlib = require('zlib');
    const { promisify } = require('util');
    const gunzip = promisify(zlib.gunzip);
    
    const buffer = Buffer.from(data, 'base64');
    const decompressed = await gunzip(buffer);
    return JSON.parse(decompressed.toString());
  }

  private static scheduleRefresh(key: string, delaySeconds: number): void {
    setTimeout(async () => {
      const value = await this.get(key);
      if (value) {
        logger.debug(`Refreshing cache key: ${key}`);
        // Re-fetch data and update cache
        // This would need the original function to regenerate data
      }
    }, delaySeconds * 1000);
  }

  // Cache statistics
  static async getStats(): Promise<{
    size: number;
    keys: number;
    memory: string;
  }> {
    const info = await redisClient.info('memory');
    const keys = await redisClient.dbsize();
    
    const memoryMatch = info.match(/used_memory_human:(.+)/);
    const memory = memoryMatch ? memoryMatch[1].trim() : 'unknown';

    return {
      size: keys,
      keys,
      memory,
    };
  }
}