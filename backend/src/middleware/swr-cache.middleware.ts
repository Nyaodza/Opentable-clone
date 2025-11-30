/**
 * Stale-While-Revalidate (SWR) Cache Middleware
 * Serves stale data while refreshing in background
 */

import { Request, Response, NextFunction } from 'express';
import { redisClient } from '../config/redis';
import { logInfo, logError, logWarn } from '../utils/logger';
import { getCorrelationId } from '../utils/async-context';

interface SWRCacheOptions {
  // Time data is considered fresh (seconds)
  maxAge: number;
  // Time stale data can be served while revalidating (seconds)
  staleWhileRevalidate: number;
  // Custom cache key generator
  keyGenerator?: (req: Request) => string;
  // Condition to enable caching
  condition?: (req: Request) => boolean;
  // Tags for cache invalidation
  tags?: (req: Request) => string[];
  // Custom serializer
  serialize?: (data: any) => string;
  // Custom deserializer
  deserialize?: (data: string) => any;
  // Headers to vary cache by
  varyBy?: string[];
  // Skip caching for specific status codes
  skipStatusCodes?: number[];
}

interface CacheEntry {
  data: any;
  timestamp: number;
  headers: Record<string, string>;
  statusCode: number;
  tags: string[];
  correlationId?: string;
}

interface CacheMetadata {
  isStale: boolean;
  age: number;
  maxAge: number;
  revalidating: boolean;
}

// Track active revalidation requests
const revalidatingKeys = new Set<string>();

// Background refresh queue
const refreshQueue: Map<string, {
  fn: () => Promise<any>;
  timestamp: number;
}> = new Map();

/**
 * Generate default cache key from request
 */
function generateDefaultKey(req: Request, varyBy: string[] = []): string {
  const parts = [
    'swr',
    req.method,
    req.baseUrl,
    req.path,
  ];

  // Add query params (sorted for consistency)
  const queryKeys = Object.keys(req.query).sort();
  for (const key of queryKeys) {
    parts.push(`${key}=${req.query[key]}`);
  }

  // Add vary headers
  for (const header of varyBy) {
    const value = req.headers[header.toLowerCase()];
    if (value) {
      parts.push(`${header}=${value}`);
    }
  }

  return parts.join(':');
}

/**
 * Check if cache entry is stale
 */
function isStale(entry: CacheEntry, maxAge: number): boolean {
  const age = (Date.now() - entry.timestamp) / 1000;
  return age > maxAge;
}

/**
 * Check if cache entry is expired (beyond stale period)
 */
function isExpired(entry: CacheEntry, maxAge: number, staleWhileRevalidate: number): boolean {
  const age = (Date.now() - entry.timestamp) / 1000;
  return age > (maxAge + staleWhileRevalidate);
}

/**
 * Get cache metadata
 */
function getCacheMetadata(
  entry: CacheEntry,
  maxAge: number,
  key: string
): CacheMetadata {
  const age = (Date.now() - entry.timestamp) / 1000;
  
  return {
    isStale: age > maxAge,
    age: Math.floor(age),
    maxAge,
    revalidating: revalidatingKeys.has(key),
  };
}

/**
 * Trigger background revalidation
 */
async function triggerRevalidation(
  key: string,
  fn: () => Promise<{ data: any; headers: Record<string, string>; statusCode: number }>,
  options: SWRCacheOptions,
  tags: string[]
): Promise<void> {
  // Prevent duplicate revalidation
  if (revalidatingKeys.has(key)) {
    return;
  }

  revalidatingKeys.add(key);
  logInfo(`[SWR] Background revalidation started for: ${key}`);

  try {
    const result = await fn();
    
    // Store new data
    const entry: CacheEntry = {
      data: result.data,
      timestamp: Date.now(),
      headers: result.headers,
      statusCode: result.statusCode,
      tags,
      correlationId: getCorrelationId(),
    };

    const serialized = options.serialize 
      ? options.serialize(entry)
      : JSON.stringify(entry);

    const ttl = options.maxAge + options.staleWhileRevalidate;
    
    await redisClient.setex(key, ttl, serialized);

    // Store tag mappings for invalidation
    for (const tag of tags) {
      await redisClient.sadd(`swr:tag:${tag}`, key);
      await redisClient.expire(`swr:tag:${tag}`, ttl);
    }

    logInfo(`[SWR] Background revalidation completed for: ${key}`);
  } catch (error) {
    logError(`[SWR] Background revalidation failed for: ${key}`, error);
  } finally {
    revalidatingKeys.delete(key);
  }
}

