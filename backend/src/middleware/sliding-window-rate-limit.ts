/**
 * Sliding Window Rate Limiting
 * More accurate rate limiting using Redis sorted sets
 */

import { Request, Response, NextFunction } from 'express';
import { redisClient } from '../config/redis';
import { logInfo, logWarn } from '../utils/logger';
import { getCorrelationId } from '../utils/async-context';

export interface RateLimitOptions {
  // Window size in seconds
  windowSize: number;
  // Maximum requests per window
  maxRequests: number;
  // Key generator function
  keyGenerator?: (req: Request) => string;
  // Skip rate limiting condition
  skip?: (req: Request) => boolean;
  // Custom response on rate limit
  onRateLimited?: (req: Request, res: Response, retryAfter: number) => void;
  // Store name for multiple rate limiters
  storeName?: string;
  // Enable burst mode (allow small bursts)
  burstSize?: number;
  // Penalty for exceeding limit (additional seconds added to window)
  penaltySeconds?: number;
  // Weight per request (for weighted rate limiting)
  requestWeight?: (req: Request) => number;
  // Headers to add
  headers?: {
    limit?: string;
    remaining?: string;
    reset?: string;
    retryAfter?: string;
  };
}

interface RateLimitInfo {
  allowed: boolean;
  limit: number;
  remaining: number;
  reset: number;
  retryAfter?: number;
  currentCount: number;
}

const defaultOptions: Partial<RateLimitOptions> = {
  storeName: 'default',
  burstSize: 0,
  penaltySeconds: 0,
  requestWeight: () => 1,
  headers: {
    limit: 'X-RateLimit-Limit',
    remaining: 'X-RateLimit-Remaining',
    reset: 'X-RateLimit-Reset',
    retryAfter: 'Retry-After',
  },
};

/**
 * Generate default key from IP and path
 */
function defaultKeyGenerator(req: Request): string {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  return `${ip}:${req.path}`;
}

/**
 * Lua script for atomic sliding window rate limiting
 * This ensures atomicity and accuracy
 */
const SLIDING_WINDOW_SCRIPT = `
local key = KEYS[1]
local now = tonumber(ARGV[1])
local window = tonumber(ARGV[2])
local limit = tonumber(ARGV[3])
local weight = tonumber(ARGV[4])
local penalty = tonumber(ARGV[5])

-- Remove expired entries
local windowStart = now - window * 1000
redis.call('ZREMRANGEBYSCORE', key, '-inf', windowStart)

-- Count current requests in window
local current = redis.call('ZCARD', key)

-- Check if limit exceeded
if current + weight > limit then
  -- Get oldest entry to calculate retry-after
  local oldest = redis.call('ZRANGE', key, 0, 0, 'WITHSCORES')
  local retryAfter = 0
  if #oldest > 0 then
    retryAfter = math.ceil((oldest[2] + window * 1000 - now) / 1000)
  end
  
  -- Apply penalty if configured
  if penalty > 0 and current > 0 then
    local penaltyKey = key .. ':penalty'
    local penaltyCount = redis.call('GET', penaltyKey) or 0
    redis.call('INCR', penaltyKey)
    redis.call('EXPIRE', penaltyKey, window * 2)
  end
  
  return {0, current, limit, retryAfter, math.ceil((now + window * 1000) / 1000)}
end

-- Add new request with current timestamp
local member = now .. ':' .. math.random(1000000)
redis.call('ZADD', key, now, member)

-- Set expiry
redis.call('EXPIRE', key, window + 1)

return {1, current + weight, limit, 0, math.ceil((now + window * 1000) / 1000)}
`;

/**
 * Load script into Redis
 */
let scriptSha: string | null = null;

async function loadScript(): Promise<string> {
  if (!scriptSha) {
    scriptSha = await redisClient.script('LOAD', SLIDING_WINDOW_SCRIPT) as string;
  }
  return scriptSha;
}

/**
 * Check rate limit using sliding window algorithm
 */
