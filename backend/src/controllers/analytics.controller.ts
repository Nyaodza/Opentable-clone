import { Request, Response } from 'express';
import { AnalyticsService } from '../services/analytics.service';
import { AppError } from '../utils/errors';
import { logger } from '../utils/logger';

export class AnalyticsController {
  static async trackEvent(req: Request, res: Response): Promise<void> {
    try {
      const { eventName, properties = {} } = req.body;
      const userId = (req as any).user?.id;

      if (!eventName) {
        throw new AppError('Event name is required', 400);
      }

      await AnalyticsService.trackEvent(eventName, properties, req, userId);

      res.status(200).json({
        success: true,
        message: 'Event tracked successfully',
      });
    } catch (error) {
      logger.error('Failed to track event:', error);
      throw new AppError('Failed to track event', 500);
    }
  }

  static async trackPageView(req: Request, res: Response): Promise<void> {
    try {
      const { page, properties = {} } = req.body;
      const userId = (req as any).user?.id;

      if (!page) {
        throw new AppError('Page is required', 400);
      }

      await AnalyticsService.trackPageView(page, properties, req, userId);

      res.status(200).json({
        success: true,
        message: 'Page view tracked successfully',
      });
    } catch (error) {
      logger.error('Failed to track page view:', error);
      throw new AppError('Failed to track page view', 500);
    }
  }

  static async createUserSegment(req: Request, res: Response): Promise<void> {
    try {
      const { name, description, conditions } = req.body;

      if (!name || !conditions || !Array.isArray(conditions)) {
        throw new AppError('Name and conditions are required', 400);
      }

      const segment = await AnalyticsService.createUserSegment(name, description, conditions);

      res.status(201).json({
        success: true,
        data: segment,
      });
    } catch (error) {
      logger.error('Failed to create user segment:', error);
      throw new AppError('Failed to create user segment', 500);
    }
  }

