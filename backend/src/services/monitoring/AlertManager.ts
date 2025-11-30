import { EventEmitter } from 'events';
import { CacheManager } from '../../config/redis';
import { logger } from '../../utils/logger';
import { ProviderHealthMonitor } from './ProviderHealthMonitor';
import { ListingSource } from '../../models/UnifiedListing';

export interface AlertRule {
  id: string;
  name: string;
  type: 'provider_down' | 'high_response_time' | 'quota_exceeded' | 'error_rate_high';
  threshold?: number;
  enabled: boolean;
  channels: AlertChannel[];
  cooldownMinutes: number;
}

export interface AlertChannel {
  type: 'email' | 'slack' | 'webhook' | 'console';
  config: {
    recipients?: string[];
    webhookUrl?: string;
    slackChannel?: string;
  };
}

export interface Alert {
  id: string;
  ruleId: string;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  source: ListingSource;
  timestamp: Date;
  acknowledged: boolean;
  resolvedAt?: Date;
  metadata: Record<string, any>;
}

export class AlertManager extends EventEmitter {
  private static instance: AlertManager;
  private cache: CacheManager;
  private healthMonitor: ProviderHealthMonitor;
  private alertRules: Map<string, AlertRule> = new Map();
  private activeAlerts: Map<string, Alert> = new Map();

  private constructor() {
    super();
    this.cache = CacheManager.getInstance();
    this.healthMonitor = ProviderHealthMonitor.getInstance();
    this.initializeDefaultRules();
    this.setupEventListeners();
  }

  static getInstance(): AlertManager {
    if (!AlertManager.instance) {
      AlertManager.instance = new AlertManager();
    }
    return AlertManager.instance;
  }

  private initializeDefaultRules(): void {
    const defaultRules: AlertRule[] = [
      {
        id: 'provider-down',
        name: 'Provider Down',
        type: 'provider_down',
        enabled: true,
        channels: [
          {
            type: 'console',
            config: {},
          },
          {
            type: 'email',
            config: {
              recipients: [process.env.ADMIN_EMAIL || 'admin@example.com'],
            },
          },
        ],
        cooldownMinutes: 15,
      },
      {
        id: 'high-response-time',
        name: 'High Response Time',
        type: 'high_response_time',
        threshold: 5000, // 5 seconds
        enabled: true,
        channels: [
          {
            type: 'console',
            config: {},
          },
        ],
        cooldownMinutes: 30,
      },
      {
        id: 'quota-exceeded',
        name: 'API Quota Exceeded',
        type: 'quota_exceeded',
        threshold: 90, // 90% of quota
        enabled: true,
        channels: [
          {
            type: 'console',
            config: {},
          },
        ],
        cooldownMinutes: 60,
      },
      {
        id: 'high-error-rate',
        name: 'High Error Rate',
        type: 'error_rate_high',
        threshold: 0.2, // 20% error rate
        enabled: true,
        channels: [
          {
            type: 'console',
            config: {},
          },
        ],
        cooldownMinutes: 20,
      },
    ];

    defaultRules.forEach(rule => {
      this.alertRules.set(rule.id, rule);
    });
  }

  private setupEventListeners(): void {
    this.healthMonitor.on('provider_down', (data) => {
      this.handleProviderDown(data);
    });

    this.healthMonitor.on('provider_recovered', (data) => {
      this.handleProviderRecovered(data);
    });

    // Check for other alert conditions periodically
    setInterval(() => {
      this.checkAlertConditions();
    }, 60000); // Every minute
  }

  private async handleProviderDown(data: any): Promise<void> {
    const rule = this.alertRules.get('provider-down');
    if (!rule?.enabled) return;

    const alertId = `provider-down-${data.source}`;
    
    // Check cooldown
    if (await this.isInCooldown(alertId, rule.cooldownMinutes)) {
      return;
    }

    const alert: Alert = {
      id: alertId,
      ruleId: rule.id,
      type: 'provider_down',
      severity: 'critical',
      message: `Provider ${data.name} (${data.source}) is down after ${data.consecutiveErrors} consecutive failures`,
      source: data.source,
      timestamp: new Date(),
      acknowledged: false,
      metadata: {
        consecutiveErrors: data.consecutiveErrors,
        providerName: data.name,
      },
    };

    await this.triggerAlert(alert, rule);
  }

