import { EventEmitter } from 'events';
import { CacheManager } from '../../config/redis';
import { logger } from '../../utils/logger';
import { ApiProvider } from '../../types/api-providers.types';
import { ListingSource, ServiceType } from '../../models/UnifiedListing';
import { ApiProviderFactory } from '../api-providers/ApiProviderFactory';

export interface ProviderHealthStatus {
  source: ListingSource;
  name: string;
  healthy: boolean;
  responseTime: number;
  lastChecked: Date;
  errorCount: number;
  successCount: number;
  uptime: number;
  quota: {
    used: number;
    limit: number;
    resetAt: Date;
  };
}

export interface ProviderMetrics {
  avgResponseTime: number;
  errorRate: number;
  requestCount: number;
  lastError?: string;
  consecutiveErrors: number;
}

export class ProviderHealthMonitor extends EventEmitter {
  private static instance: ProviderHealthMonitor;
  private cache: CacheManager;
  private healthChecks: Map<string, NodeJS.Timeout> = new Map();
  private providers: Map<ServiceType, ApiProvider[]> = new Map();
  private metrics: Map<string, ProviderMetrics> = new Map();
  private readonly CHECK_INTERVAL = 60000; // 1 minute
  private readonly FAILURE_THRESHOLD = 3;
  private readonly RECOVERY_THRESHOLD = 2;

  private constructor() {
    super();
    this.cache = CacheManager.getInstance();
    this.initializeProviders();
    this.startHealthChecks();
  }

  static getInstance(): ProviderHealthMonitor {
    if (!ProviderHealthMonitor.instance) {
      ProviderHealthMonitor.instance = new ProviderHealthMonitor();
    }
    return ProviderHealthMonitor.instance;
  }

  private initializeProviders(): void {
    const allProviders = ApiProviderFactory.createProviders();
    
    Object.entries(allProviders).forEach(([serviceType, providers]) => {
      this.providers.set(serviceType as ServiceType, providers);
      
      providers.forEach((provider: any) => {
        const key = this.getProviderKey(provider);
        this.metrics.set(key, {
          avgResponseTime: 0,
          errorRate: 0,
          requestCount: 0,
          consecutiveErrors: 0,
        });
      });
    });
  }

  private startHealthChecks(): void {
    this.providers.forEach((providers, serviceType) => {
      providers.forEach(provider => {
        const key = this.getProviderKey(provider);
        
        const interval = setInterval(async () => {
          await this.checkProviderHealth(provider);
        }, this.CHECK_INTERVAL);
        
        this.healthChecks.set(key, interval);
      });
    });
    
    logger.info('Provider health monitoring started');
  }

  private async checkProviderHealth(provider: ApiProvider): Promise<void> {
    const key = this.getProviderKey(provider);
    const startTime = Date.now();
    
    try {
      const [isHealthy, quota] = await Promise.all([
        provider.isHealthy(),
        provider.getQuota().catch(() => ({ used: 0, limit: 0, resetAt: new Date() })),
      ]);
      
      const responseTime = Date.now() - startTime;
      const metrics = this.metrics.get(key)!;
      
      // Update metrics
      metrics.requestCount++;
      metrics.avgResponseTime = this.calculateMovingAverage(
        metrics.avgResponseTime,
        responseTime,
        metrics.requestCount
      );
      
      if (isHealthy) {
        metrics.consecutiveErrors = 0;
        await this.handleHealthyProvider(provider, responseTime, quota);
      } else {
        metrics.consecutiveErrors++;
        await this.handleUnhealthyProvider(provider, responseTime);
      }
      
      // Update error rate
      metrics.errorRate = (metrics.errorRate * 0.9) + (isHealthy ? 0 : 0.1);
      
    } catch (error) {
      const responseTime = Date.now() - startTime;
      await this.handleProviderError(provider, error, responseTime);
    }
  }

  private async handleHealthyProvider(
    provider: ApiProvider,
    responseTime: number,
    quota: any
  ): Promise<void> {
    const key = this.getProviderKey(provider);
    const metrics = this.metrics.get(key)!;
    
    // Check if provider was previously down and is now recovering
    const wasDown = await this.cache.get(`provider_down:${key}`);
    if (wasDown && metrics.consecutiveErrors === 0) {
      logger.info(`Provider ${provider.config.name} has recovered`);
      await this.cache.del(`provider_down:${key}`);
      this.emit('provider_recovered', {
        source: provider.config.source,
        name: provider.config.name,
        responseTime,
      });
    }
    
    // Store health status
    const status: ProviderHealthStatus = {
      source: provider.config.source,
      name: provider.config.name,
      healthy: true,
      responseTime,
      lastChecked: new Date(),
      errorCount: 0,
      successCount: metrics.requestCount,
      uptime: this.calculateUptime(key),
      quota,
    };
    
    await this.cache.set(`provider_health:${key}`, status, 300); // 5 minutes
  }

