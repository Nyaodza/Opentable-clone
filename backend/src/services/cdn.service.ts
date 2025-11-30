import { CloudFrontClient, CreateInvalidationCommand } from '@aws-sdk/client-cloudfront';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import sharp from 'sharp';
import crypto from 'crypto';
import { logger } from '../utils/logger';
import { CacheService } from './cache.service';

export interface CDNConfig {
  cloudFrontDomain: string;
  s3BucketName: string;
  s3Region: string;
  distributionId: string;
  cacheControl: {
    images: string;
    videos: string;
    documents: string;
    static: string;
  };
}

export interface ImageTransform {
  width?: number;
  height?: number;
  fit?: 'cover' | 'contain' | 'fill' | 'inside' | 'outside';
  quality?: number;
  format?: 'jpeg' | 'png' | 'webp' | 'avif';
  blur?: number;
  grayscale?: boolean;
}

export class CDNService {
  private static s3Client: S3Client;
  private static cloudFrontClient: CloudFrontClient;
  private static config: CDNConfig;
  private static readonly IMAGE_CACHE_TTL = 86400 * 30; // 30 days

  static initialize(config: Partial<CDNConfig> = {}): void {
    this.config = {
      cloudFrontDomain: process.env.CLOUDFRONT_DOMAIN || '',
      s3BucketName: process.env.S3_BUCKET_NAME || '',
      s3Region: process.env.AWS_REGION || 'us-east-1',
      distributionId: process.env.CLOUDFRONT_DISTRIBUTION_ID || '',
      cacheControl: {
        images: 'public, max-age=31536000, immutable',
        videos: 'public, max-age=31536000, immutable',
        documents: 'public, max-age=3600',
        static: 'public, max-age=86400',
        ...config.cacheControl,
      },
      ...config,
    };

    this.s3Client = new S3Client({
      region: this.config.s3Region,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
    });

    this.cloudFrontClient = new CloudFrontClient({
      region: this.config.s3Region,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
    });
  }

  static async uploadImage(
    file: Buffer | string,
    key: string,
    options: {
      transforms?: ImageTransform[];
      metadata?: Record<string, string>;
      contentType?: string;
    } = {}
  ): Promise<string> {
    const { transforms = [], metadata = {}, contentType = 'image/jpeg' } = options;

    // Process image with Sharp
    let processedImage = sharp(file);
    
    // Apply default optimizations
    processedImage = processedImage
      .rotate() // Auto-rotate based on EXIF
      .withMetadata(); // Preserve metadata

    // Generate variants
    const variants: Array<{ key: string; buffer: Buffer; contentType: string }> = [];

    // Original image (with optimizations)
    const originalBuffer = await processedImage
      .jpeg({ quality: 85, progressive: true })
      .toBuffer();
    
    variants.push({
      key,
      buffer: originalBuffer,
      contentType: 'image/jpeg',
    });

    // Generate responsive variants
    const sizes = [
      { width: 320, suffix: '-sm' },
      { width: 768, suffix: '-md' },
      { width: 1024, suffix: '-lg' },
      { width: 1920, suffix: '-xl' },
    ];

    for (const size of sizes) {
      const variantKey = key.replace(/\.[^.]+$/, `${size.suffix}.$1`);
      const variantBuffer = await sharp(file)
        .resize(size.width, null, {
          withoutEnlargement: true,
          fit: 'inside',
        })
        .jpeg({ quality: 80, progressive: true })
        .toBuffer();
      
      variants.push({
        key: variantKey,
        buffer: variantBuffer,
        contentType: 'image/jpeg',
      });
    }

    // Generate WebP variant for modern browsers
    const webpKey = key.replace(/\.[^.]+$/, '.webp');
    const webpBuffer = await sharp(file)
      .webp({ quality: 80 })
      .toBuffer();
    
    variants.push({
      key: webpKey,
      buffer: webpBuffer,
      contentType: 'image/webp',
    });

    // Upload all variants
    const uploadPromises = variants.map(variant => 
      this.uploadToS3(variant.buffer, variant.key, {
        contentType: variant.contentType,
        cacheControl: this.config.cacheControl.images,
        metadata,
      })
    );

    await Promise.all(uploadPromises);

    // Return CDN URL for original image
    return this.getCDNUrl(key);
  }

