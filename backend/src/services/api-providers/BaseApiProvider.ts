import axios, { AxiosInstance, AxiosError } from 'axios';
import CircuitBreaker = require('opossum');
import { RateLimiter } from 'limiter';
import { CacheManager } from '../../config/redis';
import { logger } from '../../utils/logger';
import {
  ApiProvider,
  ApiProviderConfig,
  ApiProviderResponse,
  ApiSearchParams,
  NormalizedListing,
  SearchParams,
} from '../../types/api-providers.types';
import { ServiceType, ListingSource } from '../../models/UnifiedListing';

export abstract class BaseApiProvider implements ApiProvider {
  protected axiosInstance: AxiosInstance;
  protected circuitBreaker: CircuitBreaker;
  protected rateLimiter: RateLimiter;
  protected cache: CacheManager;
  public config: ApiProviderConfig;

  constructor(config: ApiProviderConfig) {
    this.config = config;
    this.cache = CacheManager.getInstance();

    // Initialize axios instance
    this.axiosInstance = axios.create({
      baseURL: config.baseUrl,
      timeout: config.timeout,
      headers: this.getDefaultHeaders(),
    });

    // Add request/response interceptors
    this.setupInterceptors();

    // Initialize rate limiter
    this.rateLimiter = new RateLimiter({
      tokensPerInterval: config.rateLimit.maxRequests,
      interval: config.rateLimit.windowMs,
      fireImmediately: true,
    });

    // Initialize circuit breaker
    this.circuitBreaker = new CircuitBreaker(
      this.makeApiRequest.bind(this),
      {
        timeout: config.timeout,
        errorThresholdPercentage: 50,
        resetTimeout: 30000, // 30 seconds
        name: `${config.name}-circuit-breaker`,
      }
    );

    // Circuit breaker event handlers
    this.circuitBreaker.on('open', () => {
      logger.warn(`Circuit breaker opened for ${config.name}`);
    });

    this.circuitBreaker.on('halfOpen', () => {
      logger.info(`Circuit breaker half-open for ${config.name}`);
    });

    this.circuitBreaker.on('close', () => {
      logger.info(`Circuit breaker closed for ${config.name}`);
    });
  }

  protected abstract getDefaultHeaders(): Record<string, string>;
  protected abstract convertSearchParams(params: SearchParams): ApiSearchParams;
  abstract normalizeResponse(rawData: any): NormalizedListing[];

  async searchListings(params: SearchParams): Promise<ApiProviderResponse<NormalizedListing[]>> {
    try {
      // Check if provider is enabled
      if (!this.config.enabled) {
        return {
          success: false,
          error: 'Provider is disabled',
        };
      }

      // Check cache first
      const cacheKey = this.getCacheKey(params);
      const cachedData = await this.cache.get(cacheKey);
      
      if (cachedData) {
        logger.debug(`Cache hit for ${this.config.name}: ${cacheKey}`);
        return {
          success: true,
          data: cachedData as NormalizedListing[],
        };
      }

      // Check rate limit
      const canProceed = await this.rateLimiter.tryRemoveTokens(1);
      if (!canProceed) {
        return {
          success: false,
          error: 'Rate limit exceeded',
        };
      }

      // Convert parameters
      const apiParams = this.convertSearchParams(params);

      // Make API request through circuit breaker
      const response = await this.circuitBreaker.fire(apiParams);

      // Normalize response
      const normalizedListings = this.normalizeResponse(response);

      // Limit results per provider
      const limitedListings = normalizedListings.slice(0, this.config.maxListingsPerRequest);

      // Cache successful response
      await this.cache.set(cacheKey, limitedListings, this.config.cacheTTL);

      return {
        success: true,
        data: limitedListings,
        totalCount: normalizedListings.length,
        hasMore: normalizedListings.length > this.config.maxListingsPerRequest,
      };
    } catch (error) {
      logger.error(`Error in ${this.config.name} provider:`, error);
      
      if (error instanceof Error) {
        return {
          success: false,
          error: error.message,
        };
      }

      return {
        success: false,
        error: 'Unknown error occurred',
      };
    }
  }

