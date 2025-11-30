import { sequelize } from '../../config/database';
import { CacheManager } from '../../config/redis';
import { logger } from '../../utils/logger';
import { ServiceType, ListingSource } from '../../models/UnifiedListing';
import { Op, QueryTypes } from 'sequelize';

export interface ViewEvent {
  listingId: string;
  userId?: string;
  sessionId?: string;
  ipAddress?: string;
  userAgent?: string;
  referrer?: string;
  searchQuery?: any;
  viewDuration?: number;
  deviceType?: 'desktop' | 'mobile' | 'tablet';
  location?: {
    country?: string;
    city?: string;
    region?: string;
  };
}

export interface SearchEvent {
  userId?: string;
  sessionId?: string;
  serviceType: ServiceType;
  searchParams: any;
  resultsCount: number;
  localResults: number;
  apiResults: Record<string, number>;
  responseTime: number;
  ipAddress?: string;
  userAgent?: string;
}

export interface ProviderMetrics {
  source: ListingSource;
  serviceType: ServiceType;
  requestCount: number;
  successCount: number;
  errorCount: number;
  avgResponseTime: number;
  totalResults: number;
  uniqueResults: number;
  clicksReceived: number;
  bookingsReceived: number;
  revenue: number;
}

export interface AnalyticsSummary {
  totalViews: number;
  uniqueViews: number;
  totalSearches: number;
  avgResponseTime: number;
  topServiceTypes: Array<{ serviceType: ServiceType; count: number }>;
  topProviders: Array<{ source: ListingSource; performance: number }>;
  conversionRate: number;
  revenue: number;
  period: {
    from: Date;
    to: Date;
  };
}

export class AnalyticsService {
  private static instance: AnalyticsService;
  private cache: CacheManager;
  private batchQueue: Array<any> = [];
  private batchTimer?: NodeJS.Timeout;
  private readonly BATCH_SIZE = 100;
  private readonly BATCH_INTERVAL = 10000; // 10 seconds

  private constructor() {
    this.cache = CacheManager.getInstance();
    this.startBatchProcessor();
  }

  static getInstance(): AnalyticsService {
    if (!AnalyticsService.instance) {
      AnalyticsService.instance = new AnalyticsService();
    }
    return AnalyticsService.instance;
  }

  /**
   * Track a listing view event
   */
  async trackView(event: ViewEvent): Promise<void> {
    try {
      // Add to batch queue for processing
      this.batchQueue.push({
        type: 'view',
        data: {
          ...event,
          timestamp: new Date(),
        },
      });

      // Update real-time counters in cache
      const cacheKey = `listing_views:${event.listingId}:${this.getDateKey()}`;
      await this.cache.incr(cacheKey, 86400); // 24 hour TTL

      // Update unique views if we have a user or session
      if (event.userId || event.sessionId) {
        const uniqueKey = `unique_view:${event.listingId}:${event.userId || event.sessionId}:${this.getDateKey()}`;
        const isUnique = await this.cache.setNX(uniqueKey, true, 86400);
        
        if (isUnique) {
          const uniqueCacheKey = `listing_unique_views:${event.listingId}:${this.getDateKey()}`;
          await this.cache.incr(uniqueCacheKey, 86400);
        }
      }

      // Process immediately if batch is full
      if (this.batchQueue.length >= this.BATCH_SIZE) {
        await this.processBatch();
      }
    } catch (error) {
      logger.error('Error tracking view:', error);
    }
  }

  /**
   * Track a search event
   */
  async trackSearch(event: SearchEvent): Promise<void> {
    try {
      // Add to batch queue
      this.batchQueue.push({
        type: 'search',
        data: {
          ...event,
          timestamp: new Date(),
        },
      });

      // Update real-time search counters
      const searchKey = `searches:${event.serviceType}:${this.getDateKey()}`;
      await this.cache.incr(searchKey, 86400);

      // Track response time for service type
      const responseTimeKey = `response_times:${event.serviceType}:${this.getDateKey()}`;
      const currentData = await this.cache.get(responseTimeKey) || { total: 0, count: 0 };
      currentData.total += event.responseTime;
      currentData.count += 1;
      await this.cache.set(responseTimeKey, currentData, 86400);

      // Process immediately if batch is full
      if (this.batchQueue.length >= this.BATCH_SIZE) {
        await this.processBatch();
      }
    } catch (error) {
      logger.error('Error tracking search:', error);
    }
  }

