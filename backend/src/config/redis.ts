import Redis from 'ioredis';
import { promisify } from 'util';

// Redis configuration interface
interface RedisConfig {
  host: string;
  port: number;
  password?: string;
  db: number;
  keyPrefix: string;
  retryDelayOnFailover: number;
  maxRetriesPerRequest: number;
  lazyConnect: boolean;
  keepAlive: number;
  family: number;
  connectTimeout: number;
  commandTimeout: number;
}

// Default Redis configuration
const defaultConfig: RedisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  db: parseInt(process.env.REDIS_DB || '0'),
  keyPrefix: process.env.REDIS_KEY_PREFIX || 'opentable:',
  retryDelayOnFailover: 100,
  maxRetriesPerRequest: 3,
  lazyConnect: true,
  keepAlive: 30000,
  family: 4,
  connectTimeout: 10000,
  commandTimeout: 5000,
};

// Create Redis instances
export const redis = new Redis(defaultConfig);
export const redisSubscriber = new Redis(defaultConfig);
export const redisPublisher = new Redis(defaultConfig);

// Cache TTL constants (in seconds)
export const CACHE_TTL = {
  SHORT: 300,      // 5 minutes
  MEDIUM: 1800,    // 30 minutes
  LONG: 3600,      // 1 hour
  VERY_LONG: 86400, // 24 hours
  WEEK: 604800,    // 7 days
} as const;

// Cache key patterns
export const CACHE_KEYS = {
  USER: (id: string) => `user:${id}`,
  USER_PROFILE: (id: string) => `user:profile:${id}`,
  USER_LOCATION: (id: string) => `user:location:${id}`,
  USER_RECENT_VIEWS: (id: string) => `user:recent_views:${id}`,
  USER_NOTIFICATION_PREFS: (id: string) => `user:notification_prefs:${id}`,
  RESTAURANT: (id: string) => `restaurant:${id}`,
  RESTAURANT_LIST: (params: string) => `restaurants:list:${params}`,
  RESTAURANT_HOURS: (id: string) => `restaurant:hours:${id}`,
  RESTAURANT_REVIEWS: (id: string) => `restaurant:reviews:${id}`,
  RESERVATION: (id: string) => `reservation:${id}`,
  RESERVATION_LIST: (userId: string) => `reservations:user:${userId}`,
  AVAILABILITY: (restaurantId: string, date: string) => `availability:${restaurantId}:${date}`,
  SEARCH_RESULTS: (query: string) => `search:${query}`,
  LOYALTY_POINTS: (userId: string) => `loyalty:points:${userId}`,
  WAITLIST: (restaurantId: string, date: string) => `waitlist:${restaurantId}:${date}`,
  FLOOR_PLAN: (restaurantId: string) => `floorplan:${restaurantId}`,
  MENU: (restaurantId: string) => `menu:${restaurantId}`,
  ANALYTICS: (type: string, period: string) => `analytics:${type}:${period}`,
  SESSION: (sessionId: string) => `session:${sessionId}`,
  RATE_LIMIT: (identifier: string) => `ratelimit:${identifier}`,
} as const;

// Redis connection event handlers
redis.on('connect', () => {
  console.log('✅ Redis connected successfully');
});

redis.on('ready', () => {
  console.log('✅ Redis ready for operations');
});

redis.on('error', (error) => {
  console.error('❌ Redis connection error:', error);
});

redis.on('close', () => {
  console.log('⚠️ Redis connection closed');
});

redis.on('reconnecting', () => {
  console.log('🔄 Redis reconnecting...');
});

// Cache manager class
export class CacheManager {
  private static instance: CacheManager;
  
  private constructor() {}

  static getInstance(): CacheManager {
    if (!CacheManager.instance) {
      CacheManager.instance = new CacheManager();
    }
    return CacheManager.instance;
  }

