import { Request, Response, NextFunction } from 'express';
import { logger } from '../config/logger';

/**
 * Query Optimization Utilities
 * Provides utilities to prevent N+1 queries, implement pagination, and optimize database queries
 */

/**
 * Pagination interface
 */
export interface PaginationParams {
  page: number;
  limit: number;
  offset: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

/**
 * Paginated response interface
 */
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

/**
 * Parse pagination parameters from request
 */
export const parsePaginationParams = (req: Request): PaginationParams => {
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
  const offset = (page - 1) * limit;
  const sortBy = req.query.sortBy as string || 'created_at';
  const sortOrder = (req.query.sortOrder as string)?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

  return {
    page,
    limit,
    offset,
    sortBy,
    sortOrder,
  };
};

/**
 * Create paginated response
 */
export const createPaginatedResponse = <T>(
  data: T[],
  total: number,
  params: PaginationParams
): PaginatedResponse<T> => {
  const totalPages = Math.ceil(total / params.limit);
  
  return {
    data,
    pagination: {
      page: params.page,
      limit: params.limit,
      total,
      totalPages,
      hasNext: params.page < totalPages,
      hasPrev: params.page > 1,
    },
  };
};

/**
 * Pagination middleware
 */
export const paginationMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const pagination = parsePaginationParams(req);
    
    // Attach to request object
    (req as any).pagination = pagination;
    
    next();
  } catch (error) {
    logger.error('Pagination middleware error:', error);
    res.status(400).json({
      success: false,
      error: 'Invalid pagination parameters',
    });
  }
};

/**
 * Field selection interface
 */
export interface FieldSelection {
  include?: string[];
  exclude?: string[];
}

/**
 * Parse field selection from request
 */
export const parseFieldSelection = (req: Request): FieldSelection => {
  const fields = req.query.fields as string;
  const exclude = req.query.exclude as string;

  const selection: FieldSelection = {};

  if (fields) {
    selection.include = fields.split(',').map(f => f.trim());
  }

  if (exclude) {
    selection.exclude = exclude.split(',').map(f => f.trim());
  }

  return selection;
};

/**
 * Apply field selection to data object
 */
export const applyFieldSelection = <T extends object>(
  data: T | T[],
  selection: FieldSelection
): any => {
  const filterFields = (obj: any): any => {
    if (!obj || typeof obj !== 'object') return obj;

    const filtered: any = {};

    // If include is specified, only include those fields
    if (selection.include && selection.include.length > 0) {
      for (const field of selection.include) {
        if (field in obj) {
          filtered[field] = obj[field];
        }
      }
      return filtered;
    }

    // Otherwise, include all except excluded fields
    for (const key in obj) {
      if (!selection.exclude || !selection.exclude.includes(key)) {
        filtered[key] = obj[key];
      }
    }

    return filtered;
  };

  if (Array.isArray(data)) {
    return data.map(filterFields);
  }

  return filterFields(data);
};

/**
 * Field selection middleware
 */
export const fieldSelectionMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const selection = parseFieldSelection(req);
    
    // Store original json method
    const originalJson = res.json.bind(res);
    
    // Override json method to apply field selection
    res.json = function(data: any) {
      if (data && (selection.include || selection.exclude)) {
        // Apply field selection to response data
        if (data.data) {
          data.data = applyFieldSelection(data.data, selection);
        } else if (!data.error && !data.success) {
          data = applyFieldSelection(data, selection);
        }
      }
      
      return originalJson(data);
    };

    next();
  } catch (error) {
    logger.error('Field selection middleware error:', error);
    next(); // Continue without field selection on error
  }
};

/**
 * Query performance monitoring
 */
export class QueryPerformanceMonitor {
  private static slowQueryThreshold = 1000; // 1 second
  private static queries: Map<string, number[]> = new Map();

  /**
   * Track query execution time
   */
  static async trackQuery<T>(
    queryName: string,
    queryFn: () => Promise<T>
  ): Promise<T> {
    const startTime = Date.now();

    try {
      const result = await queryFn();
      const duration = Date.now() - startTime;

      // Log slow queries
      if (duration > this.slowQueryThreshold) {
        logger.warn('Slow query detected', {
          queryName,
          duration,
          threshold: this.slowQueryThreshold,
        });
      }

      // Store query timing
      if (!this.queries.has(queryName)) {
        this.queries.set(queryName, []);
      }
      this.queries.get(queryName)!.push(duration);

      // Keep only last 100 executions
      const timings = this.queries.get(queryName)!;
      if (timings.length > 100) {
        timings.shift();
      }

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error('Query execution failed', {
        queryName,
        duration,
        error,
      });
      throw error;
    }
  }

