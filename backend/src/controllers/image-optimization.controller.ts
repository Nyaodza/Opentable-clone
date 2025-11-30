import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import { ImageOptimizationService } from '../services/ImageOptimizationService';
import { ImageProcessingQueue } from '../services/ImageProcessingQueue';
import { logger } from '../utils/logger';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import { QueryTypes } from 'sequelize';
import { handleControllerError } from '../utils/error-handler';

const upload = multer({
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, WebP, and AVIF are allowed.'));
    }
  },
});

export class ImageOptimizationController {
  private static imageService = ImageOptimizationService.getInstance();
  private static processingQueue = ImageProcessingQueue.getInstance();

  /**
   * Upload and optimize single image
   */
  static uploadSingle = upload.single('image');

  static async optimizeSingleImage(req: Request, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          error: 'Validation failed',
          details: errors.array(),
        });
        return;
      }

      if (!req.file) {
        res.status(400).json({ error: 'No image file provided' });
        return;
      }

      const { listingId } = req.body;

      if (!listingId) {
        res.status(400).json({ error: 'Listing ID is required' });
        return;
      }

      const optimized = await ImageOptimizationController.imageService.processUploadedImage(
        req.file.buffer,
        req.file.originalname,
        listingId
      );

      res.json({
        success: true,
        data: optimized,
      });
    } catch (error) {
      handleControllerError(error, res, 'Failed to optimize image');
    }
  }

  /**
   * Upload and optimize multiple images
   */
  static uploadMultiple = upload.array('images', 10);

  static async optimizeMultipleImages(req: Request, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          error: 'Validation failed',
          details: errors.array(),
        });
        return;
      }

      if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
        res.status(400).json({ error: 'No image files provided' });
        return;
      }

      const { listingId } = req.body;

      if (!listingId) {
        res.status(400).json({ error: 'Listing ID is required' });
        return;
      }

      const results = await Promise.allSettled(
        req.files.map(file =>
          ImageOptimizationController.imageService.processUploadedImage(
            file.buffer,
            file.originalname,
            listingId
          )
        )
      );

      const optimizedImages = results
        .filter(result => result.status === 'fulfilled')
        .map(result => (result as any).value);

      const processingErrors = results
        .filter(result => result.status === 'rejected')
        .map((result, index) => ({
          file: (req.files as Express.Multer.File[])[index].originalname,
          error: (result as any).reason.message,
        }));

      res.json({
        success: true,
        data: {
          optimized: optimizedImages,
          errors: processingErrors.length > 0 ? processingErrors : undefined,
        },
      });
    } catch (error) {
      handleControllerError(error, res, 'Failed to optimize images');
    }
  }

  /**
   * Optimize images from URLs
   */
  static async optimizeFromUrls(req: Request, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          error: 'Validation failed',
          details: errors.array(),
        });
        return;
      }

      const { listingId, imageUrls, priority = 0 } = req.body;

      if (!imageUrls || !Array.isArray(imageUrls) || imageUrls.length === 0) {
        res.status(400).json({ error: 'Image URLs array is required' });
        return;
      }

      // Add to processing queue
      const queueIds = await ImageOptimizationController.processingQueue.addToQueue(
        listingId,
        imageUrls,
        priority
      );

      res.json({
        success: true,
        data: {
          message: `${imageUrls.length} images added to processing queue`,
          queueIds,
        },
      });
    } catch (error) {
      handleControllerError(error, res, 'Failed to process images');
    }
  }

  /**
   * Get queue status
   */
  static async getQueueStatus(req: Request, res: Response): Promise<void> {
    try {
      const stats = await ImageOptimizationController.processingQueue.getQueueStats();

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      handleControllerError(error, res, 'Failed to get queue status');
    }
  }

  /**
   * Reprocess failed images
   */
  static async reprocessFailed(req: Request, res: Response): Promise<void> {
    try {
      const { limit } = req.query;
      
      const count = await ImageOptimizationController.processingQueue.reprocessFailed(
        limit ? parseInt(limit as string) : undefined
      );

      res.json({
        success: true,
        data: {
          message: `${count} failed images requeued for processing`,
          count,
        },
      });
    } catch (error) {
      handleControllerError(error, res, 'Failed to reprocess images');
    }
  }

  /**
   * Generate responsive image srcset
   */
  static async generateSrcSet(req: Request, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          error: 'Validation failed',
          details: errors.array(),
        });
        return;
      }

      const { imageUrl, listingId } = req.query;

      if (!imageUrl || !listingId) {
        res.status(400).json({ error: 'Image URL and listing ID are required' });
        return;
      }

      const srcset = await ImageOptimizationController.imageService.generateSrcSet(
        imageUrl as string,
        listingId as string
      );

      res.json({
        success: true,
        data: {
          srcset,
        },
      });
    } catch (error) {
      handleControllerError(error, res, 'Failed to generate srcset');
    }
  }

  /**
   * Get image performance analytics
   */
  static async getImagePerformance(req: Request, res: Response): Promise<void> {
    try {
      const { listingId } = req.params;

      if (!listingId) {
        res.status(400).json({ error: 'Listing ID is required' });
        return;
      }

      const performance = await ImageOptimizationController.imageService.analyzeImagePerformance(listingId);

      res.json({
        success: true,
        data: performance,
      });
    } catch (error) {
      handleControllerError(error, res, 'Failed to get image performance');
    }
  }

  /**
   * Clean up unused images
   */
  static async cleanupUnused(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user?.id || req.user.role !== 'admin') {
        res.status(403).json({ error: 'Admin access required' });
        return;
      }

      const { olderThanDays = 30 } = req.query;

      const deletedCount = await ImageOptimizationController.imageService.cleanupUnusedImages(
        parseInt(olderThanDays as string)
      );

      res.json({
        success: true,
        data: {
          message: `Cleaned up ${deletedCount} unused images`,
          deletedCount,
        },
      });
    } catch (error) {
      handleControllerError(error, res, 'Failed to cleanup images');
    }
  }

  /**
   * Clear completed queue items
   */
  static async clearCompletedQueue(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user?.id || req.user.role !== 'admin') {
        res.status(403).json({ error: 'Admin access required' });
        return;
      }

      const { olderThanDays = 7 } = req.query;

      const clearedCount = await ImageOptimizationController.processingQueue.clearCompleted(
        parseInt(olderThanDays as string)
      );

      res.json({
        success: true,
        data: {
          message: `Cleared ${clearedCount} completed queue items`,
          clearedCount,
        },
      });
    } catch (error) {
      handleControllerError(error, res, 'Failed to clear queue');
    }
  }

  /**
   * Get CDN statistics
   */
  static async getCDNStats(req: Request, res: Response): Promise<void> {
    try {
      const { sequelize } = require('../config/database');

      const [
        totalStats,
        providerStats,
        recentActivity,
      ] = await Promise.all([
        sequelize.query(
          `
          SELECT 
            COUNT(*) as total_entries,
            SUM(size) as total_size,
            SUM(hits) as total_hits,
            SUM(bandwidth) as total_bandwidth,
            AVG(size) as avg_size
          FROM cdn_cache_entries
          `,
          { type: QueryTypes.SELECT }
        ),
        sequelize.query(
          `
          SELECT 
            provider,
            COUNT(*) as entries,
            SUM(size) as size,
            SUM(hits) as hits,
            SUM(bandwidth) as bandwidth
          FROM cdn_cache_entries
          GROUP BY provider
          ORDER BY entries DESC
          `,
          { type: QueryTypes.SELECT }
        ),
        sequelize.query(
          `
          SELECT 
            DATE("lastModified") as date,
            COUNT(*) as uploads,
            SUM(size) as size
          FROM cdn_cache_entries
          WHERE "lastModified" > NOW() - INTERVAL '30 days'
          GROUP BY date
          ORDER BY date DESC
          `,
          { type: QueryTypes.SELECT }
        ),
      ]);

      res.json({
        success: true,
        data: {
          total: totalStats[0],
          byProvider: providerStats,
          recentActivity,
        },
      });
    } catch (error) {
      handleControllerError(error, res, 'Failed to get CDN statistics');
    }
  }

  /**
   * Track image performance metrics
   */
  static async trackPerformance(req: Request, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          error: 'Validation failed',
          details: errors.array(),
        });
        return;
      }

      const {
        imageId,
        loadTime,
        renderTime,
        viewportSize,
        deviceType,
        connectionType,
        cacheHit,
        lazyLoaded,
        userAgent,
        country,
      } = req.body;

      const { sequelize } = require('../config/database');

      await sequelize.query(
        `
        INSERT INTO image_performance_metrics (
          id, "imageId", "loadTime", "renderTime", "viewportSize",
          "deviceType", "connectionType", "cacheHit", "lazyLoaded",
          "userAgent", country, "createdAt"
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
        `,
        {
          replacements: [
            uuidv4(),
            imageId,
            loadTime,
            renderTime,
            viewportSize,
            deviceType,
            connectionType || null,
            cacheHit || false,
            lazyLoaded || false,
            userAgent || null,
            country || null,
          ],
        }
      );

      res.json({
        success: true,
        message: 'Performance metrics tracked',
      });
    } catch (error) {
      handleControllerError(error, res, 'Failed to track performance');
    }
  }

  /**
   * Get performance report
   */
  static async getPerformanceReport(req: Request, res: Response): Promise<void> {
    try {
      const { period = '7d' } = req.query;
      
      let interval;
      switch (period) {
        case '24h':
          interval = '24 hours';
          break;
        case '7d':
          interval = '7 days';
          break;
        case '30d':
          interval = '30 days';
          break;
        default:
          interval = '7 days';
      }

      const { sequelize } = require('../config/database');

      const [
        avgMetrics,
        deviceBreakdown,
        cachePerformance,
        slowestImages,
      ] = await Promise.all([
        sequelize.query(
          `
          SELECT 
            AVG("loadTime") as avg_load_time,
            AVG("renderTime") as avg_render_time,
            PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY "loadTime") as median_load_time,
            PERCENTILE_CONT(0.9) WITHIN GROUP (ORDER BY "loadTime") as p90_load_time,
            PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY "loadTime") as p95_load_time
          FROM image_performance_metrics
          WHERE "createdAt" > NOW() - INTERVAL '${interval}'
          `,
          { type: QueryTypes.SELECT }
        ),
        sequelize.query(
          `
          SELECT 
            "deviceType",
            COUNT(*) as count,
            AVG("loadTime") as avg_load_time,
            AVG("renderTime") as avg_render_time
          FROM image_performance_metrics
          WHERE "createdAt" > NOW() - INTERVAL '${interval}'
          GROUP BY "deviceType"
          ORDER BY count DESC
          `,
          { type: QueryTypes.SELECT }
        ),
        sequelize.query(
          `
          SELECT 
            "cacheHit",
            COUNT(*) as count,
            AVG("loadTime") as avg_load_time
          FROM image_performance_metrics
          WHERE "createdAt" > NOW() - INTERVAL '${interval}'
          GROUP BY "cacheHit"
          `,
          { type: QueryTypes.SELECT }
        ),
        sequelize.query(
          `
          SELECT 
            ipm."imageId",
            li."cdnUrl",
            AVG(ipm."loadTime") as avg_load_time,
            COUNT(*) as load_count
          FROM image_performance_metrics ipm
          JOIN listing_images li ON ipm."imageId" = li.id
          WHERE ipm."createdAt" > NOW() - INTERVAL '${interval}'
          GROUP BY ipm."imageId", li."cdnUrl"
          ORDER BY avg_load_time DESC
          LIMIT 10
          `,
          { type: QueryTypes.SELECT }
        ),
      ]);

      res.json({
        success: true,
        data: {
          period,
          averageMetrics: avgMetrics[0],
          deviceBreakdown,
          cachePerformance,
          slowestImages,
        },
      });
    } catch (error) {
      handleControllerError(error, res, 'Failed to get performance report');
    }
  }
}