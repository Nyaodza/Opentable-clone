import { QueryTypes } from 'sequelize';
import { sequelize } from '../config/database';
import { logger } from '../utils/logger';
import { CacheService } from './cache.service';

export interface QueryStats {
  query: string;
  calls: number;
  totalTime: number;
  meanTime: number;
  minTime: number;
  maxTime: number;
}

export interface IndexSuggestion {
  table: string;
  columns: string[];
  type: 'btree' | 'hash' | 'gin' | 'gist';
  reason: string;
  estimatedImprovement: number;
}

export class DatabaseOptimizationService {
  private static queryStats: Map<string, QueryStats> = new Map();
  private static slowQueryThreshold = 100; // ms
  private static readonly ANALYZE_INTERVAL = 3600000; // 1 hour

  static initialize(): void {
    // Enable query logging in development
    if (process.env.NODE_ENV === 'development') {
      sequelize.options.logging = (sql, timing) => {
        this.logQuery(sql, timing as number);
      };
    }

    // Schedule periodic analysis
    setInterval(() => {
      this.analyzePerformance().catch(err => 
        logger.error('Database analysis failed:', err)
      );
    }, this.ANALYZE_INTERVAL);

    // Create monitoring functions
    this.createMonitoringFunctions().catch(err =>
      logger.error('Failed to create monitoring functions:', err)
    );
  }

  private static logQuery(sql: string, timing: number): void {
    const normalizedQuery = this.normalizeQuery(sql);
    const stats = this.queryStats.get(normalizedQuery) || {
      query: normalizedQuery,
      calls: 0,
      totalTime: 0,
      meanTime: 0,
      minTime: Infinity,
      maxTime: 0,
    };

    stats.calls++;
    stats.totalTime += timing;
    stats.meanTime = stats.totalTime / stats.calls;
    stats.minTime = Math.min(stats.minTime, timing);
    stats.maxTime = Math.max(stats.maxTime, timing);

    this.queryStats.set(normalizedQuery, stats);

    // Log slow queries
    if (timing > this.slowQueryThreshold) {
      logger.warn(`Slow query detected (${timing}ms):`, {
        query: sql.substring(0, 200),
        timing,
      });
    }
  }

  private static normalizeQuery(sql: string): string {
    // Remove specific values to group similar queries
    return sql
      .replace(/\b\d+\b/g, '?')
      .replace(/'[^']*'/g, '?')
      .replace(/\s+/g, ' ')
      .trim();
  }

  static async analyzePerformance(): Promise<void> {
    logger.info('Starting database performance analysis');

    // Analyze table statistics
    await this.updateTableStatistics();

    // Check for missing indexes
    const indexSuggestions = await this.suggestIndexes();
    if (indexSuggestions.length > 0) {
      logger.info('Index suggestions:', indexSuggestions);
    }

    // Analyze slow queries
    const slowQueries = await this.getSlowQueries();
    if (slowQueries.length > 0) {
      logger.warn('Slow queries found:', slowQueries);
    }

    // Check table bloat
    const bloatedTables = await this.checkTableBloat();
    if (bloatedTables.length > 0) {
      logger.warn('Bloated tables:', bloatedTables);
    }

    // Vacuum and analyze if needed
    await this.performMaintenance();
  }

  static async updateTableStatistics(): Promise<void> {
    const tables = [
      'restaurants',
      'users',
      'reservations',
      'reviews',
      'tenants',
    ];

    for (const table of tables) {
      try {
        await sequelize.query(`ANALYZE ${table}`);
        logger.debug(`Updated statistics for table: ${table}`);
      } catch (error) {
        logger.error(`Failed to analyze table ${table}:`, error);
      }
    }
  }

  static async suggestIndexes(): Promise<IndexSuggestion[]> {
    const suggestions: IndexSuggestion[] = [];

    // Check for sequential scans on large tables
    const seqScans = await sequelize.query<any>(`
      SELECT 
        schemaname,
        tablename,
        seq_scan,
        seq_tup_read,
        idx_scan,
        idx_tup_fetch,
        n_tup_ins + n_tup_upd + n_tup_del as total_writes
      FROM pg_stat_user_tables
      WHERE seq_scan > 0 
        AND n_live_tup > 10000
        AND (seq_scan::float / NULLIF(idx_scan, 0)) > 0.1
      ORDER BY seq_tup_read DESC
      LIMIT 10
    `, { type: QueryTypes.SELECT });

    for (const scan of seqScans) {
      // Analyze common query patterns for this table
      const patterns = await this.analyzeQueryPatterns(scan.tablename);
      
      for (const pattern of patterns) {
        suggestions.push({
          table: scan.tablename,
          columns: pattern.columns,
          type: pattern.type,
          reason: `High sequential scan rate (${scan.seq_scan} scans)`,
          estimatedImprovement: pattern.estimatedImprovement,
        });
      }
    }

    // Check for missing foreign key indexes
    const missingFKIndexes = await sequelize.query<any>(`
      SELECT DISTINCT
        tc.table_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND NOT EXISTS (
          SELECT 1
          FROM pg_indexes
          WHERE tablename = tc.table_name
            AND indexdef LIKE '%' || kcu.column_name || '%'
        )
    `, { type: QueryTypes.SELECT });

    for (const fk of missingFKIndexes) {
      suggestions.push({
        table: fk.table_name,
        columns: [fk.column_name],
        type: 'btree',
        reason: 'Missing index on foreign key',
        estimatedImprovement: 30,
      });
    }

    return suggestions;
  }

