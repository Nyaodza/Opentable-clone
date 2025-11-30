import { Request, Response } from 'express';
import { ProviderHealthMonitor } from '../services/monitoring/ProviderHealthMonitor';
import { AlertManager } from '../services/monitoring/AlertManager';
import { ListingSource } from '../models/UnifiedListing';
import { logger } from '../utils/logger';

export class MonitoringController {
  private static healthMonitor = ProviderHealthMonitor.getInstance();
  private static alertManager = AlertManager.getInstance();

  // Public getter for healthMonitor
  static getHealthMonitor() {
    return this.healthMonitor;
  }

  // Health monitoring endpoints
  static async getHealthOverview(req: Request, res: Response) {
    try {
      const [healthSummary, allProviderHealth, activeAlerts] = await Promise.all([
        MonitoringController.healthMonitor.getHealthSummary(),
        MonitoringController.healthMonitor.getAllProviderHealth(),
        MonitoringController.alertManager.getActiveAlerts(),
      ]);

      res.json({
        summary: healthSummary,
        providers: allProviderHealth,
        activeAlerts: activeAlerts.length,
        lastUpdated: new Date(),
      });
    } catch (error) {
      logger.error('Error getting health overview:', error);
      res.status(500).json({ error: 'Failed to get health overview' });
    }
  }

  static async getProviderHealth(req: Request, res: Response) {
    try {
      const { source } = req.params;
      
      if (!Object.values(ListingSource).includes(source as ListingSource)) {
        return res.status(400).json({ error: 'Invalid provider source' });
      }

      const [health, metrics] = await Promise.all([
        MonitoringController.healthMonitor.getProviderHealth(source as ListingSource),
        MonitoringController.healthMonitor.getProviderMetrics(source as ListingSource),
      ]);

      if (!health) {
        return res.status(404).json({ error: 'Provider not found' });
      }

      res.json({
        health,
        metrics,
      });
    } catch (error) {
      logger.error('Error getting provider health:', error);
      res.status(500).json({ error: 'Failed to get provider health' });
    }
  }

  static async forceHealthCheck(req: Request, res: Response) {
    try {
      const { source } = req.params;
      
      if (!Object.values(ListingSource).includes(source as ListingSource)) {
        return res.status(400).json({ error: 'Invalid provider source' });
      }

      await MonitoringController.healthMonitor.forceHealthCheck(source as ListingSource);
      
      // Wait a moment for the check to complete
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const health = await MonitoringController.healthMonitor.getProviderHealth(source as ListingSource);
      
      res.json({
        message: 'Health check completed',
        health,
      });
    } catch (error) {
      logger.error('Error forcing health check:', error);
      res.status(500).json({ error: 'Failed to force health check' });
    }
  }

  static async enableProvider(req: Request, res: Response) {
    try {
      const { source } = req.params;
      
      if (!Object.values(ListingSource).includes(source as ListingSource)) {
        return res.status(400).json({ error: 'Invalid provider source' });
      }

      await MonitoringController.healthMonitor.enableProvider(source as ListingSource);
      
      res.json({
        message: `Provider ${source} enabled`,
      });
    } catch (error) {
      logger.error('Error enabling provider:', error);
      res.status(500).json({ error: 'Failed to enable provider' });
    }
  }

  // Alert management endpoints
  static async getActiveAlerts(req: Request, res: Response) {
    try {
      const activeAlerts = await MonitoringController.alertManager.getActiveAlerts();
      
      res.json({
        alerts: activeAlerts,
        count: activeAlerts.length,
      });
    } catch (error) {
      logger.error('Error getting active alerts:', error);
      res.status(500).json({ error: 'Failed to get active alerts' });
    }
  }

  static async getAlertHistory(req: Request, res: Response) {
    try {
      const { limit = 50, severity, source } = req.query;
      
      let alerts = await MonitoringController.alertManager.getAlertHistory(parseInt(limit as string));
      
      // Filter by severity if specified
      if (severity) {
        alerts = alerts.filter(alert => alert.severity === severity);
      }
      
      // Filter by source if specified
      if (source) {
        alerts = alerts.filter(alert => alert.source === source);
      }
      
      res.json({
        alerts,
        count: alerts.length,
        filters: {
          limit: parseInt(limit as string),
          severity,
          source,
        },
      });
    } catch (error) {
      logger.error('Error getting alert history:', error);
      res.status(500).json({ error: 'Failed to get alert history' });
    }
  }