  /**
   * Track provider performance
   */
  async trackProviderRequest(
    source: ListingSource,
    serviceType: ServiceType,
    success: boolean,
    responseTime: number,
    resultsCount: number = 0
  ): Promise<void> {
    try {
      const providerKey = `provider:${source}:${serviceType}:${this.getDateKey()}`;
      const currentData = await this.cache.get(providerKey) || {
        requestCount: 0,
        successCount: 0,
        errorCount: 0,
        totalResponseTime: 0,
        totalResults: 0,
      };

      currentData.requestCount += 1;
      if (success) {
        currentData.successCount += 1;
        currentData.totalResults += resultsCount;
      } else {
        currentData.errorCount += 1;
      }
      currentData.totalResponseTime += responseTime;

      await this.cache.set(providerKey, currentData, 86400);

      // Add to batch for database persistence
      this.batchQueue.push({
        type: 'provider',
        data: {
          source,
          serviceType,
          success,
          responseTime,
          resultsCount,
          timestamp: new Date(),
        },
      });
    } catch (error) {
      logger.error('Error tracking provider request:', error);
    }
  }

  /**
   * Track a conversion (click or booking)
   */
  async trackConversion(
    listingId: string,
    type: 'click' | 'booking',
    revenue?: number,
    userId?: string,
    sessionId?: string
  ): Promise<void> {
    try {
      // Update real-time counters
      const conversionKey = `listing_${type}s:${listingId}:${this.getDateKey()}`;
      await this.cache.incr(conversionKey, 86400);

      if (revenue && revenue > 0) {
        const revenueKey = `listing_revenue:${listingId}:${this.getDateKey()}`;
        const currentRevenue = await this.cache.get(revenueKey) || 0;
        await this.cache.set(revenueKey, currentRevenue + revenue, 86400);
      }

      // Add to batch
      this.batchQueue.push({
        type: 'conversion',
        data: {
          listingId,
          type,
          revenue: revenue || 0,
          userId,
          sessionId,
          timestamp: new Date(),
        },
      });
    } catch (error) {
      logger.error('Error tracking conversion:', error);
    }
  }

