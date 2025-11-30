import axios, { AxiosResponse } from 'axios';
import crypto from 'crypto';
import { EventEmitter } from 'events';
import { CacheManager } from '../../config/redis';
import { sequelize } from '../../config/database';
import { logger } from '../../utils/logger';
import { ListingSource } from '../../models/UnifiedListing';
import { Op, QueryTypes } from 'sequelize';

export interface WebhookEndpoint {
  id: string;
  name: string;
  url: string;
  secret: string;
  source: ListingSource;
  events: string[];
  isActive: boolean;
  lastUsed?: Date;
  failureCount: number;
  maxRetries: number;
  retryBackoff: number;
  timeout: number;
  headers: Record<string, string>;
  metadata: Record<string, any>;
}

export interface WebhookEvent {
  id?: string;
  endpointId: string;
  eventType: string;
  listingId: string;
  payload: any;
  signature: string;
  status: 'pending' | 'processing' | 'delivered' | 'failed' | 'cancelled';
  attempts: number;
  lastAttempt?: Date;
  nextRetry?: Date;
  responseStatus?: number;
  responseBody?: string;
  responseTime?: number;
  errorMessage?: string;
  deliveredAt?: Date;
}

export interface IncomingWebhookLog {
  id?: string;
  source: ListingSource;
  eventType: string;
  payload: any;
  headers: Record<string, string>;
  signature?: string;
  verified: boolean;
  processed: boolean;
  processingStatus: 'success' | 'failed' | 'pending';
  errorMessage?: string;
  listingsAffected: string[];
  ipAddress?: string;
  userAgent?: string;
  processedAt?: Date;
}

export class WebhookService extends EventEmitter {
  private static instance: WebhookService;
  private cache: CacheManager;
  private deliveryQueue: WebhookEvent[] = [];
  private processing = false;
  private retryTimer?: NodeJS.Timeout;
  private readonly BATCH_SIZE = 10;
  private readonly RETRY_INTERVAL = 30000; // 30 seconds

  private constructor() {
    super();
    this.cache = CacheManager.getInstance();
    this.startRetryProcessor();
  }

  static getInstance(): WebhookService {
    if (!WebhookService.instance) {
      WebhookService.instance = new WebhookService();
    }
    return WebhookService.instance;
  }

  /**
   * Register a new webhook endpoint
   */
  async registerEndpoint(
    name: string,
    url: string,
    source: ListingSource,
    events: string[],
    options: {
      secret?: string;
      maxRetries?: number;
      retryBackoff?: number;
      timeout?: number;
      headers?: Record<string, string>;
      metadata?: Record<string, any>;
    } = {}
  ): Promise<WebhookEndpoint> {
    try {
      const secret = options.secret || this.generateSecret();
      const endpointId = crypto.randomUUID();

      const endpoint: WebhookEndpoint = {
        id: endpointId,
        name,
        url,
        secret,
        source,
        events,
        isActive: true,
        failureCount: 0,
        maxRetries: options.maxRetries || 3,
        retryBackoff: options.retryBackoff || 30,
        timeout: options.timeout || 30000,
        headers: options.headers || {},
        metadata: options.metadata || {},
      };

      // Store in database
      await sequelize.query(
        `
        INSERT INTO webhook_endpoints (
          id, name, url, secret, source, events, "isActive", "failureCount",
          "maxRetries", "retryBackoff", timeout, headers, metadata, "createdAt", "updatedAt"
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
        `,
        {
          replacements: [
            endpoint.id,
            endpoint.name,
            endpoint.url,
            endpoint.secret,
            endpoint.source,
            JSON.stringify(endpoint.events),
            endpoint.isActive,
            endpoint.failureCount,
            endpoint.maxRetries,
            endpoint.retryBackoff,
            endpoint.timeout,
            JSON.stringify(endpoint.headers),
            JSON.stringify(endpoint.metadata),
          ],
        }
      );

      // Cache for quick lookup
      await this.cache.set(`webhook_endpoint:${endpointId}`, endpoint, 3600);

      logger.info(`Webhook endpoint registered: ${name} for ${source}`);
      return endpoint;
    } catch (error) {
      logger.error('Error registering webhook endpoint:', error);
      throw error;
    }
  }

