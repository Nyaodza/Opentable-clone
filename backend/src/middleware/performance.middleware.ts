import { Request, Response, NextFunction } from 'express';
import compression from 'compression';
import { cache } from '../config/redis';

// Response compression middleware
export const compressionMiddleware = compression({
  // Only compress responses that are larger than 1kb
  threshold: 1024,
  
  // Compression level (1-9, 6 is default)
  level: parseInt(process.env.COMPRESSION_LEVEL || '6'),
  
  // Filter function to determine what to compress
  filter: (req, res) => {
    // Don't compress if the client doesn't support it
    if (req.headers['x-no-compression']) {
      return false;
    }

    // Don't compress already compressed content
    const contentType = res.getHeader('content-type') as string;
    if (contentType?.includes('image/') || 
        contentType?.includes('video/') || 
        contentType?.includes('audio/') ||
        contentType?.includes('application/zip') ||
        contentType?.includes('application/gzip')) {
      return false;
    }

    // Use compression for everything else
    return compression.filter(req, res);
  },
});

// Performance monitoring middleware
export const performanceMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  
  // Add performance headers
  res.setHeader('X-Response-Time-Start', startTime);
  
  // Override end method to calculate response time
  const originalEnd = res.end;
  res.end = function(...args: any[]) {
    const endTime = Date.now();
    const responseTime = endTime - startTime;
    
    // Add performance headers
    res.setHeader('X-Response-Time', `${responseTime}ms`);
    res.setHeader('X-Response-Time-End', endTime);
    
    // Log slow requests
    if (responseTime > 1000) {
      console.warn(`🐌 Slow request: ${req.method} ${req.path} - ${responseTime}ms`);
    }
    
    // Log performance metrics in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`⏱️  ${req.method} ${req.path} - ${responseTime}ms`);
    }
    
    // Store performance metrics in cache for monitoring
    if (responseTime > 500) {
      cache.lpush('slow_requests', {
        method: req.method,
        path: req.path,
        responseTime,
        timestamp: new Date().toISOString(),
        userAgent: req.get('user-agent'),
        ip: req.ip,
      }).catch(err => console.error('Failed to log slow request:', err));
    }
    
    return originalEnd.apply(res, args as any);
  };
  
  next();
};

// Memory monitoring middleware
export const memoryMonitoringMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const memUsage = process.memoryUsage();
  
  // Add memory headers in development
  if (process.env.NODE_ENV === 'development') {
    res.setHeader('X-Memory-Usage', JSON.stringify({
      rss: Math.round(memUsage.rss / 1024 / 1024),
      heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
      heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
      external: Math.round(memUsage.external / 1024 / 1024),
    }));
  }
  
  // Alert if memory usage is too high
  const heapUsagePercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;
  if (heapUsagePercent > 85) {
    console.warn(`⚠️  High memory usage: ${heapUsagePercent.toFixed(2)}%`);
  }
  
  next();
};

// Static asset caching middleware
export const staticCacheMiddleware = (maxAge: number = 86400) => {
  return (req: Request, res: Response, next: NextFunction) => {
    // Only apply to static assets
    if (req.path.match(/\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$/)) {
      // Set cache headers
      res.setHeader('Cache-Control', `public, max-age=${maxAge}`);
      res.setHeader('Expires', new Date(Date.now() + maxAge * 1000).toUTCString());
      
      // Add ETag for conditional requests
      const etag = `"${Date.now()}"`;
      res.setHeader('ETag', etag);
      
      // Check if client has cached version
      const ifNoneMatch = req.get('if-none-match');
      if (ifNoneMatch === etag) {
        return res.status(304).end();
      }
    }
    
    next();
  };
};

// API response optimization middleware
export const apiOptimizationMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // Store original json method
  const originalJson = res.json;
  
  // Override json method to optimize response
  res.json = function(data: any): Response {
    // Add API version header
    res.setHeader('X-API-Version', process.env.API_VERSION || '1.0.0');
    
    // Add timestamp
    const optimizedData = {
      success: true,
      timestamp: new Date().toISOString(),
      data,
    };
    
    // Handle error responses
    if (data && typeof data === 'object' && data.error) {
      optimizedData.success = false;
      delete optimizedData.data;
      Object.assign(optimizedData, data);
    }
    
    return originalJson.call(res, optimizedData);
  };
  
  next();
};

// Request size limiting middleware
export const requestSizeLimitMiddleware = (limit: string = '10mb') => {
  return (req: Request, res: Response, next: NextFunction) => {
    const contentLength = parseInt(req.get('content-length') || '0');
    const maxSize = parseSize(limit);
    
    if (contentLength > maxSize) {
      return res.status(413).json({
        success: false,
        error: 'Request entity too large',
        maxSize: limit,
      });
    }
    
    next();
  };
};

