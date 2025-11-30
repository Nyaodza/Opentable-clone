/**
 * Query Builder with N+1 Detection
 * Fluent query builder with automatic optimization
 */

import { Sequelize, Model, ModelStatic, FindOptions, Op, WhereOptions, Includeable } from 'sequelize';
import { logInfo, logWarn, logError } from './logger';
import { getCorrelationId } from './async-context';

// N+1 Detection Types
interface QueryExecution {
  model: string;
  type: 'findAll' | 'findOne' | 'count' | 'create' | 'update' | 'destroy';
  where: string;
  timestamp: number;
  duration: number;
  stackTrace?: string;
  correlationId?: string;
}

interface N1Pattern {
  parentQuery: QueryExecution;
  childQueries: QueryExecution[];
  count: number;
  model: string;
  suggestion: string;
}

// Query Execution Tracker
class QueryTracker {
  private static instance: QueryTracker;
  private queries: Map<string, QueryExecution[]> = new Map();
  private n1Patterns: N1Pattern[] = [];
  private enabled: boolean = process.env.NODE_ENV !== 'production';
  private threshold: number = 3; // Minimum queries to consider N+1

  static getInstance(): QueryTracker {
    if (!this.instance) {
      this.instance = new QueryTracker();
    }
    return this.instance;
  }

  /**
   * Track a query execution
   */
  track(execution: QueryExecution): void {
    if (!this.enabled) return;

    const correlationId = execution.correlationId || getCorrelationId() || 'no-context';
    
    if (!this.queries.has(correlationId)) {
      this.queries.set(correlationId, []);
    }

    const queries = this.queries.get(correlationId)!;
    queries.push({
      ...execution,
      correlationId,
      stackTrace: this.getStackTrace(),
    });

    // Detect N+1 patterns
    this.detectN1Pattern(correlationId);

    // Clean up old queries
    this.cleanup();
  }

  /**
   * Detect N+1 query patterns
   */
  private detectN1Pattern(correlationId: string): void {
    const queries = this.queries.get(correlationId) || [];
    if (queries.length < this.threshold + 1) return;

    // Group queries by model and type
    const grouped = new Map<string, QueryExecution[]>();
    
    for (const query of queries) {
      const key = `${query.model}:${query.type}`;
      if (!grouped.has(key)) {
        grouped.set(key, []);
      }
      grouped.get(key)!.push(query);
    }

    // Look for patterns: one findAll followed by multiple similar queries
    for (const [key, modelQueries] of grouped) {
      if (modelQueries.length >= this.threshold) {
        // Find a potential parent query
        const [model] = key.split(':');
        const parentQuery = queries.find(
          q => q.model !== model && q.type === 'findAll' && q.timestamp < modelQueries[0].timestamp
        );

        if (parentQuery) {
          const pattern: N1Pattern = {
            parentQuery,
            childQueries: modelQueries,
            count: modelQueries.length,
            model,
            suggestion: `Consider using eager loading with 'include' for ${model} when querying ${parentQuery.model}`,
          };

          this.n1Patterns.push(pattern);
          
          logWarn(`[N+1 Detection] Potential N+1 query detected!`, {
            parentModel: parentQuery.model,
            childModel: model,
            queryCount: modelQueries.length,
            correlationId,
            suggestion: pattern.suggestion,
          });
        }
      }
    }
  }

  /**
   * Get stack trace for debugging
   */
  private getStackTrace(): string {
    const stack = new Error().stack || '';
    const lines = stack.split('\n').slice(4, 10);
    return lines.join('\n');
  }

  /**
   * Clean up old query data
   */
  private cleanup(): void {
    const maxAge = 60000; // 1 minute
    const now = Date.now();

    for (const [correlationId, queries] of this.queries) {
      const recent = queries.filter(q => now - q.timestamp < maxAge);
      if (recent.length === 0) {
        this.queries.delete(correlationId);
      } else {
        this.queries.set(correlationId, recent);
      }
    }
  }

  /**
   * Get detected N+1 patterns
   */
  getPatterns(): N1Pattern[] {
    return [...this.n1Patterns];
  }

  /**
   * Clear all tracked data
   */
  clear(): void {
    this.queries.clear();
    this.n1Patterns = [];
  }

  /**
   * Get query statistics
   */
  getStats(): {
    totalQueries: number;
    queriesByModel: Record<string, number>;
    n1PatternsDetected: number;
    slowQueries: QueryExecution[];
  } {
    let totalQueries = 0;
    const queriesByModel: Record<string, number> = {};
    const slowQueries: QueryExecution[] = [];

    for (const queries of this.queries.values()) {
      for (const query of queries) {
        totalQueries++;
        queriesByModel[query.model] = (queriesByModel[query.model] || 0) + 1;
        
        if (query.duration > 100) {
          slowQueries.push(query);
        }
      }
    }

    return {
      totalQueries,
      queriesByModel,
      n1PatternsDetected: this.n1Patterns.length,
      slowQueries: slowQueries.sort((a, b) => b.duration - a.duration).slice(0, 10),
    };
  }
}

