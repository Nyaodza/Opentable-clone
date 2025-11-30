import { Service } from 'typedi';
import { Op } from 'sequelize';
import * as crypto from 'crypto';
import { Redis } from 'ioredis';
import Queue from 'bull';
import axios from 'axios';
import * as jwt from 'jsonwebtoken';
import { RateLimiterRedis } from 'rate-limiter-flexible';

interface Integration {
  integrationId: string;
  name: string;
  category: 'pos' | 'payment' | 'marketing' | 'analytics' | 'crm' | 'accounting' | 'delivery' | 'social';
  developer: {
    name: string;
    id: string;
    verified: boolean;
    supportEmail: string;
    website: string;
  };
  description: {
    short: string;
    long: string;
    features: string[];
    benefits: string[];
    useCases: string[];
  };
  pricing: {
    model: 'free' | 'freemium' | 'subscription' | 'usage' | 'one_time';
    free: boolean;
    plans?: {
      name: string;
      price: number;
      period?: 'monthly' | 'yearly';
      features: string[];
      limits?: Record<string, number>;
    }[];
  };
  technical: {
    apiType: 'rest' | 'graphql' | 'webhook' | 'oauth' | 'custom';
    authMethod: 'api_key' | 'oauth2' | 'jwt' | 'basic' | 'custom';
    webhooks: {
      event: string;
      description: string;
      payload: any;
    }[];
    permissions: string[];
    dataAccess: string[];
    rateLimit: {
      requests: number;
      period: 'second' | 'minute' | 'hour' | 'day';
    };
  };
  compliance: {
    gdprCompliant: boolean;
    ccpaCompliant: boolean;
    pciCompliant: boolean;
    hipaaCompliant: boolean;
    soc2Certified: boolean;
    iso27001Certified: boolean;
    dataRetention: string;
    dataLocation: string[];
  };
  media: {
    logo: string;
    banner: string;
    screenshots: string[];
    videos: string[];
  };
  status: 'draft' | 'pending_review' | 'approved' | 'active' | 'suspended' | 'deprecated';
  analytics: {
    installs: number;
    activeUsers: number;
    rating: number;
    reviews: number;
    revenue: number;
  };
  version: {
    current: string;
    changelog: {
      version: string;
      date: Date;
      changes: string[];
    }[];
    deprecations: {
      feature: string;
      deprecatedIn: string;
      removedIn?: string;
      replacement?: string;
    }[];
  };
}

interface Installation {
  installationId: string;
  integrationId: string;
  restaurantId: string;
  userId: string;
  config: {
    apiKey?: string;
    accessToken?: string;
    refreshToken?: string;
    webhookUrl?: string;
    settings: Record<string, any>;
    mappings: Record<string, string>;
  };
  permissions: {
    granted: string[];
    denied: string[];
    requestedAt: Date;
    grantedAt?: Date;
  };
  status: 'active' | 'paused' | 'error' | 'uninstalled';
  health: {
    status: 'healthy' | 'degraded' | 'unhealthy';
    lastCheck: Date;
    errorCount: number;
    successRate: number;
    averageResponseTime: number;
  };
  usage: {
    apiCalls: number;
    dataTransferred: number;
    lastUsed: Date;
    monthlyUsage: Record<string, number>;
  };
  billing: {
    plan: string;
    status: 'active' | 'trial' | 'expired' | 'cancelled';
    trialEndsAt?: Date;
    nextBillingDate?: Date;
    amount?: number;
  };
  installedAt: Date;
  updatedAt: Date;
}

interface WebhookEvent {
  eventId: string;
  installationId: string;
  type: string;
  payload: any;
  attempts: number;
  status: 'pending' | 'delivered' | 'failed' | 'retrying';
  deliveredAt?: Date;
  nextRetry?: Date;
  errors: {
    timestamp: Date;
    status: number;
    message: string;
  }[];
}

interface DeveloperAccount {
  developerId: string;
  name: string;
  email: string;
  company?: string;
  integrations: string[];
  apiKeys: {
    key: string;
    name: string;
    permissions: string[];
    createdAt: Date;
    lastUsed?: Date;
    expiresAt?: Date;
  }[];
  billing: {
    stripeCustomerId?: string;
    paymentMethod?: string;
    revenue: number;
    pendingPayout: number;
    payoutSchedule: 'weekly' | 'monthly';
  };
  verification: {
    emailVerified: boolean;
    phoneVerified: boolean;
    businessVerified: boolean;
    documentsSubmitted: string[];
  };
  analytics: {
    totalInstalls: number;
    activeInstalls: number;
    revenue: number;
    averageRating: number;
  };
  status: 'pending' | 'active' | 'suspended' | 'banned';
}