  static async acknowledgeAlert(req: Request, res: Response) {
    try {
      const { alertId } = req.params;
      const acknowledgedBy = req.user?.email || 'unknown';
      
      const success = await MonitoringController.alertManager.acknowledgeAlert(alertId, acknowledgedBy);
      
      if (!success) {
        return res.status(404).json({ error: 'Alert not found' });
      }
      
      res.json({
        message: 'Alert acknowledged',
        acknowledgedBy,
      });
    } catch (error) {
      logger.error('Error acknowledging alert:', error);
      res.status(500).json({ error: 'Failed to acknowledge alert' });
    }
  }

  static async getAlertRules(req: Request, res: Response) {
    try {
      const rules = await MonitoringController.alertManager.getAlertRules();
      
      res.json({
        rules,
        count: rules.length,
      });
    } catch (error) {
      logger.error('Error getting alert rules:', error);
      res.status(500).json({ error: 'Failed to get alert rules' });
    }
  }

  static async updateAlertRule(req: Request, res: Response) {
    try {
      const { ruleId } = req.params;
      const updates = req.body;
      
      const success = await MonitoringController.alertManager.updateAlertRule(ruleId, updates);
      
      if (!success) {
        return res.status(404).json({ error: 'Alert rule not found' });
      }
      
      res.json({
        message: 'Alert rule updated',
        ruleId,
        updates,
      });
    } catch (error) {
      logger.error('Error updating alert rule:', error);
      res.status(500).json({ error: 'Failed to update alert rule' });
    }
  }

  // System metrics endpoints
  static async getSystemMetrics(req: Request, res: Response) {
    try {
      const { period = '1h' } = req.query;
      
      // Get basic system metrics
      const metrics = {
        timestamp: new Date(),
        period,
        providers: await MonitoringController.healthMonitor.getAllProviderHealth(),
        summary: await MonitoringController.healthMonitor.getHealthSummary(),
        alerts: {
          active: (await MonitoringController.alertManager.getActiveAlerts()).length,
          last24h: (await MonitoringController.alertManager.getAlertHistory(100))
            .filter(alert => alert.timestamp > new Date(Date.now() - 24 * 60 * 60 * 1000)).length,
        },
        uptime: {
          service: process.uptime(),
          monitoring: Date.now() - (process.env.MONITORING_START_TIME ? parseInt(process.env.MONITORING_START_TIME) : Date.now()),
        },
      };
      
      res.json(metrics);
    } catch (error) {
      logger.error('Error getting system metrics:', error);
      res.status(500).json({ error: 'Failed to get system metrics' });
    }
  }

  // Real-time endpoints (for WebSocket or SSE)
  static async getRealtimeHealth(req: Request, res: Response) {
    try {
      // Set up Server-Sent Events
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
      });

      const sendUpdate = async () => {
        try {
          const healthData = {
            timestamp: new Date(),
            summary: await MonitoringController.healthMonitor.getHealthSummary(),
            alerts: await MonitoringController.alertManager.getActiveAlerts(),
          };
          
          res.write(`data: ${JSON.stringify(healthData)}\n\n`);
        } catch (error) {
          logger.error('Error sending realtime health update:', error);
        }
      };

      // Send initial data
      await sendUpdate();
      
      // Send updates every 30 seconds
      const interval = setInterval(sendUpdate, 30000);
      
      // Clean up on client disconnect
      req.on('close', () => {
        clearInterval(interval);
        res.end();
      });
      
    } catch (error) {
      logger.error('Error setting up realtime health stream:', error);
      res.status(500).json({ error: 'Failed to setup realtime stream' });
    }
  }

  // Bulk operations
  static async getBulkProviderStatus(req: Request, res: Response) {
    try {
      const { sources } = req.body;
      
      if (!Array.isArray(sources)) {
        return res.status(400).json({ error: 'Sources must be an array' });
      }
      
      const results = await Promise.allSettled(
        sources.map(async (source) => {
          const [health, metrics] = await Promise.all([
            MonitoringController.healthMonitor.getProviderHealth(source),
            MonitoringController.healthMonitor.getProviderMetrics(source),
          ]);
          return { source, health, metrics };
        })
      );
      
      const successful = results
        .filter(result => result.status === 'fulfilled')
        .map(result => (result as PromiseFulfilledResult<any>).value);
        
      const failed = results
        .filter(result => result.status === 'rejected')
        .map((result, index) => ({ 
          source: sources[index], 
          error: (result as PromiseRejectedResult).reason.message 
        }));
      
      res.json({
        successful,
        failed,
        total: sources.length,
      });
    } catch (error) {
      logger.error('Error getting bulk provider status:', error);
      res.status(500).json({ error: 'Failed to get bulk provider status' });
    }
  }
}