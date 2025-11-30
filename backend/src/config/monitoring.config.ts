import { Application, Request, Response, NextFunction } from 'express';
import { performance } from 'perf_hooks';
import { cache } from './redis';

// Monitoring metrics interface
export interface MetricData {
  timestamp: number;
  endpoint: string;
  method: string;
  statusCode: number;
  responseTime: number;
  userAgent?: string;
  ip?: string;
  userId?: string;
  error?: string;
}

// API usage statistics
export interface ApiStats {
  totalRequests: number;
  averageResponseTime: number;
  errorRate: number;
  popularEndpoints: Array<{
    endpoint: string;
    count: number;
    avgResponseTime: number;
  }>;
  statusCodeDistribution: Record<string, number>;
  hourlyStats: Array<{
    hour: string;
    requests: number;
    errors: number;
    avgResponseTime: number;
  }>;
}

// System metrics interface
export interface SystemMetrics {
  cpu: {
    usage: number;
    loadAverage: number[];
  };
  memory: {
    used: number;
    total: number;
    percentage: number;
    heap: {
      used: number;
      total: number;
      percentage: number;
    };
  };
  database: {
    connections: number;
    queries: number;
    slowQueries: number;
  };
  cache: {
    hitRate: number;
    missRate: number;
    operations: number;
  };
  uptime: number;
}

// Monitoring class
export class ApiMonitor {
  private static instance: ApiMonitor;
  private metrics: MetricData[] = [];
  private isMonitoring = false;
  private maxMetrics = 10000; // Keep last 10k metrics
  private aggregationInterval = 60000; // 1 minute

  private constructor() {}

  static getInstance(): ApiMonitor {
    if (!ApiMonitor.instance) {
      ApiMonitor.instance = new ApiMonitor();
    }
    return ApiMonitor.instance;
  }

  // Start monitoring
  startMonitoring() {
    if (this.isMonitoring) return;

    this.isMonitoring = true;
    console.log('📊 API monitoring started');

    // Aggregate metrics periodically
    setInterval(() => {
      this.aggregateMetrics();
    }, this.aggregationInterval);

    // Clean old metrics
    setInterval(() => {
      this.cleanOldMetrics();
    }, this.aggregationInterval * 5); // Every 5 minutes
  }

  // Stop monitoring
  stopMonitoring() {
    this.isMonitoring = false;
    console.log('📊 API monitoring stopped');
  }

  // Record API request metric
  recordMetric(metric: MetricData) {
    if (!this.isMonitoring) return;

    this.metrics.push(metric);

    // Keep metrics within limit
    if (this.metrics.length > this.maxMetrics) {
      this.metrics.shift();
    }

    // Store in cache for real-time access
    cache.lpush('api_metrics', metric).catch(err => 
      console.error('Failed to store metric in cache:', err)
    );
  }