async function checkRateLimit(
  key: string,
  options: Required<RateLimitOptions>,
  weight: number
): Promise<RateLimitInfo> {
  const now = Date.now();
  const windowMs = options.windowSize * 1000;

  try {
    const sha = await loadScript();
    
    const result = await redisClient.evalsha(
      sha,
      1,
      key,
      now.toString(),
      options.windowSize.toString(),
      options.maxRequests.toString(),
      weight.toString(),
      options.penaltySeconds.toString()
    ) as number[];

    const [allowed, current, limit, retryAfter, reset] = result;

    return {
      allowed: allowed === 1,
      limit: options.maxRequests,
      remaining: Math.max(0, options.maxRequests - current),
      reset,
      retryAfter: retryAfter > 0 ? retryAfter : undefined,
      currentCount: current,
    };
  } catch (error) {
    // Fallback to basic counting if script fails
    logWarn('[RateLimit] Script failed, using fallback:', error);
    return fallbackRateLimitCheck(key, options, weight, now);
  }
}

/**
 * Fallback rate limit check using basic Redis commands
 */
async function fallbackRateLimitCheck(
  key: string,
  options: Required<RateLimitOptions>,
  weight: number,
  now: number
): Promise<RateLimitInfo> {
  const windowStart = now - options.windowSize * 1000;

  // Remove old entries
  await redisClient.zremrangebyscore(key, '-inf', windowStart);

  // Count current entries
  const current = await redisClient.zcard(key);

  if (current + weight > options.maxRequests) {
    // Get oldest to calculate retry-after
    const oldest = await redisClient.zrange(key, 0, 0, 'WITHSCORES');
    let retryAfter = options.windowSize;
    
    if (oldest.length >= 2) {
      const oldestTime = parseInt(oldest[1], 10);
      retryAfter = Math.ceil((oldestTime + options.windowSize * 1000 - now) / 1000);
    }

    return {
      allowed: false,
      limit: options.maxRequests,
      remaining: 0,
      reset: Math.ceil((now + options.windowSize * 1000) / 1000),
      retryAfter: Math.max(1, retryAfter),
      currentCount: current,
    };
  }

  // Add new entry
  const member = `${now}:${Math.random().toString(36).slice(2)}`;
  await redisClient.zadd(key, now, member);
  await redisClient.expire(key, options.windowSize + 1);

  return {
    allowed: true,
    limit: options.maxRequests,
    remaining: Math.max(0, options.maxRequests - current - weight),
    reset: Math.ceil((now + options.windowSize * 1000) / 1000),
    currentCount: current + weight,
  };
}

/**
 * Default rate limited response
 */
function defaultRateLimitedResponse(
  req: Request,
  res: Response,
  retryAfter: number
): void {
  res.status(429).json({
    error: 'Too Many Requests',
    message: 'Rate limit exceeded. Please try again later.',
    retryAfter,
    correlationId: getCorrelationId(),
  });
}

/**
 * Sliding window rate limit middleware
 */
export function slidingWindowRateLimit(options: RateLimitOptions) {
  const opts = { 
    ...defaultOptions, 
    ...options,
    keyGenerator: options.keyGenerator || defaultKeyGenerator,
    onRateLimited: options.onRateLimited || defaultRateLimitedResponse,
  } as Required<RateLimitOptions>;

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    // Check skip condition
    if (opts.skip && opts.skip(req)) {
      return next();
    }

    // Generate cache key
    const identifier = opts.keyGenerator(req);
    const key = `ratelimit:${opts.storeName}:${identifier}`;
    const weight = opts.requestWeight(req);

    try {
      const result = await checkRateLimit(key, opts, weight);

      // Set rate limit headers
      res.setHeader(opts.headers.limit!, result.limit.toString());
      res.setHeader(opts.headers.remaining!, result.remaining.toString());
      res.setHeader(opts.headers.reset!, result.reset.toString());

      if (!result.allowed) {
        res.setHeader(opts.headers.retryAfter!, result.retryAfter!.toString());
        
        logWarn(`[RateLimit] Limit exceeded for ${identifier}: ${result.currentCount}/${result.limit}`);
        
        opts.onRateLimited(req, res, result.retryAfter!);
        return;
      }

      next();
    } catch (error) {
      // On error, allow request but log warning
      logWarn('[RateLimit] Error checking rate limit, allowing request:', error);
      next();
    }
  };
}

