import { QueryInterface, DataTypes, QueryTypes } from 'sequelize';
import { sequelize } from './database';

// Database optimization configuration
export const optimizeDatabase = async () => {
  console.log('Starting database optimization...');
  
  try {
    // Create indexes for better query performance
    await createIndexes();
    
    // Configure query optimization
    await configureQueryOptimization();
    
    console.log('✅ Database optimization completed');
  } catch (error) {
    console.error('❌ Database optimization failed:', error);
    throw error;
  }
};

// Create performance indexes
const createIndexes = async () => {
  const queryInterface = sequelize.getQueryInterface();
  
  console.log('Creating performance indexes...');

  try {
    // User indexes
    await createIndexIfNotExists(queryInterface, 'Users', ['email'], { unique: true });
    await createIndexIfNotExists(queryInterface, 'Users', ['role']);
    await createIndexIfNotExists(queryInterface, 'Users', ['isActive']);
    await createIndexIfNotExists(queryInterface, 'Users', ['createdAt']);

    // Restaurant indexes
    await createIndexIfNotExists(queryInterface, 'Restaurants', ['name']);
    await createIndexIfNotExists(queryInterface, 'Restaurants', ['cuisine']);
    await createIndexIfNotExists(queryInterface, 'Restaurants', ['location']);
    await createIndexIfNotExists(queryInterface, 'Restaurants', ['priceRange']);
    await createIndexIfNotExists(queryInterface, 'Restaurants', ['rating']);
    await createIndexIfNotExists(queryInterface, 'Restaurants', ['isActive']);
    await createIndexIfNotExists(queryInterface, 'Restaurants', ['ownerId']);
    
    // Composite indexes for restaurant search
    await createIndexIfNotExists(queryInterface, 'Restaurants', ['cuisine', 'location']);
    await createIndexIfNotExists(queryInterface, 'Restaurants', ['location', 'priceRange']);
    await createIndexIfNotExists(queryInterface, 'Restaurants', ['rating', 'isActive']);
    await createIndexIfNotExists(queryInterface, 'Restaurants', ['cuisine', 'priceRange', 'rating']);

    // Full-text search index for restaurant name and description
    await createGinIndex(queryInterface, 'Restaurants', ['name', 'description']);

    // Reservation indexes
    await createIndexIfNotExists(queryInterface, 'Reservations', ['userId']);
    await createIndexIfNotExists(queryInterface, 'Reservations', ['restaurantId']);
    await createIndexIfNotExists(queryInterface, 'Reservations', ['tableId']);
    await createIndexIfNotExists(queryInterface, 'Reservations', ['reservationDate']);
    await createIndexIfNotExists(queryInterface, 'Reservations', ['reservationTime']);
    await createIndexIfNotExists(queryInterface, 'Reservations', ['status']);
    await createIndexIfNotExists(queryInterface, 'Reservations', ['createdAt']);
    
    // Composite indexes for reservation queries
    await createIndexIfNotExists(queryInterface, 'Reservations', ['restaurantId', 'reservationDate']);
    await createIndexIfNotExists(queryInterface, 'Reservations', ['userId', 'status']);
    await createIndexIfNotExists(queryInterface, 'Reservations', ['restaurantId', 'reservationDate', 'reservationTime']);

    // Table indexes
    await createIndexIfNotExists(queryInterface, 'Tables', ['restaurantId']);
    await createIndexIfNotExists(queryInterface, 'Tables', ['capacity']);
    await createIndexIfNotExists(queryInterface, 'Tables', ['isActive']);
    await createIndexIfNotExists(queryInterface, 'Tables', ['restaurantId', 'isActive']);

    // Review indexes
    await createIndexIfNotExists(queryInterface, 'Reviews', ['restaurantId']);
    await createIndexIfNotExists(queryInterface, 'Reviews', ['userId']);
    await createIndexIfNotExists(queryInterface, 'Reviews', ['rating']);
    await createIndexIfNotExists(queryInterface, 'Reviews', ['createdAt']);
    await createIndexIfNotExists(queryInterface, 'Reviews', ['restaurantId', 'rating']);

    // Restaurant hours indexes
    await createIndexIfNotExists(queryInterface, 'RestaurantHours', ['restaurantId']);
    await createIndexIfNotExists(queryInterface, 'RestaurantHours', ['dayOfWeek']);
    await createIndexIfNotExists(queryInterface, 'RestaurantHours', ['restaurantId', 'dayOfWeek']);

    // Payment indexes
    await createIndexIfNotExists(queryInterface, 'Payments', ['reservationId']);
    await createIndexIfNotExists(queryInterface, 'Payments', ['userId']);
    await createIndexIfNotExists(queryInterface, 'Payments', ['status']);
    await createIndexIfNotExists(queryInterface, 'Payments', ['stripePaymentIntentId'], { unique: true });
    await createIndexIfNotExists(queryInterface, 'Payments', ['createdAt']);

    // Waitlist indexes
    await createIndexIfNotExists(queryInterface, 'Waitlists', ['restaurantId']);
    await createIndexIfNotExists(queryInterface, 'Waitlists', ['userId']);
    await createIndexIfNotExists(queryInterface, 'Waitlists', ['requestedDate']);
    await createIndexIfNotExists(queryInterface, 'Waitlists', ['status']);
    await createIndexIfNotExists(queryInterface, 'Waitlists', ['restaurantId', 'requestedDate']);

    // Loyalty program indexes
    await createIndexIfNotExists(queryInterface, 'LoyaltyTransactions', ['userId']);
    await createIndexIfNotExists(queryInterface, 'LoyaltyTransactions', ['type']);
    await createIndexIfNotExists(queryInterface, 'LoyaltyTransactions', ['createdAt']);
    await createIndexIfNotExists(queryInterface, 'LoyaltyTransactions', ['userId', 'type']);

    await createIndexIfNotExists(queryInterface, 'UserRewards', ['userId']);
    await createIndexIfNotExists(queryInterface, 'UserRewards', ['rewardId']);
    await createIndexIfNotExists(queryInterface, 'UserRewards', ['status']);
    await createIndexIfNotExists(queryInterface, 'UserRewards', ['expiresAt']);

    // Audit log indexes
    await createIndexIfNotExists(queryInterface, 'AuditLogs', ['userId']);
    await createIndexIfNotExists(queryInterface, 'AuditLogs', ['action']);
    await createIndexIfNotExists(queryInterface, 'AuditLogs', ['resourceType']);
    await createIndexIfNotExists(queryInterface, 'AuditLogs', ['ipAddress']);
    await createIndexIfNotExists(queryInterface, 'AuditLogs', ['createdAt']);
    await createIndexIfNotExists(queryInterface, 'AuditLogs', ['action', 'resourceType']);

    console.log('✅ Performance indexes created');
  } catch (error) {
    console.error('❌ Failed to create indexes:', error);
    throw error;
  }
};