/**
 * Fluent Query Builder
 */
export class QueryBuilder<M extends Model> {
  private model: ModelStatic<M>;
  private options: FindOptions = {};
  private tracker: QueryTracker;

  constructor(model: ModelStatic<M>) {
    this.model = model;
    this.tracker = QueryTracker.getInstance();
    this.options = {
      where: {},
      include: [],
      order: [],
      attributes: undefined,
    };
  }

  /**
   * Add where clause
   */
  where(conditions: WhereOptions<M['_attributes']>): this {
    this.options.where = {
      ...this.options.where as object,
      ...conditions as object,
    };
    return this;
  }

  /**
   * Add OR conditions
   */
  orWhere(conditions: WhereOptions<M['_attributes']>[]): this {
    (this.options.where as any)[Op.or] = conditions;
    return this;
  }

  /**
   * Add AND conditions
   */
  andWhere(conditions: WhereOptions<M['_attributes']>[]): this {
    (this.options.where as any)[Op.and] = conditions;
    return this;
  }

  /**
   * Select specific attributes
   */
  select(...attributes: (keyof M['_attributes'])[]): this {
    this.options.attributes = attributes as string[];
    return this;
  }

  /**
   * Exclude attributes
   */
  exclude(...attributes: (keyof M['_attributes'])[]): this {
    this.options.attributes = {
      exclude: attributes as string[],
    };
    return this;
  }

  /**
   * Eager load associations (prevents N+1)
   */
  include(associations: Includeable | Includeable[]): this {
    const includes = Array.isArray(associations) ? associations : [associations];
    (this.options.include as Includeable[]).push(...includes);
    return this;
  }

  /**
   * Add ordering
   */
  orderBy(column: keyof M['_attributes'], direction: 'ASC' | 'DESC' = 'ASC'): this {
    (this.options.order as any[]).push([column, direction]);
    return this;
  }

  /**
   * Limit results
   */
  limit(count: number): this {
    this.options.limit = count;
    return this;
  }

  /**
   * Offset results
   */
  offset(count: number): this {
    this.options.offset = count;
    return this;
  }

  /**
   * Paginate results
   */
  paginate(page: number, perPage: number = 20): this {
    this.options.limit = perPage;
    this.options.offset = (page - 1) * perPage;
    return this;
  }

  /**
   * Add raw options
   */
  raw(raw: boolean = true): this {
    this.options.raw = raw;
    return this;
  }

  /**
   * Use transaction
   */
  transaction(t: any): this {
    this.options.transaction = t;
    return this;
  }

  /**
   * Lock for update
   */
  forUpdate(): this {
    this.options.lock = true;
    return this;
  }

  /**
   * Execute findAll
   */
  async findAll(): Promise<M[]> {
    const startTime = Date.now();
    
    try {
      const results = await this.model.findAll(this.options);
      
      this.trackQuery('findAll', Date.now() - startTime);
      
      return results;
    } catch (error) {
      logError('[QueryBuilder] findAll error:', error);
      throw error;
    }
  }

  /**
   * Execute findOne
   */
  async findOne(): Promise<M | null> {
    const startTime = Date.now();
    
    try {
      const result = await this.model.findOne(this.options);
      
      this.trackQuery('findOne', Date.now() - startTime);
      
      return result;
    } catch (error) {
      logError('[QueryBuilder] findOne error:', error);
      throw error;
    }
  }

  /**
   * Execute findByPk
   */
  async findById(id: string | number): Promise<M | null> {
    const startTime = Date.now();
    
    try {
      const result = await this.model.findByPk(id, this.options);
      
      this.trackQuery('findOne', Date.now() - startTime);
      
      return result;
    } catch (error) {
      logError('[QueryBuilder] findById error:', error);
      throw error;
    }
  }

  /**
   * Execute count
   */
  async count(): Promise<number> {
    const startTime = Date.now();
    
    try {
      const result = await this.model.count({
        where: this.options.where,
        include: this.options.include,
      });
      
      this.trackQuery('count', Date.now() - startTime);
      
      return result;
    } catch (error) {
      logError('[QueryBuilder] count error:', error);
      throw error;
    }
  }

  /**
   * Execute findAndCountAll for pagination
   */
  async findAndCount(): Promise<{ rows: M[]; count: number }> {
    const startTime = Date.now();
    
    try {
      const result = await this.model.findAndCountAll(this.options);
      
      this.trackQuery('findAll', Date.now() - startTime);
      
      return result;
    } catch (error) {
      logError('[QueryBuilder] findAndCount error:', error);
      throw error;
    }
  }

