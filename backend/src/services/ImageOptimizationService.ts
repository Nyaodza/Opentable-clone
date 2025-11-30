import sharp from 'sharp';
import AWS from 'aws-sdk';
import { createHash } from 'crypto';
import { promises as fs } from 'fs';
import path from 'path';
import axios from 'axios';
import { logger } from '../utils/logger';
import { CacheManager } from '../config/redis';
import { sequelize } from '../config/database';
import { QueryTypes } from 'sequelize';

export interface ImageSize {
  width: number;
  height: number;
  name: string;
  suffix: string;
}

export interface OptimizedImage {
  originalUrl: string;
  cdnUrl: string;
  thumbnailUrl: string;
  sizes: {
    small: string;
    medium: string;
    large: string;
    original: string;
  };
  metadata: {
    width: number;
    height: number;
    format: string;
    size: number;
    hash: string;
  };
}

export interface CDNConfig {
  provider: 'cloudfront' | 'cloudflare' | 'fastly' | 'custom';
  baseUrl: string;
  bucket?: string;
  region?: string;
  accessKeyId?: string;
  secretAccessKey?: string;
}

export class ImageOptimizationService {
  private static instance: ImageOptimizationService;
  private s3: AWS.S3 | null = null;
  private cache: CacheManager;
  private cdnConfig: CDNConfig;
  
  private readonly imageSizes: ImageSize[] = [
    { width: 150, height: 150, name: 'thumbnail', suffix: '_thumb' },
    { width: 400, height: 300, name: 'small', suffix: '_small' },
    { width: 800, height: 600, name: 'medium', suffix: '_medium' },
    { width: 1920, height: 1080, name: 'large', suffix: '_large' },
  ];

  private readonly supportedFormats = ['jpeg', 'jpg', 'png', 'webp', 'avif'];
  private readonly maxFileSize = 10 * 1024 * 1024; // 10MB

  private constructor() {
    this.cache = CacheManager.getInstance();
    this.cdnConfig = this.loadCDNConfig();
    
    if (this.cdnConfig.provider === 'cloudfront' && this.cdnConfig.bucket) {
      this.s3 = new AWS.S3({
        region: this.cdnConfig.region || 'us-east-1',
        accessKeyId: this.cdnConfig.accessKeyId || process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: this.cdnConfig.secretAccessKey || process.env.AWS_SECRET_ACCESS_KEY,
      });
    }
  }

  static getInstance(): ImageOptimizationService {
    if (!ImageOptimizationService.instance) {
      ImageOptimizationService.instance = new ImageOptimizationService();
    }
    return ImageOptimizationService.instance;
  }

  /**
   * Process and optimize an image from URL
   */
  async processImageFromUrl(imageUrl: string, listingId: string): Promise<OptimizedImage> {
    try {
      const cacheKey = `optimized_image:${this.hashUrl(imageUrl)}`;
      const cached = await this.cache.get(cacheKey);
      
      if (cached) {
        return cached;
      }

      // Download image
      const imageBuffer = await this.downloadImage(imageUrl);
      
      // Process and optimize
      const optimized = await this.processImage(imageBuffer, listingId, imageUrl);
      
      // Cache for 24 hours
      await this.cache.set(cacheKey, optimized, 86400);
      
      // Store in database
      await this.storeImageRecord(listingId, optimized);
      
      return optimized;
    } catch (error) {
      logger.error('Error processing image from URL:', error);
      throw error;
    }
  }

  /**
   * Process and optimize an uploaded image
   */
  async processUploadedImage(
    buffer: Buffer,
    filename: string,
    listingId: string
  ): Promise<OptimizedImage> {
    try {
      const hash = this.hashBuffer(buffer);
      const cacheKey = `optimized_image:${hash}`;
      const cached = await this.cache.get(cacheKey);
      
      if (cached) {
        return cached;
      }

      const optimized = await this.processImage(buffer, listingId, filename);
      
      // Cache for 24 hours
      await this.cache.set(cacheKey, optimized, 86400);
      
      // Store in database
      await this.storeImageRecord(listingId, optimized);
      
      return optimized;
    } catch (error) {
      logger.error('Error processing uploaded image:', error);
      throw error;
    }
  }

