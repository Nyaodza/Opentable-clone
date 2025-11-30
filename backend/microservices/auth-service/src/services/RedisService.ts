import Redis from 'redis';
import { config } from '../config/environment';
import { logger } from '../utils/logger';

export class RedisService {
  private client: Redis.RedisClientType;
  private isConnected: boolean = false;

  constructor() {
    this.client = Redis.createClient({
      socket: {
        host: config.redis.host,
        port: config.redis.port,
      },
      password: config.redis.password,
      database: config.redis.db,
    });

    this.client.on('error', (error) => {
      logger.error('Redis connection error:', error);
      this.isConnected = false;
    });

    this.client.on('connect', () => {
      logger.info('Redis connected successfully');
      this.isConnected = true;
    });
  }

  async connect(): Promise<void> {
    if (!this.isConnected) {
      await this.client.connect();
    }
  }

  async disconnect(): Promise<void> {
    if (this.isConnected) {
      await this.client.disconnect();
    }
  }

  async get(key: string): Promise<string | null> {
    try {
      return await this.client.get(key);
    } catch (error) {
      logger.error(`Redis GET error for key ${key}:`, error);
      return null;
    }
  }

  async set(key: string, value: string, ttl?: number): Promise<void> {
    try {
      if (ttl) {
        await this.client.setEx(key, ttl, value);
      } else {
        await this.client.set(key, value);
      }
    } catch (error) {
      logger.error(`Redis SET error for key ${key}:`, error);
      throw error;
    }
  }

  async del(key: string): Promise<void> {
    try {
      await this.client.del(key);
    } catch (error) {
      logger.error(`Redis DEL error for key ${key}:`, error);
      throw error;
    }
  }

  async keys(pattern: string): Promise<string[]> {
    try {
      return await this.client.keys(pattern);
    } catch (error) {
      logger.error(`Redis KEYS error for pattern ${pattern}:`, error);
      return [];
    }
  }

  async setRefreshToken(userId: string, token: string, ttl: number): Promise<void> {
    await this.set(`refresh:${userId}:${token}`, '1', ttl);
  }

  async isRefreshTokenValid(userId: string, token: string): Promise<boolean> {
    const exists = await this.get(`refresh:${userId}:${token}`);
    return exists === '1';
  }

  async revokeRefreshToken(userId: string, token: string): Promise<void> {
    await this.del(`refresh:${userId}:${token}`);
  }

  async revokeAllRefreshTokens(userId: string): Promise<void> {
    const keys = await this.keys(`refresh:${userId}:*`);
    for (const key of keys) {
      await this.del(key);
    }
  }
}