  private async handleUnhealthyProvider(
    provider: ApiProvider,
    responseTime: number
  ): Promise<void> {
    const key = this.getProviderKey(provider);
    const metrics = this.metrics.get(key)!;
    
    logger.warn(`Provider ${provider.config.name} health check failed`, {
      consecutiveErrors: metrics.consecutiveErrors,
      responseTime,
    });
    
    // Mark as down after threshold failures
    if (metrics.consecutiveErrors >= this.FAILURE_THRESHOLD) {
      await this.markProviderDown(provider);
    }
    
    const status: ProviderHealthStatus = {
      source: provider.config.source,
      name: provider.config.name,
      healthy: false,
      responseTime,
      lastChecked: new Date(),
      errorCount: metrics.consecutiveErrors,
      successCount: Math.max(0, metrics.requestCount - metrics.consecutiveErrors),
      uptime: this.calculateUptime(key),
      quota: { used: 0, limit: 0, resetAt: new Date() },
    };
    
    await this.cache.set(`provider_health:${key}`, status, 300);
  }

  private async handleProviderError(
    provider: ApiProvider,
    error: any,
    responseTime: number
  ): Promise<void> {
    const key = this.getProviderKey(provider);
    const metrics = this.metrics.get(key)!;
    
    metrics.consecutiveErrors++;
    metrics.lastError = error.message;
    
    logger.error(`Provider ${provider.config.name} error:`, error);
    
    if (metrics.consecutiveErrors >= this.FAILURE_THRESHOLD) {
      await this.markProviderDown(provider);
    }
    
    const status: ProviderHealthStatus = {
      source: provider.config.source,
      name: provider.config.name,
      healthy: false,
      responseTime,
      lastChecked: new Date(),
      errorCount: metrics.consecutiveErrors,
      successCount: Math.max(0, metrics.requestCount - metrics.consecutiveErrors),
      uptime: this.calculateUptime(key),
      quota: { used: 0, limit: 0, resetAt: new Date() },
    };
    
    await this.cache.set(`provider_health:${key}`, status, 300);
  }

  private async markProviderDown(provider: ApiProvider): Promise<void> {
    const key = this.getProviderKey(provider);
    const isAlreadyDown = await this.cache.get(`provider_down:${key}`);
    
    if (!isAlreadyDown) {
      logger.error(`Provider ${provider.config.name} marked as DOWN`);
      await this.cache.set(`provider_down:${key}`, true, 3600); // 1 hour
      
      // Disable provider temporarily
      provider.config.enabled = false;
      
      this.emit('provider_down', {
        source: provider.config.source,
        name: provider.config.name,
        consecutiveErrors: this.metrics.get(key)!.consecutiveErrors,
      });
    }
  }

  private calculateMovingAverage(
    currentAvg: number,
    newValue: number,
    count: number
  ): number {
    return ((currentAvg * (count - 1)) + newValue) / count;
  }

  private calculateUptime(providerKey: string): number {
    const metrics = this.metrics.get(providerKey)!;
    const successRate = metrics.requestCount > 0 
      ? (metrics.requestCount - metrics.consecutiveErrors) / metrics.requestCount 
      : 0;
    return Math.round(successRate * 100);
  }

  private getProviderKey(provider: ApiProvider): string {
    return `${provider.config.source}`;
  }

  // Public API methods
  async getProviderHealth(source: ListingSource): Promise<ProviderHealthStatus | null> {
    const key = source;
    return await this.cache.get(`provider_health:${key}`);
  }

  async getAllProviderHealth(): Promise<Record<string, ProviderHealthStatus>> {
    const healthStatuses: Record<string, ProviderHealthStatus> = {};
    
    for (const [serviceType, providers] of Array.from(this.providers.entries())) {
      for (const provider of providers) {
        const key = this.getProviderKey(provider);
        const health = await this.cache.get(`provider_health:${key}`);
        if (health) {
          healthStatuses[key] = health;
        }
      }
    }
    
    return healthStatuses;
  }

  async getProviderMetrics(source: ListingSource): Promise<ProviderMetrics | null> {
    return this.metrics.get(source) || null;
  }

  async forceHealthCheck(source: ListingSource): Promise<void> {
    for (const [serviceType, providers] of Array.from(this.providers.entries())) {
      const provider = providers.find(p => p.config.source === source);
      if (provider) {
        await this.checkProviderHealth(provider);
        break;
      }
    }
  }

  async enableProvider(source: ListingSource): Promise<void> {
    for (const [serviceType, providers] of Array.from(this.providers.entries())) {
      const provider = providers.find(p => p.config.source === source);
      if (provider) {
        provider.config.enabled = true;
        await this.cache.del(`provider_down:${source}`);
        logger.info(`Provider ${provider.config.name} manually enabled`);
        break;
      }
    }
  }

  async getHealthSummary(): Promise<{
    totalProviders: number;
    healthyProviders: number;
    downProviders: number;
    avgResponseTime: number;
    totalRequests: number;
  }> {
    const allHealth = await this.getAllProviderHealth();
    const statuses = Object.values(allHealth);
    
    const healthy = statuses.filter(s => s.healthy).length;
    const down = statuses.filter(s => !s.healthy).length;
    const avgResponseTime = statuses.length > 0 
      ? statuses.reduce((sum, s) => sum + s.responseTime, 0) / statuses.length 
      : 0;
    const totalRequests = Array.from(this.metrics.values())
      .reduce((sum, m) => sum + m.requestCount, 0);
    
    return {
      totalProviders: statuses.length,
      healthyProviders: healthy,
      downProviders: down,
      avgResponseTime: Math.round(avgResponseTime),
      totalRequests,
    };
  }

  // Cleanup method
  destroy(): void {
    this.healthChecks.forEach(interval => clearInterval(interval));
    this.healthChecks.clear();
    this.removeAllListeners();
    logger.info('Provider health monitoring stopped');
  }
}