  /**
   * Process image with multiple sizes and formats
   */
  private async processImage(
    buffer: Buffer,
    listingId: string,
    originalUrl: string
  ): Promise<OptimizedImage> {
    try {
      const metadata = await sharp(buffer).metadata();
      const hash = this.hashBuffer(buffer);
      
      const sizes: any = {};
      const uploadPromises: Promise<string>[] = [];

      // Generate optimized versions
      for (const size of this.imageSizes) {
        const optimizedBuffer = await this.optimizeImage(buffer, size);
        const key = `listings/${listingId}/${hash}${size.suffix}.webp`;
        
        uploadPromises.push(this.uploadToCDN(optimizedBuffer, key));
        sizes[size.name] = this.getCDNUrl(key);
      }

      // Upload original
      const originalKey = `listings/${listingId}/${hash}_original.${metadata.format}`;
      uploadPromises.push(this.uploadToCDN(buffer, originalKey));
      sizes.original = this.getCDNUrl(originalKey);

      // Wait for all uploads
      await Promise.all(uploadPromises);

      return {
        originalUrl,
        cdnUrl: sizes.large,
        thumbnailUrl: sizes.thumbnail,
        sizes,
        metadata: {
          width: metadata.width || 0,
          height: metadata.height || 0,
          format: metadata.format || 'unknown',
          size: buffer.length,
          hash,
        },
      };
    } catch (error) {
      logger.error('Error processing image:', error);
      throw error;
    }
  }

  /**
   * Optimize image for specific size
   */
  private async optimizeImage(buffer: Buffer, size: ImageSize): Promise<Buffer> {
    try {
      const pipeline = sharp(buffer)
        .resize(size.width, size.height, {
          fit: 'cover',
          withoutEnlargement: true,
        })
        .webp({ quality: 85 });

      // Apply additional optimizations based on size
      if (size.name === 'thumbnail') {
        pipeline.blur(0.3); // Slight blur for better compression
      }

      return await pipeline.toBuffer();
    } catch (error) {
      logger.error('Error optimizing image:', error);
      throw error;
    }
  }

  /**
   * Generate responsive image srcset
   */
  async generateSrcSet(imageUrl: string, listingId: string): Promise<string> {
    try {
      const optimized = await this.processImageFromUrl(imageUrl, listingId);
      
      const srcset = [
        `${optimized.sizes.small} 400w`,
        `${optimized.sizes.medium} 800w`,
        `${optimized.sizes.large} 1920w`,
      ].join(', ');

      return srcset;
    } catch (error) {
      logger.error('Error generating srcset:', error);
      return imageUrl; // Fallback to original
    }
  }

  /**
   * Generate picture element HTML
   */
  async generatePictureElement(
    imageUrl: string,
    listingId: string,
    alt: string
  ): Promise<string> {
    try {
      const optimized = await this.processImageFromUrl(imageUrl, listingId);
      
      return `
        <picture>
          <source 
            type="image/webp" 
            srcset="${optimized.sizes.small} 400w, ${optimized.sizes.medium} 800w, ${optimized.sizes.large} 1920w"
            sizes="(max-width: 400px) 400px, (max-width: 800px) 800px, 1920px"
          >
          <img 
            src="${optimized.sizes.medium}" 
            alt="${alt}"
            loading="lazy"
            decoding="async"
          >
        </picture>
      `;
    } catch (error) {
      logger.error('Error generating picture element:', error);
      return `<img src="${imageUrl}" alt="${alt}">`;
    }
  }

  /**
   * Batch process images for a listing
   */
  async batchProcessImages(
    imageUrls: string[],
    listingId: string
  ): Promise<OptimizedImage[]> {
    try {
      const batchSize = 5;
      const results: OptimizedImage[] = [];

      for (let i = 0; i < imageUrls.length; i += batchSize) {
        const batch = imageUrls.slice(i, i + batchSize);
        const batchResults = await Promise.allSettled(
          batch.map(url => this.processImageFromUrl(url, listingId))
        );

        for (const result of batchResults) {
          if (result.status === 'fulfilled') {
            results.push(result.value);
          } else {
            logger.error('Failed to process image:', result.reason);
          }
        }
      }

      return results;
    } catch (error) {
      logger.error('Error batch processing images:', error);
      throw error;
    }
  }

  /**
   * Clean up unused images
   */
  async cleanupUnusedImages(olderThanDays: number = 30): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