  // Get current API statistics
  getApiStats(timeframe: number = 3600000): ApiStats { // Default 1 hour
    const cutoff = Date.now() - timeframe;
    const relevantMetrics = this.metrics.filter(m => m.timestamp > cutoff);

    if (relevantMetrics.length === 0) {
      return {
        totalRequests: 0,
        averageResponseTime: 0,
        errorRate: 0,
        popularEndpoints: [],
        statusCodeDistribution: {},
        hourlyStats: [],
      };
    }

    // Calculate basic stats
    const totalRequests = relevantMetrics.length;
    const totalResponseTime = relevantMetrics.reduce((sum, m) => sum + m.responseTime, 0);
    const averageResponseTime = totalResponseTime / totalRequests;
    const errorCount = relevantMetrics.filter(m => m.statusCode >= 400).length;
    const errorRate = (errorCount / totalRequests) * 100;

    // Popular endpoints
    const endpointCounts: Record<string, { count: number; totalTime: number }> = {};
    relevantMetrics.forEach(m => {
      const key = `${m.method} ${m.endpoint}`;
      if (!endpointCounts[key]) {
        endpointCounts[key] = { count: 0, totalTime: 0 };
      }
      endpointCounts[key].count++;
      endpointCounts[key].totalTime += m.responseTime;
    });

    const popularEndpoints = Object.entries(endpointCounts)
      .map(([endpoint, data]) => ({
        endpoint,
        count: data.count,
        avgResponseTime: data.totalTime / data.count,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Status code distribution
    const statusCodeDistribution: Record<string, number> = {};
    relevantMetrics.forEach(m => {
      const code = m.statusCode.toString();
      statusCodeDistribution[code] = (statusCodeDistribution[code] || 0) + 1;
    });

    // Hourly stats
    const hourlyStats = this.calculateHourlyStats(relevantMetrics);

    return {
      totalRequests,
      averageResponseTime,
      errorRate,
      popularEndpoints,
      statusCodeDistribution,
      hourlyStats,
    };
  }

  // Get system metrics
  async getSystemMetrics(): Promise<SystemMetrics> {
    const memUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    
    // Calculate CPU percentage (simplified)
    const cpuPercent = ((cpuUsage.user + cpuUsage.system) / 1000000) / process.uptime() * 100;

    // Get cache stats
    const cacheStats = await cache.getStats().catch(() => ({
      connected: false,
      usedMemory: '0B',
      totalKeys: 0,
      hitRatio: 0,
    }));

    return {
      cpu: {
        usage: Math.min(cpuPercent, 100),
        loadAverage: process.platform === 'win32' ? [0, 0, 0] : require('os').loadavg(),
      },
      memory: {
        used: memUsage.rss,
        total: require('os').totalmem(),
        percentage: (memUsage.rss / require('os').totalmem()) * 100,
        heap: {
          used: memUsage.heapUsed,
          total: memUsage.heapTotal,
          percentage: (memUsage.heapUsed / memUsage.heapTotal) * 100,
        },
      },
      database: {
        connections: 0, // Would be populated from actual DB pool
        queries: 0,     // Would be populated from query counter
        slowQueries: 0, // Would be populated from slow query counter
      },
      cache: {
        hitRate: cacheStats.hitRatio,
        missRate: 100 - cacheStats.hitRatio,
        operations: cacheStats.totalKeys,
      },
      uptime: process.uptime(),
    };
  }

  // Calculate hourly statistics
  private calculateHourlyStats(metrics: MetricData[]) {
    const hourlyData: Record<string, { requests: number; errors: number; totalTime: number }> = {};

    metrics.forEach(m => {
      const hour = new Date(m.timestamp).toISOString().substring(0, 13); // YYYY-MM-DDTHH
      if (!hourlyData[hour]) {
        hourlyData[hour] = { requests: 0, errors: 0, totalTime: 0 };
      }
      hourlyData[hour].requests++;
      hourlyData[hour].totalTime += m.responseTime;
      if (m.statusCode >= 400) {
        hourlyData[hour].errors++;
      }
    });

    return Object.entries(hourlyData)
      .map(([hour, data]) => ({
        hour,
        requests: data.requests,
        errors: data.errors,
        avgResponseTime: data.totalTime / data.requests,
      }))
      .sort((a, b) => a.hour.localeCompare(b.hour));
  }

  // Aggregate metrics for storage
  private async aggregateMetrics() {
    if (this.metrics.length === 0) return;

    try {
      const stats = this.getApiStats();
      const systemMetrics = await this.getSystemMetrics();

      // Store aggregated data in cache
      await cache.set('api_stats_current', stats, 300); // 5 minutes
      await cache.set('system_metrics_current', systemMetrics, 60); // 1 minute

      // Store historical data
      const timestamp = new Date().toISOString();
      await cache.hset('api_stats_history', timestamp, stats);
      await cache.hset('system_metrics_history', timestamp, systemMetrics);

      console.log(`📊 Metrics aggregated: ${stats.totalRequests} requests, ${stats.averageResponseTime.toFixed(2)}ms avg`);
    } catch (error) {
      console.error('Failed to aggregate metrics:', error);
    }
  }

  // Clean old metrics from memory
  private cleanOldMetrics() {
    const cutoff = Date.now() - (24 * 60 * 60 * 1000); // 24 hours
    this.metrics = this.metrics.filter(m => m.timestamp > cutoff);
  }

  // Get real-time metrics
  async getRealTimeMetrics() {
    const [apiStats, systemMetrics] = await Promise.all([
      cache.get('api_stats_current'),
      cache.get('system_metrics_current'),
    ]);

    return {
      api: apiStats || this.getApiStats(),
      system: systemMetrics || await this.getSystemMetrics(),
      timestamp: new Date().toISOString(),
    };
  }

  // Get historical metrics
  async getHistoricalMetrics(hours: number = 24) {
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
    
    const [apiHistory, systemHistory] = await Promise.all([
      cache.hgetall('api_stats_history'),
      cache.hgetall('system_metrics_history'),
    ]);

    const filteredApiHistory = Object.entries(apiHistory)
      .filter(([timestamp]) => timestamp > cutoff)
      .sort(([a], [b]) => a.localeCompare(b));

    const filteredSystemHistory = Object.entries(systemHistory)
      .filter(([timestamp]) => timestamp > cutoff)
      .sort(([a], [b]) => a.localeCompare(b));

    return {
      api: filteredApiHistory,
      system: filteredSystemHistory,
    };
  }
}

// Monitoring middleware
export const monitoringMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const startTime = performance.now();
  const monitor = ApiMonitor.getInstance();

  // Override res.end to capture response data
  const originalEnd = res.end;
  res.end = function(this: Response, ...args: any[]) {
    const endTime = performance.now();
    const responseTime = endTime - startTime;

    // Record metric
    monitor.recordMetric({
      timestamp: Date.now(),
      endpoint: req.route?.path || req.path,
      method: req.method,
      statusCode: res.statusCode,
      responseTime,
      userAgent: req.get('user-agent'),
      ip: req.ip,
      userId: (req as any).user?.id,
      error: res.statusCode >= 400 ? res.statusMessage : undefined,
    });

    return originalEnd.apply(this, args as any);
  };

  next();
};

// Health check with detailed system info
export const detailedHealthCheck = async (req: Request, res: Response) => {
  try {
    const monitor = ApiMonitor.getInstance();
    const metrics = await monitor.getRealTimeMetrics();
    
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: process.env.API_VERSION || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      uptime: process.uptime(),
      system: metrics.system,
      api: {
        requests: metrics.api.totalRequests,
        averageResponseTime: metrics.api.averageResponseTime,
        errorRate: metrics.api.errorRate,
      },
      dependencies: {
        database: await checkDatabaseHealth(),
        redis: await checkRedisHealth(),
        external: await checkExternalServices(),
      },
    };

    // Determine overall health status
    if (metrics.system.memory.percentage > 90 || metrics.api.errorRate > 50) {
      health.status = 'degraded';
    }

    if (!health.dependencies.database || !health.dependencies.redis) {
      health.status = 'unhealthy';
    }

    const statusCode = health.status === 'healthy' ? 200 : 
                      health.status === 'degraded' ? 200 : 503;

    res.status(statusCode).json(health);
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Health check failed',
    });
  }
};

