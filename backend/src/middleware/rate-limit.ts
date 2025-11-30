/**
 * Rate Limiting Middleware
 * Protects API endpoints from abuse and DDoS attacks
 */

import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import Redis from 'ioredis';

// Redis client for distributed rate limiting
const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  db: 1, // Use separate DB for rate limiting
  retryStrategy: (times) => {
    // Reconnect after
    return Math.min(times * 50, 2000);
  },
});

// Standard API rate limit - 100 requests per 15 minutes
export const apiLimiter = rateLimit({
  store: new RedisStore({
    client: redis,
    prefix: 'rl:api:',
  }),
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
  message: {
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: '15 minutes',
  },
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  skip: (req) => {
    // Skip rate limiting for health checks
    return req.path === '/health' || req.path === '/api/health';
  },
});

// Strict rate limit for authentication endpoints - 5 attempts per 15 minutes
export const authLimiter = rateLimit({
  store: new RedisStore({
    client: redis,
    prefix: 'rl:auth:',
  }),
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: {
    error: 'Too many authentication attempts, please try again later.',
    retryAfter: '15 minutes',
    },
  skipSuccessfulRequests: true, // Don't count successful requests
  skipFailedRequests: false,
});

// Registration limit - 3 registrations per hour per IP
export const registerLimiter = rateLimit({
  store: new RedisStore({
    client: redis,
    prefix: 'rl:register:',
  }),
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3,
  message: {
    error: 'Too many accounts created from this IP, please try again later.',
    retryAfter: '1 hour',
  },
});

// Search/query limit - 30 searches per minute
export const searchLimiter = rateLimit({
  store: new RedisStore({
    client: redis,
    prefix: 'rl:search:',
  }),
  windowMs: 60 * 1000, // 1 minute
  max: 30,
  message: {
    error: 'Too many search requests, please slow down.',
    retryAfter: '1 minute',
  },
});

// Reservation creation limit - 10 reservations per hour per user
export const reservationLimiter = rateLimit({
  store: new RedisStore({
    client: redis,
    prefix: 'rl:reservation:',
  }),
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  message: {
    error: 'Too many reservation attempts, please try again later.',
    retryAfter: '1 hour',
  },
  keyGenerator: (req) => {
    // Use user ID if authenticated, otherwise IP
    return (req as any).user?.id || req.ip;
  },
});

// Payment endpoint - very strict
export const paymentLimiter = rateLimit({
  store: new RedisStore({
    client: redis,
    prefix: 'rl:payment:',
  }),
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  message: {
    error: 'Too many payment attempts, please contact support.',
    retryAfter: '1 hour',
  },
});

// File upload limit - 10 uploads per hour
export const uploadLimiter = rateLimit({
  store: new RedisStore({
    client: redis,
    prefix: 'rl:upload:',
  }),
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: {
    error: 'Too many file uploads, please try again later.',
    retryAfter: '1 hour',
  },
});

// Admin endpoints - 100 per minute (less restrictive for admins)
export const adminLimiter = rateLimit({
  store: new RedisStore({
    client: redis,
    prefix: 'rl:admin:',
  }),
  windowMs: 60 * 1000, // 1 minute
  max: 100,
  message: {
    error: 'Rate limit exceeded for admin endpoint.',
    retryAfter: '1 minute',
  },
});

// Custom rate limiter factory for specific use cases
export function createCustomLimiter(options: {
  windowMs: number;
  max: number;
  prefix: string;
  message?: string;
}) {
  return rateLimit({
    store: new RedisStore({
      client: redis,
      prefix: `rl:${options.prefix}:`,
    }),
    windowMs: options.windowMs,
    max: options.max,
    message: {
      error: options.message || 'Rate limit exceeded',
    },
  });
}

// IP-based blocking for severe abuse
const blockedIPs = new Set<string>();

export function blockIP(ip: string, durationMs: number = 24 * 60 * 60 * 1000) {
  blockedIPs.add(ip);
  
  // Auto-unblock after duration
  setTimeout(() => {
    blockedIPs.delete(ip);
  }, durationMs);
  
  // Also store in Redis for distributed blocking
  redis.setex(`blocked:${ip}`, Math.floor(durationMs / 1000), '1');
}

export function isIPBlocked(ip: string): Promise<boolean> {
  if (blockedIPs.has(ip)) return Promise.resolve(true);
  
  return redis.exists(`blocked:${ip}`).then(exists => exists === 1);
}

// Middleware to check if IP is blocked
export async function checkIPBlocked(req: any, res: any, next: any) {
  const blocked = await isIPBlocked(req.ip);
  
  if (blocked) {
    return res.status(403).json({
      error: 'Access forbidden. Your IP has been temporarily blocked due to suspicious activity.',
      contact: 'support@yourdomain.com',
    });
  }
  
  next();
}

// Export Redis client for other uses
export { redis as rateLimitRedis };