// Helper function to parse size strings like '10mb', '1gb'
const parseSize = (size: string): number => {
  const units: { [key: string]: number } = {
    b: 1,
    kb: 1024,
    mb: 1024 * 1024,
    gb: 1024 * 1024 * 1024,
  };
  
  const match = size.toLowerCase().match(/^(\d+)(b|kb|mb|gb)$/);
  if (!match) {
    throw new Error(`Invalid size format: ${size}`);
  }
  
  const [, value, unit] = match;
  return parseInt(value) * units[unit];
};

// Database connection pooling optimization
export const dbPoolOptimizationMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // Add connection pool status to response headers in development
  if (process.env.NODE_ENV === 'development') {
    // This would need to be implemented based on your ORM
    // For Sequelize, you can access pool stats like this:
    // const pool = sequelize.connectionManager.pool;
    // res.setHeader('X-DB-Pool', JSON.stringify({
    //   size: pool.size,
    //   available: pool.available,
    //   using: pool.using,
    //   waiting: pool.waiting
    // }));
  }
  
  next();
};

// Request batching middleware
export const requestBatchingMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // Handle batch requests
  if (req.path === '/api/batch' && req.method === 'POST') {
    const { requests } = req.body;
    
    if (!Array.isArray(requests)) {
      return res.status(400).json({
        success: false,
        error: 'Requests must be an array',
      });
    }
    
    if (requests.length > 10) {
      return res.status(400).json({
        success: false,
        error: 'Maximum 10 requests per batch',
      });
    }
    
    // Process batch requests
    processBatchRequests(requests, req, res);
    return;
  }
  
  next();
};

// Process batch requests
const processBatchRequests = async (requests: any[], originalReq: Request, res: Response) => {
  const results = await Promise.allSettled(
    requests.map(async (request, index) => {
      try {
        // Simulate individual request processing
        // In a real implementation, you'd need to create mock req/res objects
        // and route them through your existing middleware/controllers
        return {
          id: request.id || index,
          status: 'fulfilled',
          data: { message: 'Batch request processed', request },
        };
      } catch (error: any) {
        return {
          id: request.id || index,
          status: 'rejected',
          error: error.message,
        };
      }
    })
  );
  
  res.json({
    success: true,
    results,
  });
};

// Preflight optimization for OPTIONS requests
export const preflightOptimizationMiddleware = (req: Request, res: Response, next: NextFunction) => {
  if (req.method === 'OPTIONS') {
    // Cache preflight responses
    res.setHeader('Access-Control-Max-Age', '86400'); // 24 hours
    res.setHeader('Cache-Control', 'public, max-age=86400');
    return res.status(204).end();
  }
  
  next();
};

// Performance analytics middleware
export const performanceAnalyticsMiddleware = (req: Request, res: Response, next: NextFunction) => {
  if (req.path === '/api/admin/performance') {
    return handlePerformanceAnalytics(req, res);
  }
  
  next();
};

const handlePerformanceAnalytics = async (req: Request, res: Response) => {
  try {
    // Get slow requests from cache
    const slowRequests = await cache.lrange('slow_requests', 0, 99);
    
    // Get memory usage
    const memUsage = process.memoryUsage();
    
    // Get uptime
    const uptime = process.uptime();
    
    // Calculate performance metrics
    const performanceMetrics = {
      slowRequests: slowRequests.length,
      averageResponseTime: slowRequests.length > 0 
        ? slowRequests.reduce((sum: number, req: any) => sum + req.responseTime, 0) / slowRequests.length
        : 0,
      memoryUsage: {
        rss: Math.round(memUsage.rss / 1024 / 1024),
        heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
        heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
        external: Math.round(memUsage.external / 1024 / 1024),
        heapUsagePercent: Math.round((memUsage.heapUsed / memUsage.heapTotal) * 100),
      },
      uptime: Math.round(uptime),
      uptimeFormatted: formatUptime(uptime),
    };
    
    res.json({
      success: true,
      data: performanceMetrics,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get performance analytics',
    });
  }
};

const formatUptime = (seconds: number): string => {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  
  return `${days}d ${hours}h ${minutes}m`;
};

// Health check middleware with performance data
export const healthCheckMiddleware = (req: Request, res: Response, next: NextFunction) => {
  if (req.path === '/api/health') {
    const memUsage = process.memoryUsage();
    const uptime = process.uptime();
    
    res.json({
      success: true,
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: uptime,
      memory: {
        rss: Math.round(memUsage.rss / 1024 / 1024),
        heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
        heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
      },
      version: process.env.API_VERSION || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
    });
    return;
  }
  
  next();
};

export default {
  compressionMiddleware,
  performanceMiddleware,
  memoryMonitoringMiddleware,
  staticCacheMiddleware,
  apiOptimizationMiddleware,
  requestSizeLimitMiddleware,
  dbPoolOptimizationMiddleware,
  requestBatchingMiddleware,
  preflightOptimizationMiddleware,
  performanceAnalyticsMiddleware,
  healthCheckMiddleware,
};