  static async uploadFile(
    file: Buffer,
    key: string,
    options: {
      contentType: string;
      metadata?: Record<string, string>;
      cacheControl?: string;
    }
  ): Promise<string> {
    await this.uploadToS3(file, key, options);
    return this.getCDNUrl(key);
  }

  private static async uploadToS3(
    buffer: Buffer,
    key: string,
    options: {
      contentType: string;
      cacheControl?: string;
      metadata?: Record<string, string>;
    }
  ): Promise<void> {
    const command = new PutObjectCommand({
      Bucket: this.config.s3BucketName,
      Key: key,
      Body: buffer,
      ContentType: options.contentType,
      CacheControl: options.cacheControl || this.config.cacheControl.static,
      Metadata: options.metadata,
      ServerSideEncryption: 'AES256',
    });

    try {
      await this.s3Client.send(command);
      logger.info(`Uploaded file to S3: ${key}`);
    } catch (error) {
      logger.error('S3 upload error:', error);
      throw new Error('Failed to upload file to S3');
    }
  }

  static getCDNUrl(key: string, transform?: ImageTransform): string {
    if (!transform) {
      return `https://${this.config.cloudFrontDomain}/${key}`;
    }

    // Generate transform string for URL
    const transformStr = this.generateTransformString(transform);
    const transformedKey = key.replace(/\.[^.]+$/, `-${transformStr}.$1`);
    
    return `https://${this.config.cloudFrontDomain}/${transformedKey}`;
  }