  static async getUserSegments(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.params.userId || (req as any).user?.id;

      if (!userId) {
        throw new AppError('User ID is required', 400);
      }

      const segments = await AnalyticsService.getUserSegments(userId);

      res.status(200).json({
        success: true,
        data: segments,
      });
    } catch (error) {
      logger.error('Failed to get user segments:', error);
      throw new AppError('Failed to get user segments', 500);
    }
  }

  static async getSegmentUsers(req: Request, res: Response): Promise<void> {
    try {
      const { segmentId } = req.params;
      const limit = parseInt(req.query.limit as string) || 100;
      const offset = parseInt(req.query.offset as string) || 0;

      const users = await AnalyticsService.getSegmentUsers(segmentId, limit, offset);

      res.status(200).json({
        success: true,
        data: {
          users,
          pagination: {
            limit,
            offset,
            total: users.length,
          },
        },
      });
    } catch (error) {
      logger.error('Failed to get segment users:', error);
      throw new AppError('Failed to get segment users', 500);
    }
  }

  static async createFunnel(req: Request, res: Response): Promise<void> {
    try {
      const { name, steps, timeWindow = 24 } = req.body;

      if (!name || !steps || !Array.isArray(steps)) {
        throw new AppError('Name and steps are required', 400);
      }

      const funnel = await AnalyticsService.createFunnel(name, steps, timeWindow);

      res.status(201).json({
        success: true,
        data: funnel,
      });
    } catch (error) {
      logger.error('Failed to create funnel:', error);
      throw new AppError('Failed to create funnel', 500);
    }
  }

  static async analyzeFunnel(req: Request, res: Response): Promise<void> {
    try {
      const { funnelId } = req.params;
      const { startDate, endDate, segmentId } = req.query;

      if (!startDate || !endDate) {
        throw new AppError('Start date and end date are required', 400);
      }

      const start = new Date(startDate as string);
      const end = new Date(endDate as string);

      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        throw new AppError('Invalid date format', 400);
      }

      const analysis = await AnalyticsService.analyzeFunnel(
        funnelId,
        start,
        end,
        segmentId as string
      );

      res.status(200).json({
        success: true,
        data: analysis,
      });
    } catch (error) {
      logger.error('Failed to analyze funnel:', error);
      throw new AppError('Failed to analyze funnel', 500);
    }
  }

  static async performCohortAnalysis(req: Request, res: Response): Promise<void> {
    try {
      const { startDate, endDate, periods } = req.query;

      if (!startDate || !endDate) {
        throw new AppError('Start date and end date are required', 400);
      }

      const start = new Date(startDate as string);
      const end = new Date(endDate as string);

      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        throw new AppError('Invalid date format', 400);
      }

      const periodsArray = periods 
        ? (periods as string).split(',')
        : ['1d', '7d', '30d', '90d'];

      const cohorts = await AnalyticsService.performCohortAnalysis(start, end, periodsArray);

      res.status(200).json({
        success: true,
        data: cohorts,
      });
    } catch (error) {
      logger.error('Failed to perform cohort analysis:', error);
      throw new AppError('Failed to perform cohort analysis', 500);
    }
  }

  static async getRealTimeMetrics(req: Request, res: Response): Promise<void> {
    try {
      const metrics = await AnalyticsService.getRealTimeMetrics();

      res.status(200).json({
        success: true,
        data: metrics,
      });
    } catch (error) {
      logger.error('Failed to get real-time metrics:', error);
      throw new AppError('Failed to get real-time metrics', 500);
    }
  }

  static async generateCustomReport(req: Request, res: Response): Promise<void> {
    try {
      const { metrics, dimensions, filters = {}, startDate, endDate } = req.body;

      if (!metrics || !Array.isArray(metrics) || metrics.length === 0) {
        throw new AppError('Metrics are required', 400);
      }

      if (!dimensions || !Array.isArray(dimensions)) {
        throw new AppError('Dimensions are required', 400);
      }

      if (!startDate || !endDate) {
        throw new AppError('Start date and end date are required', 400);
      }

      const start = new Date(startDate);
      const end = new Date(endDate);

      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        throw new AppError('Invalid date format', 400);
      }

      const report = await AnalyticsService.generateCustomReport(
        metrics,
        dimensions,
        filters,
        start,
        end
      );

      res.status(200).json({
        success: true,
        data: report,
      });
    } catch (error) {
      logger.error('Failed to generate custom report:', error);
      throw new AppError('Failed to generate custom report', 500);
    }
  }

  static async trackExperiment(req: Request, res: Response): Promise<void> {
    try {
      const { experimentId, variant, conversionEvent } = req.body;
      const userId = (req as any).user?.id;

      if (!experimentId || !variant) {
        throw new AppError('Experiment ID and variant are required', 400);
      }

      if (!userId) {
        throw new AppError('User must be authenticated', 401);
      }

      await AnalyticsService.trackExperiment(experimentId, variant, userId, conversionEvent);

      res.status(200).json({
        success: true,
        message: 'Experiment tracked successfully',
      });
    } catch (error) {
      logger.error('Failed to track experiment:', error);
      throw new AppError('Failed to track experiment', 500);
    }
  }

  static async getExperimentResults(req: Request, res: Response): Promise<void> {
    try {
      const { experimentId } = req.params;

      const results = await AnalyticsService.getExperimentResults(experimentId);

      res.status(200).json({
        success: true,
        data: results,
      });
    } catch (error) {
      logger.error('Failed to get experiment results:', error);
      throw new AppError('Failed to get experiment results', 500);
    }
  }

  // Dashboard endpoints
  static async getDashboardData(req: Request, res: Response): Promise<void> {
    try {
      const { timeRange = '7d' } = req.query;
      const tenantId = (req as any).tenant?.id;

      // Calculate date range
      const endDate = new Date();
      const startDate = new Date();
      
      switch (timeRange) {
        case '1d':
          startDate.setDate(startDate.getDate() - 1);
          break;
        case '7d':
          startDate.setDate(startDate.getDate() - 7);
          break;
        case '30d':
          startDate.setDate(startDate.getDate() - 30);
          break;
        case '90d':
          startDate.setDate(startDate.getDate() - 90);
          break;
        default:
          startDate.setDate(startDate.getDate() - 7);
      }

      const [realTimeMetrics] = await Promise.all([
        AnalyticsService.getRealTimeMetrics(),
      ]);

      const dashboardData = {
        realTime: realTimeMetrics,
        timeRange: { startDate, endDate },
        tenantId,
      };

      res.status(200).json({
        success: true,
        data: dashboardData,
      });
    } catch (error) {
      logger.error('Failed to get dashboard data:', error);
      throw new AppError('Failed to get dashboard data', 500);
    }
  }

  static async getPopularContent(req: Request, res: Response): Promise<void> {
    try {
      const { type = 'pages', limit = 10 } = req.query;

      // This would typically query your analytics data
      const mockData = {
        pages: [
          { path: '/restaurants', views: 1250, uniqueViews: 890 },
          { path: '/search', views: 980, uniqueViews: 745 },
          { path: '/reservations', views: 567, uniqueViews: 432 },
        ],
        restaurants: [
          { id: '1', name: 'The French Laundry', views: 345, reservations: 23 },
          { id: '2', name: 'Le Bernardin', views: 298, reservations: 19 },
          { id: '3', name: 'Eleven Madison Park', views: 276, reservations: 15 },
        ],
      };

      res.status(200).json({
        success: true,
        data: mockData[type as keyof typeof mockData] || [],
      });
    } catch (error) {
      logger.error('Failed to get popular content:', error);
      throw new AppError('Failed to get popular content', 500);
    }
  }

  static async getUserJourney(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const { limit = 50 } = req.query;

      if (!userId) {
        throw new AppError('User ID is required', 400);
      }

      // This would typically query your user's event history
      const mockJourney = [
        {
          timestamp: new Date(),
          event: 'page_view',
          properties: { page: '/home' },
        },
        {
          timestamp: new Date(Date.now() - 60000),
          event: 'search',
          properties: { query: 'italian restaurant' },
        },
        {
          timestamp: new Date(Date.now() - 120000),
          event: 'restaurant_view',
          properties: { restaurantId: '123' },
        },
      ];

      res.status(200).json({
        success: true,
        data: {
          userId,
          journey: mockJourney.slice(0, parseInt(limit as string)),
        },
      });
    } catch (error) {
      logger.error('Failed to get user journey:', error);
      throw new AppError('Failed to get user journey', 500);
    }
  }
}