// Helper to create index if it doesn't exist
const createIndexIfNotExists = async (
  queryInterface: QueryInterface,
  tableName: string,
  fields: string[],
  options: { unique?: boolean; name?: string } = {}
) => {
  const indexName = options.name || `idx_${tableName}_${fields.join('_')}`.toLowerCase();
  
  try {
    await queryInterface.addIndex(tableName, fields, {
      ...options,
      name: indexName,
    });
    console.log(`✓ Created index: ${indexName}`);
  } catch (error: any) {
    if (error.message?.includes('already exists') || error.message?.includes('duplicate')) {
      console.log(`- Index already exists: ${indexName}`);
    } else {
      console.error(`Failed to create index ${indexName}:`, error.message);
    }
  }
};

// Create GIN index for full-text search (PostgreSQL specific)
const createGinIndex = async (
  queryInterface: QueryInterface,
  tableName: string,
  fields: string[]
) => {
  const indexName = `gin_idx_${tableName}_${fields.join('_')}_search`.toLowerCase();
  
  try {
    // Create tsvector column for full-text search
    const searchFields = fields.map(field => `coalesce(${field}, '')`).join(" || ' ' || ");
    
    await queryInterface.sequelize.query(`
      CREATE INDEX IF NOT EXISTS ${indexName} 
      ON "${tableName}" 
      USING gin(to_tsvector('english', ${searchFields}))
    `);
    
    console.log(`✓ Created GIN index: ${indexName}`);
  } catch (error: any) {
    console.error(`Failed to create GIN index ${indexName}:`, error.message);
  }
};