/**
 * SWR Cache Middleware
 */
export function swrCache(options: SWRCacheOptions) {
  const defaultOptions: Partial<SWRCacheOptions> = {
    varyBy: [],
    skipStatusCodes: [400, 401, 403, 404, 500, 502, 503],
    serialize: JSON.stringify,
    deserialize: JSON.parse,
  };

  const opts = { ...defaultOptions, ...options };

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    // Only cache GET requests
    if (req.method !== 'GET') {
      return next();
    }

    // Check condition
    if (opts.condition && !opts.condition(req)) {
      return next();
    }

    // Generate cache key
    const key = opts.keyGenerator 
      ? opts.keyGenerator(req) 
      : generateDefaultKey(req, opts.varyBy);

    try {
      // Try to get cached data
      const cached = await redisClient.get(key);

      if (cached) {
        const entry: CacheEntry = opts.deserialize!(cached);
        const metadata = getCacheMetadata(entry, opts.maxAge, key);

        // Check if completely expired
        if (isExpired(entry, opts.maxAge, opts.staleWhileRevalidate)) {
          logInfo(`[SWR] Cache expired for: ${key}`);
          // Continue to fetch fresh data
        } else {
          // Serve from cache
          logInfo(`[SWR] Cache ${metadata.isStale ? 'STALE' : 'HIT'} for: ${key}`);

          // Set cache headers
          res.setHeader('X-Cache', metadata.isStale ? 'STALE' : 'HIT');
          res.setHeader('X-Cache-Age', metadata.age.toString());
          res.setHeader('X-Cache-Key', key);
          res.setHeader('Cache-Control', `max-age=${opts.maxAge}, stale-while-revalidate=${opts.staleWhileRevalidate}`);

          // Copy original headers
          for (const [header, value] of Object.entries(entry.headers)) {
            if (!res.hasHeader(header)) {
              res.setHeader(header, value);
            }
          }

          // If stale, trigger background revalidation
          if (metadata.isStale && !metadata.revalidating) {
            const tags = opts.tags ? opts.tags(req) : [];
            
            // Don't await - let it run in background
            triggerRevalidation(
              key,
              async () => {
                // Re-execute the request internally
                return new Promise((resolve, reject) => {
                  // Store original methods
                  const originalJson = res.json.bind(res);
                  const originalStatus = res.status.bind(res);
                  const originalSetHeader = res.setHeader.bind(res);
                  
                  let statusCode = 200;
                  const headers: Record<string, string> = {};

                  // Mock response methods
                  res.status = ((code: number) => {
                    statusCode = code;
                    return res;
                  }) as any;

                  res.setHeader = ((name: string, value: string) => {
                    headers[name] = value;
                    return res;
                  }) as any;

                  res.json = ((data: any) => {
                    resolve({ data, headers, statusCode });
                    return res;
                  }) as any;

                  // Call next middleware
                  next();
                });
              },
              opts as SWRCacheOptions,
              tags
            ).catch(err => logError('[SWR] Revalidation error:', err));
          }

          // Return cached data
          return res.status(entry.statusCode).json(entry.data);
        }
      }

      // Cache miss - fetch fresh data
      logInfo(`[SWR] Cache MISS for: ${key}`);

      // Intercept response
      const originalJson = res.json.bind(res);
      const tags = opts.tags ? opts.tags(req) : [];
      let statusCode = 200;
      const headers: Record<string, string> = {};

      // Track headers being set
      const originalSetHeader = res.setHeader.bind(res);
      res.setHeader = ((name: string, value: any) => {
        headers[name] = String(value);
        return originalSetHeader(name, value);
      }) as any;

      // Track status code
      const originalStatus = res.status.bind(res);
      res.status = ((code: number) => {
        statusCode = code;
        return originalStatus(code);
      }) as any;

      res.json = ((data: any) => {
        // Don't cache error responses
        if (!opts.skipStatusCodes!.includes(statusCode)) {
          const entry: CacheEntry = {
            data,
            timestamp: Date.now(),
            headers,
            statusCode,
            tags,
            correlationId: getCorrelationId(),
          };

          const serialized = opts.serialize!(entry);
          const ttl = opts.maxAge + opts.staleWhileRevalidate;

          // Store in cache (don't await)
          redisClient.setex(key, ttl, serialized).catch(err => {
            logError('[SWR] Cache write error:', err);
          });

          // Store tag mappings
          for (const tag of tags) {
            redisClient.sadd(`swr:tag:${tag}`, key).catch(() => {});
            redisClient.expire(`swr:tag:${tag}`, ttl).catch(() => {});
          }

          // Set cache headers
          res.setHeader('X-Cache', 'MISS');
          res.setHeader('X-Cache-Key', key);
          res.setHeader('Cache-Control', `max-age=${opts.maxAge}, stale-while-revalidate=${opts.staleWhileRevalidate}`);
        }

        return originalJson(data);
      }) as any;

      next();
    } catch (error) {
      logError('[SWR] Cache middleware error:', error);
      next();
    }
  };
}

