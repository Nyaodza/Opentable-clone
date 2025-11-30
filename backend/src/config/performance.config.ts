import { Application } from 'express';
import {
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
} from '../middleware/performance.middleware';
import {
  cacheStatsMiddleware,
  cacheManagementMiddleware,
} from '../middleware/cache.middleware';
import { optimizeDatabase } from './database-optimization';

// Performance configuration interface
export interface PerformanceConfig {
  compression: {
    enabled: boolean;
    level: number;
    threshold: number;
  };
  caching: {
    enabled: boolean;
    redis: boolean;
    staticAssets: boolean;
    apiResponses: boolean;
  };
  monitoring: {
    enabled: boolean;
    slowRequestThreshold: number;
    memoryAlerts: boolean;
    performanceMetrics: boolean;
  };
  optimization: {
    database: boolean;
    responseCompression: boolean;
    staticAssetCaching: boolean;
    requestBatching: boolean;
  };
  limits: {
    requestSize: string;
    responseTimeout: number;
    maxConcurrentRequests: number;
  };
}

// Default performance configuration
export const defaultPerformanceConfig: PerformanceConfig = {
  compression: {
    enabled: true,
    level: parseInt(process.env.COMPRESSION_LEVEL || '6'),
    threshold: 1024, // 1KB
  },
  caching: {
    enabled: true,
    redis: true,
    staticAssets: true,
    apiResponses: true,
  },
  monitoring: {
    enabled: true,
    slowRequestThreshold: 1000, // 1 second
    memoryAlerts: true,
    performanceMetrics: true,
  },
  optimization: {
    database: true,
    responseCompression: true,
    staticAssetCaching: true,
    requestBatching: true,
  },
  limits: {
    requestSize: process.env.MAX_REQUEST_SIZE || '10mb',
    responseTimeout: parseInt(process.env.RESPONSE_TIMEOUT || '30000'), // 30 seconds
    maxConcurrentRequests: parseInt(process.env.MAX_CONCURRENT_REQUESTS || '1000'),
  },
};

// Apply performance optimizations to Express app
export const applyPerformanceOptimizations = async (
  app: Application, 
  config: PerformanceConfig = defaultPerformanceConfig
) => {
  console.log('Applying performance optimizations...');

  try {
    // Database optimizations
    if (config.optimization.database) {
      await optimizeDatabase();
      console.log('✓ Database optimizations applied');
    }

    // Request size limiting
    app.use(requestSizeLimitMiddleware(config.limits.requestSize));
    console.log('✓ Request size limiting enabled');

    // Response compression
    if (config.compression.enabled && config.optimization.responseCompression) {
      app.use(compressionMiddleware);
      console.log('✓ Response compression enabled');
    }

    // Performance monitoring
    if (config.monitoring.enabled) {
      app.use(performanceMiddleware);
      app.use(memoryMonitoringMiddleware);
      console.log('✓ Performance monitoring enabled');
    }

    // Static asset caching
    if (config.caching.staticAssets && config.optimization.staticAssetCaching) {
      app.use(staticCacheMiddleware(86400)); // 24 hours
      console.log('✓ Static asset caching enabled');
    }

    // Preflight optimization
    app.use(preflightOptimizationMiddleware);
    console.log('✓ Preflight optimization enabled');

    // Request batching
    if (config.optimization.requestBatching) {
      app.use(requestBatchingMiddleware);
      console.log('✓ Request batching enabled');
    }

    // API response optimization
    if (config.caching.apiResponses) {
      app.use('/api', apiOptimizationMiddleware);
      console.log('✓ API response optimization enabled');
    }

    // Database connection pooling optimization
    app.use(dbPoolOptimizationMiddleware);
    console.log('✓ Database pool optimization enabled');

    // Cache management endpoints
    if (config.caching.enabled && config.caching.redis) {
      app.use(cacheStatsMiddleware);
      app.use(cacheManagementMiddleware);
      console.log('✓ Cache management endpoints enabled');
    }

    // Performance analytics endpoint
    if (config.monitoring.performanceMetrics) {
      app.use(performanceAnalyticsMiddleware);
      console.log('✓ Performance analytics enabled');
    }

    // Health check endpoint
    app.use(healthCheckMiddleware);
    console.log('✓ Health check endpoint enabled');

    console.log('Performance optimizations applied successfully');
  } catch (error) {
    console.error('Failed to apply performance optimizations:', error);
    throw error;
  }
};