  /**
   * Send webhook event to registered endpoints
   */
  async sendWebhook(
    eventType: string,
    listingId: string,
    payload: any,
    source?: ListingSource
  ): Promise<void> {
    try {
      // Get all active endpoints for this event type
      const endpoints = await this.getEndpointsForEvent(eventType, source);

      if (endpoints.length === 0) {
        logger.debug(`No webhooks registered for event: ${eventType}`);
        return;
      }

      // Create webhook events for each endpoint
      const events: WebhookEvent[] = [];
      
      for (const endpoint of endpoints) {
        const eventId = crypto.randomUUID();
        const signature = this.generateSignature(payload, endpoint.secret);

        const webhookEvent: WebhookEvent = {
          id: eventId,
          endpointId: endpoint.id,
          eventType,
          listingId,
          payload,
          signature,
          status: 'pending',
          attempts: 0,
        };

        events.push(webhookEvent);
      }

      // Store events in database
      if (events.length > 0) {
        await this.storeWebhookEvents(events);
        
        // Add to delivery queue
        this.deliveryQueue.push(...events);
        
        // Process immediately if not already processing
        if (!this.processing) {
          await this.processDeliveryQueue();
        }
      }

      logger.debug(`Created ${events.length} webhook events for ${eventType}`);
    } catch (error) {
      logger.error('Error sending webhook:', error);
    }
  }

  /**
   * Handle incoming webhook from external provider
   */
  async handleIncomingWebhook(
    source: ListingSource,
    eventType: string,
    payload: any,
    headers: Record<string, string>,
    ipAddress?: string,
    userAgent?: string
  ): Promise<{ success: boolean; message: string; listingsAffected?: string[] }> {
    try {
      const logId = crypto.randomUUID();
      const signature = headers['x-webhook-signature'] || headers['signature'];

      // Verify webhook signature if provided
      const verified = signature ? await this.verifyIncomingSignature(
        source,
        payload,
        signature
      ) : false;

      // Log incoming webhook
      const log: IncomingWebhookLog = {
        id: logId,
        source,
        eventType,
        payload,
        headers,
        signature,
        verified,
        processed: false,
        processingStatus: 'pending',
        listingsAffected: [],
        ipAddress,
        userAgent,
      };

      await this.storeIncomingWebhookLog(log);

      // Process the webhook
      const result = await this.processIncomingWebhook(log);

      // Update log with processing result
      await sequelize.query(
        `
        UPDATE incoming_webhook_logs 
        SET processed = ?, "processingStatus" = ?, "errorMessage" = ?, 
            "listingsAffected" = ?, "processedAt" = NOW()
        WHERE id = ?
        `,
        {
          replacements: [
            result.success,
            result.success ? 'success' : 'failed',
            result.errorMessage || null,
            JSON.stringify(result.listingsAffected || []),
            logId,
          ],
        }
      );

      return result;
    } catch (error) {
      logger.error('Error handling incoming webhook:', error);
      return {
        success: false,
        message: 'Internal error processing webhook',
      };
    }
  }

  /**
   * Get webhook endpoints for specific event
   */
  private async getEndpointsForEvent(
    eventType: string,
    source?: ListingSource
  ): Promise<WebhookEndpoint[]> {
    try {
      const cacheKey = `webhook_endpoints:${eventType}:${source || 'all'}`;
      const cached = await this.cache.get(cacheKey);
      
      if (cached) {
        return cached;
      }

      const whereConditions = [
        '"isActive" = true',
        'events @> ?', // PostgreSQL array contains operator
      ];
      const replacements = [JSON.stringify([eventType])];

      if (source) {
        whereConditions.push('source = ?');
        replacements.push(source);
      }

      const result = await sequelize.query(
        `
        SELECT * FROM webhook_endpoints
        WHERE ${whereConditions.join(' AND ')}
        ORDER BY "createdAt" ASC
        `,
        {
          replacements,
          type: QueryTypes.SELECT,
        }
      );

      const endpoints = (result as any[]).map(row => ({
        ...row,
        events: JSON.parse(row.events),
        headers: JSON.parse(row.headers || '{}'),
        metadata: JSON.parse(row.metadata || '{}'),
      }));

      // Cache for 5 minutes
      await this.cache.set(cacheKey, endpoints, 300);
      
      return endpoints;
    } catch (error) {
      logger.error('Error getting endpoints for event:', error);
      return [];
    }
  }

