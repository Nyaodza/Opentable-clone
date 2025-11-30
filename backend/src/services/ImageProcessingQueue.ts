import { EventEmitter } from 'events';
import { sequelize } from '../config/database';
import { ImageOptimizationService } from './ImageOptimizationService';
import { logger } from '../utils/logger';
import { CacheManager } from '../config/redis';
import { QueryTypes } from 'sequelize';

export interface QueueItem {
  id: string;
  listingId: string;
  imageUrl: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  priority: number;
  attempts: number;
  errorMessage?: string;
  processedAt?: Date;
}

export interface QueueStats {
  pending: number;
  processing: number;
  completed: number;
  failed: number;
  avgProcessingTime: number;
  successRate: number;
}

export class ImageProcessingQueue extends EventEmitter {
  private static instance: ImageProcessingQueue;
  private imageService: ImageOptimizationService;
  private cache: CacheManager;
  private isProcessing = false;
  private processingTimer?: NodeJS.Timeout;
  private readonly BATCH_SIZE = 10;
  private readonly MAX_ATTEMPTS = 3;
  private readonly PROCESSING_INTERVAL = 5000; // 5 seconds

  private constructor() {
    super();
    this.imageService = ImageOptimizationService.getInstance();
    this.cache = CacheManager.getInstance();
    this.startProcessing();
  }

  static getInstance(): ImageProcessingQueue {
    if (!ImageProcessingQueue.instance) {
      ImageProcessingQueue.instance = new ImageProcessingQueue();
    }
    return ImageProcessingQueue.instance;
  }

  /**
   * Add images to processing queue
   */
  async addToQueue(
    listingId: string,
    imageUrls: string[],
    priority: number = 0
  ): Promise<string[]> {
    try {
      const queueIds: string[] = [];
      const values: any[] = [];

      for (const imageUrl of imageUrls) {
        const id = require('crypto').randomUUID();
        queueIds.push(id);
        values.push([id, listingId, imageUrl, 'pending', priority]);
      }

      if (values.length > 0) {
        const placeholders = values.map(() => '(?, ?, ?, ?, ?)').join(', ');
        
        await sequelize.query(
          `
          INSERT INTO image_processing_queue (id, "listingId", "imageUrl", status, priority)
          VALUES ${placeholders}
          `,
          {
            replacements: values.flat(),
          }
        );

        this.emit('itemsAdded', queueIds);
        logger.info(`Added ${imageUrls.length} images to processing queue for listing ${listingId}`);
      }

      return queueIds;
    } catch (error) {
      logger.error('Error adding to queue:', error);
      throw error;
    }
  }