// Check database health
const checkDatabaseHealth = async (): Promise<boolean> => {
  try {
    const { sequelize } = require('./database');
    await sequelize.authenticate();
    return true;
  } catch (error) {
    return false;
  }
};

// Check Redis health
const checkRedisHealth = async (): Promise<boolean> => {
  try {
    const stats = await cache.getStats();
    return stats.connected;
  } catch (error) {
    return false;
  }
};

// Check external services health
const checkExternalServices = async (): Promise<Record<string, boolean>> => {
  const services = {
    stripe: false,
    email: false,
    aws: false,
  };

  // These would be actual health checks
  // For now, we'll assume they're healthy if env vars are set
  services.stripe = !!process.env.STRIPE_SECRET_KEY;
  services.email = !!process.env.EMAIL_HOST;
  services.aws = !!process.env.AWS_ACCESS_KEY_ID;

  return services;
};

// Setup monitoring endpoints
export const setupMonitoring = (app: Application) => {
  const monitor = ApiMonitor.getInstance();
  
  // Start monitoring
  monitor.startMonitoring();

  // Apply monitoring middleware to all routes
  app.use(monitoringMiddleware);

  // Monitoring endpoints
  app.get('/api/monitoring/health', detailedHealthCheck);
  
  app.get('/api/monitoring/metrics', async (req, res) => {
    try {
      const timeframe = parseInt(req.query.timeframe as string) || 3600000; // 1 hour default
      const stats = monitor.getApiStats(timeframe);
      res.json({ success: true, data: stats });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Failed to get metrics' });
    }
  });

  app.get('/api/monitoring/system', async (req, res) => {
    try {
      const metrics = await monitor.getSystemMetrics();
      res.json({ success: true, data: metrics });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Failed to get system metrics' });
    }
  });

  app.get('/api/monitoring/realtime', async (req, res) => {
    try {
      const metrics = await monitor.getRealTimeMetrics();
      res.json({ success: true, data: metrics });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Failed to get real-time metrics' });
    }
  });

  app.get('/api/monitoring/history', async (req, res) => {
    try {
      const hours = parseInt(req.query.hours as string) || 24;
      const history = await monitor.getHistoricalMetrics(hours);
      res.json({ success: true, data: history });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Failed to get historical metrics' });
    }
  });

  console.log('📊 Monitoring endpoints configured:');
  console.log('  - GET /api/monitoring/health');
  console.log('  - GET /api/monitoring/metrics');
  console.log('  - GET /api/monitoring/system');
  console.log('  - GET /api/monitoring/realtime');
  console.log('  - GET /api/monitoring/history');
};

export default {
  ApiMonitor,
  setupMonitoring,
  monitoringMiddleware,
  detailedHealthCheck,
};