  /**
   * Process webhook delivery queue
   */
  private async processDeliveryQueue(): Promise<void> {
    if (this.processing || this.deliveryQueue.length === 0) {
      return;
    }

    this.processing = true;

    try {
      const batch = this.deliveryQueue.splice(0, this.BATCH_SIZE);
      
      await Promise.allSettled(
        batch.map(event => this.deliverWebhook(event))
      );

      // Continue processing if more events in queue
      if (this.deliveryQueue.length > 0) {
        setImmediate(() => this.processDeliveryQueue());
      }
    } catch (error) {
      logger.error('Error processing delivery queue:', error);
    } finally {
      this.processing = false;
    }
  }

  /**
   * Deliver individual webhook
   */
  private async deliverWebhook(event: WebhookEvent): Promise<void> {
    try {
      // Get endpoint details
      const endpoint = await this.getEndpointById(event.endpointId);
      if (!endpoint || !endpoint.isActive) {
        await this.updateWebhookEvent(event.id!, {
          status: 'cancelled',
          errorMessage: 'Endpoint not found or inactive',
        });
        return;
      }

      // Update status to processing
      await this.updateWebhookEvent(event.id!, {
        status: 'processing',
        attempts: event.attempts + 1,
        lastAttempt: new Date(),
      });

      const startTime = Date.now();

      // Prepare request
      const webhookPayload = {
        event: event.eventType,
        listingId: event.listingId,
        timestamp: new Date().toISOString(),
        data: event.payload,
      };

      const headers = {
        'Content-Type': 'application/json',
        'X-Webhook-Signature': event.signature,
        'X-Webhook-Event': event.eventType,
        'X-Webhook-Id': event.id,
        'User-Agent': 'TravelPlatform-Webhooks/1.0',
        ...endpoint.headers,
      };

      // Send webhook
      const response: AxiosResponse = await axios.post(
        endpoint.url,
        webhookPayload,
        {
          headers,
          timeout: endpoint.timeout,
          validateStatus: (status) => status < 500, // Don't throw on 4xx errors
        }
      );

      const responseTime = Date.now() - startTime;
      const success = response.status >= 200 && response.status < 300;

      if (success) {
        // Mark as delivered
        await this.updateWebhookEvent(event.id!, {
          status: 'delivered',
          responseStatus: response.status,
          responseBody: JSON.stringify(response.data),
          responseTime,
          deliveredAt: new Date(),
        });

        // Update endpoint last used
        await this.updateEndpointLastUsed(endpoint.id);
        
        logger.debug(`Webhook delivered successfully: ${event.eventType} to ${endpoint.url}`);
      } else {
        // Handle delivery failure
        await this.handleWebhookFailure(event, endpoint, response.status, response.data, responseTime);
      }
    } catch (error) {
      // Handle network/timeout errors
      await this.handleWebhookError(event, error);
    }
  }

  /**
   * Handle webhook delivery failure
   */
  private async handleWebhookFailure(
    event: WebhookEvent,
    endpoint: WebhookEndpoint,
    status: number,
    responseBody: any,
    responseTime: number
  ): Promise<void> {
    const attempts = event.attempts + 1;
    const shouldRetry = attempts < endpoint.maxRetries && status >= 500;

    if (shouldRetry) {
      // Schedule retry
      const nextRetry = new Date(Date.now() + (endpoint.retryBackoff * 1000 * Math.pow(2, attempts - 1)));
      
      await this.updateWebhookEvent(event.id!, {
        status: 'pending',
        responseStatus: status,
        responseBody: JSON.stringify(responseBody),
        responseTime,
        nextRetry,
        errorMessage: `HTTP ${status} - Scheduled for retry`,
      });
      
      logger.warn(`Webhook delivery failed, will retry: ${event.eventType} to ${endpoint.url} (attempt ${attempts})`);
    } else {
      // Mark as failed
      await this.updateWebhookEvent(event.id!, {
        status: 'failed',
        responseStatus: status,
        responseBody: JSON.stringify(responseBody),
        responseTime,
        errorMessage: attempts >= endpoint.maxRetries ? 'Max retries exceeded' : `HTTP ${status}`,
      });

      // Increment endpoint failure count
      await this.incrementEndpointFailureCount(endpoint.id);
      
      logger.error(`Webhook delivery failed permanently: ${event.eventType} to ${endpoint.url}`);
    }
  }

