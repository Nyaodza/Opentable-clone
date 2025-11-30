import request from 'supertest';
import { WebhookService } from '../services/webhooks/WebhookService';
import { ListingSource } from '../models/UnifiedListing';
import { sequelize } from '../config/database';
import { createApp } from '../app';
import { QueryTypes } from 'sequelize';

describe('Webhook System', () => {
  let webhookService: WebhookService;
  let authToken: string;
  let testEndpointId: string;
  let app: any;

  beforeAll(async () => {
    app = await createApp();
    await sequelize.sync({ force: true });
    webhookService = WebhookService.getInstance();
    
    // Create test user and get auth token
    const userResponse = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'webhook-test@example.com',
        password: 'TestPassword123!',
        firstName: 'Webhook',
        lastName: 'Test',
      });
    
    authToken = userResponse.body.token;
  });

  afterAll(async () => {
    webhookService.destroy();
    await sequelize.close();
  });

  describe('WebhookService', () => {
    describe('registerEndpoint', () => {
      it('should register a new webhook endpoint', async () => {
        const endpoint = await webhookService.registerEndpoint(
          'Test Endpoint',
          'https://example.com/webhook',
          ListingSource.VIATOR,
          ['listing.created', 'listing.updated']
        );

        expect(endpoint).toMatchObject({
          name: 'Test Endpoint',
          url: 'https://example.com/webhook',
          source: ListingSource.VIATOR,
          events: ['listing.created', 'listing.updated'],
          isActive: true,
          failureCount: 0,
        });

        expect(endpoint.id).toBeDefined();
        expect(endpoint.secret).toBeDefined();
        testEndpointId = endpoint.id;
      });

      it('should register endpoint with custom options', async () => {
        const endpoint = await webhookService.registerEndpoint(
          'Custom Endpoint',
          'https://custom.example.com/webhook',
          ListingSource.BOOKING,
          ['listing.deleted'],
          {
            secret: 'custom-secret-key-12345',
            maxRetries: 5,
            retryBackoff: 60,
            timeout: 45000,
            headers: { 'X-Custom-Header': 'value' },
            metadata: { environment: 'test' },
          }
        );

        expect(endpoint).toMatchObject({
          name: 'Custom Endpoint',
          maxRetries: 5,
          retryBackoff: 60,
          timeout: 45000,
          headers: { 'X-Custom-Header': 'value' },
          metadata: { environment: 'test' },
        });
      });
    });

    describe('sendWebhook', () => {
      it('should create webhook events for registered endpoints', async () => {
        const payload = {
          id: 'test-listing-123',
          title: 'Test Listing',
          price: 100,
        };

        await webhookService.sendWebhook(
          'listing.created',
          'test-listing-123',
          payload,
          ListingSource.VIATOR
        );

        // Verify webhook event was created
        const events = await sequelize.query(
          'SELECT * FROM webhook_events WHERE "listingId" = ?',
          {
            replacements: ['test-listing-123'],
            type: QueryTypes.SELECT,
          }
        );

        expect(events.length).toBeGreaterThan(0);
        const event = events[0] as any;
        expect(event.eventType).toBe('listing.created');
        expect(JSON.parse(event.payload)).toEqual(payload);
      });
    });

    describe('handleIncomingWebhook', () => {
      it('should process Viator webhook successfully', async () => {
        const payload = {
          productCode: 'VIATOR-123',
          title: 'Updated Activity',
          price: 75,
          availability: true,
        };

        const headers = {
          'x-webhook-signature': 'test-signature',
          'content-type': 'application/json',
        };

        const result = await webhookService.handleIncomingWebhook(
          ListingSource.VIATOR,
          'product.updated',
          payload,
          headers,
          '192.168.1.1',
          'Viator-Webhook/1.0'
        );

        expect(result.success).toBe(true);
        expect(result.message).toContain('Processed Viator');
      });

      it('should process Booking.com webhook successfully', async () => {
        const payload = {
          hotel_id: 'BOOKING-456',
          name: 'Updated Hotel',
          min_rate: 150,
          availability: 5,
        };

        const headers = {
          'x-event-type': 'hotel.updated',
          'content-type': 'application/json',
        };

        const result = await webhookService.handleIncomingWebhook(
          ListingSource.BOOKING,
          'hotel.updated',
          payload,
          headers
        );

        expect(result.success).toBe(true);
        expect(result.message).toContain('Processed Booking.com');
      });

      it('should handle unsupported webhook source', async () => {
        const result = await webhookService.handleIncomingWebhook(
          'unsupported' as ListingSource,
          'test.event',
          {},
          {}
        );

        expect(result.success).toBe(false);
        expect(result.message).toContain('Unsupported webhook source');
      });
    });
  });

  describe('Webhook API Routes', () => {
    describe('POST /api/webhooks/endpoints', () => {
      it('should register webhook endpoint via API', async () => {
        const response = await request(app)
          .post('/api/webhooks/endpoints')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            name: 'API Test Endpoint',
            url: 'https://api-test.example.com/webhook',
            source: ListingSource.EXPEDIA,
            events: ['listing.created', 'listing.updated'],
            maxRetries: 3,
            timeout: 30000,
          });

        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
        expect(response.body.data.name).toBe('API Test Endpoint');
        expect(response.body.data.secret).toBeUndefined(); // Should not expose secret
      });

      it('should reject invalid webhook registration', async () => {
        const response = await request(app)
          .post('/api/webhooks/endpoints')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            name: '',
            url: 'invalid-url',
            source: 'invalid-source',
            events: [],
          });

        expect(response.status).toBe(400);
        expect(response.body.error).toBe('Validation failed');
      });

      it('should require authentication', async () => {
        const response = await request(app)
          .post('/api/webhooks/endpoints')
          .send({
            name: 'Unauthorized Test',
            url: 'https://test.example.com/webhook',
            source: ListingSource.VIATOR,
            events: ['listing.created'],
          });

        expect(response.status).toBe(401);
      });
    });

    describe('POST /api/webhooks/incoming/:source', () => {
      it('should handle incoming Viator webhook', async () => {
        const payload = {
          productCode: 'VIATOR-789',
          title: 'New Activity',
          price: 50,
        };

        const response = await request(app)
          .post('/api/webhooks/incoming/viator')
          .set('X-Event-Type', 'product.created')
          .send(payload);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });

      it('should handle incoming Booking.com webhook', async () => {
        const payload = {
          hotel_id: 789,
          name: 'New Hotel',
          min_rate: 200,
        };

        const response = await request(app)
          .post('/api/webhooks/incoming/booking')
          .set('X-Webhook-Event', 'hotel.created')
          .send(payload);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });

      it('should reject invalid webhook source', async () => {
        const response = await request(app)
          .post('/api/webhooks/incoming/invalid-source')
          .send({ test: 'data' });

        expect(response.status).toBe(400);
        expect(response.body.error).toBe('Invalid webhook source');
      });
    });

    describe('POST /api/webhooks/test', () => {
      it('should send test webhook', async () => {
        const response = await request(app)
          .post('/api/webhooks/test')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            eventType: 'listing.test',
            listingId: 'test-123',
            payload: { test: true },
            source: ListingSource.VIATOR,
          });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.message).toContain('Test webhook sent');
      });

      it('should require authentication for test webhook', async () => {
        const response = await request(app)
          .post('/api/webhooks/test')
          .send({
            eventType: 'listing.test',
            listingId: 'test-123',
          });

        expect(response.status).toBe(401);
      });
    });

    describe('GET /api/webhooks/delivery-logs', () => {
      it('should retrieve webhook delivery logs', async () => {
        const response = await request(app)
          .get('/api/webhooks/delivery-logs')
          .set('Authorization', `Bearer ${authToken}`)
          .query({
            page: 1,
            limit: 10,
          });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.events).toBeDefined();
        expect(response.body.data.pagination).toBeDefined();
      });

      it('should filter delivery logs by status', async () => {
        const response = await request(app)
          .get('/api/webhooks/delivery-logs')
          .set('Authorization', `Bearer ${authToken}`)
          .query({
            status: 'pending',
            limit: 5,
          });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });
    });

    describe('GET /api/webhooks/incoming-logs', () => {
      it('should retrieve incoming webhook logs', async () => {
        const response = await request(app)
          .get('/api/webhooks/incoming-logs')
          .set('Authorization', `Bearer ${authToken}`)
          .query({
            page: 1,
            limit: 10,
          });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.logs).toBeDefined();
        expect(response.body.data.pagination).toBeDefined();
      });

      it('should filter incoming logs by source', async () => {
        const response = await request(app)
          .get('/api/webhooks/incoming-logs')
          .set('Authorization', `Bearer ${authToken}`)
          .query({
            source: ListingSource.VIATOR,
            processed: true,
          });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });
    });

    describe('GET /api/webhooks/stats', () => {
      it('should retrieve webhook statistics', async () => {
        const response = await request(app)
          .get('/api/webhooks/stats')
          .set('Authorization', `Bearer ${authToken}`)
          .query({
            from: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
            to: new Date().toISOString(),
          });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.outgoing).toBeDefined();
        expect(response.body.data.incoming).toBeDefined();
        expect(response.body.data.endpoints).toBeDefined();
      });

      it('should require authentication for stats', async () => {
        const response = await request(app)
          .get('/api/webhooks/stats');

        expect(response.status).toBe(401);
      });
    });
  });

  describe('Webhook Delivery and Retry Logic', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should retry failed webhook deliveries', async () => {
      // This would require mocking HTTP requests
      // Implementation depends on your testing setup
    });

    it('should respect max retry limits', async () => {
      // Test retry limit enforcement
    });

    it('should calculate exponential backoff correctly', async () => {
      // Test backoff calculation
    });
  });

  describe('Webhook Security', () => {
    it('should verify webhook signatures correctly', async () => {
      // Test signature verification
    });

    it('should handle missing signatures gracefully', async () => {
      // Test behavior without signatures
    });

    it('should prevent replay attacks', async () => {
      // Test timestamp validation if implemented
    });
  });
});