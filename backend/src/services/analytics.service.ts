import { Request } from 'express';
import { createClient } from 'redis';
import { logger } from '../utils/logger';
import { AppError } from '../utils/errors';

interface AnalyticsEvent {
  userId?: string;
  sessionId: string;
  eventType: string;
  eventName: string;
  properties: Record<string, any>;
  timestamp: Date;
  userAgent?: string;
  ipAddress?: string;
  referrer?: string;
  url?: string;
  tenantId?: string;
}

interface UserSegment {
  id: string;
  name: string;
  description: string;
  conditions: SegmentCondition[];
  createdAt: Date;
  updatedAt: Date;
}

interface SegmentCondition {
  field: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than' | 'in' | 'not_in';
  value: any;
}

interface FunnelStep {
  name: string;
  event: string;
  conditions?: Record<string, any>;
}

interface Funnel {
  id: string;
  name: string;
  steps: FunnelStep[];
  timeWindow: number; // hours
}

interface CohortAnalysis {
  cohortDate: string;
  totalUsers: number;
  retainedUsers: Record<string, number>; // period -> count
  retentionRates: Record<string, number>; // period -> percentage
}

export class AnalyticsService {
  private static redisClient = createClient({
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  });

  private static eventQueue: AnalyticsEvent[] = [];
  private static readonly BATCH_SIZE = 100;
  private static readonly FLUSH_INTERVAL = 5000; // 5 seconds

  static async initialize(): Promise<void> {
    try {
      await this.redisClient.connect();
      
      // Start the batch processing
      setInterval(() => {
        this.flushEventQueue();
      }, this.FLUSH_INTERVAL);

      logger.info('Analytics service initialized');
    } catch (error) {
      logger.error('Failed to initialize analytics service:', error);
      throw new AppError('Analytics service initialization failed', 500);
    }
  }

  // Event Tracking
  static async trackEvent(
    eventName: string,
    properties: Record<string, any> = {},
    req?: Request,
    userId?: string
  ): Promise<void> {
    try {
      const event: AnalyticsEvent = {
        userId,
        sessionId: this.getSessionId(req),
        eventType: 'track',
        eventName,
        properties: {
          ...properties,
          timestamp: new Date().toISOString(),
        },
        timestamp: new Date(),
        userAgent: req?.get('User-Agent'),
        ipAddress: this.getClientIP(req),
        referrer: req?.get('Referer'),
        url: req?.originalUrl,
        tenantId: (req as any)?.tenant?.id,
      };

      // Add to queue for batch processing
      this.eventQueue.push(event);

      // Immediate flush if queue is full
      if (this.eventQueue.length >= this.BATCH_SIZE) {
        await this.flushEventQueue();
      }

      // Update real-time metrics
      await this.updateRealTimeMetrics(event);
    } catch (error) {
      logger.error('Failed to track event:', error);
    }
  }

  static async trackPageView(
    page: string,
    properties: Record<string, any> = {},
    req?: Request,
    userId?: string
  ): Promise<void> {
    await this.trackEvent('page_view', {
      page,
      ...properties,
    }, req, userId);
  }

  static async trackUserAction(
    action: string,
    target: string,
    properties: Record<string, any> = {},
    req?: Request,
    userId?: string
  ): Promise<void> {
    await this.trackEvent('user_action', {
      action,
      target,
      ...properties,
    }, req, userId);
  }

  static async trackBusinessEvent(
    event: string,
    properties: Record<string, any> = {},
    req?: Request,
    userId?: string
  ): Promise<void> {
    await this.trackEvent('business_event', {
      event,
      ...properties,
    }, req, userId);
  }