/**
 * Invalidate cache by key
 */
export async function invalidateSWRCache(key: string): Promise<void> {
  try {
    await redisClient.del(key);
    logInfo(`[SWR] Cache invalidated: ${key}`);
  } catch (error) {
    logError('[SWR] Cache invalidation error:', error);
  }
}

/**
 * Invalidate cache by pattern
 */
export async function invalidateSWRCachePattern(pattern: string): Promise<void> {
  try {
    const keys = await redisClient.keys(`swr:${pattern}`);
    if (keys.length > 0) {
      await redisClient.del(...keys);
      logInfo(`[SWR] Cache invalidated ${keys.length} keys matching: ${pattern}`);
    }
  } catch (error) {
    logError('[SWR] Cache pattern invalidation error:', error);
  }
}

/**
 * Invalidate cache by tag
 */
export async function invalidateSWRCacheByTag(tag: string): Promise<void> {
  try {
    const keys = await redisClient.smembers(`swr:tag:${tag}`);
    if (keys.length > 0) {
      await redisClient.del(...keys);
      await redisClient.del(`swr:tag:${tag}`);
      logInfo(`[SWR] Cache invalidated ${keys.length} keys with tag: ${tag}`);
    }
  } catch (error) {
    logError('[SWR] Cache tag invalidation error:', error);
  }
}

/**
 * Warm cache for specific key
 */
export async function warmSWRCache(
  key: string,
  data: any,
  options: { maxAge: number; staleWhileRevalidate: number; tags?: string[] }
): Promise<void> {
  try {
    const entry: CacheEntry = {
      data,
      timestamp: Date.now(),
      headers: {},
      statusCode: 200,
      tags: options.tags || [],
    };

    const ttl = options.maxAge + options.staleWhileRevalidate;
    await redisClient.setex(key, ttl, JSON.stringify(entry));

    for (const tag of entry.tags) {
      await redisClient.sadd(`swr:tag:${tag}`, key);
      await redisClient.expire(`swr:tag:${tag}`, ttl);
    }

    logInfo(`[SWR] Cache warmed: ${key}`);
  } catch (error) {
    logError('[SWR] Cache warming error:', error);
  }
}

/**
 * Get SWR cache statistics
 */
export async function getSWRCacheStats(): Promise<{
  keys: number;
  tags: number;
  revalidating: number;
}> {
  try {
    const [keys, tags] = await Promise.all([
      redisClient.keys('swr:GET:*'),
      redisClient.keys('swr:tag:*'),
    ]);

    return {
      keys: keys.length,
      tags: tags.length,
      revalidating: revalidatingKeys.size,
    };
  } catch (error) {
    logError('[SWR] Stats error:', error);
    return { keys: 0, tags: 0, revalidating: 0 };
  }
}

export default swrCache;