  protected async makeApiRequest(params: ApiSearchParams): Promise<any> {
    try {
      const response = await this.axiosInstance.get('/search', { params });
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`API request failed: ${error.message}`);
      }
      throw error;
    }
  }

  async isHealthy(): Promise<boolean> {
    try {
      // Check circuit breaker state
      if (this.circuitBreaker.opened) {
        return false;
      }

      // Make a simple health check request
      const response = await this.axiosInstance.get('/health', {
        timeout: 5000,
      }).catch(() => null);

      return response?.status === 200;
    } catch {
      return false;
    }
  }

  async getQuota(): Promise<{ used: number; limit: number; resetAt: Date }> {
    // This should be overridden by providers that have quota endpoints
    const tokensRemaining = this.rateLimiter.getTokensRemaining();
    const limit = this.config.rateLimit.maxRequests;
    const used = limit - tokensRemaining;
    const resetAt = new Date(Date.now() + this.config.rateLimit.windowMs);

    return { used, limit, resetAt };
  }

  protected getCacheKey(params: SearchParams): string {
    const keyParts = [
      'listing',
      this.config.source,
      params.serviceType,
      params.location.city || params.location.lat,
      params.location.country || params.location.lng,
      params.page || 1,
      params.pageSize || 20,
      params.sortBy || 'default',
    ];

    if (params.dateRange) {
      keyParts.push(params.dateRange.startDate.toISOString().split('T')[0]);
      keyParts.push(params.dateRange.endDate.toISOString().split('T')[0]);
    }

    if (params.filters) {
      keyParts.push(JSON.stringify(params.filters));
    }

    return keyParts.join(':');
  }

  protected setupInterceptors(): void {
    // Request interceptor
    this.axiosInstance.interceptors.request.use(
      (config) => {
        // Add timestamp for logging
        (config as any).metadata = { startTime: Date.now() };
        logger.debug(`API Request to ${this.config.name}: ${config.url}`);
        return config;
      },
      (error) => {
        logger.error(`API Request Error for ${this.config.name}:`, error);
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.axiosInstance.interceptors.response.use(
      (response) => {
        const metadata = (response.config as any).metadata;
        const duration = metadata ? Date.now() - metadata.startTime : 0;
        logger.debug(`API Response from ${this.config.name}: ${response.status} (${duration}ms)`);
        return response;
      },
      (error: AxiosError) => {
        if (error.response) {
          logger.error(`API Response Error from ${this.config.name}: ${error.response.status}`);
        } else if (error.request) {
          logger.error(`No response from ${this.config.name}`);
        } else {
          logger.error(`API Error for ${this.config.name}: ${error.message}`);
        }
        return Promise.reject(error);
      }
    );
  }

  protected generateListingId(externalId: string): string {
    return `${this.config.source}_${externalId}`;
  }

  protected normalizePrice(price: any, currency?: string): { price?: number; currency?: string } {
    if (!price) return {};

    let normalizedPrice: number | undefined;
    let normalizedCurrency = currency || 'USD';

    if (typeof price === 'number') {
      normalizedPrice = price;
    } else if (typeof price === 'string') {
      normalizedPrice = parseFloat(price.replace(/[^0-9.-]+/g, ''));
    } else if (price.amount) {
      normalizedPrice = price.amount;
      normalizedCurrency = price.currency || normalizedCurrency;
    }

    return {
      price: normalizedPrice,
      currency: normalizedCurrency,
    };
  }

  protected normalizeRating(rating: any): number | undefined {
    if (!rating) return undefined;

    let normalizedRating: number | undefined;

    if (typeof rating === 'number') {
      normalizedRating = rating;
    } else if (typeof rating === 'string') {
      normalizedRating = parseFloat(rating);
    } else if (rating.value) {
      normalizedRating = rating.value;
    } else if (rating.average) {
      normalizedRating = rating.average;
    }

    // Ensure rating is between 0 and 5
    if (normalizedRating) {
      // If rating is out of 10, convert to 5-scale
      if (normalizedRating > 5) {
        normalizedRating = normalizedRating / 2;
      }
      normalizedRating = Math.min(5, Math.max(0, normalizedRating));
    }

    return normalizedRating;
  }

  protected extractImages(images: any): string[] {
    if (!images) return [];

    if (Array.isArray(images)) {
      return images
        .map(img => {
          if (typeof img === 'string') return img;
          if (img.url) return img.url;
          if (img.src) return img.src;
          if (img.href) return img.href;
          return null;
        })
        .filter(Boolean) as string[];
    }

    if (typeof images === 'string') {
      return [images];
    }

    if (images.url || images.src || images.href) {
      return [images.url || images.src || images.href];
    }

    return [];
  }
}