  /**
   * Check if any records exist
   */
  async exists(): Promise<boolean> {
    const result = await this.limit(1).findOne();
    return result !== null;
  }

  /**
   * Get first result or throw
   */
  async firstOrFail(): Promise<M> {
    const result = await this.findOne();
    if (!result) {
      throw new Error(`${this.model.name} not found`);
    }
    return result;
  }

  /**
   * Track query execution
   */
  private trackQuery(type: QueryExecution['type'], duration: number): void {
    this.tracker.track({
      model: this.model.name,
      type,
      where: JSON.stringify(this.options.where || {}),
      timestamp: Date.now(),
      duration,
    });

    // Log slow queries
    if (duration > 100) {
      logWarn(`[SlowQuery] ${this.model.name}.${type} took ${duration}ms`, {
        where: this.options.where,
        includes: (this.options.include as any[])?.map(i => i.model?.name || i),
      });
    }
  }

  /**
   * Get built options (for debugging)
   */
  getOptions(): FindOptions {
    return { ...this.options };
  }
}

/**
 * Create query builder for a model
 */
export function query<M extends Model>(model: ModelStatic<M>): QueryBuilder<M> {
  return new QueryBuilder(model);
}

/**
 * Middleware to log N+1 detection results
 */
export function queryAnalyzerMiddleware() {
  return (req: any, res: any, next: any) => {
    const tracker = QueryTracker.getInstance();
    
    // Log query stats on response finish
    res.on('finish', () => {
      const stats = tracker.getStats();
      
      if (stats.totalQueries > 10) {
        logInfo(`[QueryAnalyzer] Request executed ${stats.totalQueries} queries`, {
          path: req.path,
          queriesByModel: stats.queriesByModel,
          n1Patterns: stats.n1PatternsDetected,
        });
      }

      if (stats.n1PatternsDetected > 0) {
        const patterns = tracker.getPatterns();
        for (const pattern of patterns.slice(-3)) {
          logWarn('[QueryAnalyzer] N+1 Pattern:', {
            parent: pattern.parentQuery.model,
            child: pattern.model,
            count: pattern.count,
            suggestion: pattern.suggestion,
          });
        }
      }
    });

    next();
  };
}

/**
 * Batch loader for preventing N+1 queries
 */
export class BatchLoader<K, V> {
  private batch: Map<K, { resolve: (v: V) => void; reject: (e: Error) => void }[]> = new Map();
  private scheduled = false;
  private batchFn: (keys: K[]) => Promise<Map<K, V>>;
  private delay: number;

  constructor(
    batchFn: (keys: K[]) => Promise<Map<K, V>>,
    options: { delay?: number } = {}
  ) {
    this.batchFn = batchFn;
    this.delay = options.delay || 0;
  }

  /**
   * Load a single value
   */
  load(key: K): Promise<V> {
    return new Promise((resolve, reject) => {
      if (!this.batch.has(key)) {
        this.batch.set(key, []);
      }
      this.batch.get(key)!.push({ resolve, reject });

      if (!this.scheduled) {
        this.scheduled = true;
        
        if (this.delay > 0) {
          setTimeout(() => this.executeBatch(), this.delay);
        } else {
          process.nextTick(() => this.executeBatch());
        }
      }
    });
  }

  /**
   * Load multiple values
   */
  async loadMany(keys: K[]): Promise<V[]> {
    return Promise.all(keys.map(key => this.load(key)));
  }

  /**
   * Execute batch load
   */
  private async executeBatch(): Promise<void> {
    const currentBatch = this.batch;
    this.batch = new Map();
    this.scheduled = false;

    const keys = Array.from(currentBatch.keys());
    
    try {
      const results = await this.batchFn(keys);

      for (const [key, callbacks] of currentBatch) {
        const value = results.get(key);
        for (const { resolve, reject } of callbacks) {
          if (value !== undefined) {
            resolve(value);
          } else {
            reject(new Error(`No result for key: ${key}`));
          }
        }
      }
    } catch (error) {
      for (const callbacks of currentBatch.values()) {
        for (const { reject } of callbacks) {
          reject(error as Error);
        }
      }
    }
  }

  /**
   * Clear the batch
   */
  clear(): void {
    this.batch.clear();
    this.scheduled = false;
  }
}

/**
 * Create a batch loader for a model
 */
export function createModelLoader<M extends Model>(
  model: ModelStatic<M>,
  keyField: keyof M['_attributes'] = 'id' as any
): BatchLoader<string | number, M> {
  return new BatchLoader(async (keys) => {
    const results = await model.findAll({
      where: {
        [keyField]: keys,
      } as any,
    });

    const map = new Map<string | number, M>();
    for (const result of results) {
      const key = (result as any)[keyField];
      map.set(key, result);
    }
    return map;
  });
}

// Export tracker for monitoring
export const queryTracker = QueryTracker.getInstance();

export default query;

