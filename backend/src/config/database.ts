import { Sequelize } from 'sequelize-typescript';
import { resolve } from 'path';
import dotenv from 'dotenv';

dotenv.config();

// Create Sequelize instance with proper typescript support
export const sequelize = new Sequelize({
  database: process.env.DB_NAME || 'opentable_clone',
  dialect: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
  
  // Auto-discover models in the models directory
  models: [resolve(__dirname, '../models')],
  
  // Logging configuration
  logging: process.env.NODE_ENV === 'production' ? false : console.log,
  
  // Connection pooling configuration
  pool: {
    max: parseInt(process.env.DB_POOL_MAX || '20'),
    min: parseInt(process.env.DB_POOL_MIN || '5'),
    acquire: parseInt(process.env.DB_POOL_ACQUIRE || '60000'),
    idle: parseInt(process.env.DB_POOL_IDLE || '10000'),
  },
  
  // Retry logic for failed connections
  retry: {
    max: 3,
    match: [
      /SequelizeConnectionError/,
      /SequelizeConnectionRefusedError/,
      /SequelizeHostNotFoundError/,
      /SequelizeHostNotReachableError/,
      /SequelizeInvalidConnectionError/,
      /SequelizeConnectionTimedOutError/,
      /TimeoutError/,
    ],
    backoffBase: 1000,
    backoffExponent: 1.5,
  },
  
  // SSL configuration for production
  dialectOptions: process.env.NODE_ENV === 'production' ? {
    ssl: {
      require: true,
      rejectUnauthorized: false
    }
  } : {},
  
  // Global model configuration
  define: {
    timestamps: true,
    underscored: true,
    freezeTableName: true,
  },
});

// Test database connection
export const testDatabaseConnection = async (): Promise<boolean> => {
  try {
    await sequelize.authenticate();
    console.log('✓ Database connection established successfully.');
    return true;
  } catch (error) {
    console.error('✗ Unable to connect to the database:', error);
    return false;
  }
};

// Initialize database with proper model synchronization
export const initializeDatabase = async (): Promise<void> => {
  try {
    // Test connection first
    const connected = await testDatabaseConnection();
    if (!connected) {
      throw new Error('Database connection failed');
    }

    // Sync models in development
    if (process.env.NODE_ENV === 'development') {
      await sequelize.sync({ alter: true });
      console.log('✓ Database models synchronized successfully.');
    }
    
    console.log('✓ Database initialization completed.');
  } catch (error) {
    console.error('✗ Database initialization failed:', error);
    throw error;
  }
};