// Configure query optimization settings
const configureQueryOptimization = async () => {
  console.log('Configuring query optimization...');

  try {
    // Update connection pool settings for better performance
    const pool = sequelize.options.pool;
    if (pool) {
      pool.max = parseInt(process.env.DB_POOL_MAX || '20');
      pool.min = parseInt(process.env.DB_POOL_MIN || '5');
      pool.acquire = parseInt(process.env.DB_POOL_ACQUIRE || '30000');
      pool.idle = parseInt(process.env.DB_POOL_IDLE || '10000');
    }

    // Enable query logging in development
    if (process.env.NODE_ENV === 'development') {
      sequelize.options.logging = (sql, timing) => {
        if (timing && timing > 1000) {
          console.warn(`🐌 Slow query (${timing}ms):`, sql);
        }
      };
      sequelize.options.benchmark = true;
    }

    // Configure PostgreSQL-specific optimizations
    if (sequelize.getDialect() === 'postgres') {
      await configurePostgresOptimizations();
    }

    console.log('✅ Query optimization configured');
  } catch (error) {
    console.error('❌ Failed to configure query optimization:', error);
  }
};

// PostgreSQL-specific optimizations
const configurePostgresOptimizations = async () => {
  try {
    // Set connection-level optimizations
    await sequelize.query("SET statement_timeout = '30s'");
    await sequelize.query("SET lock_timeout = '10s'");
    await sequelize.query("SET idle_in_transaction_session_timeout = '5min'");
    
    // Enable query plan caching
    await sequelize.query("SET plan_cache_mode = 'auto'");
    
    // Configure work memory for complex queries
    await sequelize.query("SET work_mem = '64MB'");
    
    console.log('✅ PostgreSQL optimizations applied');
  } catch (error) {
    console.error('❌ Failed to apply PostgreSQL optimizations:', error);
  }
};

// Query optimization helpers
export class QueryOptimizer {
  // Optimize restaurant search queries
  static getOptimizedRestaurantSearchQuery(filters: {
    cuisine?: string;
    location?: string;
    priceRange?: string;
    rating?: number;
    limit?: number;
    offset?: number;
  }) {
    const { cuisine, location, priceRange, rating, limit = 20, offset = 0 } = filters;
    
    let whereClause = 'WHERE r."isActive" = true';
    const replacements: any = { limit, offset };
    
    if (cuisine) {
      whereClause += ' AND r.cuisine = :cuisine';
      replacements.cuisine = cuisine;
    }
    
    if (location) {
      whereClause += ' AND r.location ILIKE :location';
      replacements.location = `%${location}%`;
    }
    
    if (priceRange) {
      whereClause += ' AND r."priceRange" = :priceRange';
      replacements.priceRange = priceRange;
    }
    
    if (rating) {
      whereClause += ' AND r.rating >= :rating';
      replacements.rating = rating;
    }

    return {
      query: `
        SELECT 
          r.*,
          COUNT(rev.id) as review_count,
          AVG(rev.rating) as avg_rating
        FROM "Restaurants" r
        LEFT JOIN "Reviews" rev ON r.id = rev."restaurantId"
        ${whereClause}
        GROUP BY r.id
        ORDER BY r.rating DESC, r."createdAt" DESC
        LIMIT :limit OFFSET :offset
      `,
      replacements,
    };
  }

  // Optimize availability check queries
  static getOptimizedAvailabilityQuery(restaurantId: string, date: string, partySize: number) {
    return {
      query: `
        WITH available_tables AS (
          SELECT t.id, t.capacity, t."tableNumber"
          FROM "Tables" t
          WHERE t."restaurantId" = :restaurantId 
            AND t."isActive" = true 
            AND t.capacity >= :partySize
        ),
        reserved_tables AS (
          SELECT DISTINCT r."tableId"
          FROM "Reservations" r
          WHERE r."restaurantId" = :restaurantId
            AND r."reservationDate" = :date
            AND r.status IN ('confirmed', 'seated')
        )
        SELECT at.*
        FROM available_tables at
        LEFT JOIN reserved_tables rt ON at.id = rt."tableId"
        WHERE rt."tableId" IS NULL
        ORDER BY at.capacity ASC, at."tableNumber" ASC
      `,
      replacements: { restaurantId, date, partySize },
    };
  }