  private async handleProviderRecovered(data: any): Promise<void> {
    const alertId = `provider-down-${data.source}`;
    const existingAlert = this.activeAlerts.get(alertId);
    
    if (existingAlert) {
      existingAlert.resolvedAt = new Date();
      await this.resolveAlert(alertId);
      
      logger.info(`Alert resolved: Provider ${data.name} recovered`, {
        alertId,
        responseTime: data.responseTime,
      });
    }
  }

  private async checkAlertConditions(): Promise<void> {
    const allHealth = await this.healthMonitor.getAllProviderHealth();
    
    for (const [source, health] of Object.entries(allHealth)) {
      await this.checkResponseTimeAlert(health);
      await this.checkQuotaAlert(health);
      await this.checkErrorRateAlert(health.source);
    }
  }

  private async checkResponseTimeAlert(health: any): Promise<void> {
    const rule = this.alertRules.get('high-response-time');
    if (!rule?.enabled || !rule.threshold) return;

    if (health.responseTime > rule.threshold) {
      const alertId = `high-response-time-${health.source}`;
      
      if (await this.isInCooldown(alertId, rule.cooldownMinutes)) {
        return;
      }

      const alert: Alert = {
        id: alertId,
        ruleId: rule.id,
        type: 'high_response_time',
        severity: 'medium',
        message: `Provider ${health.name} response time is ${health.responseTime}ms (threshold: ${rule.threshold}ms)`,
        source: health.source,
        timestamp: new Date(),
        acknowledged: false,
        metadata: {
          responseTime: health.responseTime,
          threshold: rule.threshold,
        },
      };

      await this.triggerAlert(alert, rule);
    }
  }

  private async checkQuotaAlert(health: any): Promise<void> {
    const rule = this.alertRules.get('quota-exceeded');
    if (!rule?.enabled || !rule.threshold) return;

    if (health.quota?.limit > 0) {
      const usagePercentage = (health.quota.used / health.quota.limit) * 100;
      
      if (usagePercentage > rule.threshold) {
        const alertId = `quota-exceeded-${health.source}`;
        
        if (await this.isInCooldown(alertId, rule.cooldownMinutes)) {
          return;
        }

        const alert: Alert = {
          id: alertId,
          ruleId: rule.id,
          type: 'quota_exceeded',
          severity: 'high',
          message: `Provider ${health.name} quota usage is ${usagePercentage.toFixed(1)}% (${health.quota.used}/${health.quota.limit})`,
          source: health.source,
          timestamp: new Date(),
          acknowledged: false,
          metadata: {
            usagePercentage,
            used: health.quota.used,
            limit: health.quota.limit,
          },
        };

        await this.triggerAlert(alert, rule);
      }
    }
  }

  private async checkErrorRateAlert(source: ListingSource): Promise<void> {
    const rule = this.alertRules.get('high-error-rate');
    if (!rule?.enabled || !rule.threshold) return;

    const metrics = await this.healthMonitor.getProviderMetrics(source);
    if (!metrics) return;

    if (metrics.errorRate > rule.threshold) {
      const alertId = `high-error-rate-${source}`;
      
      if (await this.isInCooldown(alertId, rule.cooldownMinutes)) {
        return;
      }

      const alert: Alert = {
        id: alertId,
        ruleId: rule.id,
        type: 'error_rate_high',
        severity: 'medium',
        message: `Provider ${source} error rate is ${(metrics.errorRate * 100).toFixed(1)}% (threshold: ${(rule.threshold * 100).toFixed(1)}%)`,
        source,
        timestamp: new Date(),
        acknowledged: false,
        metadata: {
          errorRate: metrics.errorRate,
          threshold: rule.threshold,
          requestCount: metrics.requestCount,
        },
      };

      await this.triggerAlert(alert, rule);
    }
  }