  /**
   * Get analytics summary for a period
   */
  async getAnalyticsSummary(
    from: Date,
    to: Date,
    serviceType?: ServiceType
  ): Promise<AnalyticsSummary> {
    try {
      const cacheKey = `analytics_summary:${from.toISOString()}:${to.toISOString()}:${serviceType || 'all'}`;
      const cached = await this.cache.get(cacheKey);
      
      if (cached) {
        return cached;
      }

      // Build where conditions
      const dateCondition = {
        createdAt: {
          [Op.between]: [from, to],
        },
      };

      const serviceCondition = serviceType ? { serviceType } : {};

      // Get total views and searches
      const [viewsResult, searchesResult] = await Promise.all([
        sequelize.query(
          `
          SELECT 
            COUNT(*) as total_views,
            COUNT(DISTINCT COALESCE("userId", "sessionId")) as unique_views
          FROM listing_views 
          WHERE "createdAt" BETWEEN :from AND :to
          `,
          {
            replacements: { from, to },
            type: QueryTypes.SELECT,
          }
        ),
        sequelize.query(
          `
          SELECT 
            COUNT(*) as total_searches,
            AVG("responseTime") as avg_response_time,
            SUM(CASE WHEN clicked = true THEN 1 ELSE 0 END) as total_clicks,
            SUM(CASE WHEN converted = true THEN 1 ELSE 0 END) as total_conversions
          FROM search_analytics 
          WHERE "createdAt" BETWEEN :from AND :to
          ${serviceType ? 'AND "serviceType" = :serviceType' : ''}
          `,
          {
            replacements: { from, to, serviceType },
            type: QueryTypes.SELECT,
          }
        ),
      ]);

      // Get top service types
      const topServiceTypesResult = await sequelize.query(
        `
        SELECT 
          "serviceType",
          COUNT(*) as count
        FROM search_analytics 
        WHERE "createdAt" BETWEEN :from AND :to
        GROUP BY "serviceType"
        ORDER BY count DESC
        LIMIT 10
        `,
        {
          replacements: { from, to },
          type: QueryTypes.SELECT,
        }
      );

      // Get top providers by performance
      const topProvidersResult = await sequelize.query(
        `
        SELECT 
          source,
          AVG("avgResponseTime") as avg_response_time,
          SUM("successCount") as success_count,
          SUM("requestCount") as request_count,
          SUM("clicksReceived") as clicks_received,
          SUM("revenue") as revenue
        FROM provider_analytics 
        WHERE date BETWEEN :dateFrom AND :dateTo
        ${serviceType ? 'AND "serviceType" = :serviceType' : ''}
        GROUP BY source
        ORDER BY success_count DESC, avg_response_time ASC
        LIMIT 10
        `,
        {
          replacements: { 
            dateFrom: from.toISOString().split('T')[0], 
            dateTo: to.toISOString().split('T')[0],
            serviceType,
          },
          type: QueryTypes.SELECT,
        }
      );

      // Calculate total revenue
      const revenueResult = await sequelize.query(
        `
        SELECT SUM(revenue) as total_revenue
        FROM listing_performance
        WHERE date BETWEEN :dateFrom AND :dateTo
        `,
        {
          replacements: { 
            dateFrom: from.toISOString().split('T')[0], 
            dateTo: to.toISOString().split('T')[0],
          },
          type: QueryTypes.SELECT,
        }
      );

      const views = viewsResult[0] as any;
      const searches = searchesResult[0] as any;
      const revenue = revenueResult[0] as any;

      const summary: AnalyticsSummary = {
        totalViews: parseInt(views.total_views || 0),
        uniqueViews: parseInt(views.unique_views || 0),
        totalSearches: parseInt(searches.total_searches || 0),
        avgResponseTime: parseFloat(searches.avg_response_time || 0),
        topServiceTypes: (topServiceTypesResult as any[]).map(row => ({
          serviceType: row.serviceType,
          count: parseInt(row.count),
        })),
        topProviders: (topProvidersResult as any[]).map(row => {
          const successRate = row.request_count > 0 ? row.success_count / row.request_count : 0;
          const performance = successRate * 100 - (row.avg_response_time / 1000); // Simple performance score
          return {
            source: row.source,
            performance: Math.round(performance * 100) / 100,
          };
        }),
        conversionRate: searches.total_searches > 0 
          ? (searches.total_conversions / searches.total_searches) * 100 
          : 0,
        revenue: parseFloat(revenue.total_revenue || 0),
        period: { from, to },
      };

      // Cache for 5 minutes
      await this.cache.set(cacheKey, summary, 300);
      
      return summary;
    } catch (error) {
      logger.error('Error getting analytics summary:', error);
      throw error;
    }
  }

  /**
   * Get listing performance metrics
   */
  async getListingPerformance(
    listingId: string,
    from: Date,
    to: Date
  ): Promise<{
    views: number;
    uniqueViews: number;
    clicks: number;
    bookings: number;
    revenue: number;
    conversionRate: number;
    avgPosition: number;
    trending: 'up' | 'down' | 'stable';
  }> {
    try {
      const performanceResult = await sequelize.query(
        `
        SELECT 
          SUM(views) as total_views,
          SUM("uniqueViews") as total_unique_views,
          SUM(clicks) as total_clicks,
          SUM(bookings) as total_bookings,
          SUM(revenue) as total_revenue,
          AVG("conversionRate") as avg_conversion_rate,
          AVG("avgPosition") as avg_position
        FROM listing_performance
        WHERE "listingId" = :listingId
          AND date BETWEEN :dateFrom AND :dateTo
        `,
        {
          replacements: {
            listingId,
            dateFrom: from.toISOString().split('T')[0],
            dateTo: to.toISOString().split('T')[0],
          },
          type: QueryTypes.SELECT,
        }
      );

      const result = performanceResult[0] as any;
      
      // Calculate trending (simplified - compare with previous period)
      const periodDays = Math.ceil((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));
      const previousFrom = new Date(from.getTime() - (periodDays * 24 * 60 * 60 * 1000));
      const previousTo = from;

      const previousResult = await sequelize.query(
        `
        SELECT SUM(views) as previous_views
        FROM listing_performance
        WHERE "listingId" = :listingId
          AND date BETWEEN :dateFrom AND :dateTo
        `,
        {
          replacements: {
            listingId,
            dateFrom: previousFrom.toISOString().split('T')[0],
            dateTo: previousTo.toISOString().split('T')[0],
          },
          type: QueryTypes.SELECT,
        }
      );

      const previousViews = parseInt((previousResult[0] as any)?.previous_views || 0);
      const currentViews = parseInt(result.total_views || 0);
      
      let trending: 'up' | 'down' | 'stable' = 'stable';
      if (currentViews > previousViews * 1.1) trending = 'up';
      else if (currentViews < previousViews * 0.9) trending = 'down';

      return {
        views: currentViews,
        uniqueViews: parseInt(result.total_unique_views || 0),
        clicks: parseInt(result.total_clicks || 0),
        bookings: parseInt(result.total_bookings || 0),
        revenue: parseFloat(result.total_revenue || 0),
        conversionRate: parseFloat(result.avg_conversion_rate || 0),
        avgPosition: parseFloat(result.avg_position || 0),
        trending,
      };
    } catch (error) {
      logger.error('Error getting listing performance:', error);
      throw error;
    }
  }

