import request from 'supertest';
import { app } from '../server';
import { sequelize } from '../config/database';
import { User } from '../models/User';
import { Restaurant } from '../models/Restaurant';
import { BlockchainLoyalty } from '../models/BlockchainLoyalty';
import { VirtualExperience } from '../models/VirtualExperience';
import { SocialDiningGroup } from '../models/SocialDiningGroup';

describe('Disruptive Features Integration Tests', () => {
  let authToken: string;
  let testUser: User;
  let testRestaurant: Restaurant;

  beforeAll(async () => {
    // Setup test database
    await sequelize.sync({ force: true });

    // Create test user
    testUser = await User.create({
      email: 'test@example.com',
      password: 'hashedpassword',
      firstName: 'Test',
      lastName: 'User',
    });

    // Create test restaurant
    testRestaurant = await Restaurant.create({
      name: 'Test Restaurant',
      description: 'A test restaurant',
      cuisine: 'Italian',
      address: {
        street: '123 Test St',
        city: 'Test City',
        state: 'TS',
        zipCode: '12345',
        country: 'Test Country',
      },
      phone: '555-0123',
      email: 'restaurant@test.com',
      priceRange: '$$',
      capacity: 100,
      amenities: ['wifi', 'parking'],
      openingHours: [],
      isActive: true,
    });

    // Generate auth token (mock JWT)
    authToken = 'Bearer mock-jwt-token';
  });

  afterAll(async () => {
    await sequelize.close();
  });

  describe('Blockchain Loyalty System', () => {
    test('should create blockchain loyalty account', async () => {
      const response = await request(app)
        .post('/api/disruptive/blockchain/loyalty/account')
        .set('Authorization', authToken)
        .send({
          walletAddress: '0x1234567890123456789012345678901234567890',
          blockchainNetwork: 'polygon',
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('tokenBalance', 0);
      expect(response.body.data).toHaveProperty('loyaltyTier', 'bronze');
    });

    test('should earn tokens for reservation', async () => {
      const response = await request(app)
        .post('/api/disruptive/blockchain/loyalty/earn')
        .set('Authorization', authToken)
        .send({
          amount: 10,
          sourceType: 'reservation',
          sourceId: 'test-reservation-id',
          metadata: { restaurantId: testRestaurant.id },
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('tokenAmount', 10);
      expect(response.body.data).toHaveProperty('transactionType', 'earn');
    });

    test('should redeem tokens for rewards', async () => {
      // First earn some tokens
      await request(app)
        .post('/api/disruptive/blockchain/loyalty/earn')
        .set('Authorization', authToken)
        .send({
          amount: 100,
          sourceType: 'manual',
          metadata: { test: true },
        });

      const response = await request(app)
        .post('/api/disruptive/blockchain/loyalty/redeem')
        .set('Authorization', authToken)
        .send({
          amount: 50,
          rewardType: 'discount_10',
          metadata: { discount: '10%' },
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('tokenAmount', 50);
      expect(response.body.data).toHaveProperty('transactionType', 'redeem');
    });

    test('should get transaction history', async () => {
      const response = await request(app)
        .get('/api/disruptive/blockchain/loyalty/transactions')
        .set('Authorization', authToken)
        .query({ limit: 10 });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    test('should get loyalty leaderboard', async () => {
      const response = await request(app)
        .get('/api/disruptive/blockchain/loyalty/leaderboard')
        .query({ limit: 10 });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe('Virtual Restaurant Experiences', () => {
    let testVirtualExperience: VirtualExperience;

    beforeAll(async () => {
      testVirtualExperience = await VirtualExperience.create({
        restaurantId: testRestaurant.id,
        title: 'Virtual Kitchen Tour',
        description: 'An immersive kitchen tour experience',
        experienceType: 'vr_tour',
        duration: 45,
        maxParticipants: 10,
        price: 29.99,
        currency: 'USD',
        availableSlots: [
          {
            date: '2024-12-25',
            startTime: '18:00',
            endTime: '18:45',
            available: 10,
          },
        ],
        vrAssets: {
          thumbnailUrl: '/images/vr-kitchen.jpg',
          sceneUrl: '/vr/kitchen.glb',
        },
        interactiveElements: [],
        requirements: ['vr_headset'],
        language: 'en',
        difficulty: 'beginner',
        rating: 4.5,
        totalBookings: 0,
        isActive: true,
        metadata: {},
      });
    });

    test('should get virtual experiences', async () => {
      const response = await request(app)
        .get('/api/disruptive/virtual-experiences')
        .query({
          experienceType: 'vr_tour',
          limit: 10,
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
    });

    test('should get virtual experience by id', async () => {
      const response = await request(app)
        .get(`/api/disruptive/virtual-experiences/${testVirtualExperience.id}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('title', 'Virtual Kitchen Tour');
      expect(response.body.data).toHaveProperty('experienceType', 'vr_tour');
    });

    test('should book virtual experience', async () => {
      const response = await request(app)
        .post('/api/disruptive/virtual-experiences/book')
        .set('Authorization', authToken)
        .send({
          virtualExperienceId: testVirtualExperience.id,
          bookingDate: '2024-12-25',
          startTime: '18:00',
          participants: [
            {
              name: 'Test User',
              email: 'test@example.com',
            },
          ],
          deviceInfo: {
            type: 'vr_headset',
            model: 'Oculus Quest 2',
            capabilities: ['3d_rendering', 'spatial_audio'],
          },
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('bookingDate', '2024-12-25');
      expect(response.body.data).toHaveProperty('status', 'pending');
    });

    test('should get user virtual bookings', async () => {
      const response = await request(app)
        .get('/api/disruptive/virtual-experiences/bookings/user')
        .set('Authorization', authToken);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe('Social Dining Groups', () => {
    test('should create social dining group', async () => {
      const response = await request(app)
        .post('/api/disruptive/social-dining/groups')
        .set('Authorization', authToken)
        .send({
          name: 'Test Dining Group',
          description: 'A group for testing social dining features',
          maxMembers: 8,
          isPrivate: false,
          preferences: {
            cuisineTypes: ['Italian', 'Mexican'],
            priceRange: '$$',
            preferredLocations: ['Downtown'],
            dietaryRestrictions: [],
          },
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('name', 'Test Dining Group');
      expect(response.body.data).toHaveProperty('maxMembers', 8);
    });

    test('should get social dining group by id', async () => {
      // First create a group
      const createResponse = await request(app)
        .post('/api/disruptive/social-dining/groups')
        .set('Authorization', authToken)
        .send({
          name: 'Another Test Group',
          maxMembers: 6,
          preferences: {
            cuisineTypes: ['Asian'],
            priceRange: '$$$',
          },
        });

      const groupId = createResponse.body.data.id;

      const response = await request(app)
        .get(`/api/disruptive/social-dining/groups/${groupId}`)
        .set('Authorization', authToken);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('name', 'Another Test Group');
    });
  });

  describe('AI Concierge', () => {
    test('should process chat message', async () => {
      const response = await request(app)
        .post('/api/disruptive/ai-concierge/chat')
        .set('Authorization', authToken)
        .send({
          message: 'Find me a good Italian restaurant for dinner tonight',
          context: {
            location: 'downtown',
            partySize: 2,
          },
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('response');
      expect(response.body.data).toHaveProperty('intent');
      expect(response.body.data).toHaveProperty('confidence');
    });

    test('should handle booking intent', async () => {
      const response = await request(app)
        .post('/api/disruptive/ai-concierge/chat')
        .set('Authorization', authToken)
        .send({
          message: 'Book a table at Test Restaurant for 4 people tomorrow at 7 PM',
          context: {},
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.intent).toBe('booking');
    });
  });

  describe('Voice/IoT Integration', () => {
    test('should process voice command', async () => {
      const response = await request(app)
        .post('/api/disruptive/voice/command')
        .set('Authorization', authToken)
        .send({
          command: 'Book a table at an Italian restaurant for tonight',
          deviceType: 'alexa',
          deviceId: 'alexa-device-123',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('text');
      expect(response.body.data).toHaveProperty('shouldEndSession');
    });

    test('should register IoT device', async () => {
      const response = await request(app)
        .post('/api/disruptive/iot/devices/register')
        .set('Authorization', authToken)
        .send({
          deviceType: 'smart_display',
          deviceName: 'Kitchen Display',
          capabilities: ['display', 'touch', 'voice'],
          settings: {
            volume: 50,
            brightness: 80,
          },
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('deviceId');
    });

    test('should get connected devices', async () => {
      const response = await request(app)
        .get('/api/disruptive/iot/devices')
        .set('Authorization', authToken);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe('Sustainability Features', () => {
    test('should get restaurant sustainability metrics', async () => {
      const response = await request(app)
        .get(`/api/disruptive/sustainability/restaurant/${testRestaurant.id}/metrics`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('carbonFootprint');
      expect(response.body.data).toHaveProperty('localSourcingPercentage');
      expect(response.body.data).toHaveProperty('sustainabilityRating');
    });

    test('should get user sustainability profile', async () => {
      const response = await request(app)
        .get('/api/disruptive/sustainability/user/profile')
        .set('Authorization', authToken);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('preferences');
      expect(response.body.data).toHaveProperty('impact');
    });

    test('should update user sustainability preferences', async () => {
      const response = await request(app)
        .put('/api/disruptive/sustainability/user/preferences')
        .set('Authorization', authToken)
        .send({
          prioritizeLocalSourcing: true,
          prioritizeLowCarbon: true,
          minimumSustainabilityRating: 4.0,
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Preferences updated successfully');
    });
  });

  describe('Health Check', () => {
    test('should return health status for all disruptive features', async () => {
      const response = await request(app)
        .get('/api/disruptive/health');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('services');
      expect(response.body.data.services).toHaveProperty('socialDining', 'operational');
      expect(response.body.data.services).toHaveProperty('aiConcierge', 'operational');
      expect(response.body.data.services).toHaveProperty('sustainability', 'operational');
      expect(response.body.data.services).toHaveProperty('blockchainLoyalty', 'operational');
      expect(response.body.data.services).toHaveProperty('voiceIoT', 'operational');
      expect(response.body.data.services).toHaveProperty('virtualExperiences', 'operational');
    });
  });
});

// Performance Tests
describe('Disruptive Features Performance Tests', () => {
  test('blockchain loyalty operations should complete within acceptable time', async () => {
    const start = Date.now();
    
    await request(app)
      .get('/api/disruptive/blockchain/loyalty/leaderboard')
      .query({ limit: 100 });
    
    const duration = Date.now() - start;
    expect(duration).toBeLessThan(2000); // Should complete within 2 seconds
  });

  test('virtual experience search should be fast', async () => {
    const start = Date.now();
    
    await request(app)
      .get('/api/disruptive/virtual-experiences')
      .query({ limit: 50 });
    
    const duration = Date.now() - start;
    expect(duration).toBeLessThan(1000); // Should complete within 1 second
  });

  test('AI concierge should respond quickly', async () => {
    const start = Date.now();
    
    await request(app)
      .post('/api/disruptive/ai-concierge/chat')
      .set('Authorization', 'Bearer mock-token')
      .send({
        message: 'Hello',
        context: {},
      });
    
    const duration = Date.now() - start;
    expect(duration).toBeLessThan(3000); // Should complete within 3 seconds
  });
});

// Error Handling Tests
describe('Disruptive Features Error Handling', () => {
  test('should handle invalid blockchain transaction', async () => {
    const response = await request(app)
      .post('/api/disruptive/blockchain/loyalty/redeem')
      .set('Authorization', 'Bearer mock-token')
      .send({
        amount: -10, // Invalid negative amount
        rewardType: 'invalid_reward',
      });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.error).toBeDefined();
  });

  test('should handle non-existent virtual experience', async () => {
    const response = await request(app)
      .get('/api/disruptive/virtual-experiences/non-existent-id');

    expect(response.status).toBe(404);
    expect(response.body.success).toBe(false);
  });

  test('should handle unauthorized access', async () => {
    const response = await request(app)
      .post('/api/disruptive/social-dining/groups')
      .send({
        name: 'Unauthorized Group',
      });

    expect(response.status).toBe(401);
  });
});
