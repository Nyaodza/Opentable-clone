import request from 'supertest';
import { app } from '../../app';
import { sequelize } from '../../config/database';
import { createTestUser, createTestRestaurant, getAuthToken } from '../helpers';
import { Redis } from 'ioredis';

const redis = new Redis(process.env.REDIS_URL);

describe('Enhanced Features Integration Tests', () => {
  let authToken: string;
  let userId: string;
  let restaurantId: string;

  beforeAll(async () => {
    await sequelize.sync({ force: true });
    const user = await createTestUser();
    userId = user.id;
    authToken = await getAuthToken(user);
    const restaurant = await createTestRestaurant();
    restaurantId = restaurant.id;
  });

  afterAll(async () => {
    await redis.flushall();
    await sequelize.close();
  });

  describe('Dynamic Pricing', () => {
    let pricingRuleId: string;

    it('should create a pricing rule', async () => {
      const response = await request(app)
        .post('/api/pricing/rules')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          restaurantId,
          type: 'surge',
          name: 'Peak Hours',
          conditions: {
            timeRange: { start: '18:00', end: '21:00' },
            minOccupancy: 0.7
          },
          adjustment: {
            type: 'percentage',
            value: 25
          }
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('ruleId');
      pricingRuleId = response.body.data.ruleId;
    });

    it('should calculate dynamic price', async () => {
      const response = await request(app)
        .post('/api/pricing/calculate')
        .send({
          restaurantId,
          dateTime: new Date(Date.now() + 86400000).toISOString(),
          partySize: 4
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('adjustedPrice');
      expect(response.body.data).toHaveProperty('appliedRules');
    });

    it('should get demand forecast', async () => {
      const response = await request(app)
        .get(`/api/pricing/demand/${restaurantId}`)
        .query({ date: new Date().toISOString() });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('predictedDemand');
    });
  });

  describe('Accessibility Features', () => {
    it('should create accessibility profile', async () => {
      const response = await request(app)
        .post('/api/accessibility/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          preferences: {
            visualImpairment: 'low_vision',
            fontSize: 'large',
            highContrast: true,
            screenReaderMode: false
          }
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('userId', userId);
    });

    it('should find accessible restaurants', async () => {
      const response = await request(app)
        .post('/api/accessibility/restaurants/search')
        .send({
          requirements: {
            wheelchairAccessible: true,
            brailleMenu: true
          },
          location: { lat: 37.7749, lng: -122.4194 },
          radius: 5
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
    });

    it('should generate accessibility report', async () => {
      const response = await request(app)
        .get(`/api/accessibility/report/${restaurantId}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('summary');
      expect(response.body.data).toHaveProperty('recommendations');
    });
  });

  describe('Enhanced Loyalty Program', () => {
    let programId: string;
    let memberId: string;

    it('should create loyalty program', async () => {
      const response = await request(app)
        .post('/api/loyalty-enhanced/programs')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Premium Rewards',
          type: 'tiered'
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('programId');
      programId = response.body.data.programId;
    });

    it('should enroll member', async () => {
      const response = await request(app)
        .post('/api/loyalty-enhanced/enroll')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          programId
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('memberId');
      expect(response.body.data).toHaveProperty('tier', 'bronze');
      memberId = response.body.data.memberId;
    });

    it('should earn points', async () => {
      const response = await request(app)
        .post('/api/loyalty-enhanced/points/earn')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          memberId,
          source: {
            type: 'purchase',
            referenceId: 'purchase_123',
            amount: 100,
            description: 'Restaurant purchase'
          }
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('points');
      expect(response.body.data.points).toBeGreaterThan(0);
    });

    it('should get leaderboard', async () => {
      const response = await request(app)
        .get(`/api/loyalty-enhanced/leaderboards/${programId}`)
        .query({ period: 'weekly', metric: 'points' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('entries');
    });
  });

  describe('Last-Minute Availability', () => {
    let slotId: string;

    it('should release last-minute slot', async () => {
      const response = await request(app)
        .post('/api/last-minute/release')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          restaurantId,
          dateTime: new Date(Date.now() + 3600000).toISOString(),
          partySize: 2,
          type: 'cancellation',
          discount: 20
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('slotId');
      slotId = response.body.data.slotId;
    });

    it('should search last-minute availability', async () => {
      const response = await request(app)
        .post('/api/last-minute/search')
        .send({
          location: { lat: 37.7749, lng: -122.4194 },
          radius: 5,
          partySize: 2
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
    });

    it('should reserve last-minute slot', async () => {
      const response = await request(app)
        .post(`/api/last-minute/reserve/${slotId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({});

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('confirmationCode');
    });
  });

  describe('Waitlist Transparency', () => {
    let waitlistId: string;
    let positionId: string;

    it('should create transparent waitlist', async () => {
      const response = await request(app)
        .post('/api/waitlist-transparency/create')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          restaurantId,
          visibility: {
            showPosition: true,
            showEstimatedTime: true,
            showAheadCount: true,
            anonymizeNames: true
          }
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('waitlistId');
      waitlistId = response.body.data.waitlistId;
    });

    it('should join waitlist', async () => {
      const response = await request(app)
        .post('/api/waitlist-transparency/join')
        .send({
          waitlistId,
          partySize: 4,
          displayName: 'Test Party'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('positionId');
      expect(response.body.data).toHaveProperty('position');
      positionId = response.body.data.positionId;
    });

    it('should get public waitlist view', async () => {
      const response = await request(app)
        .get(`/api/waitlist-transparency/${waitlistId}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.waitlist).toHaveProperty('statistics');
      expect(response.body.data.waitlist.statistics).toHaveProperty('partiesWaiting');
    });
  });

  describe('Mobile App Features', () => {
    let deviceId: string;

    it('should register device', async () => {
      const response = await request(app)
        .post('/api/mobile-app/register-device')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          platform: 'ios',
          deviceInfo: {
            model: 'iPhone 14 Pro',
            osVersion: '17.0',
            appVersion: '2.0.0'
          }
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('deviceId');
      deviceId = response.body.data.deviceId;
    });

    it('should create deep link', async () => {
      const response = await request(app)
        .post('/api/mobile-app/deep-link')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          path: '/restaurant/123',
          params: { promo: 'SUMMER20' }
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('linkId');
      expect(response.body.data).toHaveProperty('shortUrl');
    });

    it('should sync offline changes', async () => {
      const response = await request(app)
        .post('/api/mobile-app/sync')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          deviceId,
          changes: [
            {
              type: 'update',
              entity: 'favorite',
              data: { restaurantId: 'rest_456' },
              timestamp: new Date().toISOString()
            }
          ]
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('synced');
    });
  });

  describe('Special Occasions', () => {
    let occasionId: string;

    it('should create special occasion', async () => {
      const response = await request(app)
        .post('/api/occasions/create')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          type: 'anniversary',
          date: '2024-12-25',
          recurring: true,
          preferences: {
            restaurantTypes: ['fine_dining'],
            priceRange: [3, 4]
          }
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('occasionId');
      occasionId = response.body.data.occasionId;
    });

    it('should get occasion suggestions', async () => {
      const response = await request(app)
        .get(`/api/occasions/${occasionId}/suggestions`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('restaurants');
      expect(response.body.data).toHaveProperty('packages');
    });
  });

  describe('Integration Marketplace', () => {
    let integrationId: string;
    let installationId: string;

    it('should list marketplace integrations', async () => {
      const response = await request(app)
        .get('/api/marketplace/integrations')
        .query({ category: 'pos' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
    });

    it('should install integration', async () => {
      // First create a test integration
      const integration = await request(app)
        .post('/api/marketplace/integrations')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Test POS',
          category: 'pos',
          developer: { name: 'Test Dev', verified: true },
          description: { short: 'Test POS integration' },
          pricing: { model: 'free' },
          technical: { apiType: 'rest', authMethod: 'api_key' }
        });

      integrationId = integration.body.data.integrationId;

      const response = await request(app)
        .post('/api/marketplace/install')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          integrationId,
          restaurantId,
          config: { apiKey: 'test_key_123' }
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('installationId');
      installationId = response.body.data.installationId;
    });
  });

  describe('Business Intelligence', () => {
    it('should get analytics dashboard', async () => {
      const response = await request(app)
        .get(`/api/intelligence/dashboard/${restaurantId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('kpis');
      expect(response.body.data).toHaveProperty('trends');
      expect(response.body.data).toHaveProperty('predictions');
    });

    it('should generate predictive analytics', async () => {
      const response = await request(app)
        .post('/api/intelligence/predict')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          restaurantId,
          metric: 'revenue',
          period: {
            start: new Date().toISOString(),
            end: new Date(Date.now() + 30 * 86400000).toISOString()
          }
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('prediction');
      expect(response.body.data).toHaveProperty('confidence');
    });

    it('should export analytics report', async () => {
      const response = await request(app)
        .post('/api/intelligence/export')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          restaurantId,
          format: 'pdf',
          period: {
            start: new Date(Date.now() - 30 * 86400000).toISOString(),
            end: new Date().toISOString()
          }
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('downloadUrl');
    });
  });

  describe('Performance Tests', () => {
    it('should handle concurrent pricing calculations', async () => {
      const promises = Array.from({ length: 10 }, () =>
        request(app)
          .post('/api/pricing/calculate')
          .send({
            restaurantId,
            dateTime: new Date(Date.now() + 86400000).toISOString(),
            partySize: Math.floor(Math.random() * 6) + 1
          })
      );

      const responses = await Promise.all(promises);

      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });
    });

    it('should handle high-volume loyalty transactions', async () => {
      const promises = Array.from({ length: 20 }, (_, i) =>
        request(app)
          .post('/api/loyalty-enhanced/points/earn')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            memberId: 'test_member',
            source: {
              type: 'purchase',
              referenceId: `purchase_${i}`,
              amount: Math.random() * 200,
              description: `Test purchase ${i}`
            }
          })
      );

      const responses = await Promise.all(promises);

      responses.forEach(response => {
        expect([200, 201]).toContain(response.status);
      });
    });
  });
});