interface MarketplaceReview {
  reviewId: string;
  integrationId: string;
  restaurantId: string;
  userId: string;
  rating: number;
  title: string;
  content: string;
  pros: string[];
  cons: string[];
  verified: boolean;
  helpful: number;
  notHelpful: number;
  developerResponse?: {
    content: string;
    timestamp: Date;
  };
  createdAt: Date;
  updatedAt: Date;
}

@Service()
export class IntegrationMarketplaceService {
  private redis: Redis;
  private webhookQueue: Queue.Queue;
  private healthCheckQueue: Queue.Queue;
  private rateLimiter: RateLimiterRedis;

  constructor() {
    this.redis = new Redis(process.env.REDIS_URL);

    this.webhookQueue = new Queue('webhook-delivery', process.env.REDIS_URL!);
    this.healthCheckQueue = new Queue('integration-health', process.env.REDIS_URL!);

    this.rateLimiter = new RateLimiterRedis({
      storeClient: this.redis,
      keyPrefix: 'integration_ratelimit',
      points: 100,
      duration: 60
    });

    this.setupQueueProcessors();
  }

  private setupQueueProcessors(): void {
    // Process webhook delivery
    this.webhookQueue.process(async (job) => {
      const { event } = job.data;
      return await this.deliverWebhook(event);
    });

    // Process health checks
    this.healthCheckQueue.process(async (job) => {
      const { installationId } = job.data;
      return await this.performHealthCheck(installationId);
    });

    // Schedule regular health checks
    this.scheduleHealthChecks();
  }

  private scheduleHealthChecks(): void {
    setInterval(async () => {
      const activeInstallations = await this.getActiveInstallations();

      for (const installation of activeInstallations) {
        await this.healthCheckQueue.add(
          'check-health',
          { installationId: installation.installationId },
          { delay: Math.random() * 60000 } // Spread checks over 1 minute
        );
      }
    }, 300000); // Every 5 minutes
  }

  async createIntegration(
    developerId: string,
    integration: Partial<Integration>
  ): Promise<Integration> {
    const integrationId = `int_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;

    const fullIntegration: Integration = {
      integrationId,
      name: integration.name!,
      category: integration.category!,
      developer: integration.developer!,
      description: integration.description!,
      pricing: integration.pricing!,
      technical: integration.technical!,
      compliance: {
        gdprCompliant: false,
        ccpaCompliant: false,
        pciCompliant: false,
        hipaaCompliant: false,
        soc2Certified: false,
        iso27001Certified: false,
        dataRetention: '90 days',
        dataLocation: ['us-east-1'],
        ...integration.compliance
      },
      media: integration.media!,
      status: 'pending_review',
      analytics: {
        installs: 0,
        activeUsers: 0,
        rating: 0,
        reviews: 0,
        revenue: 0
      },
      version: {
        current: '1.0.0',
        changelog: [],
        deprecations: [],
        ...integration.version
      }
    };

    // Store integration
    await this.redis.set(
      `integration:${integrationId}`,
      JSON.stringify(fullIntegration)
    );

    // Add to developer's integrations
    await this.redis.sadd(`developer:${developerId}:integrations`, integrationId);

    // Add to marketplace index
    await this.redis.zadd(
      `marketplace:${integration.category}`,
      Date.now(),
      integrationId
    );

    // Start review process
    await this.submitForReview(integrationId);

    return fullIntegration;
  }

  private async submitForReview(integrationId: string): Promise<void> {
    // Automated review checks
    const checks = await this.performAutomatedChecks(integrationId);

    if (checks.passed) {
      // Auto-approve if all checks pass
      await this.updateIntegrationStatus(integrationId, 'approved');
    } else {
      // Queue for manual review
      await this.redis.lpush('review:queue', integrationId);
    }
  }

  private async performAutomatedChecks(integrationId: string): Promise<{
    passed: boolean;
    issues: string[];
  }> {
    const integration = await this.getIntegration(integrationId);
    const issues: string[] = [];

    // Check required fields
    if (!integration.description.long || integration.description.long.length < 100) {
      issues.push('Description too short');
    }

    // Check API documentation
    if (!integration.technical.webhooks || integration.technical.webhooks.length === 0) {
      issues.push('No webhooks defined');
    }

    // Check compliance
    if (!integration.compliance.gdprCompliant && !integration.compliance.ccpaCompliant) {
      issues.push('No privacy compliance');
    }

    // Check security
    if (integration.technical.authMethod === 'basic') {
      issues.push('Basic auth not recommended');
    }

    return {
      passed: issues.length === 0,
      issues
    };
  }

  private async updateIntegrationStatus(
    integrationId: string,
    status: Integration['status']
  ): Promise<void> {
    const integration = await this.getIntegration(integrationId);
    integration.status = status;

    await this.redis.set(
      `integration:${integrationId}`,
      JSON.stringify(integration)
    );

    // Notify developer
    await this.notifyDeveloper(integration.developer.id, {
      type: 'status_change',
      integrationId,
      status
    });
  }

  private async getIntegration(integrationId: string): Promise<Integration> {
    const data = await this.redis.get(`integration:${integrationId}`);
    return JSON.parse(data!);
  }

  async installIntegration(
    restaurantId: string,
    integrationId: string,
    userId: string,
    config: Installation['config']
  ): Promise<Installation> {
    // Check if already installed
    const existing = await this.redis.get(
      `installation:${restaurantId}:${integrationId}`
    );

    if (existing) {
      throw new Error('Integration already installed');
    }

    const installationId = `inst_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;

    const installation: Installation = {
      installationId,
      integrationId,
      restaurantId,
      userId,
      config,
      permissions: {
        granted: [],
        denied: [],
        requestedAt: new Date()
      },
      status: 'active',
      health: {
        status: 'healthy',
        lastCheck: new Date(),
        errorCount: 0,
        successRate: 100,
        averageResponseTime: 0
      },
      usage: {
        apiCalls: 0,
        dataTransferred: 0,
        lastUsed: new Date(),
        monthlyUsage: {}
      },
      billing: {
        plan: 'trial',
        status: 'trial',
        trialEndsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
      },
      installedAt: new Date(),
      updatedAt: new Date()
    };

    // Store installation
    await this.redis.set(
      `installation:${installationId}`,
      JSON.stringify(installation)
    );

    // Create reverse mapping
    await this.redis.set(
      `installation:${restaurantId}:${integrationId}`,
      installationId
    );

    // Add to restaurant's installations
    await this.redis.sadd(`restaurant:${restaurantId}:integrations`, installationId);

    // Update integration analytics
    await this.incrementIntegrationMetric(integrationId, 'installs');

    // Set up webhooks
    await this.setupWebhooks(installation);

    // Send installation event
    await this.sendWebhookEvent(installationId, 'integration.installed', {
      restaurantId,
      userId,
      timestamp: new Date()
    });

    return installation;
  }