  // User Segmentation
  static async createUserSegment(
    name: string,
    description: string,
    conditions: SegmentCondition[]
  ): Promise<UserSegment> {
    const segment: UserSegment = {
      id: `segment_${Date.now()}`,
      name,
      description,
      conditions,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await this.redisClient.hSet(
      'analytics:segments',
      segment.id,
      JSON.stringify(segment)
    );

    // Calculate initial segment members
    await this.calculateSegmentMembers(segment.id);

    return segment;
  }

  static async getUserSegments(userId: string): Promise<string[]> {
    const userSegments = await this.redisClient.sMembers(`analytics:user_segments:${userId}`);
    return userSegments;
  }

  static async getSegmentUsers(segmentId: string, limit = 100, offset = 0): Promise<string[]> {
    const users = await this.redisClient.zRange(
      `analytics:segment_users:${segmentId}`,
      offset,
      offset + limit - 1
    );
    return users;
  }

  // Funnel Analysis
  static async createFunnel(
    name: string,
    steps: FunnelStep[],
    timeWindow = 24
  ): Promise<Funnel> {
    const funnel: Funnel = {
      id: `funnel_${Date.now()}`,
      name,
      steps,
      timeWindow,
    };

    await this.redisClient.hSet(
      'analytics:funnels',
      funnel.id,
      JSON.stringify(funnel)
    );

    return funnel;
  }

  static async analyzeFunnel(
    funnelId: string,
    startDate: Date,
    endDate: Date,
    segmentId?: string
  ): Promise<any> {
    const funnelData = await this.redisClient.hGet('analytics:funnels', funnelId);
    if (!funnelData) {
      throw new AppError('Funnel not found', 404);
    }

    const funnel: Funnel = JSON.parse(funnelData);
    const results = {
      funnelId,
      name: funnel.name,
      steps: [] as any[],
      conversionRates: [] as number[],
      totalUsers: 0,
    };

    // Analyze each step
    for (let i = 0; i < funnel.steps.length; i++) {
      const step = funnel.steps[i];
      const stepUsers = await this.getStepUsers(step, startDate, endDate, segmentId);
      
      // For subsequent steps, filter users who completed previous steps
      let filteredUsers = stepUsers;
      if (i > 0) {
        const previousStepUsers = results.steps[i - 1].users;
        filteredUsers = stepUsers.filter(userId => previousStepUsers.includes(userId));
      }

      const stepResult = {
        name: step.name,
        event: step.event,
        userCount: filteredUsers.length,
        users: filteredUsers,
        conversionRate: i === 0 ? 100 : (filteredUsers.length / results.steps[0].userCount) * 100,
      };

      results.steps.push(stepResult);
      results.conversionRates.push(stepResult.conversionRate);

      if (i === 0) {
        results.totalUsers = stepResult.userCount;
      }
    }

    return results;
  }

  // Cohort Analysis
  static async performCohortAnalysis(
    startDate: Date,
    endDate: Date,
    periods: string[] = ['1d', '7d', '30d', '90d']
  ): Promise<CohortAnalysis[]> {
    const cohorts: CohortAnalysis[] = [];
    const current = new Date(startDate);

    while (current <= endDate) {
      const cohortDate = current.toISOString().split('T')[0];
      const cohortUsers = await this.getCohortUsers(cohortDate);
      
      const retainedUsers: Record<string, number> = {};
      const retentionRates: Record<string, number> = {};

      for (const period of periods) {
        const retainedCount = await this.getRetainedUsers(cohortDate, period);
        retainedUsers[period] = retainedCount;
        retentionRates[period] = cohortUsers.length > 0 ? (retainedCount / cohortUsers.length) * 100 : 0;
      }

      cohorts.push({
        cohortDate,
        totalUsers: cohortUsers.length,
        retainedUsers,
        retentionRates,
      });

      // Move to next day
      current.setDate(current.getDate() + 1);
    }

    return cohorts;
  }

  // Real-time Analytics
  static async getRealTimeMetrics(): Promise<any> {
    const [
      activeUsers,
      currentPageViews,
      topPages,
      topEvents,
      conversions,
    ] = await Promise.all([
      this.redisClient.sCard('analytics:active_users'),
      this.redisClient.get('analytics:current_page_views'),
      this.redisClient.zRevRange('analytics:top_pages', 0, 9, { WITHSCORES: true }),
      this.redisClient.zRevRange('analytics:top_events', 0, 9, { WITHSCORES: true }),
      this.redisClient.get('analytics:conversions'),
    ]);

    return {
      activeUsers: parseInt(activeUsers.toString()) || 0,
      currentPageViews: parseInt(currentPageViews || '0'),
      topPages: this.formatZRangeResult(topPages),
      topEvents: this.formatZRangeResult(topEvents),
      conversions: parseInt(conversions || '0'),
      timestamp: new Date(),
    };
  }

  // Custom Reports
  static async generateCustomReport(
    metrics: string[],
    dimensions: string[],
    filters: Record<string, any> = {},
    startDate: Date,
    endDate: Date
  ): Promise<any> {
    const reportId = `report_${Date.now()}`;
    
    // This would typically involve complex aggregation queries
    // For now, we'll return a simplified structure
    const report = {
      id: reportId,
      metrics,
      dimensions,
      filters,
      dateRange: { startDate, endDate },
      data: [],
      generatedAt: new Date(),
    };

    // Store report for caching
    await this.redisClient.setEx(
      `analytics:reports:${reportId}`,
      3600, // 1 hour cache
      JSON.stringify(report)
    );

    return report;
  }

  // A/B Testing Integration
  static async trackExperiment(
    experimentId: string,
    variant: string,
    userId: string,
    conversionEvent?: string
  ): Promise<void> {
    // Track experiment exposure
    await this.trackEvent('experiment_exposure', {
      experimentId,
      variant,
      conversionEvent,
    }, undefined, userId);

    // Store user variant assignment
    await this.redisClient.hSet(
      `analytics:experiments:${experimentId}`,
      userId,
      variant
    );

    if (conversionEvent) {
      await this.redisClient.sAdd(
        `analytics:experiment_conversions:${experimentId}:${variant}`,
        userId
      );
    }
  }

  static async getExperimentResults(experimentId: string): Promise<any> {
    const variants = await this.redisClient.hGetAll(`analytics:experiments:${experimentId}`);
    const results: Record<string, any> = {};

    for (const [userId, variant] of Object.entries(variants)) {
      if (!results[variant]) {
        results[variant] = {
          exposures: 0,
          conversions: 0,
          conversionRate: 0,
        };
      }
      results[variant].exposures++;
    }

    // Calculate conversions for each variant
    for (const variant of Object.keys(results)) {
      const conversions = await this.redisClient.sCard(
        `analytics:experiment_conversions:${experimentId}:${variant}`
      );
      results[variant].conversions = conversions;
      results[variant].conversionRate = 
        results[variant].exposures > 0 
          ? (conversions / results[variant].exposures) * 100 
          : 0;
    }

    return results;
  }

  // Helper Methods
  private static async flushEventQueue(): Promise<void> {
    if (this.eventQueue.length === 0) return;

    const events = this.eventQueue.splice(0);
    
    try {
      // In a real implementation, you would batch insert these into your analytics database
      // For now, we'll just log them
      logger.info(`Flushing ${events.length} analytics events`);
      
      // Store events in Redis for short-term access
      const pipeline = this.redisClient.multi();
      
      for (const event of events) {
        pipeline.lPush(
          `analytics:events:${event.eventName}`,
          JSON.stringify(event)
        );
        pipeline.lTrim(`analytics:events:${event.eventName}`, 0, 999); // Keep last 1000
      }
      
      await pipeline.exec();
    } catch (error) {
      logger.error('Failed to flush event queue:', error);
      // Re-add events back to queue for retry
      this.eventQueue.unshift(...events);
    }
  }

  private static async updateRealTimeMetrics(event: AnalyticsEvent): Promise<void> {
    const pipeline = this.redisClient.multi();
    
    // Track active users (24-hour window)
    if (event.userId) {
      pipeline.sAdd('analytics:active_users', event.userId);
      pipeline.expire('analytics:active_users', 86400); // 24 hours
    }

    // Track page views
    if (event.eventName === 'page_view') {
      pipeline.incr('analytics:current_page_views');
      pipeline.expire('analytics:current_page_views', 300); // 5 minutes
      
      if (event.properties.page) {
        pipeline.zIncrBy('analytics:top_pages', 1, event.properties.page);
      }
    }

    // Track top events
    pipeline.zIncrBy('analytics:top_events', 1, event.eventName);

    // Track conversions
    if (event.eventName === 'reservation_completed' || event.eventName === 'purchase') {
      pipeline.incr('analytics:conversions');
      pipeline.expire('analytics:conversions', 86400); // 24 hours
    }

    await pipeline.exec();
  }

  private static getSessionId(req?: Request): string {
    // In a real implementation, you would extract this from session or generate one
    return req?.sessionID || `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private static getClientIP(req?: Request): string | undefined {
    if (!req) return undefined;
    
    return (
      req.ip ||
      req.connection?.remoteAddress ||
      req.socket?.remoteAddress ||
      (req.connection as any)?.socket?.remoteAddress
    );
  }

  private static async calculateSegmentMembers(segmentId: string): Promise<void> {
    // This would involve querying your user database based on segment conditions
    // For now, we'll just create an empty set
    await this.redisClient.del(`analytics:segment_users:${segmentId}`);
  }

  private static async getStepUsers(
    step: FunnelStep,
    startDate: Date,
    endDate: Date,
    segmentId?: string
  ): Promise<string[]> {
    // This would query your analytics data for users who completed this step
    // For now, return mock data
    return [`user_1`, `user_2`, `user_3`];
  }

  private static async getCohortUsers(cohortDate: string): Promise<string[]> {
    // This would query for users who first used the app on this date
    return [`user_1`, `user_2`];
  }

  private static async getRetainedUsers(cohortDate: string, period: string): Promise<number> {
    // This would calculate how many users from the cohort returned after the period
    return Math.floor(Math.random() * 10);
  }

  private static formatZRangeResult(result: any[]): Array<{ name: string; count: number }> {
    const formatted: Array<{ name: string; count: number }> = [];
    
    for (let i = 0; i < result.length; i += 2) {
      formatted.push({
        name: result[i],
        count: parseInt(result[i + 1]),
      });
    }
    
    return formatted;
  }
}