  /**
   * Start batch processor for analytics events
   */
  private startBatchProcessor(): void {
    this.batchTimer = setInterval(async () => {
      if (this.batchQueue.length > 0) {
        await this.processBatch();
      }
    }, this.BATCH_INTERVAL);
  }

  /**
   * Process batched analytics events
   */
  private async processBatch(): Promise<void> {
    if (this.batchQueue.length === 0) return;

    const batch = this.batchQueue.splice(0, this.BATCH_SIZE);
    
    try {
      const transaction = await sequelize.transaction();
      
      try {
        // Group events by type
        const viewEvents = batch.filter(event => event.type === 'view');
        const searchEvents = batch.filter(event => event.type === 'search');
        const providerEvents = batch.filter(event => event.type === 'provider');
        const conversionEvents = batch.filter(event => event.type === 'conversion');

        // Insert view events
        if (viewEvents.length > 0) {
          await sequelize.query(
            `
            INSERT INTO listing_views (
              "listingId", "userId", "sessionId", "ipAddress", "userAgent", 
              "referrer", "searchQuery", "viewDuration", "deviceType", 
              "location", "createdAt"
            ) VALUES ${viewEvents.map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').join(', ')}
            `,
            {
              replacements: viewEvents.flatMap(event => [
                event.data.listingId,
                event.data.userId || null,
                event.data.sessionId || null,
                event.data.ipAddress || null,
                event.data.userAgent || null,
                event.data.referrer || null,
                event.data.searchQuery ? JSON.stringify(event.data.searchQuery) : null,
                event.data.viewDuration || null,
                event.data.deviceType || null,
                event.data.location ? JSON.stringify(event.data.location) : null,
                event.data.timestamp,
              ]),
              transaction,
            }
          );
        }

        // Insert search events
        if (searchEvents.length > 0) {
          await sequelize.query(
            `
            INSERT INTO search_analytics (
              "userId", "sessionId", "serviceType", "searchParams", "resultsCount",
              "localResults", "apiResults", "responseTime", "ipAddress", "userAgent", "createdAt"
            ) VALUES ${searchEvents.map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').join(', ')}
            `,
            {
              replacements: searchEvents.flatMap(event => [
                event.data.userId || null,
                event.data.sessionId || null,
                event.data.serviceType,
                JSON.stringify(event.data.searchParams),
                event.data.resultsCount,
                event.data.localResults,
                JSON.stringify(event.data.apiResults),
                event.data.responseTime,
                event.data.ipAddress || null,
                event.data.userAgent || null,
                event.data.timestamp,
              ]),
              transaction,
            }
          );
        }

        await transaction.commit();
        logger.debug(`Processed analytics batch: ${batch.length} events`);
      } catch (error) {
        await transaction.rollback();
        throw error;
      }
    } catch (error) {
      logger.error('Error processing analytics batch:', error);
      // Re-add failed events to queue for retry
      this.batchQueue.unshift(...batch);
    }
  }

  /**
   * Get current date key for caching
   */
  private getDateKey(): string {
    return new Date().toISOString().split('T')[0];
  }

  /**
   * Cleanup method
   */
  destroy(): void {
    if (this.batchTimer) {
      clearInterval(this.batchTimer);
    }
    // Process remaining events
    if (this.batchQueue.length > 0) {
      this.processBatch().catch(error => {
        logger.error('Error processing final batch:', error);
      });
    }
  }
}