  private async setupWebhooks(installation: Installation): Promise<void> {
    const integration = await this.getIntegration(installation.integrationId);

    // Register webhook endpoint
    if (installation.config.webhookUrl) {
      await this.redis.set(
        `webhook:${installation.installationId}`,
        installation.config.webhookUrl
      );
    }

    // Subscribe to relevant events
    for (const webhook of integration.technical.webhooks) {
      await this.redis.sadd(
        `webhook:subscribers:${webhook.event}`,
        installation.installationId
      );
    }
  }

  async sendWebhookEvent(
    installationId: string,
    eventType: string,
    payload: any
  ): Promise<void> {
    const eventId = `evt_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;

    const event: WebhookEvent = {
      eventId,
      installationId,
      type: eventType,
      payload,
      attempts: 0,
      status: 'pending',
      errors: []
    };

    // Queue for delivery
    await this.webhookQueue.add(
      'deliver-webhook',
      { event },
      {
        attempts: 5,
        backoff: {
          type: 'exponential',
          delay: 2000
        }
      }
    );

    // Store event
    await this.redis.set(
      `webhook:event:${eventId}`,
      JSON.stringify(event),
      'EX',
      86400 * 7 // 7 days
    );
  }

  private async deliverWebhook(event: WebhookEvent): Promise<void> {
    const webhookUrl = await this.redis.get(`webhook:${event.installationId}`);
    if (!webhookUrl) {
      throw new Error('No webhook URL configured');
    }

    event.attempts++;

    try {
      // Sign webhook payload
      const signature = this.signWebhookPayload(event);

      const response = await axios.post(webhookUrl, event.payload, {
        headers: {
          'X-Webhook-Signature': signature,
          'X-Webhook-Event': event.type,
          'X-Webhook-Event-Id': event.eventId,
          'X-Webhook-Timestamp': Date.now().toString()
        },
        timeout: 10000
      });

      if (response.status >= 200 && response.status < 300) {
        event.status = 'delivered';
        event.deliveredAt = new Date();
      } else {
        throw new Error(`Webhook delivery failed with status ${response.status}`);
      }
    } catch (error: any) {
      event.errors.push({
        timestamp: new Date(),
        status: error.response?.status || 0,
        message: error.message
      });

      if (event.attempts >= 5) {
        event.status = 'failed';
      } else {
        event.status = 'retrying';
        event.nextRetry = new Date(Date.now() + Math.pow(2, event.attempts) * 1000);
      }

      throw error;
    } finally {
      // Update event
      await this.redis.set(
        `webhook:event:${event.eventId}`,
        JSON.stringify(event),
        'EX',
        86400 * 7
      );
    }
  }

  private signWebhookPayload(event: WebhookEvent): string {
    const secret = process.env.WEBHOOK_SECRET!;
    const payload = JSON.stringify({
      eventId: event.eventId,
      type: event.type,
      payload: event.payload,
      timestamp: Date.now()
    });

    return crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');
  }

  async callIntegrationAPI(
    installationId: string,
    endpoint: string,
    method: string,
    data?: any
  ): Promise<any> {
    // Rate limiting
    try {
      await this.rateLimiter.consume(installationId);
    } catch (error) {
      throw new Error('Rate limit exceeded');
    }

    const installation = await this.getInstallation(installationId);
    const integration = await this.getIntegration(installation.integrationId);

    // Build request
    const headers: any = {};

    switch (integration.technical.authMethod) {
      case 'api_key':
        headers['X-API-Key'] = installation.config.apiKey;
        break;
      case 'oauth2':
        headers['Authorization'] = `Bearer ${installation.config.accessToken}`;
        break;
      case 'jwt':
        const token = this.generateJWT(installation);
        headers['Authorization'] = `Bearer ${token}`;
        break;
      case 'basic':
        const auth = Buffer.from(
          `${installation.config.apiKey}:${installation.config.settings.apiSecret}`
        ).toString('base64');
        headers['Authorization'] = `Basic ${auth}`;
        break;
    }

    try {
      const startTime = Date.now();

      const response = await axios({
        method,
        url: endpoint,
        data,
        headers,
        timeout: 30000
      });

      // Track usage
      await this.trackUsage(installationId, {
        apiCalls: 1,
        dataTransferred: JSON.stringify(response.data).length,
        responseTime: Date.now() - startTime
      });

      return response.data;
    } catch (error: any) {
      // Track error
      await this.trackError(installationId, error);
      throw error;
    }
  }

  private generateJWT(installation: Installation): string {
    return jwt.sign(
      {
        installationId: installation.installationId,
        restaurantId: installation.restaurantId,
        permissions: installation.permissions.granted
      },
      process.env.JWT_SECRET!,
      { expiresIn: '1h' }
    );
  }

  private async getInstallation(installationId: string): Promise<Installation> {
    const data = await this.redis.get(`installation:${installationId}`);
    return JSON.parse(data!);
  }

  private async trackUsage(
    installationId: string,
    usage: {
      apiCalls: number;
      dataTransferred: number;
      responseTime: number;
    }
  ): Promise<void> {
    const installation = await this.getInstallation(installationId);

    installation.usage.apiCalls += usage.apiCalls;
    installation.usage.dataTransferred += usage.dataTransferred;
    installation.usage.lastUsed = new Date();

    // Update monthly usage
    const month = new Date().toISOString().substring(0, 7);
    installation.usage.monthlyUsage[month] =
      (installation.usage.monthlyUsage[month] || 0) + usage.apiCalls;

    // Update health metrics
    installation.health.averageResponseTime =
      (installation.health.averageResponseTime + usage.responseTime) / 2;

    await this.redis.set(
      `installation:${installationId}`,
      JSON.stringify(installation)
    );
  }

  private async trackError(installationId: string, error: any): Promise<void> {
    const installation = await this.getInstallation(installationId);

    installation.health.errorCount++;
    installation.health.successRate =
      (installation.usage.apiCalls - installation.health.errorCount) /
      installation.usage.apiCalls * 100;

    if (installation.health.errorCount > 10) {
      installation.health.status = 'unhealthy';
    } else if (installation.health.errorCount > 5) {
      installation.health.status = 'degraded';
    }

    await this.redis.set(
      `installation:${installationId}`,
      JSON.stringify(installation)
    );
  }

  private async performHealthCheck(installationId: string): Promise<void> {
    const installation = await this.getInstallation(installationId);

    try {
      // Perform a simple API call to check connectivity
      await this.callIntegrationAPI(installationId, '/health', 'GET');

      installation.health.status = 'healthy';
      installation.health.errorCount = 0;
    } catch (error) {
      installation.health.errorCount++;

      if (installation.health.errorCount > 10) {
        installation.health.status = 'unhealthy';
        installation.status = 'error';
      }
    }

    installation.health.lastCheck = new Date();

    await this.redis.set(
      `installation:${installationId}`,
      JSON.stringify(installation)
    );
  }

  private async getActiveInstallations(): Promise<Installation[]> {
    // Get all active installations
    const keys = await this.redis.keys('installation:inst_*');
    const installations: Installation[] = [];

    for (const key of keys) {
      const data = await this.redis.get(key);
      if (data) {
        const installation = JSON.parse(data);
        if (installation.status === 'active') {
          installations.push(installation);
        }
      }
    }

    return installations;
  }

  async searchIntegrations(
    category?: string,
    query?: string,
    filters?: {
      pricing?: 'free' | 'paid';
      compliance?: string[];
      rating?: number;
    }
  ): Promise<Integration[]> {
    let integrationIds: string[] = [];

    if (category) {
      integrationIds = await this.redis.zrange(
        `marketplace:${category}`,
        0,
        -1
      );
    } else {
      // Get all categories
      const categories = ['pos', 'payment', 'marketing', 'analytics', 'crm', 'accounting', 'delivery', 'social'];
      for (const cat of categories) {
        const ids = await this.redis.zrange(`marketplace:${cat}`, 0, -1);
        integrationIds.push(...ids);
      }
    }

    const integrations: Integration[] = [];

    for (const id of integrationIds) {
      const data = await this.redis.get(`integration:${id}`);
      if (data) {
        const integration = JSON.parse(data);

        // Apply filters
        if (filters?.pricing) {
          if (filters.pricing === 'free' && !integration.pricing.free) continue;
          if (filters.pricing === 'paid' && integration.pricing.free) continue;
        }

        if (filters?.compliance) {
          const hasCompliance = filters.compliance.every(c =>
            integration.compliance[`${c}Compliant`] === true
          );
          if (!hasCompliance) continue;
        }

        if (filters?.rating && integration.analytics.rating < filters.rating) {
          continue;
        }

        // Text search
        if (query) {
          const searchText = `${integration.name} ${integration.description.short} ${integration.description.long}`.toLowerCase();
          if (!searchText.includes(query.toLowerCase())) continue;
        }

        integrations.push(integration);
      }
    }

    return integrations;
  }

  async createReview(
    integrationId: string,
    restaurantId: string,
    userId: string,
    review: Partial<MarketplaceReview>
  ): Promise<MarketplaceReview> {
    const reviewId = `rev_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;

    const fullReview: MarketplaceReview = {
      reviewId,
      integrationId,
      restaurantId,
      userId,
      rating: review.rating!,
      title: review.title!,
      content: review.content!,
      pros: review.pros || [],
      cons: review.cons || [],
      verified: await this.verifyPurchase(restaurantId, integrationId),
      helpful: 0,
      notHelpful: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Store review
    await this.redis.set(
      `review:${reviewId}`,
      JSON.stringify(fullReview)
    );

    // Add to integration's reviews
    await this.redis.zadd(
      `integration:${integrationId}:reviews`,
      Date.now(),
      reviewId
    );

    // Update integration rating
    await this.updateIntegrationRating(integrationId);

    return fullReview;
  }

  private async verifyPurchase(
    restaurantId: string,
    integrationId: string
  ): Promise<boolean> {
    const installationId = await this.redis.get(
      `installation:${restaurantId}:${integrationId}`
    );
    return !!installationId;
  }

  private async updateIntegrationRating(integrationId: string): Promise<void> {
    const reviewIds = await this.redis.zrange(
      `integration:${integrationId}:reviews`,
      0,
      -1
    );

    let totalRating = 0;
    let count = 0;

    for (const reviewId of reviewIds) {
      const data = await this.redis.get(`review:${reviewId}`);
      if (data) {
        const review = JSON.parse(data);
        totalRating += review.rating;
        count++;
      }
    }

    const integration = await this.getIntegration(integrationId);
    integration.analytics.rating = count > 0 ? totalRating / count : 0;
    integration.analytics.reviews = count;

    await this.redis.set(
      `integration:${integrationId}`,
      JSON.stringify(integration)
    );
  }

  private async incrementIntegrationMetric(
    integrationId: string,
    metric: keyof Integration['analytics']
  ): Promise<void> {
    const integration = await this.getIntegration(integrationId);
    integration.analytics[metric]++;

    await this.redis.set(
      `integration:${integrationId}`,
      JSON.stringify(integration)
    );
  }

  private async notifyDeveloper(
    developerId: string,
    notification: any
  ): Promise<void> {
    await this.redis.lpush(
      `developer:${developerId}:notifications`,
      JSON.stringify({
        ...notification,
        timestamp: new Date()
      })
    );
  }
}