  // Optimize user reservation history queries
  static getOptimizedUserReservationsQuery(userId: string, status?: string, limit = 20, offset = 0) {
    let whereClause = 'WHERE r."userId" = :userId';
    const replacements: any = { userId, limit, offset };
    
    if (status) {
      whereClause += ' AND r.status = :status';
      replacements.status = status;
    }

    return {
      query: `
        SELECT 
          r.*,
          rest.name as restaurant_name,
          rest.location as restaurant_location,
          rest.cuisine as restaurant_cuisine,
          t."tableNumber",
          t.capacity as table_capacity
        FROM "Reservations" r
        INNER JOIN "Restaurants" rest ON r."restaurantId" = rest.id
        LEFT JOIN "Tables" t ON r."tableId" = t.id
        ${whereClause}
        ORDER BY r."reservationDate" DESC, r."reservationTime" DESC
        LIMIT :limit OFFSET :offset
      `,
      replacements,
    };
  }

  // Optimize analytics queries
  static getOptimizedAnalyticsQuery(type: 'revenue' | 'reservations' | 'users', period: 'daily' | 'weekly' | 'monthly') {
    const dateFormat = period === 'daily' ? 'YYYY-MM-DD' : 
                     period === 'weekly' ? 'YYYY-"W"WW' : 'YYYY-MM';
    
    switch (type) {
      case 'revenue':
        return {
          query: `
            SELECT 
              TO_CHAR(p."createdAt", '${dateFormat}') as period,
              SUM(p.amount) as total_revenue,
              COUNT(p.id) as transaction_count,
              AVG(p.amount) as avg_transaction
            FROM "Payments" p
            WHERE p.status = 'completed'
              AND p."createdAt" >= NOW() - INTERVAL '30 days'
            GROUP BY period
            ORDER BY period DESC
          `,
          replacements: {},
        };
        
      case 'reservations':
        return {
          query: `
            SELECT 
              TO_CHAR(r."createdAt", '${dateFormat}') as period,
              COUNT(r.id) as total_reservations,
              COUNT(CASE WHEN r.status = 'confirmed' THEN 1 END) as confirmed_reservations,
              COUNT(CASE WHEN r.status = 'cancelled' THEN 1 END) as cancelled_reservations,
              COUNT(CASE WHEN r.status = 'completed' THEN 1 END) as completed_reservations
            FROM "Reservations" r
            WHERE r."createdAt" >= NOW() - INTERVAL '30 days'
            GROUP BY period
            ORDER BY period DESC
          `,
          replacements: {},
        };
        
      case 'users':
        return {
          query: `
            SELECT 
              TO_CHAR(u."createdAt", '${dateFormat}') as period,
              COUNT(u.id) as new_users,
              COUNT(CASE WHEN u."isActive" = true THEN 1 END) as active_users
            FROM "Users" u
            WHERE u."createdAt" >= NOW() - INTERVAL '30 days'
            GROUP BY period
            ORDER BY period DESC
          `,
          replacements: {},
        };
        
      default:
        throw new Error(`Unsupported analytics type: ${type}`);
    }
  }
}

// Database performance monitoring
export class DatabaseMonitor {
  // Monitor slow queries
  static async getSlowQueries(limit = 10) {
    try {
      const result = await sequelize.query(`
        SELECT 
          query,
          calls,
          total_time,
          mean_time,
          rows
        FROM pg_stat_statements
        WHERE mean_time > 1000
        ORDER BY mean_time DESC
        LIMIT :limit
      `, {
        replacements: { limit },
        type: QueryTypes.SELECT,
      });
      
      return result;
    } catch (error) {
      console.error('Failed to get slow queries:', error);
      return [];
    }
  }

  // Monitor database connections
  static async getConnectionStats() {
    try {
      const result = await sequelize.query(`
        SELECT 
          state,
          COUNT(*) as count
        FROM pg_stat_activity
        WHERE datname = current_database()
        GROUP BY state
      `, {
        type: QueryTypes.SELECT,
      });
      
      return result;
    } catch (error) {
      console.error('Failed to get connection stats:', error);
      return [];
    }
  }

  // Monitor table sizes
  static async getTableSizes() {
    try {
      const result = await sequelize.query(`
        SELECT 
          tablename,
          pg_size_pretty(pg_total_relation_size(tablename::regclass)) as size,
          pg_total_relation_size(tablename::regclass) as size_bytes
        FROM pg_tables 
        WHERE schemaname = 'public'
        ORDER BY pg_total_relation_size(tablename::regclass) DESC
      `, {
        type: QueryTypes.SELECT,
      });
      
      return result;
    } catch (error) {
      console.error('Failed to get table sizes:', error);
      return [];
    }
  }
}

export default {
  optimizeDatabase,
  QueryOptimizer,
  DatabaseMonitor,
};