  private async triggerAlert(alert: Alert, rule: AlertRule): Promise<void> {
    this.activeAlerts.set(alert.id, alert);
    
    // Store in cache for persistence
    await this.cache.set(`alert:${alert.id}`, alert, 86400); // 24 hours
    await this.cache.set(`alert_cooldown:${alert.id}`, true, rule.cooldownMinutes * 60);
    
    logger.warn(`Alert triggered: ${alert.message}`, {
      alertId: alert.id,
      severity: alert.severity,
      source: alert.source,
    });

    // Send notifications through configured channels
    for (const channel of rule.channels) {
      await this.sendNotification(alert, channel);
    }

    this.emit('alert_triggered', alert);
  }

  private async sendNotification(alert: Alert, channel: AlertChannel): Promise<void> {
    try {
      switch (channel.type) {
        case 'console':
          console.log(`🚨 ALERT: ${alert.message}`);
          break;
          
        case 'email':
          // In production, integrate with email service
          logger.info(`Email alert would be sent to: ${channel.config.recipients?.join(', ')}`, {
            subject: `Alert: ${alert.type}`,
            message: alert.message,
          });
          break;
          
        case 'slack':
          // In production, integrate with Slack API
          logger.info(`Slack alert would be sent to: ${channel.config.slackChannel}`, {
            message: alert.message,
          });
          break;
          
        case 'webhook':
          // In production, send HTTP POST to webhook URL
          logger.info(`Webhook alert would be sent to: ${channel.config.webhookUrl}`, {
            alert,
          });
          break;
      }
    } catch (error) {
      logger.error(`Failed to send alert notification:`, error);
    }
  }

  private async isInCooldown(alertId: string, cooldownMinutes: number): Promise<boolean> {
    return !!(await this.cache.get(`alert_cooldown:${alertId}`));
  }

  private async resolveAlert(alertId: string): Promise<void> {
    const alert = this.activeAlerts.get(alertId);
    if (alert) {
      alert.resolvedAt = new Date();
      await this.cache.set(`alert:${alertId}`, alert, 86400);
      this.activeAlerts.delete(alertId);
      this.emit('alert_resolved', alert);
    }
  }

  // Public API methods
  async getActiveAlerts(): Promise<Alert[]> {
    return Array.from(this.activeAlerts.values());
  }

  async getAlertHistory(limit: number = 50): Promise<Alert[]> {
    // In production, this would query a database
    const alerts: Alert[] = [];
    const keys = await this.cache.get('alert_keys') || [];
    
    for (const key of keys.slice(0, limit)) {
      const alert = await this.cache.get(key);
      if (alert) alerts.push(alert);
    }
    
    return alerts.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  async acknowledgeAlert(alertId: string, acknowledgedBy: string): Promise<boolean> {
    const alert = this.activeAlerts.get(alertId);
    if (alert) {
      alert.acknowledged = true;
      alert.metadata.acknowledgedBy = acknowledgedBy;
      alert.metadata.acknowledgedAt = new Date();
      
      await this.cache.set(`alert:${alertId}`, alert, 86400);
      
      logger.info(`Alert acknowledged by ${acknowledgedBy}`, { alertId });
      return true;
    }
    return false;
  }

  async updateAlertRule(ruleId: string, updates: Partial<AlertRule>): Promise<boolean> {
    const rule = this.alertRules.get(ruleId);
    if (rule) {
      Object.assign(rule, updates);
      this.alertRules.set(ruleId, rule);
      logger.info(`Alert rule updated: ${ruleId}`, updates);
      return true;
    }
    return false;
  }

  async getAlertRules(): Promise<AlertRule[]> {
    return Array.from(this.alertRules.values());
  }
}