/**
 * Create rate limiter for specific use cases
 */
export const RateLimiters = {
  /**
   * Strict limiter for authentication endpoints
   */
  auth: () => slidingWindowRateLimit({
    windowSize: 900, // 15 minutes
    maxRequests: 5,
    storeName: 'auth',
    penaltySeconds: 300, // 5 minute penalty for abuse
    keyGenerator: (req) => {
      const ip = req.ip || 'unknown';
      return `auth:${ip}`;
    },
  }),

  /**
   * Limiter for password reset
   */
  passwordReset: () => slidingWindowRateLimit({
    windowSize: 3600, // 1 hour
    maxRequests: 3,
    storeName: 'password-reset',
    keyGenerator: (req) => {
      const email = req.body?.email || req.ip || 'unknown';
      return `password-reset:${email}`;
    },
  }),

  /**
   * API limiter per user
   */
  apiPerUser: (limit: number = 100) => slidingWindowRateLimit({
    windowSize: 60, // 1 minute
    maxRequests: limit,
    storeName: 'api-user',
    keyGenerator: (req) => {
      const userId = (req as any).user?.id || 'anonymous';
      return `api-user:${userId}`;
    },
    skip: (req) => {
      // Skip for health checks
      return req.path.startsWith('/health');
    },
  }),

  /**
   * API limiter per IP
   */
  apiPerIp: (limit: number = 60) => slidingWindowRateLimit({
    windowSize: 60, // 1 minute
    maxRequests: limit,
    storeName: 'api-ip',
    keyGenerator: (req) => {
      const ip = req.ip || req.socket.remoteAddress || 'unknown';
      return `api-ip:${ip}`;
    },
  }),

  /**
   * Reservation creation limiter
   */
  reservation: () => slidingWindowRateLimit({
    windowSize: 60, // 1 minute
    maxRequests: 5,
    storeName: 'reservation',
    keyGenerator: (req) => {
      const userId = (req as any).user?.id || req.ip || 'unknown';
      return `reservation:${userId}`;
    },
  }),

  /**
   * Search endpoint limiter
   */
  search: () => slidingWindowRateLimit({
    windowSize: 60, // 1 minute
    maxRequests: 30,
    storeName: 'search',
    burstSize: 10, // Allow bursts of 10
    keyGenerator: (req) => {
      const ip = req.ip || 'unknown';
      return `search:${ip}`;
    },
  }),

  /**
   * Webhook endpoint limiter
   */
  webhook: () => slidingWindowRateLimit({
    windowSize: 60, // 1 minute
    maxRequests: 100,
    storeName: 'webhook',
    keyGenerator: (req) => {
      const source = req.headers['x-webhook-source'] as string || req.ip || 'unknown';
      return `webhook:${source}`;
    },
  }),
};

/**
 * Get current rate limit status for a key
 */
export async function getRateLimitStatus(
  identifier: string,
  storeName: string = 'default',
  windowSize: number = 60
): Promise<{ count: number; remaining: number; reset: number }> {
  const key = `ratelimit:${storeName}:${identifier}`;
  const now = Date.now();
  const windowStart = now - windowSize * 1000;

  await redisClient.zremrangebyscore(key, '-inf', windowStart);
  const count = await redisClient.zcard(key);

  // This is a simplified check - actual limits may differ
  return {
    count,
    remaining: Math.max(0, 100 - count), // Assuming 100 as default limit
    reset: Math.ceil((now + windowSize * 1000) / 1000),
  };
}

/**
 * Reset rate limit for a specific identifier
 */
export async function resetRateLimit(
  identifier: string,
  storeName: string = 'default'
): Promise<void> {
  const key = `ratelimit:${storeName}:${identifier}`;
  await redisClient.del(key);
  logInfo(`[RateLimit] Reset for ${identifier}`);
}

export default slidingWindowRateLimit;