  static async getSlowQueries(): Promise<any[]> {
    // Get slow queries from pg_stat_statements
    try {
      const slowQueries = await sequelize.query<any>(`
        SELECT 
          query,
          calls,
          total_exec_time,
          mean_exec_time,
          stddev_exec_time,
          rows
        FROM pg_stat_statements
        WHERE mean_exec_time > :threshold
          AND query NOT LIKE '%pg_stat_statements%'
        ORDER BY mean_exec_time DESC
        LIMIT 20
      `, {
        type: QueryTypes.SELECT,
        replacements: { threshold: this.slowQueryThreshold },
      });

      return slowQueries;
    } catch (error) {
      // pg_stat_statements might not be enabled
      logger.debug('pg_stat_statements not available');
      return [];
    }
  }

  static async checkTableBloat(): Promise<any[]> {
    const bloatQuery = `
      WITH constants AS (
        SELECT current_setting('block_size')::numeric AS bs, 23 AS hdr, 4 AS ma
      ),
      bloat_info AS (
        SELECT
          schemaname,
          tablename,
          cc.relpages,
          bs,
          CEIL((cc.reltuples*((datahdr+ma-
            (CASE WHEN datahdr%ma=0 THEN ma ELSE datahdr%ma END))+nullhdr2+4))/(bs-20::float)) AS otta
        FROM (
          SELECT
            schemaname,
            tablename,
            hdr,
            ma,
            bs,
            SUM((1-null_frac)*avg_width) AS nullhdr2,
            MAX(null_frac) AS null_frac,
            hdr+(
              SELECT 1+COUNT(*)/8
              FROM pg_stats s2
              WHERE null_frac<>0 AND s2.schemaname = s.schemaname AND s2.tablename = s.tablename
            ) AS datahdr
          FROM pg_stats s, constants
          GROUP BY 1,2,3,4,5
        ) AS foo
        JOIN pg_class cc ON cc.relname = tablename
        JOIN pg_namespace nn ON cc.relnamespace = nn.oid AND nn.nspname = schemaname
      )
      SELECT
        schemaname,
        tablename,
        relpages::bigint * bs / 1024 / 1024 AS real_size_mb,
        otta * bs / 1024 / 1024 AS optimal_size_mb,
        CASE WHEN relpages < otta THEN 0
          ELSE (relpages::bigint * bs - otta * bs) / 1024 / 1024
        END AS bloat_mb,
        CASE WHEN relpages < otta THEN 0
          ELSE ROUND(((relpages::bigint - otta) * 100 / relpages)::numeric, 2)
        END AS bloat_percent
      FROM bloat_info
      WHERE relpages > 100
        AND ROUND(((relpages::bigint - otta) * 100 / relpages)::numeric, 2) > 20
      ORDER BY bloat_mb DESC
    `;

    try {
      return await sequelize.query(bloatQuery, { type: QueryTypes.SELECT });
    } catch (error) {
      logger.error('Failed to check table bloat:', error);
      return [];
    }
  }

  static async performMaintenance(): Promise<void> {
    // Vacuum analyze tables with high bloat or modification rate
    const tables = await sequelize.query<any>(`
      SELECT 
        schemaname,
        tablename,
        n_dead_tup,
        n_live_tup,
        n_dead_tup::float / NULLIF(n_live_tup, 0) as dead_ratio
      FROM pg_stat_user_tables
      WHERE n_dead_tup > 1000
        AND n_dead_tup::float / NULLIF(n_live_tup, 0) > 0.1
      ORDER BY n_dead_tup DESC
    `, { type: QueryTypes.SELECT });

    for (const table of tables) {
      try {
        await sequelize.query(`VACUUM ANALYZE ${table.schemaname}.${table.tablename}`);
        logger.info(`Vacuumed table: ${table.tablename} (${table.n_dead_tup} dead tuples)`);
      } catch (error) {
        logger.error(`Failed to vacuum ${table.tablename}:`, error);
      }
    }
  }