  // Get value from cache
  async get<T = any>(key: string): Promise<T | null> {
    try {
      const value = await redis.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }

  // Set value in cache with TTL
  async set(key: string, value: any, ttl: number = CACHE_TTL.MEDIUM): Promise<boolean> {
    try {
      const serialized = JSON.stringify(value);
      await redis.setex(key, ttl, serialized);
      return true;
    } catch (error) {
      console.error('Cache set error:', error);
      return false;
    }
  }

  // Set value in cache without expiration
  async setPersistent(key: string, value: any): Promise<boolean> {
    try {
      const serialized = JSON.stringify(value);
      await redis.set(key, serialized);
      return true;
    } catch (error) {
      console.error('Cache setPersistent error:', error);
      return false;
    }
  }

  // Delete key from cache
  async del(key: string | string[]): Promise<boolean> {
    try {
      if (Array.isArray(key)) {
        await redis.del(...key);
      } else {
        await redis.del(key);
      }
      return true;
    } catch (error) {
      console.error('Cache del error:', error);
      return false;
    }
  }

  // Clear cache keys matching a pattern
  async clear(pattern: string): Promise<boolean> {
    try {
      const keys = await redis.keys(pattern);
      if (keys.length > 0) {
        await redis.del(...keys);
      }
      return true;
    } catch (error) {
      console.error('Cache clear error:', error);
      return false;
    }
  }

  // Delete keys by pattern
  async delPattern(pattern: string): Promise<number> {
    try {
      const keys = await redis.keys(pattern);
      if (keys.length > 0) {
        return await redis.del(...keys);
      }
      return 0;
    } catch (error) {
      console.error('Cache delPattern error:', error);
      return 0;
    }
  }

  // Check if key exists
  async exists(key: string): Promise<boolean> {
    try {
      const result = await redis.exists(key);
      return result === 1;
    } catch (error) {
      console.error('Cache exists error:', error);
      return false;
    }
  }

  // Get TTL of a key
  async ttl(key: string): Promise<number> {
    try {
      return await redis.ttl(key);
    } catch (error) {
      console.error('Cache ttl error:', error);
      return -1;
    }
  }

  // Increment counter
  async incr(key: string, ttl?: number): Promise<number> {
    try {
      const result = await redis.incr(key);
      if (ttl && result === 1) {
        await redis.expire(key, ttl);
      }
      return result;
    } catch (error) {
      console.error('Cache incr error:', error);
      return 0;
    }
  }

  // Set with NX (only if not exists)
  async setNX(key: string, value: any, ttl: number = CACHE_TTL.MEDIUM): Promise<boolean> {
    try {
      const serialized = JSON.stringify(value);
      const result = await redis.set(key, serialized, 'EX', ttl, 'NX');
      return result === 'OK';
    } catch (error) {
      console.error('Cache setNX error:', error);
      return false;
    }
  }

  // Multi-get
  async mget(keys: string[]): Promise<(any | null)[]> {
    try {
      const values = await redis.mget(...keys);
      return values.map(value => value ? JSON.parse(value) : null);
    } catch (error) {
      console.error('Cache mget error:', error);
      return keys.map(() => null);
    }
  }

  // Multi-set
  async mset(keyValues: Record<string, any>, ttl: number = CACHE_TTL.MEDIUM): Promise<boolean> {
    try {
      const pipeline = redis.pipeline();
      
      Object.entries(keyValues).forEach(([key, value]) => {
        const serialized = JSON.stringify(value);
        pipeline.setex(key, ttl, serialized);
      });
      
      await pipeline.exec();
      return true;
    } catch (error) {
      console.error('Cache mset error:', error);
      return false;
    }
  }

  // Hash operations
  async hget(key: string, field: string): Promise<any | null> {
    try {
      const value = await redis.hget(key, field);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error('Cache hget error:', error);
      return null;
    }
  }

  async hset(key: string, field: string, value: any): Promise<boolean> {
    try {
      const serialized = JSON.stringify(value);
      await redis.hset(key, field, serialized);
      return true;
    } catch (error) {
      console.error('Cache hset error:', error);
      return false;
    }
  }

  async hgetall(key: string): Promise<Record<string, any>> {
    try {
      const values = await redis.hgetall(key);
      const result: Record<string, any> = {};
      
      Object.entries(values).forEach(([field, value]) => {
        result[field] = JSON.parse(value);
      });
      
      return result;
    } catch (error) {
      console.error('Cache hgetall error:', error);
      return {};
    }
  }

  // List operations
  async lpush(key: string, value: any): Promise<number> {
    try {
      const serialized = JSON.stringify(value);
      return await redis.lpush(key, serialized);
    } catch (error) {
      console.error('Cache lpush error:', error);
      return 0;
    }
  }

  async rpop(key: string): Promise<any | null> {
    try {
      const value = await redis.rpop(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error('Cache rpop error:', error);
      return null;
    }
  }

  async lrange(key: string, start: number, stop: number): Promise<any[]> {
    try {
      const values = await redis.lrange(key, start, stop);
      return values.map(value => JSON.parse(value));
    } catch (error) {
      console.error('Cache lrange error:', error);
      return [];
    }
  }

  // Set operations
  async sadd(key: string, members: string[]): Promise<number> {
    try {
      return await redis.sadd(key, ...members);
    } catch (error) {
      console.error('Cache sadd error:', error);
      return 0;
    }
  }

  async smembers(key: string): Promise<string[]> {
    try {
      return await redis.smembers(key);
    } catch (error) {
      console.error('Cache smembers error:', error);
      return [];
    }
  }

  // Pub/Sub operations
  async publish(channel: string, message: any): Promise<number> {
    try {
      const serialized = JSON.stringify(message);
      return await redisPublisher.publish(channel, serialized);
    } catch (error) {
      console.error('Redis publish error:', error);
      return 0;
    }
  }

  async subscribe(channel: string, callback: (message: any) => void): Promise<void> {
    try {
      await redisSubscriber.subscribe(channel);
      redisSubscriber.on('message', (receivedChannel, message) => {
        if (receivedChannel === channel) {
          try {
            const parsed = JSON.parse(message);
            callback(parsed);
          } catch (error) {
            console.error('Redis message parse error:', error);
          }
        }
      });
    } catch (error) {
      console.error('Redis subscribe error:', error);
    }
  }

  // Cache statistics
  async getStats(): Promise<{
    connected: boolean;
    usedMemory: string;
    totalKeys: number;
    hitRatio: number;
  }> {
    try {
      const info = await redis.info('memory');
      const dbSize = await redis.dbsize();
      const stats = await redis.info('stats');
      
      const usedMemory = info.split('\n')
        .find(line => line.startsWith('used_memory_human:'))
        ?.split(':')[1]?.trim() || 'N/A';
      
      const hitRatio = this.calculateHitRatio(stats);
      
      return {
        connected: redis.status === 'ready',
        usedMemory,
        totalKeys: dbSize,
        hitRatio,
      };
    } catch (error) {
      console.error('Redis stats error:', error);
      return {
        connected: false,
        usedMemory: 'N/A',
        totalKeys: 0,
        hitRatio: 0,
      };
    }
  }

  private calculateHitRatio(stats: string): number {
    try {
      const hits = parseInt(stats.split('\n')
        .find(line => line.startsWith('keyspace_hits:'))
        ?.split(':')[1] || '0');
      
      const misses = parseInt(stats.split('\n')
        .find(line => line.startsWith('keyspace_misses:'))
        ?.split(':')[1] || '0');
      
      const total = hits + misses;
      return total > 0 ? Math.round((hits / total) * 100) : 0;
    } catch (error) {
      return 0;
    }
  }

  // Flush cache (use with caution)
  async flush(): Promise<boolean> {
    try {
      await redis.flushdb();
      return true;
    } catch (error) {
      console.error('Cache flush error:', error);
      return false;
    }
  }
}

// Export singleton instance
export const cache = CacheManager.getInstance();

// Export redis client for direct access (used by auth service)
export const redisClient = redis;

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('Closing Redis connections...');
  await redis.quit();
  await redisSubscriber.quit();
  await redisPublisher.quit();
});

export default cache;