import { Request, Response, NextFunction } from 'express';
import { AnalyticsService } from '../services/analytics.service';
import { logger } from '../utils/logger';

interface AnalyticsRequest extends Request {
  analytics?: {
    skipTracking?: boolean;
    customProperties?: Record<string, any>;
  };
}

export const trackPageView = (req: AnalyticsRequest, res: Response, next: NextFunction) => {
  // Skip if explicitly disabled
  if (req.analytics?.skipTracking) {
    return next();
  }

  // Skip for API endpoints and static assets
  if (req.path.startsWith('/api') || req.path.includes('.')) {
    return next();
  }

  // Track page view asynchronously
  setImmediate(async () => {
    try {
      const userId = (req as any).user?.id;
      const properties = {
        path: req.path,
        method: req.method,
        query: req.query,
        ...req.analytics?.customProperties,
      };

      await AnalyticsService.trackPageView(req.path, properties, req, userId);
    } catch (error) {
      logger.error('Failed to track page view:', error);
    }
  });

  next();
};

export const trackUserAction = (action: string, target?: string) => {
  return (req: AnalyticsRequest, res: Response, next: NextFunction) => {
    if (req.analytics?.skipTracking) {
      return next();
    }

    // Track after response is sent
    res.on('finish', async () => {
      try {
        const userId = (req as any).user?.id;
        const properties = {
          action,
          target: target || req.path,
          statusCode: res.statusCode,
          ...req.analytics?.customProperties,
        };

        await AnalyticsService.trackUserAction(action, target || req.path, properties, req, userId);
      } catch (error) {
        logger.error('Failed to track user action:', error);
      }
    });

    next();
  };
};

export const trackBusinessEvent = (eventName: string) => {
  return (req: AnalyticsRequest, res: Response, next: NextFunction) => {
    if (req.analytics?.skipTracking) {
      return next();
    }

    // Track after response is sent
    res.on('finish', async () => {
      try {
        const userId = (req as any).user?.id;
        const properties = {
          event: eventName,
          statusCode: res.statusCode,
          ...req.analytics?.customProperties,
        };

        await AnalyticsService.trackBusinessEvent(eventName, properties, req, userId);
      } catch (error) {
        logger.error('Failed to track business event:', error);
      }
    });

    next();
  };
};

export const trackApiUsage = (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();

  // Track after response is sent
  res.on('finish', async () => {
    try {
      const duration = Date.now() - startTime;
      const userId = (req as any).user?.id;
      const endpoint = `${req.method} ${req.route?.path || req.path}`;

      const properties = {
        endpoint,
        method: req.method,
        statusCode: res.statusCode,
        duration,
        userAgent: req.get('User-Agent'),
        contentLength: res.get('Content-Length'),
      };

      await AnalyticsService.trackEvent('api_request', properties, req, userId);
    } catch (error) {
      logger.error('Failed to track API usage:', error);
    }
  });

  next();
};

export const trackError = (req: Request, res: Response, next: NextFunction) => {
  // Track after response is sent if it's an error
  res.on('finish', async () => {
    if (res.statusCode >= 400) {
      try {
        const userId = (req as any).user?.id;
        const properties = {
          statusCode: res.statusCode,
          method: req.method,
          path: req.path,
          userAgent: req.get('User-Agent'),
          error: res.statusMessage,
        };

        await AnalyticsService.trackEvent('error', properties, req, userId);
      } catch (error) {
        logger.error('Failed to track error:', error);
      }
    }
  });

  next();
};

export const setAnalyticsProperties = (properties: Record<string, any>) => {
  return (req: AnalyticsRequest, res: Response, next: NextFunction) => {
    if (!req.analytics) {
      req.analytics = {};
    }
    req.analytics.customProperties = {
      ...req.analytics.customProperties,
      ...properties,
    };
    next();
  };
};

export const skipAnalytics = (req: AnalyticsRequest, res: Response, next: NextFunction) => {
  if (!req.analytics) {
    req.analytics = {};
  }
  req.analytics.skipTracking = true;
  next();
};

// Performance monitoring middleware
export const trackPerformance = (req: Request, res: Response, next: NextFunction) => {
  const startTime = process.hrtime.bigint();
  const startMemory = process.memoryUsage();

  res.on('finish', async () => {
    try {
      const endTime = process.hrtime.bigint();
      const endMemory = process.memoryUsage();
      
      const duration = Number(endTime - startTime) / 1_000_000; // Convert to milliseconds
      const memoryDelta = {
        rss: endMemory.rss - startMemory.rss,
        heapUsed: endMemory.heapUsed - startMemory.heapUsed,
        heapTotal: endMemory.heapTotal - startMemory.heapTotal,
        external: endMemory.external - startMemory.external,
      };

      const userId = (req as any).user?.id;
      const properties = {
        endpoint: `${req.method} ${req.route?.path || req.path}`,
        duration,
        memoryDelta,
        statusCode: res.statusCode,
        contentLength: res.get('Content-Length'),
      };

      await AnalyticsService.trackEvent('performance', properties, req, userId);
    } catch (error) {
      logger.error('Failed to track performance:', error);
    }
  });

  next();
};

// Security monitoring middleware
export const trackSecurityEvent = (eventType: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    setImmediate(async () => {
      try {
        const userId = (req as any).user?.id;
        const properties = {
          eventType,
          path: req.path,
          method: req.method,
          userAgent: req.get('User-Agent'),
          timestamp: new Date(),
        };

        await AnalyticsService.trackEvent('security_event', properties, req, userId);
      } catch (error) {
        logger.error('Failed to track security event:', error);
      }
    });

    next();
  };
};