      const result = await sequelize.query(
        `
        DELETE FROM listing_images 
        WHERE "lastUsed" < ? 
          AND id NOT IN (
            SELECT DISTINCT image_id 
            FROM listing_image_references 
            WHERE image_id IS NOT NULL
          )
        RETURNING id
        `,
        {
          replacements: [cutoffDate],
          type: QueryTypes.SELECT,
        }
      );

      const deletedCount = result.length;

      // Delete from CDN
      for (const row of result) {
        try {
          await this.deleteFromCDN((row as any).cdnKey);
        } catch (error) {
          logger.error('Error deleting from CDN:', error);
        }
      }

      logger.info(`Cleaned up ${deletedCount} unused images`);
      return deletedCount;
    } catch (error) {
      logger.error('Error cleaning up unused images:', error);
      throw error;
    }
  }

  /**
   * Analyze image performance
   */
  async analyzeImagePerformance(listingId: string): Promise<{
    totalImages: number;
    totalSize: number;
    averageSize: number;
    optimizationSavings: number;
    formats: Record<string, number>;
    recommendations: string[];
  }> {
    try {
      const result = await sequelize.query(
        `
        SELECT 
          COUNT(*) as total_images,
          SUM("originalSize") as total_original_size,
          SUM("optimizedSize") as total_optimized_size,
          AVG("originalSize") as avg_original_size,
          AVG("optimizedSize") as avg_optimized_size,
          json_object_agg(format, format_count) as formats
        FROM (
          SELECT 
            "originalSize",
            "optimizedSize",
            metadata->>'format' as format,
            COUNT(*) OVER (PARTITION BY metadata->>'format') as format_count
          FROM listing_images
          WHERE "listingId" = ?
        ) subquery
        GROUP BY "listingId"
        `,
        {
          replacements: [listingId],
          type: QueryTypes.SELECT,
        }
      );

      if (result.length === 0) {
        return {
          totalImages: 0,
          totalSize: 0,
          averageSize: 0,
          optimizationSavings: 0,
          formats: {},
          recommendations: ['No images found for this listing'],
        };
      }

      const data = result[0] as any;
      const recommendations: string[] = [];

      // Generate recommendations
      if (data.avg_optimized_size > 500 * 1024) {
        recommendations.push('Consider further compression for images over 500KB');
      }

      if (data.total_images > 20) {
        recommendations.push('Consider lazy loading for better performance');
      }

      const savingsPercentage = 
        ((data.total_original_size - data.total_optimized_size) / data.total_original_size) * 100;

      return {
        totalImages: parseInt(data.total_images),
        totalSize: parseInt(data.total_optimized_size),
        averageSize: parseInt(data.avg_optimized_size),
        optimizationSavings: savingsPercentage,
        formats: data.formats || {},
        recommendations,
      };
    } catch (error) {
      logger.error('Error analyzing image performance:', error);
      throw error;
    }
  }

  /**
   * Upload image to CDN
   */
  private async uploadToCDN(buffer: Buffer, key: string): Promise<string> {
    try {
      switch (this.cdnConfig.provider) {
        case 'cloudfront':
          return await this.uploadToS3(buffer, key);
        case 'cloudflare':
          return await this.uploadToCloudflare(buffer, key);
        case 'fastly':
          return await this.uploadToFastly(buffer, key);
        default:
          return await this.uploadToCustomCDN(buffer, key);
      }
    } catch (error) {
      logger.error('Error uploading to CDN:', error);
      throw error;
    }
  }

  /**
   * Upload to S3 (for CloudFront)
   */
  private async uploadToS3(buffer: Buffer, key: string): Promise<string> {
    if (!this.s3 || !this.cdnConfig.bucket) {
      throw new Error('S3 not configured');
    }

    const params = {
      Bucket: this.cdnConfig.bucket,
      Key: key,
      Body: buffer,
      ContentType: this.getContentType(key),
      CacheControl: 'public, max-age=31536000', // 1 year
    };

    await this.s3.upload(params).promise();
    return this.getCDNUrl(key);
  }

  /**
   * Upload to Cloudflare (placeholder)
   */
  private async uploadToCloudflare(buffer: Buffer, key: string): Promise<string> {
    // Implement Cloudflare Images API integration
    logger.warn('Cloudflare upload not implemented, using local storage');
    return await this.uploadToLocal(buffer, key);
  }

  /**
   * Upload to Fastly (placeholder)
   */
  private async uploadToFastly(buffer: Buffer, key: string): Promise<string> {
    // Implement Fastly API integration
    logger.warn('Fastly upload not implemented, using local storage');
    return await this.uploadToLocal(buffer, key);
  }

  /**
   * Upload to custom CDN
   */
  private async uploadToCustomCDN(buffer: Buffer, key: string): Promise<string> {
    // Implement custom CDN logic
    return await this.uploadToLocal(buffer, key);
  }

  /**
   * Upload to local storage (fallback)
   */
  private async uploadToLocal(buffer: Buffer, key: string): Promise<string> {
    const uploadDir = path.join(process.cwd(), 'uploads', 'optimized');
    const filePath = path.join(uploadDir, key);
    
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, buffer);
    
    return `/uploads/optimized/${key}`;
  }

  /**
   * Delete from CDN
   */
  private async deleteFromCDN(key: string): Promise<void> {
    try {
      switch (this.cdnConfig.provider) {
        case 'cloudfront':
          if (this.s3 && this.cdnConfig.bucket) {
            await this.s3.deleteObject({
              Bucket: this.cdnConfig.bucket,
              Key: key,
            }).promise();
          }
          break;
        default:
          // Delete from local storage
          const filePath = path.join(process.cwd(), 'uploads', 'optimized', key);
          await fs.unlink(filePath).catch(() => {});
      }
    } catch (error) {
      logger.error('Error deleting from CDN:', error);
    }
  }

  /**
   * Download image from URL
   */
  private async downloadImage(url: string): Promise<Buffer> {
    const response = await axios.get(url, {
      responseType: 'arraybuffer',
      maxContentLength: this.maxFileSize,
      timeout: 30000,
    });

    return Buffer.from(response.data);
  }

  /**
   * Get CDN URL for a key
   */
  private getCDNUrl(key: string): string {
    return `${this.cdnConfig.baseUrl}/${key}`;
  }

  /**
   * Get content type from filename
   */
  private getContentType(filename: string): string {
    const ext = path.extname(filename).toLowerCase();
    const contentTypes: Record<string, string> = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.webp': 'image/webp',
      '.avif': 'image/avif',
    };
    return contentTypes[ext] || 'application/octet-stream';
  }

  /**
   * Hash URL for caching
   */
  private hashUrl(url: string): string {
    return createHash('sha256').update(url).digest('hex').substring(0, 16);
  }

  /**
   * Hash buffer for deduplication
   */
  private hashBuffer(buffer: Buffer): string {
    return createHash('sha256').update(buffer).digest('hex').substring(0, 16);
  }

  /**
   * Load CDN configuration
   */
  private loadCDNConfig(): CDNConfig {
    return {
      provider: (process.env.CDN_PROVIDER as any) || 'cloudfront',
      baseUrl: process.env.CDN_BASE_URL || 'https://cdn.example.com',
      bucket: process.env.CDN_BUCKET,
      region: process.env.CDN_REGION || 'us-east-1',
      accessKeyId: process.env.CDN_ACCESS_KEY_ID,
      secretAccessKey: process.env.CDN_SECRET_ACCESS_KEY,
    };
  }

  /**
   * Store image record in database
   */
  private async storeImageRecord(
    listingId: string,
    optimizedImage: OptimizedImage
  ): Promise<void> {
    try {
      await sequelize.query(
        `
        INSERT INTO listing_images (
          id, "listingId", "originalUrl", "cdnUrl", "thumbnailUrl",
          sizes, metadata, "originalSize", "optimizedSize", "lastUsed",
          "createdAt", "updatedAt"
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW(), NOW())
        ON CONFLICT (id) DO UPDATE SET 
          "lastUsed" = NOW(),
          "updatedAt" = NOW()
        `,
        {
          replacements: [
            optimizedImage.metadata.hash,
            listingId,
            optimizedImage.originalUrl,
            optimizedImage.cdnUrl,
            optimizedImage.thumbnailUrl,
            JSON.stringify(optimizedImage.sizes),
            JSON.stringify(optimizedImage.metadata),
            optimizedImage.metadata.size,
            0, // Will be calculated from optimized versions
          ],
        }
      );
    } catch (error) {
      logger.error('Error storing image record:', error);
    }
  }
}