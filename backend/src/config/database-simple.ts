import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';

dotenv.config();

// Simple database configuration that works without model initialization issues
const sequelizeConfig = {
  database: process.env.DB_NAME || 'opentable_clone',
  dialect: 'postgres' as const,
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
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
  },
  
  dialectOptions: process.env.NODE_ENV === 'production' ? {
    ssl: {
      require: true,
      rejectUnauthorized: false
    }
  } : {}
};

export const sequelize = new Sequelize(sequelizeConfig);

// Basic connection test
export const testConnection = async () => {
  try {
    await sequelize.authenticate();
    console.log('✓ Database connection has been established successfully.');
    return true;
  } catch (error) {
    console.error('✗ Unable to connect to the database:', error);
    return false;
  }
};
