import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';

// Load test environment variables
dotenv.config({ path: '.env.test' });

// Create test database connection
export const testSequelize = new Sequelize(process.env.DATABASE_URL || 'postgresql://postgres:postgres123@localhost:5432/opentable_test', {
  dialect: 'postgres',
  logging: false,
});

// Setup and teardown hooks
beforeAll(async () => {
  try {
    await testSequelize.authenticate();
    await testSequelize.sync({ force: true });
  } catch (error) {
    console.error('Unable to connect to the test database:', error);
    throw error;
  }
});

afterAll(async () => {
  await testSequelize.close();
});

// Mock Redis client
jest.mock('../src/config/redis', () => ({
  redisClient: {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    setex: jest.fn(),
    expire: jest.fn(),
    ttl: jest.fn(),
    exists: jest.fn(),
    hget: jest.fn(),
    hset: jest.fn(),
    hdel: jest.fn(),
    hgetall: jest.fn(),
    incr: jest.fn(),
    decr: jest.fn(),
    lpush: jest.fn(),
    rpush: jest.fn(),
    lrange: jest.fn(),
    llen: jest.fn(),
    sadd: jest.fn(),
    srem: jest.fn(),
    smembers: jest.fn(),
    sismember: jest.fn(),
  },
}));

// Mock email service
jest.mock('../src/services/email.service', () => ({
  EmailService: {
    sendEmail: jest.fn().mockResolvedValue(true),
    sendReservationConfirmation: jest.fn().mockResolvedValue(true),
    sendReservationCancellation: jest.fn().mockResolvedValue(true),
    sendPasswordReset: jest.fn().mockResolvedValue(true),
    sendWelcomeEmail: jest.fn().mockResolvedValue(true),
  },
}));

// Mock payment service
jest.mock('../src/services/payment.service', () => ({
  PaymentService: {
    createCustomer: jest.fn().mockResolvedValue({ id: 'cus_test123' }),
    createPaymentIntent: jest.fn().mockResolvedValue({
      id: 'pi_test123',
      client_secret: 'secret_test123',
      amount: 2500,
    }),
    capturePayment: jest.fn().mockResolvedValue(true),
    refundPayment: jest.fn().mockResolvedValue(true),
    createConnectedAccount: jest.fn().mockResolvedValue({ id: 'acct_test123' }),
  },
}));

// Global test utilities
export const createTestUser = async (overrides = {}) => {
  const User = require('../src/models/user.model').default;
  const bcrypt = require('bcryptjs');
  
  const defaultUser = {
    firstName: 'Test',
    lastName: 'User',
    email: 'test@example.com',
    password: await bcrypt.hash('password123', 10),
    role: 'diner',
    emailVerified: true,
    isActive: true,
    ...overrides,
  };
  
  return User.create(defaultUser);
};

export const createTestRestaurant = async (ownerId: string, overrides = {}) => {
  const Restaurant = require('../src/models/restaurant.model').default;
  
  const defaultRestaurant = {
    ownerId,
    name: 'Test Restaurant',
    description: 'A test restaurant',
    cuisineType: 'Italian',
    priceRange: '$$',
    address: '123 Test St',
    city: 'Test City',
    state: 'TC',
    zipCode: '12345',
    country: 'USA',
    phone: '+1234567890',
    email: 'test@restaurant.com',
    isActive: true,
    isVerified: true,
    ...overrides,
  };
  
  return Restaurant.create(defaultRestaurant);
};

export const createTestReservation = async (userId: string, restaurantId: string, overrides = {}) => {
  const Reservation = require('../src/models/reservation.model').default;
  
  const defaultReservation = {
    userId,
    restaurantId,
    date: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
    time: '19:00',
    partySize: 2,
    status: 'confirmed',
    ...overrides,
  };
  
  return Reservation.create(defaultReservation);
};

// Add custom matchers
expect.extend({
  toBeValidDate(received) {
    const pass = received instanceof Date && !isNaN(received.getTime());
    return {
      pass,
      message: () => `expected ${received} to be a valid Date`,
    };
  },
  toBeWithinRange(received, floor, ceiling) {
    const pass = received >= floor && received <= ceiling;
    return {
      pass,
      message: () => `expected ${received} to be within range ${floor} - ${ceiling}`,
    };
  },
});