  static async createIndex(suggestion: IndexSuggestion): Promise<void> {
    const indexName = `idx_${suggestion.table}_${suggestion.columns.join('_')}`;
    const columns = suggestion.columns.join(', ');
    
    let indexDef = `CREATE INDEX CONCURRENTLY ${indexName} ON ${suggestion.table}`;
    
    if (suggestion.type === 'gin' || suggestion.type === 'gist') {
      indexDef += ` USING ${suggestion.type} (${columns})`;
    } else {
      indexDef += ` (${columns})`;
    }

    try {
      await sequelize.query(indexDef);
      logger.info(`Created index: ${indexName}`);
    } catch (error) {
      logger.error(`Failed to create index ${indexName}:`, error);
      throw error;
    }
  }

  static async analyzeQueryPatterns(tableName: string): Promise<any[]> {
    // Analyze common WHERE clauses for the table
    const patterns: any[] = [];
    
    // Get column statistics
    const columns = await sequelize.query<any>(`
      SELECT 
        attname as column_name,
        n_distinct,
        null_frac,
        avg_width
      FROM pg_stats
      WHERE tablename = :tableName
        AND n_distinct > 1
        AND null_frac < 0.5
      ORDER BY n_distinct DESC
    `, {
      type: QueryTypes.SELECT,
      replacements: { tableName },
    });

    // Suggest indexes based on column cardinality
    for (const col of columns) {
      if (col.n_distinct > 100) {
        patterns.push({
          columns: [col.column_name],
          type: 'btree',
          estimatedImprovement: Math.min(50, col.n_distinct / 10),
        });
      }
    }

    // Check for array columns that might benefit from GIN indexes
    const arrayColumns = await sequelize.query<any>(`
      SELECT 
        attname as column_name
      FROM pg_attribute a
      JOIN pg_type t ON a.atttypid = t.oid
      WHERE attrelid = :tableName::regclass
        AND t.typname LIKE '%[]'
        AND NOT attisdropped
    `, {
      type: QueryTypes.SELECT,
      replacements: { tableName },
    });

    for (const col of arrayColumns) {
      patterns.push({
        columns: [col.column_name],
        type: 'gin',
        estimatedImprovement: 40,
      });
    }

    return patterns;
  }

  static async optimizeConnection(tenantId?: string): Promise<void> {
    // Set optimal connection parameters based on workload
    const commands = [
      'SET work_mem = "8MB"',
      'SET effective_cache_size = "1GB"',
      'SET random_page_cost = 1.1',
      'SET effective_io_concurrency = 200',
      'SET max_parallel_workers_per_gather = 2',
    ];

    if (tenantId) {
      // Set row-level security context
      commands.push(`SET app.current_tenant = '${tenantId}'`);
    }

    for (const cmd of commands) {
      try {
        await sequelize.query(cmd);
      } catch (error) {
        logger.error(`Failed to execute: ${cmd}`, error);
      }
    }
  }

  private static async createMonitoringFunctions(): Promise<void> {
    // Create function to track query performance
    const createFunction = `
      CREATE OR REPLACE FUNCTION track_query_performance()
      RETURNS event_trigger AS $$
      BEGIN
        -- Log query performance metrics
        INSERT INTO query_performance_log (
          query_hash,
          execution_time,
          rows_affected,
          timestamp
        ) VALUES (
          md5(current_query()),
          clock_timestamp() - statement_timestamp(),
          0,
          clock_timestamp()
        );
      END;
      $$ LANGUAGE plpgsql;
    `;

    try {
      await sequelize.query(createFunction);
    } catch (error) {
      // Function might already exist
    }
  }

  static getQueryStats(): QueryStats[] {
    return Array.from(this.queryStats.values())
      .sort((a, b) => b.totalTime - a.totalTime)
      .slice(0, 100);
  }

  static async getConnectionPoolStats(): Promise<any> {
    const pool = (sequelize as any).connectionManager.pool;
    
    return {
      size: pool.size,
      available: pool.available,
      using: pool.using,
      waiting: pool.waiting,
      maxSize: pool.max,
      minSize: pool.min,
    };
  }

  static async explainQuery(query: string, params?: any[]): Promise<any> {
    const explainQuery = `EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ${query}`;
    
    try {
      const result = await sequelize.query(explainQuery, {
        type: QueryTypes.SELECT,
        replacements: params,
      });
      
      return result[0]['QUERY PLAN'];
    } catch (error) {
      logger.error('Failed to explain query:', error);
      throw error;
    }
  }
}