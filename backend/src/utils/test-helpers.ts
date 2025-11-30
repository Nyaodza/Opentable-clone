/**
 * Test Helper Utilities
 * Provides utilities for unit and integration testing
 */

import { Request, Response } from 'express';

/**
 * Mock Express Request
 */
export const mockRequest = (options: {
  body?: any;
  params?: any;
  query?: any;
  headers?: any;
  user?: any;
  method?: string;
  path?: string;
  ip?: string;
} = {}): Partial<Request> => {
  return {
    body: options.body || {},
    params: options.params || {},
    query: options.query || {},
    headers: options.headers || {},
    user: options.user,
    method: options.method || 'GET',
    path: options.path || '/',
    ip: options.ip || '127.0.0.1',
    get: (header: string) => options.headers?.[header],
  } as Partial<Request>;
};

/**
 * Mock Express Response
 */
export const mockResponse = (): Partial<Response> => {
  const res: any = {
    statusCode: 200,
    headers: {},
    locals: {},
  };

  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  res.setHeader = jest.fn().mockImplementation((key, value) => {
    res.headers[key] = value;
    return res;
  });
  res.set = res.setHeader;
  res.get = jest.fn().mockImplementation((key) => res.headers[key]);
  res.cookie = jest.fn().mockReturnValue(res);
  res.clearCookie = jest.fn().mockReturnValue(res);
  res.redirect = jest.fn().mockReturnValue(res);
  res.render = jest.fn().mockReturnValue(res);

  return res;
};

/**
 * Mock Next Function
 */
export const mockNext = jest.fn();

/**
 * Create mock user
 */
export const mockUser = (overrides = {}) => ({
  id: '123',
  email: 'test@example.com',
  name: 'Test User',
  role: 'user',
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

/**
 * Create mock restaurant
 */
export const mockRestaurant = (overrides = {}) => ({
  id: '456',
  name: 'Test Restaurant',
  cuisineType: 'Italian',
  city: 'New York',
  rating: 4.5,
  priceRange: '$$',
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

/**
 * Create mock reservation
 */
export const mockReservation = (overrides = {}) => ({
  id: '789',
  userId: '123',
  restaurantId: '456',
  dateTime: new Date(Date.now() + 86400000), // Tomorrow
  partySize: 2,
  status: 'confirmed',
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

/**
 * Wait for async operations
 */
export const waitFor = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

/**
 * Cleanup function for tests
 */
export const cleanup = async () => {
  jest.clearAllMocks();
  jest.restoreAllMocks();
};

/**
 * Database test helpers
 */
export const dbHelpers = {
  /**
   * Create test database connection
   */
  async connect() {
    // Implement database connection for tests
  },

  /**
   * Clean test database
   */
  async clean() {
    // Implement database cleanup
  },

  /**
   * Seed test data
   */
  async seed() {
    // Implement test data seeding
  },

  /**
   * Close database connection
   */
  async close() {
    // Implement connection close
  },
};

export default {
  mockRequest,
  mockResponse,
  mockNext,
  mockUser,
  mockRestaurant,
  mockReservation,
  waitFor,
  cleanup,
  dbHelpers,
};