  /**
   * Get query statistics
   */
  static getQueryStats(queryName: string): {
    count: number;
    avg: number;
    min: number;
    max: number;
    p95: number;
  } | null {
    const timings = this.queries.get(queryName);
    if (!timings || timings.length === 0) {
      return null;
    }

    const sorted = [...timings].sort((a, b) => a - b);
    const count = sorted.length;
    const sum = sorted.reduce((a, b) => a + b, 0);

    return {
      count,
      avg: sum / count,
      min: sorted[0],
      max: sorted[count - 1],
      p95: sorted[Math.floor(count * 0.95)],
    };
  }

  /**
   * Get all query statistics
   */
  static getAllStats(): Record<string, any> {
    const stats: Record<string, any> = {};
    
    for (const [queryName, _] of this.queries) {
      stats[queryName] = this.getQueryStats(queryName);
    }

    return stats;
  }

  /**
   * Reset statistics
   */
  static reset(): void {
    this.queries.clear();
  }
}

/**
 * Batch loading utility to prevent N+1 queries
 */
export class DataLoader<K, V> {
  private cache = new Map<K, Promise<V>>();
  private batchScheduled = false;
  private batchQueue: Array<{
    key: K;
    resolve: (value: V) => void;
    reject: (error: any) => void;
  }> = [];

  constructor(
    private batchLoadFn: (keys: K[]) => Promise<V[]>,
    private options: {
      maxBatchSize?: number;
      cacheKeyFn?: (key: K) => string;
    } = {}
  ) {}

  /**
   * Load a single item (batched automatically)
   */
  async load(key: K): Promise<V> {
    const cacheKey = this.options.cacheKeyFn ? this.options.cacheKeyFn(key) : key;
    
    // Check cache
    if (this.cache.has(cacheKey as K)) {
      return this.cache.get(cacheKey as K)!;
    }

    // Create promise for this key
    const promise = new Promise<V>((resolve, reject) => {
      this.batchQueue.push({ key, resolve, reject });

      // Schedule batch execution
      if (!this.batchScheduled) {
        this.batchScheduled = true;
        process.nextTick(() => this.executeBatch());
      }
    });

    // Cache the promise
    this.cache.set(cacheKey as K, promise);

    return promise;
  }

  /**
   * Execute batch load
   */
  private async executeBatch(): Promise<void> {
    this.batchScheduled = false;

    const batch = this.batchQueue.splice(0, this.options.maxBatchSize || 100);
    if (batch.length === 0) return;

    try {
      const keys = batch.map(item => item.key);
      const values = await this.batchLoadFn(keys);

      // Resolve promises
      batch.forEach((item, index) => {
        item.resolve(values[index]);
      });
    } catch (error) {
      // Reject all promises in batch
      batch.forEach(item => {
        item.reject(error);
      });
    }
  }

  /**
   * Load multiple items
   */
  async loadMany(keys: K[]): Promise<V[]> {
    return Promise.all(keys.map(key => this.load(key)));
  }

  /**
   * Clear cache
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Clear specific key
   */
  clearKey(key: K): void {
    const cacheKey = this.options.cacheKeyFn ? this.options.cacheKeyFn(key) : key;
    this.cache.delete(cacheKey as K);
  }
}

/**
 * Create a data loader for common use cases
 */
export const createRestaurantLoader = (repository: any) => {
  return new DataLoader<string, any>(
    async (ids: string[]) => {
      const restaurants = await repository.findByIds(ids);
      // Ensure order matches input order
      return ids.map(id => restaurants.find((r: any) => r.id === id));
    },
    { maxBatchSize: 100 }
  );
};

/**
 * Query optimization helpers for Sequelize
 */
export const sequelizeOptimizations = {
  /**
   * Get optimized include options
   */
  getIncludeOptions: (associations: string[]) => {
    return associations.map(assoc => ({
      association: assoc,
      required: false, // Use LEFT JOIN instead of INNER JOIN
      attributes: { exclude: ['createdAt', 'updatedAt'] }, // Reduce data transfer
    }));
  },

  /**
   * Get pagination options
   */
  getPaginationOptions: (params: PaginationParams) => {
    return {
      limit: params.limit,
      offset: params.offset,
      order: [[params.sortBy || 'createdAt', params.sortOrder || 'DESC']],
    };
  },

  /**
   * Get attribute selection options
   */
  getAttributeOptions: (selection: FieldSelection) => {
    if (selection.include) {
      return { attributes: selection.include };
    }
    if (selection.exclude) {
      return { attributes: { exclude: selection.exclude } };
    }
    return {};
  },
};

export default {
  parsePaginationParams,
  createPaginatedResponse,
  paginationMiddleware,
  parseFieldSelection,
  applyFieldSelection,
  fieldSelectionMiddleware,
  QueryPerformanceMonitor,
  DataLoader,
  createRestaurantLoader,
  sequelizeOptimizations,
};