  /**
   * Handle webhook network/timeout errors
   */
  private async handleWebhookError(event: WebhookEvent, error: any): Promise<void> {
    const attempts = event.attempts + 1;
    const endpoint = await this.getEndpointById(event.endpointId);
    
    if (!endpoint) return;

    const shouldRetry = attempts < endpoint.maxRetries;

    if (shouldRetry) {
      const nextRetry = new Date(Date.now() + (endpoint.retryBackoff * 1000 * Math.pow(2, attempts - 1)));
      
      await this.updateWebhookEvent(event.id!, {
        status: 'pending',
        nextRetry,
        errorMessage: error.message,
      });
    } else {
      await this.updateWebhookEvent(event.id!, {
        status: 'failed',
        errorMessage: `Max retries exceeded: ${error.message}`,
      });

      await this.incrementEndpointFailureCount(endpoint.id);
    }

    logger.error(`Webhook delivery error: ${error.message}`);
  }

  /**
   * Process incoming webhook based on source and event type
   */
  private async processIncomingWebhook(
    log: IncomingWebhookLog
  ): Promise<{ success: boolean; message: string; listingsAffected?: string[]; errorMessage?: string }> {
    try {
      switch (log.source) {
        case ListingSource.VIATOR:
          return await this.processViatorWebhook(log);
        case ListingSource.BOOKING:
          return await this.processBookingWebhook(log);
        case ListingSource.EXPEDIA:
          return await this.processExpediaWebhook(log);
        default:
          return {
            success: false,
            message: `Unsupported webhook source: ${log.source}`,
            errorMessage: `No processor for source: ${log.source}`,
          };
      }
    } catch (error) {
      logger.error('Error processing incoming webhook:', error);
      return {
        success: false,
        message: 'Processing error',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Generate webhook signature
   */
  private generateSignature(payload: any, secret: string): string {
    const body = JSON.stringify(payload);
    return crypto
      .createHmac('sha256', secret)
      .update(body)
      .digest('hex');
  }

  /**
   * Generate random secret for webhook endpoint
   */
  private generateSecret(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Verify incoming webhook signature
   */
  private async verifyIncomingSignature(
    source: ListingSource,
    payload: any,
    signature: string
  ): Promise<boolean> {
    try {
      // Get the secret for this source (would be stored in config/database)
      const secret = process.env[`${source.toUpperCase()}_WEBHOOK_SECRET`];
      if (!secret) return false;

      const expectedSignature = this.generateSignature(payload, secret);
      return crypto.timingSafeEqual(
        Buffer.from(signature, 'hex'),
        Buffer.from(expectedSignature, 'hex')
      );
    } catch (error) {
      logger.error('Error verifying webhook signature:', error);
      return false;
    }
  }

  // Additional helper methods would continue here...
  // (Space constraints - the implementation would include more methods for:
  // - Processing specific provider webhooks
  // - Database operations
  // - Retry processing
  // - Cleanup tasks)

  /**
   * Start retry processor for failed webhooks
   */
  private startRetryProcessor(): void {
    this.retryTimer = setInterval(async () => {
      await this.processRetries();
    }, this.RETRY_INTERVAL);
  }

  /**
   * Process webhook events that are ready for retry
   */
  private async processRetries(): Promise<void> {
    try {
      const retryEvents = await sequelize.query(
        `
        SELECT * FROM webhook_events 
        WHERE status = 'pending' 
          AND "nextRetry" IS NOT NULL 
          AND "nextRetry" <= NOW()
        ORDER BY "nextRetry" ASC
        LIMIT 50
        `,
        { type: QueryTypes.SELECT }
      );

      if (retryEvents.length > 0) {
        this.deliveryQueue.push(...(retryEvents as WebhookEvent[]));
        
        if (!this.processing) {
          await this.processDeliveryQueue();
        }
      }
    } catch (error) {
      logger.error('Error processing webhook retries:', error);
    }
  }

  // Provider-specific webhook processing
  private async processViatorWebhook(log: IncomingWebhookLog): Promise<{
    success: boolean;
    message: string;
    listingsAffected?: string[];
    errorMessage?: string;
  }> {
    try {
      const { eventType, payload } = log;
      const listingsAffected: string[] = [];

      switch (eventType) {
        case 'product.updated':
        case 'product.availability.changed':
        case 'product.price.changed':
          const productCode = payload.productCode || payload.id;
          if (!productCode) {
            return {
              success: false,
              message: 'Missing product code in payload',
              errorMessage: 'Product code is required for Viator webhooks',
            };
          }

          // Find existing listing
          const existingListing = await sequelize.query(
            'SELECT id FROM unified_listings WHERE "externalId" = ? AND source = ?',
            {
              replacements: [productCode, 'viator'],
              type: QueryTypes.SELECT,
            }
          );

          if (existingListing.length > 0) {
            const listingId = (existingListing[0] as any).id;
            listingsAffected.push(listingId);

            // Update listing with new data
            const updateData: any = {
              updatedAt: new Date(),
            };

            if (payload.title) updateData.title = payload.title;
            if (payload.description) updateData.description = payload.description;
            if (payload.price) updateData.price = parseFloat(payload.price);
            if (payload.currency) updateData.currency = payload.currency;
            if (payload.availability !== undefined) updateData.isAvailable = payload.availability;
            if (payload.rating) updateData.rating = parseFloat(payload.rating);
            if (payload.images) updateData.images = JSON.stringify(payload.images);

            const setClauses = Object.keys(updateData).map(key => `"${key}" = ?`);
            const values = Object.values(updateData);
            values.push(listingId);

            await sequelize.query(
              `UPDATE unified_listings SET ${setClauses.join(', ')} WHERE id = ?`,
              { replacements: values }
            );

            logger.info(`Updated Viator listing ${listingId} from webhook`);
          }
          break;

        case 'product.deleted':
          const deletedProductCode = payload.productCode || payload.id;
          if (deletedProductCode) {
            const deletedResult = await sequelize.query(
              'DELETE FROM unified_listings WHERE "externalId" = ? AND source = ? RETURNING id',
              {
                replacements: [deletedProductCode, 'viator'],
                type: QueryTypes.SELECT,
              }
            );
            
            if (deletedResult.length > 0) {
              listingsAffected.push((deletedResult[0] as any).id);
              logger.info(`Deleted Viator listing ${deletedProductCode} from webhook`);
            }
          }
          break;

        default:
          logger.warn(`Unhandled Viator webhook event type: ${eventType}`);
      }

      return {
        success: true,
        message: `Processed Viator ${eventType} webhook`,
        listingsAffected,
      };
    } catch (error) {
      logger.error('Error processing Viator webhook:', error);
      return {
        success: false,
        message: 'Error processing Viator webhook',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private async processBookingWebhook(log: IncomingWebhookLog): Promise<{
    success: boolean;
    message: string;
    listingsAffected?: string[];
    errorMessage?: string;
  }> {
    try {
      const { eventType, payload } = log;
      const listingsAffected: string[] = [];

      switch (eventType) {
        case 'hotel.updated':
        case 'hotel.availability.changed':
        case 'hotel.rates.changed':
          const hotelId = payload.hotel_id || payload.id;
          if (!hotelId) {
            return {
              success: false,
              message: 'Missing hotel ID in payload',
              errorMessage: 'Hotel ID is required for Booking.com webhooks',
            };
          }

          const existingHotel = await sequelize.query(
            'SELECT id FROM unified_listings WHERE "externalId" = ? AND source = ?',
            {
              replacements: [hotelId.toString(), 'booking'],
              type: QueryTypes.SELECT,
            }
          );

          if (existingHotel.length > 0) {
            const listingId = (existingHotel[0] as any).id;
            listingsAffected.push(listingId);

            const updateData: any = {
              updatedAt: new Date(),
            };

            if (payload.name) updateData.title = payload.name;
            if (payload.description) updateData.description = payload.description;
            if (payload.min_rate) updateData.price = parseFloat(payload.min_rate);
            if (payload.currency) updateData.currency = payload.currency;
            if (payload.availability !== undefined) updateData.isAvailable = payload.availability > 0;
            if (payload.review_score) updateData.rating = parseFloat(payload.review_score) / 2; // Convert 0-10 to 0-5
            if (payload.photos) updateData.images = JSON.stringify(payload.photos);
            if (payload.address) {
              updateData.location = JSON.stringify({
                address: payload.address,
                city: payload.city,
                country: payload.country,
              });
            }

            const setClauses = Object.keys(updateData).map(key => `"${key}" = ?`);
            const values = Object.values(updateData);
            values.push(listingId);

            await sequelize.query(
              `UPDATE unified_listings SET ${setClauses.join(', ')} WHERE id = ?`,
              { replacements: values }
            );

            logger.info(`Updated Booking.com hotel ${listingId} from webhook`);
          }
          break;

        case 'hotel.closed':
          const closedHotelId = payload.hotel_id || payload.id;
          if (closedHotelId) {
            const closedResult = await sequelize.query(
              'UPDATE unified_listings SET "isAvailable" = false, "updatedAt" = NOW() WHERE "externalId" = ? AND source = ? RETURNING id',
              {
                replacements: [closedHotelId.toString(), 'booking'],
                type: QueryTypes.SELECT,
              }
            );
            
            if (closedResult.length > 0) {
              listingsAffected.push((closedResult[0] as any).id);
              logger.info(`Marked Booking.com hotel ${closedHotelId} as unavailable from webhook`);
            }
          }
          break;

        default:
          logger.warn(`Unhandled Booking.com webhook event type: ${eventType}`);
      }

      return {
        success: true,
        message: `Processed Booking.com ${eventType} webhook`,
        listingsAffected,
      };
    } catch (error) {
      logger.error('Error processing Booking.com webhook:', error);
      return {
        success: false,
        message: 'Error processing Booking.com webhook',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private async processExpediaWebhook(log: IncomingWebhookLog): Promise<{
    success: boolean;
    message: string;
    listingsAffected?: string[];
    errorMessage?: string;
  }> {
    try {
      const { eventType, payload } = log;
      const listingsAffected: string[] = [];

      switch (eventType) {
        case 'property.updated':
        case 'property.inventory.changed':
        case 'property.rates.changed':
          const propertyId = payload.property_id || payload.id;
          if (!propertyId) {
            return {
              success: false,
              message: 'Missing property ID in payload',
              errorMessage: 'Property ID is required for Expedia webhooks',
            };
          }

          const existingProperty = await sequelize.query(
            'SELECT id FROM unified_listings WHERE "externalId" = ? AND source = ?',
            {
              replacements: [propertyId.toString(), 'expedia'],
              type: QueryTypes.SELECT,
            }
          );

          if (existingProperty.length > 0) {
            const listingId = (existingProperty[0] as any).id;
            listingsAffected.push(listingId);

            const updateData: any = {
              updatedAt: new Date(),
            };

            if (payload.name) updateData.title = payload.name;
            if (payload.description) updateData.description = payload.description;
            if (payload.rate) updateData.price = parseFloat(payload.rate.amount);
            if (payload.rate?.currency) updateData.currency = payload.rate.currency;
            if (payload.inventory !== undefined) updateData.isAvailable = payload.inventory > 0;
            if (payload.star_rating) updateData.rating = parseFloat(payload.star_rating);
            if (payload.images) updateData.images = JSON.stringify(payload.images);
            if (payload.address) {
              updateData.location = JSON.stringify({
                address: payload.address.line_1,
                city: payload.address.city,
                state: payload.address.state_province,
                country: payload.address.country,
                postal_code: payload.address.postal_code,
              });
            }

            const setClauses = Object.keys(updateData).map(key => `"${key}" = ?`);
            const values = Object.values(updateData);
            values.push(listingId);

            await sequelize.query(
              `UPDATE unified_listings SET ${setClauses.join(', ')} WHERE id = ?`,
              { replacements: values }
            );

            logger.info(`Updated Expedia property ${listingId} from webhook`);
          }
          break;

        case 'property.deactivated':
          const deactivatedPropertyId = payload.property_id || payload.id;
          if (deactivatedPropertyId) {
            const deactivatedResult = await sequelize.query(
              'UPDATE unified_listings SET "isAvailable" = false, "updatedAt" = NOW() WHERE "externalId" = ? AND source = ? RETURNING id',
              {
                replacements: [deactivatedPropertyId.toString(), 'expedia'],
                type: QueryTypes.SELECT,
              }
            );
            
            if (deactivatedResult.length > 0) {
              listingsAffected.push((deactivatedResult[0] as any).id);
              logger.info(`Deactivated Expedia property ${deactivatedPropertyId} from webhook`);
            }
          }
          break;

        default:
          logger.warn(`Unhandled Expedia webhook event type: ${eventType}`);
      }

      return {
        success: true,
        message: `Processed Expedia ${eventType} webhook`,
        listingsAffected,
      };
    } catch (error) {
      logger.error('Error processing Expedia webhook:', error);
      return {
        success: false,
        message: 'Error processing Expedia webhook',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // Database helper methods
  private async storeWebhookEvents(events: WebhookEvent[]): Promise<void> {
    if (events.length === 0) return;

    const values = events.map(event => [
      event.id,
      event.endpointId,
      event.eventType,
      event.listingId,
      JSON.stringify(event.payload),
      event.signature,
      event.status,
      event.attempts,
      event.lastAttempt || null,
      event.nextRetry || null,
      event.responseStatus || null,
      event.responseBody || null,
      event.responseTime || null,
      event.errorMessage || null,
      event.deliveredAt || null,
    ]);

    const placeholders = events.map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())').join(', ');

    await sequelize.query(
      `
      INSERT INTO webhook_events (
        id, "endpointId", "eventType", "listingId", payload, signature,
        status, attempts, "lastAttempt", "nextRetry", "responseStatus",
        "responseBody", "responseTime", "errorMessage", "deliveredAt",
        "createdAt", "updatedAt"
      ) VALUES ${placeholders}
      `,
      {
        replacements: values.flat(),
      }
    );
  }

  private async storeIncomingWebhookLog(log: IncomingWebhookLog): Promise<void> {
    await sequelize.query(
      `
      INSERT INTO incoming_webhook_logs (
        id, source, "eventType", payload, headers, signature, verified,
        processed, "processingStatus", "errorMessage", "listingsAffected",
        "ipAddress", "userAgent", "processedAt", "createdAt"
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
      `,
      {
        replacements: [
          log.id,
          log.source,
          log.eventType,
          JSON.stringify(log.payload),
          JSON.stringify(log.headers),
          log.signature || null,
          log.verified,
          log.processed,
          log.processingStatus,
          log.errorMessage || null,
          JSON.stringify(log.listingsAffected),
          log.ipAddress || null,
          log.userAgent || null,
          log.processedAt || null,
        ],
      }
    );
  }

  private async updateWebhookEvent(eventId: string, updates: Partial<WebhookEvent>): Promise<void> {
    const setClauses: string[] = [];
    const replacements: any[] = [];

    Object.entries(updates).forEach(([key, value]) => {
      if (value !== undefined) {
        if (key === 'payload' || key === 'responseBody') {
          setClauses.push(`"${key}" = ?`);
          replacements.push(typeof value === 'string' ? value : JSON.stringify(value));
        } else {
          setClauses.push(`"${key}" = ?`);
          replacements.push(value);
        }
      }
    });

    if (setClauses.length === 0) return;

    setClauses.push('"updatedAt" = NOW()');
    replacements.push(eventId);

    await sequelize.query(
      `UPDATE webhook_events SET ${setClauses.join(', ')} WHERE id = ?`,
      { replacements }
    );
  }

  private async getEndpointById(endpointId: string): Promise<WebhookEndpoint | null> {
    try {
      // Check cache first
      const cacheKey = `webhook_endpoint:${endpointId}`;
      const cached = await this.cache.get(cacheKey);
      
      if (cached) {
        return cached;
      }

      const result = await sequelize.query(
        'SELECT * FROM webhook_endpoints WHERE id = ? AND "isActive" = true',
        {
          replacements: [endpointId],
          type: QueryTypes.SELECT,
        }
      );

      if (result.length === 0) return null;

      const row = result[0] as any;
      const endpoint: WebhookEndpoint = {
        ...row,
        events: JSON.parse(row.events || '[]'),
        headers: JSON.parse(row.headers || '{}'),
        metadata: JSON.parse(row.metadata || '{}'),
      };

      // Cache for 10 minutes
      await this.cache.set(cacheKey, endpoint, 600);
      
      return endpoint;
    } catch (error) {
      logger.error('Error getting endpoint by ID:', error);
      return null;
    }
  }

  private async updateEndpointLastUsed(endpointId: string): Promise<void> {
    await sequelize.query(
      'UPDATE webhook_endpoints SET "lastUsed" = NOW(), "updatedAt" = NOW() WHERE id = ?',
      { replacements: [endpointId] }
    );

    // Clear cache
    await this.cache.del(`webhook_endpoint:${endpointId}`);
  }

  private async incrementEndpointFailureCount(endpointId: string): Promise<void> {
    await sequelize.query(
      'UPDATE webhook_endpoints SET "failureCount" = "failureCount" + 1, "updatedAt" = NOW() WHERE id = ?',
      { replacements: [endpointId] }
    );

    // Clear cache
    await this.cache.del(`webhook_endpoint:${endpointId}`);
  }

  /**
   * Cleanup method
   */
  destroy(): void {
    if (this.retryTimer) {
      clearInterval(this.retryTimer);
    }
  }
}