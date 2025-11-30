import Redis from 'ioredis';

export class RedisService {
  private static instance: RedisService;
  private client: Redis;
  private subscriber: Redis;
  private publisher: Redis;

  private constructor() {
    const redisConfig = {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      db: parseInt(process.env.REDIS_DB || '0'),
      keyPrefix: process.env.REDIS_KEY_PREFIX || 'opentable:',
      retryStrategy: (times: number) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      }
    };

    // Main client for general operations
    this.client = new Redis(redisConfig);
    
    // Separate clients for pub/sub
    this.subscriber = new Redis(redisConfig);
    this.publisher = new Redis(redisConfig);

    // Error handling
    this.client.on('error', (err) => {
      console.error('Redis Client Error:', err);
    });

    this.client.on('connect', () => {
      console.log('Redis Client Connected');
    });
  }

  static getInstance(): RedisService {
    if (!RedisService.instance) {
      RedisService.instance = new RedisService();
    }
    return RedisService.instance;
  }

  /**
   * Get value by key
   */
  async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  /**
   * Set key-value pair
   */
  async set(key: string, value: string): Promise<'OK'> {
    return this.client.set(key, value);
  }

  /**
   * Set with expiration (in seconds)
   */
  async setex(key: string, seconds: number, value: string): Promise<'OK'> {
    return this.client.setex(key, seconds, value);
  }

  /**
   * Delete key
   */
  async del(key: string | string[]): Promise<number> {
    return this.client.del(key);
  }

  /**
   * Check if key exists
   */
  async exists(key: string): Promise<number> {
    return this.client.exists(key);
  }

  /**
   * Set expiration on key (in seconds)
   */
  async expire(key: string, seconds: number): Promise<number> {
    return this.client.expire(key, seconds);
  }

  /**
   * Get TTL of key
   */
  async ttl(key: string): Promise<number> {
    return this.client.ttl(key);
  }

  /**
   * Increment value
   */
  async incr(key: string): Promise<number> {
    return this.client.incr(key);
  }

  /**
   * Decrement value
   */
  async decr(key: string): Promise<number> {
    return this.client.decr(key);
  }

  /**
   * Add to set
   */
  async sadd(key: string, ...members: string[]): Promise<number> {
    return this.client.sadd(key, ...members);
  }

  /**
   * Remove from set
   */
  async srem(key: string, ...members: string[]): Promise<number> {
    return this.client.srem(key, ...members);
  }

  /**
   * Get all members of set
   */
  async smembers(key: string): Promise<string[]> {
    return this.client.smembers(key);
  }

  /**
   * Check if member exists in set
   */
  async sismember(key: string, member: string): Promise<number> {
    return this.client.sismember(key, member);
  }

  /**
   * Hash operations
   */
  async hset(key: string, field: string, value: string): Promise<number> {
    return this.client.hset(key, field, value);
  }

  async hget(key: string, field: string): Promise<string | null> {
    return this.client.hget(key, field);
  }

  async hgetall(key: string): Promise<Record<string, string>> {
    return this.client.hgetall(key);
  }

  async hdel(key: string, ...fields: string[]): Promise<number> {
    return this.client.hdel(key, ...fields);
  }

  /**
   * List operations
   */
  async lpush(key: string, ...values: string[]): Promise<number> {
    return this.client.lpush(key, ...values);
  }

  async rpush(key: string, ...values: string[]): Promise<number> {
    return this.client.rpush(key, ...values);
  }

  async lpop(key: string): Promise<string | null> {
    return this.client.lpop(key);
  }

  async rpop(key: string): Promise<string | null> {
    return this.client.rpop(key);
  }

  async lrange(key: string, start: number, stop: number): Promise<string[]> {
    return this.client.lrange(key, start, stop);
  }

  async llen(key: string): Promise<number> {
    return this.client.llen(key);
  }

  /**
   * Sorted set operations
   */
  async zadd(key: string, score: number, member: string): Promise<number> {
    return this.client.zadd(key, score, member);
  }

  async zrange(key: string, start: number, stop: number): Promise<string[]> {
    return this.client.zrange(key, start, stop);
  }

  async zrevrange(key: string, start: number, stop: number): Promise<string[]> {
    return this.client.zrevrange(key, start, stop);
  }

  async zrem(key: string, ...members: string[]): Promise<number> {
    return this.client.zrem(key, ...members);
  }

  async zscore(key: string, member: string): Promise<string | null> {
    return this.client.zscore(key, member);
  }

  /**
   * Pub/Sub operations
   */
  async publish(channel: string, message: string): Promise<number> {
    return this.publisher.publish(channel, message);
  }

  async subscribe(channel: string, callback: (message: string) => void): Promise<void> {
    await this.subscriber.subscribe(channel);
    this.subscriber.on('message', (ch, message) => {
      if (ch === channel) {
        callback(message);
      }
    });
  }

  async unsubscribe(channel: string): Promise<void> {
    await this.subscriber.unsubscribe(channel);
  }

  /**
   * Cache operations with JSON
   */
  async getJSON<T>(key: string): Promise<T | null> {
    const data = await this.get(key);
    if (!data) return null;
    try {
      return JSON.parse(data) as T;
    } catch {
      return null;
    }
  }

  async setJSON(key: string, value: any, ttl?: number): Promise<'OK'> {
    const data = JSON.stringify(value);
    if (ttl) {
      return this.setex(key, ttl, data);
    }
    return this.set(key, data);
  }

  /**
   * Caching helper with automatic generation
   */
  async cache<T>(
    key: string,
    generator: () => Promise<T>,
    ttl: number = 3600
  ): Promise<T> {
    // Try to get from cache
    const cached = await this.getJSON<T>(key);
    if (cached !== null) {
      return cached;
    }

    // Generate new value
    const value = await generator();
    
    // Store in cache
    await this.setJSON(key, value, ttl);
    
    return value;
  }

  /**
   * Invalidate cache by pattern
   */
  async invalidatePattern(pattern: string): Promise<void> {
    const keys = await this.client.keys(pattern);
    if (keys.length > 0) {
      await this.del(keys);
    }
  }

  /**
   * Rate limiting helper
   */
  async checkRateLimit(
    identifier: string,
    limit: number,
    window: number
  ): Promise<{ allowed: boolean; remaining: number; resetIn: number }> {
    const key = `rate_limit:${identifier}`;
    const current = await this.incr(key);
    
    if (current === 1) {
      await this.expire(key, window);
    }
    
    const ttl = await this.ttl(key);
    const allowed = current <= limit;
    const remaining = Math.max(0, limit - current);
    
    return {
      allowed,
      remaining,
      resetIn: ttl
    };
  }

  /**
   * Session management
   */
  async createSession(
    sessionId: string,
    data: any,
    ttl: number = 86400
  ): Promise<void> {
    await this.setJSON(`session:${sessionId}`, data, ttl);
  }

  async getSession<T>(sessionId: string): Promise<T | null> {
    return this.getJSON<T>(`session:${sessionId}`);
  }

  async updateSession(sessionId: string, data: any): Promise<void> {
    const key = `session:${sessionId}`;
    const ttl = await this.ttl(key);
    await this.setJSON(key, data, ttl > 0 ? ttl : 86400);
  }

  async deleteSession(sessionId: string): Promise<void> {
    await this.del(`session:${sessionId}`);
  }

  /**
   * Distributed lock
   */
  async acquireLock(
    resource: string,
    ttl: number = 10
  ): Promise<boolean> {
    const lockKey = `lock:${resource}`;
    const identifier = Date.now().toString();
    
    const result = await this.client.set(
      lockKey,
      identifier,
      'NX',
      'EX',
      ttl
    );
    
    return result === 'OK';
  }

  async releaseLock(resource: string): Promise<void> {
    await this.del(`lock:${resource}`);
  }

  /**
   * Clean up connections
   */
  async disconnect(): Promise<void> {
    await this.client.quit();
    await this.subscriber.quit();
    await this.publisher.quit();
  }
}