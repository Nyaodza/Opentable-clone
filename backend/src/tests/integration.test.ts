import request from 'supertest';
import { app } from '../server';
import { sequelize } from '../config/database';

describe('OpenTable Clone API Integration Tests', () => {
  beforeAll(async () => {
    await sequelize.authenticate();
  });

  afterAll(async () => {
    await sequelize.close();
  });

  describe('Health Endpoints', () => {
    test('GET /api/health should return healthy status', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200);

      expect(response.body).toHaveProperty('status', 'healthy');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('services');
    });

    test('GET /api/health/detailed should return detailed status', async () => {
      const response = await request(app)
        .get('/api/health/detailed')
        .expect(200);

      expect(response.body).toHaveProperty('status', 'healthy');
      expect(response.body).toHaveProperty('services');
      expect(response.body.services).toHaveProperty('database');
      expect(response.body.services).toHaveProperty('disruptive_features');
    });
  });

  describe('Restaurant Onboarding', () => {
    test('POST /api/restaurants/onboard should create restaurant', async () => {
      const restaurantData = {
        name: 'Test Restaurant',
        email: 'test@restaurant.com',
        phone: '(555) 123-4567',
        address: '123 Test Street',
        city: 'Test City',
        state: 'TS',
        zipCode: '12345',
        cuisine: 'Test Cuisine',
        description: 'A test restaurant for integration testing',
        priceRange: '$$',
        capacity: 50
      };

      const response = await request(app)
        .post('/api/restaurants/onboard')
        .send(restaurantData)
        .expect(201);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('restaurant');
      expect(response.body.restaurant).toHaveProperty('id');
      expect(response.body.restaurant.name).toBe(restaurantData.name);
    });

    test('POST /api/restaurants/onboard should validate required fields', async () => {
      const invalidData = {
        name: 'Test Restaurant'
        // Missing required fields
      };

      const response = await request(app)
        .post('/api/restaurants/onboard')
        .send(invalidData)
        .expect(400);

      expect(response.body).toHaveProperty('errors');
      expect(Array.isArray(response.body.errors)).toBe(true);
    });
  });

  describe('Payment Processing', () => {
    test('POST /api/payments/create-intent should create payment intent', async () => {
      const paymentData = {
        amount: 5000, // $50.00
        currency: 'usd',
        description: 'Test reservation payment'
      };

      const response = await request(app)
        .post('/api/payments/create-intent')
        .send(paymentData)
        .expect(200);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('client_secret');
      expect(response.body).toHaveProperty('amount', 5000);
      expect(response.body).toHaveProperty('currency', 'usd');
    });

    test('POST /api/payments/refund should process refund', async () => {
      const refundData = {
        paymentIntentId: 'pi_test_payment_intent',
        amount: 2500, // $25.00
        reason: 'Customer requested refund'
      };

      const response = await request(app)
        .post('/api/payments/refund')
        .send(refundData)
        .expect(200);

      expect(response.body).toHaveProperty('refund');
      expect(response.body.refund).toHaveProperty('id');
      expect(response.body.refund).toHaveProperty('amount', 2500);
      expect(response.body.refund).toHaveProperty('status', 'succeeded');
    });
  });

  describe('User Management', () => {
    test('POST /api/auth/register should create new user', async () => {
      const userData = {
        name: 'Test User',
        email: `test${Date.now()}@example.com`,
        password: 'securepassword123'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('user');
      expect(response.body.user).toHaveProperty('id');
      expect(response.body.user.email).toBe(userData.email);
      expect(response.body.user).not.toHaveProperty('password');
    });
  });

  describe('Reservation System', () => {
    test('GET /api/reservations should return reservations', async () => {
      const response = await request(app)
        .get('/api/reservations')
        .query({ userId: 'test_user_123' })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('reservations');
      expect(Array.isArray(response.body.reservations)).toBe(true);
    });

    test('POST /api/reservations should create reservation', async () => {
      const reservationData = {
        restaurantId: 'rest_123',
        date: '2025-12-01',
        time: '19:00',
        partySize: 4,
        specialRequests: 'Window table preferred'
      };

      const response = await request(app)
        .post('/api/reservations')
        .send(reservationData)
        .expect(201);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('reservation');
      expect(response.body.reservation).toHaveProperty('id');
      expect(response.body.reservation.status).toBe('confirmed');
    });
  });

  describe('Search Functionality', () => {
    test('GET /api/search/restaurants should return search results', async () => {
      const response = await request(app)
        .get('/api/search/restaurants')
        .query({
          q: 'modern',
          location: 'New York',
          cuisine: 'American',
          date: '2025-12-01',
          partySize: 2
        })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('restaurants');
      expect(Array.isArray(response.body.restaurants)).toBe(true);
      expect(response.body).toHaveProperty('total');
    });
  });

  describe('Analytics & Monitoring', () => {
    test('POST /api/analytics/performance should accept analytics data', async () => {
      const analyticsData = {
        event: 'page_view',
        data: {
          page: '/restaurants',
          loadTime: 1250
        },
        timestamp: Date.now(),
        url: 'https://example.com/restaurants',
        userAgent: 'Mozilla/5.0 Test Browser'
      };

      const response = await request(app)
        .post('/api/analytics/performance')
        .send(analyticsData)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message', 'Analytics data received');
    });

    test('POST /api/errors should accept error data', async () => {
      const errorData = {
        errors: [
          {
            message: 'Test error message',
            stack: 'Error stack trace',
            url: 'https://example.com/test',
            severity: 'medium',
            timestamp: Date.now()
          }
        ]
      };

      const response = await request(app)
        .post('/api/errors')
        .send(errorData)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message', 'Errors logged successfully');
    });
  });

  describe('Disruptive Features Health', () => {
    test('GET /api/disruptive/health should return operational status', async () => {
      const response = await request(app)
        .get('/api/disruptive/health')
        .expect(200);

      expect(response.body).toHaveProperty('status', 'operational');
      expect(response.body).toHaveProperty('services');
      expect(response.body.services).toHaveProperty('blockchainLoyalty');
      expect(response.body.services).toHaveProperty('virtualExperience');
      expect(response.body.services).toHaveProperty('aiConcierge');
      expect(response.body.services).toHaveProperty('voiceIoT');
      expect(response.body.services).toHaveProperty('socialDining');
      expect(response.body.services).toHaveProperty('sustainability');
    });
  });
});