  /**
   * Process queue batch
   */
  private async processBatch(): Promise<void> {
    if (this.isProcessing) return;

    try {
      this.isProcessing = true;

      // Get next batch
      const batch = await this.getNextBatch();
      
      if (batch.length === 0) {
        return;
      }

      // Process items in parallel
      const results = await Promise.allSettled(
        batch.map(item => this.processQueueItem(item))
      );

      // Handle results
      let successCount = 0;
      let failureCount = 0;

      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          successCount++;
        } else {
          failureCount++;
          logger.error(`Failed to process queue item ${batch[index].id}:`, result.reason);
        }
      });

      this.emit('batchProcessed', {
        total: batch.length,
        success: successCount,
        failure: failureCount,
      });

      logger.info(`Processed batch: ${successCount} success, ${failureCount} failure`);
    } catch (error) {
      logger.error('Error processing batch:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Process individual queue item
   */
  private async processQueueItem(item: QueueItem): Promise<void> {
    try {
      // Update status to processing
      await this.updateQueueItem(item.id, {
        status: 'processing',
        attempts: item.attempts + 1,
      });

      // Process image
      const startTime = Date.now();
      const optimized = await this.imageService.processImageFromUrl(
        item.imageUrl,
        item.listingId
      );
      const processingTime = Date.now() - startTime;

      // Update status to completed
      await this.updateQueueItem(item.id, {
        status: 'completed',
        processedAt: new Date(),
      });

      // Update listing with optimized image
      await this.updateListingImage(item.listingId, item.imageUrl, optimized);

      // Track metrics
      await this.trackProcessingMetrics(item.id, processingTime, true);

      this.emit('itemProcessed', {
        queueId: item.id,
        listingId: item.listingId,
        imageUrl: item.imageUrl,
        optimized,
        processingTime,
      });
    } catch (error) {
      logger.error(`Error processing queue item ${item.id}:`, error);

      // Update status
      const shouldRetry = item.attempts < this.MAX_ATTEMPTS;
      
      await this.updateQueueItem(item.id, {
        status: shouldRetry ? 'pending' : 'failed',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      });

      // Track metrics
      await this.trackProcessingMetrics(item.id, 0, false);

      this.emit('itemFailed', {
        queueId: item.id,
        listingId: item.listingId,
        imageUrl: item.imageUrl,
        error: error instanceof Error ? error.message : 'Unknown error',
        attempts: item.attempts + 1,
        willRetry: shouldRetry,
      });

      if (!shouldRetry) {
        throw error;
      }
    }
  }

  /**
   * Get next batch of items to process
   */
  private async getNextBatch(): Promise<QueueItem[]> {
    const result = await sequelize.query(
      `
      SELECT * FROM image_processing_queue
      WHERE status = 'pending'
        AND attempts < ?
      ORDER BY priority DESC, "createdAt" ASC
      LIMIT ?
      FOR UPDATE SKIP LOCKED
      `,
      {
        replacements: [this.MAX_ATTEMPTS, this.BATCH_SIZE],
        type: QueryTypes.SELECT,
      }
    );

    return result as QueueItem[];
  }

  /**
   * Update queue item
   */
  private async updateQueueItem(
    id: string,
    updates: Partial<QueueItem>
  ): Promise<void> {
    const setClauses: string[] = [];
    const replacements: any[] = [];

    Object.entries(updates).forEach(([key, value]) => {
      if (value !== undefined) {
        setClauses.push(`"${key}" = ?`);
        replacements.push(value);
      }
    });

    if (setClauses.length === 0) return;

    setClauses.push('"updatedAt" = NOW()');
    replacements.push(id);

    await sequelize.query(
      `UPDATE image_processing_queue SET ${setClauses.join(', ')} WHERE id = ?`,
      { replacements }
    );
  }

  /**
   * Update listing with optimized image
   */
  private async updateListingImage(
    listingId: string,
    originalUrl: string,
    optimized: any
  ): Promise<void> {
    try {
      // Get current images
      const [listing] = await sequelize.query(
        'SELECT images FROM unified_listings WHERE id = ?',
        {
          replacements: [listingId],
          type: QueryTypes.SELECT,
        }
      );

      if (!listing) return;

      const currentImages = JSON.parse((listing as any).images || '[]');
      
      // Update image URLs
      const updatedImages = currentImages.map((img: any) => {
        if (typeof img === 'string' && img === originalUrl) {
          return optimized.cdnUrl;
        } else if (img.url === originalUrl) {
          return {
            ...img,
            url: optimized.cdnUrl,
            thumbnail: optimized.thumbnailUrl,
            sizes: optimized.sizes,
          };
        }
        return img;
      });

      // Update listing
      await sequelize.query(
        'UPDATE unified_listings SET images = ?, "updatedAt" = NOW() WHERE id = ?',
        {
          replacements: [JSON.stringify(updatedImages), listingId],
        }
      );

      // Clear cache
      await this.cache.del(`listing:${listingId}`);
    } catch (error) {
      logger.error('Error updating listing image:', error);
    }
  }

  /**
   * Track processing metrics
   */
  private async trackProcessingMetrics(
    queueId: string,
    processingTime: number,
    success: boolean
  ): Promise<void> {
    try {
      const key = `image_processing:metrics:${new Date().toISOString().split('T')[0]}`;
      const metrics = await this.cache.get(key) || {
        total: 0,
        success: 0,
        failure: 0,
        totalTime: 0,
      };

      metrics.total++;
      if (success) {
        metrics.success++;
        metrics.totalTime += processingTime;
      } else {
        metrics.failure++;
      }

      await this.cache.set(key, metrics, 86400); // 24 hours
    } catch (error) {
      logger.error('Error tracking metrics:', error);
    }
  }

  /**
   * Get queue statistics
   */
  async getQueueStats(): Promise<QueueStats> {
    try {
      const result = await sequelize.query(
        `
        SELECT 
          status,
          COUNT(*) as count,
          AVG(EXTRACT(EPOCH FROM ("processedAt" - "createdAt"))) as avg_time
        FROM image_processing_queue
        WHERE "createdAt" > NOW() - INTERVAL '24 hours'
        GROUP BY status
        `,
        {
          type: QueryTypes.SELECT,
        }
      );

      const stats: QueueStats = {
        pending: 0,
        processing: 0,
        completed: 0,
        failed: 0,
        avgProcessingTime: 0,
        successRate: 0,
      };

      let totalCompleted = 0;
      let totalTime = 0;

      for (const row of result as any[]) {
        const statusKey = row.status as keyof QueueStats;
        if (statusKey !== 'avgProcessingTime' && statusKey !== 'successRate') {
          stats[statusKey] = parseInt(row.count);
        }
        if (row.status === 'completed') {
          totalCompleted = parseInt(row.count);
          totalTime = parseFloat(row.avg_time || 0);
        }
      }

      stats.avgProcessingTime = totalTime;
      const total = stats.completed + stats.failed;
      stats.successRate = total > 0 ? (stats.completed / total) * 100 : 0;

      return stats;
    } catch (error) {
      logger.error('Error getting queue stats:', error);
      throw error;
    }
  }

  /**
   * Reprocess failed items
   */
  async reprocessFailed(limit?: number): Promise<number> {
    try {
      const result = await sequelize.query(
        `
        UPDATE image_processing_queue 
        SET status = 'pending', attempts = 0, "errorMessage" = NULL
        WHERE status = 'failed'
        ${limit ? 'LIMIT ?' : ''}
        RETURNING id
        `,
        {
          replacements: limit ? [limit] : [],
          type: QueryTypes.SELECT,
        }
      );

      const count = result.length;
      
      if (count > 0) {
        logger.info(`Requeued ${count} failed items for processing`);
        this.emit('failedItemsRequeued', count);
      }

      return count;
    } catch (error) {
      logger.error('Error reprocessing failed items:', error);
      throw error;
    }
  }

  /**
   * Clear completed items older than days
   */
  async clearCompleted(olderThanDays: number = 7): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

      const result = await sequelize.query(
        `
        DELETE FROM image_processing_queue 
        WHERE status = 'completed' 
          AND "processedAt" < ?
        RETURNING id
        `,
        {
          replacements: [cutoffDate],
          type: QueryTypes.SELECT,
        }
      );

      const count = result.length;
      
      if (count > 0) {
        logger.info(`Cleared ${count} completed queue items`);
      }

      return count;
    } catch (error) {
      logger.error('Error clearing completed items:', error);
      throw error;
    }
  }

  /**
   * Prioritize listing images
   */
  async prioritizeListing(listingId: string, priority: number = 10): Promise<void> {
    try {
      await sequelize.query(
        `
        UPDATE image_processing_queue 
        SET priority = ?
        WHERE "listingId" = ? AND status = 'pending'
        `,
        {
          replacements: [priority, listingId],
        }
      );

      logger.info(`Prioritized images for listing ${listingId}`);
    } catch (error) {
      logger.error('Error prioritizing listing:', error);
      throw error;
    }
  }

  /**
   * Start processing timer
   */
  private startProcessing(): void {
    this.processingTimer = setInterval(() => {
      this.processBatch().catch(error => {
        logger.error('Error in processing timer:', error);
      });
    }, this.PROCESSING_INTERVAL);

    logger.info('Image processing queue started');
  }

  /**
   * Stop processing
   */
  stopProcessing(): void {
    if (this.processingTimer) {
      clearInterval(this.processingTimer);
      this.processingTimer = undefined;
    }
    
    logger.info('Image processing queue stopped');
  }

  /**
   * Destroy instance
   */
  destroy(): void {
    this.stopProcessing();
    this.removeAllListeners();
  }
}