  static async getSignedUrl(
    key: string,
    expiresIn: number = 3600
  ): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.config.s3BucketName,
      Key: key,
    });

    try {
      return await getSignedUrl(this.s3Client, command, { expiresIn });
    } catch (error) {
      logger.error('Failed to generate signed URL:', error);
      throw new Error('Failed to generate signed URL');
    }
  }

  static async invalidateCache(paths: string[]): Promise<void> {
    if (!this.config.distributionId) {
      logger.warn('CloudFront distribution ID not configured');
      return;
    }

    const command = new CreateInvalidationCommand({
      DistributionId: this.config.distributionId,
      InvalidationBatch: {
        CallerReference: Date.now().toString(),
        Paths: {
          Quantity: paths.length,
          Items: paths,
        },
      },
    });

    try {
      await this.cloudFrontClient.send(command);
      logger.info(`Invalidated CloudFront cache for ${paths.length} paths`);
    } catch (error) {
      logger.error('CloudFront invalidation error:', error);
    }
  }

  static async processAndCacheImage(
    imageUrl: string,
    transform: ImageTransform
  ): Promise<string> {
    const cacheKey = `cdn:image:${this.generateTransformHash(imageUrl, transform)}`;
    
    // Check cache
    const cached = await CacheService.get<string>(cacheKey);
    if (cached) {
      return cached;
    }

    // Download image
    const response = await fetch(imageUrl);
    const buffer = Buffer.from(await response.arrayBuffer());

    // Process image
    let image = sharp(buffer);

    if (transform.width || transform.height) {
      image = image.resize(transform.width, transform.height, {
        fit: transform.fit || 'cover',
        withoutEnlargement: true,
      });
    }

    if (transform.blur) {
      image = image.blur(transform.blur);
    }

    if (transform.grayscale) {
      image = image.grayscale();
    }

    // Convert to specified format
    let outputBuffer: Buffer;
    let contentType: string;

    switch (transform.format) {
      case 'webp':
        outputBuffer = await image.webp({ quality: transform.quality || 80 }).toBuffer();
        contentType = 'image/webp';
        break;
      case 'avif':
        outputBuffer = await image.avif({ quality: transform.quality || 80 }).toBuffer();
        contentType = 'image/avif';
        break;
      case 'png':
        outputBuffer = await image.png({ quality: transform.quality || 90 }).toBuffer();
        contentType = 'image/png';
        break;
      default:
        outputBuffer = await image.jpeg({ 
          quality: transform.quality || 80,
          progressive: true,
        }).toBuffer();
        contentType = 'image/jpeg';
    }

    // Upload to CDN
    const key = `processed/${this.generateTransformHash(imageUrl, transform)}.${transform.format || 'jpg'}`;
    const cdnUrl = await this.uploadFile(outputBuffer, key, { contentType });

    // Cache result
    await CacheService.set(cacheKey, cdnUrl, { ttl: this.IMAGE_CACHE_TTL });

    return cdnUrl;
  }

  static async optimizeImageBatch(
    images: Array<{ url: string; key: string }>
  ): Promise<void> {
    const batchSize = 10;
    
    for (let i = 0; i < images.length; i += batchSize) {
      const batch = images.slice(i, i + batchSize);
      
      await Promise.all(
        batch.map(async ({ url, key }) => {
          try {
            const response = await fetch(url);
            const buffer = Buffer.from(await response.arrayBuffer());
            
            await this.uploadImage(buffer, key, {
              transforms: [
                { width: 320 },
                { width: 768 },
                { width: 1024 },
                { width: 1920 },
              ],
            });
          } catch (error) {
            logger.error(`Failed to optimize image ${url}:`, error);
          }
        })
      );
    }
  }

  private static generateTransformString(transform: ImageTransform): string {
    const parts: string[] = [];
    
    if (transform.width) parts.push(`w${transform.width}`);
    if (transform.height) parts.push(`h${transform.height}`);
    if (transform.fit) parts.push(`f${transform.fit}`);
    if (transform.quality) parts.push(`q${transform.quality}`);
    if (transform.format) parts.push(transform.format);
    if (transform.blur) parts.push(`b${transform.blur}`);
    if (transform.grayscale) parts.push('g');
    
    return parts.join('-');
  }

  private static generateTransformHash(url: string, transform: ImageTransform): string {
    const transformStr = this.generateTransformString(transform);
    return crypto
      .createHash('md5')
      .update(`${url}:${transformStr}`)
      .digest('hex');
  }

  // Preload critical images
  static async preloadImages(urls: string[]): Promise<void> {
    const preloadPromises = urls.map(url => 
      fetch(url, {
        method: 'HEAD',
        headers: {
          'X-Preload': 'true',
        },
      })
    );

    await Promise.allSettled(preloadPromises);
  }

  // Generate responsive image set
  static getResponsiveImageSet(
    baseUrl: string,
    alt: string,
    sizes: string = '100vw'
  ): {
    src: string;
    srcSet: string;
    sizes: string;
    alt: string;
  } {
    const base = baseUrl.replace(/\.[^.]+$/, '');
    const ext = baseUrl.match(/\.[^.]+$/)?.[0] || '.jpg';
    
    const srcSet = [
      `${base}-sm${ext} 320w`,
      `${base}-md${ext} 768w`,
      `${base}-lg${ext} 1024w`,
      `${base}-xl${ext} 1920w`,
      `${baseUrl} 2560w`,
    ].join(', ');

    return {
      src: baseUrl,
      srcSet,
      sizes,
      alt,
    };
  }

  // Get optimized video URL with adaptive bitrate
  static getVideoUrl(key: string, quality: 'low' | 'medium' | 'high' = 'medium'): string {
    const qualityMap = {
      low: '480p',
      medium: '720p',
      high: '1080p',
    };

    const videoKey = key.replace(/\.[^.]+$/, `-${qualityMap[quality]}.$1`);
    return `https://${this.config.cloudFrontDomain}/${videoKey}`;
  }
}