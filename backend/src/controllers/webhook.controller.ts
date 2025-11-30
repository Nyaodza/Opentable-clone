import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import { WebhookService } from '../services/webhooks/WebhookService';
import { ListingSource } from '../models/UnifiedListing';
import { logger } from '../utils/logger';
import { QueryTypes } from 'sequelize';
import { handleControllerError } from '../utils/error-handler';

export class WebhookController {
  private static webhookService = WebhookService.getInstance();

  /**
   * Register a new webhook endpoint
   */
  static async registerEndpoint(req: Request, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          error: 'Validation failed',
          details: errors.array(),
        });
        return;
      }

      if (!req.user?.id) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const {
        name,
        url,
        source,
        events,
        secret,
        maxRetries,
        retryBackoff,
        timeout,
        headers,
        metadata,
      } = req.body;

      const endpoint = await WebhookController.webhookService.registerEndpoint(
        name,
        url,
        source,
        events,
        {
          secret,
          maxRetries,
          retryBackoff,
          timeout,
          headers,
          metadata,
        }
      );

      res.status(201).json({
        success: true,
        data: {
          ...endpoint,
          // Don't expose the secret in response
          secret: undefined,
        },
      });
    } catch (error) {
      handleControllerError(error, res, 'Failed to register webhook endpoint');
    }
  }

  /**
   * Handle incoming webhook from external provider
   */
  static async handleIncoming(req: Request, res: Response): Promise<void> {
    try {
      const { source } = req.params;
      const payload = req.body;
      const headers = req.headers as Record<string, string>;
      const ipAddress = req.ip;
      const userAgent = req.get('User-Agent');

      if (!Object.values(ListingSource).includes(source as ListingSource)) {
        res.status(400).json({
          error: 'Invalid webhook source',
          message: `Source must be one of: ${Object.values(ListingSource).join(', ')}`,
        });
        return;
      }

      // Determine event type from headers or payload
      const eventType = headers['x-event-type'] || 
                       headers['x-webhook-event'] || 
                       payload.event_type || 
                       payload.type ||
                       'unknown';

      const result = await WebhookController.webhookService.handleIncomingWebhook(
        source as ListingSource,
        eventType,
        payload,
        headers,
        ipAddress,
        userAgent
      );

      if (result.success) {
        res.status(200).json({
          success: true,
          message: result.message,
          listingsAffected: result.listingsAffected,
        });
      } else {
        res.status(400).json({
          success: false,
          message: result.message,
        });
      }
    } catch (error) {
      handleControllerError(error, res, 'Failed to process webhook');
    }
  }

  /**
   * Send a test webhook
   */
  static async sendTestWebhook(req: Request, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          error: 'Validation failed',
          details: errors.array(),
        });
        return;
      }

      if (!req.user?.id) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const { eventType, listingId, payload, source } = req.body;

      await WebhookController.webhookService.sendWebhook(
        eventType,
        listingId,
        payload || { test: true, timestamp: new Date().toISOString() },
        source
      );

      res.json({
        success: true,
        message: 'Test webhook sent successfully',
      });
    } catch (error) {
      handleControllerError(error, res, 'Failed to send test webhook');
    }
  }

  /**
   * Get webhook delivery logs
   */
  static async getDeliveryLogs(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user?.id) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const {
        page = 1,
        limit = 50,
        endpointId,
        status,
        eventType,
        from,
        to,
      } = req.query;

      const offset = (parseInt(page as string) - 1) * parseInt(limit as string);
      
      let whereConditions = ['1=1'];
      const replacements: any[] = [];

      if (endpointId) {
        whereConditions.push('"endpointId" = ?');
        replacements.push(endpointId);
      }

      if (status) {
        whereConditions.push('status = ?');
        replacements.push(status);
      }

      if (eventType) {
        whereConditions.push('"eventType" = ?');
        replacements.push(eventType);
      }

      if (from) {
        whereConditions.push('"createdAt" >= ?');
        replacements.push(new Date(from as string));
      }

      if (to) {
        whereConditions.push('"createdAt" <= ?');
        replacements.push(new Date(to as string));
      }

      const { sequelize } = require('../config/database');

      const [events, totalResult] = await Promise.all([
        sequelize.query(
          `
          SELECT 
            we.*,
            wep.name as endpoint_name,
            wep.url as endpoint_url
          FROM webhook_events we
          LEFT JOIN webhook_endpoints wep ON we."endpointId" = wep.id
          WHERE ${whereConditions.join(' AND ')}
          ORDER BY we."createdAt" DESC
          LIMIT ? OFFSET ?
          `,
          {
            replacements: [...replacements, parseInt(limit as string), offset],
            type: QueryTypes.SELECT,
          }
        ),
        sequelize.query(
          `
          SELECT COUNT(*) as total
          FROM webhook_events we
          WHERE ${whereConditions.join(' AND ')}
          `,
          {
            replacements,
            type: QueryTypes.SELECT,
          }
        ),
      ]);

      const total = parseInt((totalResult[0] as any).total);
      const totalPages = Math.ceil(total / parseInt(limit as string));

      res.json({
        success: true,
        data: {
          events: events.map((event: any) => ({
            ...event,
            payload: JSON.parse(event.payload || '{}'),
          })),
          pagination: {
            page: parseInt(page as string),
            limit: parseInt(limit as string),
            total,
            totalPages,
            hasNext: parseInt(page as string) < totalPages,
            hasPrev: parseInt(page as string) > 1,
          },
        },
      });
    } catch (error) {
      handleControllerError(error, res, 'Failed to retrieve webhook logs');
    }
  }

  /**
   * Get incoming webhook logs
   */
  static async getIncomingLogs(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user?.id) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const {
        page = 1,
        limit = 50,
        source,
        eventType,
        processed,
        verified,
        from,
        to,
      } = req.query;

      const offset = (parseInt(page as string) - 1) * parseInt(limit as string);
      
      let whereConditions = ['1=1'];
      const replacements: any[] = [];

      if (source) {
        whereConditions.push('source = ?');
        replacements.push(source);
      }

      if (eventType) {
        whereConditions.push('"eventType" = ?');
        replacements.push(eventType);
      }

      if (processed !== undefined) {
        whereConditions.push('processed = ?');
        replacements.push(processed === 'true');
      }

      if (verified !== undefined) {
        whereConditions.push('verified = ?');
        replacements.push(verified === 'true');
      }

      if (from) {
        whereConditions.push('"createdAt" >= ?');
        replacements.push(new Date(from as string));
      }

      if (to) {
        whereConditions.push('"createdAt" <= ?');
        replacements.push(new Date(to as string));
      }

      const { sequelize } = require('../config/database');

      const [logs, totalResult] = await Promise.all([
        sequelize.query(
          `
          SELECT *
          FROM incoming_webhook_logs
          WHERE ${whereConditions.join(' AND ')}
          ORDER BY "createdAt" DESC
          LIMIT ? OFFSET ?
          `,
          {
            replacements: [...replacements, parseInt(limit as string), offset],
            type: QueryTypes.SELECT,
          }
        ),
        sequelize.query(
          `
          SELECT COUNT(*) as total
          FROM incoming_webhook_logs
          WHERE ${whereConditions.join(' AND ')}
          `,
          {
            replacements,
            type: QueryTypes.SELECT,
          }
        ),
      ]);

      const total = parseInt((totalResult[0] as any).total);
      const totalPages = Math.ceil(total / parseInt(limit as string));

      res.json({
        success: true,
        data: {
          logs: logs.map((log: any) => ({
            ...log,
            payload: JSON.parse(log.payload || '{}'),
            headers: JSON.parse(log.headers || '{}'),
            listingsAffected: JSON.parse(log.listingsAffected || '[]'),
          })),
          pagination: {
            page: parseInt(page as string),
            limit: parseInt(limit as string),
            total,
            totalPages,
            hasNext: parseInt(page as string) < totalPages,
            hasPrev: parseInt(page as string) > 1,
          },
        },
      });
    } catch (error) {
      handleControllerError(error, res, 'Failed to retrieve incoming webhook logs');
    }
  }

  /**
   * Get webhook statistics
   */
  static async getWebhookStats(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user?.id) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const { from, to } = req.query;
      const fromDate = from ? new Date(from as string) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const toDate = to ? new Date(to as string) : new Date();

      const { sequelize } = require('../config/database');

      const [outgoingStats, incomingStats, endpointStats] = await Promise.all([
        sequelize.query(
          `
          SELECT 
            status,
            COUNT(*) as count,
            AVG("responseTime") as avg_response_time
          FROM webhook_events
          WHERE "createdAt" BETWEEN ? AND ?
          GROUP BY status
          `,
          {
            replacements: [fromDate, toDate],
            type: QueryTypes.SELECT,
          }
        ),
        sequelize.query(
          `
          SELECT 
            source,
            "processingStatus",
            COUNT(*) as count
          FROM incoming_webhook_logs
          WHERE "createdAt" BETWEEN ? AND ?
          GROUP BY source, "processingStatus"
          `,
          {
            replacements: [fromDate, toDate],
            type: QueryTypes.SELECT,
          }
        ),
        sequelize.query(
          `
          SELECT 
            id,
            name,
            url,
            source,
            "isActive",
            "failureCount",
            "lastUsed"
          FROM webhook_endpoints
          ORDER BY "createdAt" DESC
          `,
          {
            type: QueryTypes.SELECT,
          }
        ),
      ]);

      res.json({
        success: true,
        data: {
          period: { from: fromDate, to: toDate },
          outgoing: outgoingStats,
          incoming: incomingStats,
          endpoints: endpointStats,
        },
      });
    } catch (error) {
      handleControllerError(error, res, 'Failed to retrieve webhook statistics');
    }
  }
}