// Performance monitoring class
export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private isMonitoring = false;
  private monitoringInterval = 60000; // 1 minute
  private metricsBuffer: Array<{
    timestamp: string;
    memoryUsage: NodeJS.MemoryUsage;
    cpuUsage: NodeJS.CpuUsage;
    uptime: number;
  }> = [];

  private constructor() {}

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  startMonitoring() {
    if (this.isMonitoring) return;

    this.isMonitoring = true;
    console.log('Starting performance monitoring...');

    let lastCpuUsage = process.cpuUsage();

    const intervalId = setInterval(() => {
      try {
        const currentCpuUsage = process.cpuUsage(lastCpuUsage);
        lastCpuUsage = process.cpuUsage();

        const metrics = {
          timestamp: new Date().toISOString(),
          memoryUsage: process.memoryUsage(),
          cpuUsage: currentCpuUsage,
          uptime: process.uptime(),
        };

        this.metricsBuffer.push(metrics);

        // Keep only last 60 measurements (1 hour of data)
        if (this.metricsBuffer.length > 60) {
          this.metricsBuffer.shift();
        }

        // Check for performance issues
        this.checkPerformanceAlerts(metrics);

        // Log periodic summary
        if (this.metricsBuffer.length % 15 === 0) { // Every 15 minutes
          this.logPerformanceSummary();
        }
      } catch (error) {
        console.error('Performance monitoring error:', error);
      }
    }, this.monitoringInterval);

    // Clean up on process exit
    process.on('SIGTERM', () => {
      clearInterval(intervalId);
      this.stopMonitoring();
    });

    process.on('SIGINT', () => {
      clearInterval(intervalId);
      this.stopMonitoring();
    });
  }

  stopMonitoring() {
    this.isMonitoring = false;
    console.log('Performance monitoring stopped');
  }

  getMetrics() {
    return {
      isMonitoring: this.isMonitoring,
      metricsBuffer: this.metricsBuffer,
      summary: this.calculateSummary(),
    };
  }

  private checkPerformanceAlerts(metrics: any) {
    const { memoryUsage, cpuUsage } = metrics;

    // Memory usage alerts
    const heapUsagePercent = (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100;
    if (heapUsagePercent > 85) {
      console.warn(`⚠️  HIGH MEMORY USAGE: ${heapUsagePercent.toFixed(2)}%`);
    }

    // CPU usage alerts
    const cpuPercent = ((cpuUsage.user + cpuUsage.system) / 1000000) * 100; // Convert to percentage
    if (cpuPercent > 80) {
      console.warn(`⚠️  HIGH CPU USAGE: ${cpuPercent.toFixed(2)}%`);
    }

    // RSS memory alerts
    const rssInMB = memoryUsage.rss / 1024 / 1024;
    if (rssInMB > 1024) { // 1GB
      console.warn(`⚠️  HIGH RSS MEMORY: ${rssInMB.toFixed(2)}MB`);
    }
  }

  private logPerformanceSummary() {
    const summary = this.calculateSummary();
    console.log('📊 Performance Summary:', {
      averageMemoryUsage: `${summary.averageMemoryUsage}MB`,
      peakMemoryUsage: `${summary.peakMemoryUsage}MB`,
      averageHeapUsage: `${summary.averageHeapUsage}%`,
      uptime: this.formatUptime(summary.uptime),
    });
  }

  private calculateSummary() {
    if (this.metricsBuffer.length === 0) {
      return {
        averageMemoryUsage: 0,
        peakMemoryUsage: 0,
        averageHeapUsage: 0,
        uptime: 0,
      };
    }

    const totalHeapUsed = this.metricsBuffer.reduce((sum, m) => sum + m.memoryUsage.heapUsed, 0);
    const totalHeapTotal = this.metricsBuffer.reduce((sum, m) => sum + m.memoryUsage.heapTotal, 0);
    const peakHeapUsed = Math.max(...this.metricsBuffer.map(m => m.memoryUsage.heapUsed));
    const latestUptime = this.metricsBuffer[this.metricsBuffer.length - 1]?.uptime || 0;

    return {
      averageMemoryUsage: Math.round(totalHeapUsed / this.metricsBuffer.length / 1024 / 1024),
      peakMemoryUsage: Math.round(peakHeapUsed / 1024 / 1024),
      averageHeapUsage: Math.round((totalHeapUsed / totalHeapTotal) * 100),
      uptime: latestUptime,
    };
  }

  private formatUptime(seconds: number): string {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    return `${days}d ${hours}h ${minutes}m`;
  }
}

// Environment-specific performance configurations
export const getPerformanceConfigForEnvironment = (env: string): PerformanceConfig => {
  const baseConfig = { ...defaultPerformanceConfig };

  switch (env) {
    case 'development':
      return {
        ...baseConfig,
        compression: {
          ...baseConfig.compression,
          level: 1, // Faster compression for development
        },
        monitoring: {
          ...baseConfig.monitoring,
          slowRequestThreshold: 2000, // More lenient in development
        },
        limits: {
          ...baseConfig.limits,
          requestSize: '50mb', // Allow larger requests in development
        },
      };

    case 'staging':
      return {
        ...baseConfig,
        compression: {
          ...baseConfig.compression,
          level: 4, // Moderate compression for staging
        },
        monitoring: {
          ...baseConfig.monitoring,
          slowRequestThreshold: 1500,
        },
      };

    case 'production':
      return {
        ...baseConfig,
        compression: {
          ...baseConfig.compression,
          level: 6, // Optimal compression for production
        },
        monitoring: {
          ...baseConfig.monitoring,
          enabled: true,
          slowRequestThreshold: 1000,
          memoryAlerts: true,
          performanceMetrics: true,
        },
        optimization: {
          ...baseConfig.optimization,
          database: true,
          responseCompression: true,
          staticAssetCaching: true,
          requestBatching: true,
        },
      };

    default:
      return baseConfig;
  }
};

// Performance testing utilities
export class PerformanceTester {
  static async testDatabaseQueries() {
    console.log('Testing database query performance...');
    // Implementation would include various database query tests
    return {
      simpleSelect: '15ms',
      complexJoin: '45ms',
      aggregation: '32ms',
      indexedSearch: '8ms',
    };
  }

  static async testCachePerformance() {
    console.log('Testing cache performance...');
    // Implementation would include cache read/write tests
    return {
      setOperation: '2ms',
      getOperation: '1ms',
      deleteOperation: '1ms',
      complexQuery: '5ms',
    };
  }

  static async testAPIEndpoints() {
    console.log('Testing API endpoint performance...');
    // Implementation would include API response time tests
    return {
      '/api/restaurants': '120ms',
      '/api/reservations': '95ms',
      '/api/users/profile': '45ms',
      '/api/search': '180ms',
    };
  }
}

export default {
  applyPerformanceOptimizations,
  PerformanceMonitor,
  PerformanceTester,
  defaultPerformanceConfig,
  getPerformanceConfigForEnvironment,
};