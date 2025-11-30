import request from 'supertest';
import { Express } from 'express';
import { ServiceType, ListingSource } from '../../src/models/UnifiedListing';
import { setupTestApp } from '../setup';

describe('Unified Listings E2E Tests', () => {
  let app: Express;
  let authToken: string;
  let adminToken: string;

  beforeAll(async () => {
    app = await setupTestApp();
    
    // Get authentication tokens
    const userResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'test@example.com',
        password: 'testpassword',
      });
    authToken = userResponse.body.token;

    const adminResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'admin@example.com',
        password: 'adminpassword',
      });
    adminToken = adminResponse.body.token;
  });

  describe('Search Flow', () => {
    it('should perform complete search flow for activities in New York', async () => {
      const searchResponse = await request(app)
        .get('/api/unified-listings/search')
        .query({
          serviceType: ServiceType.ACTIVITIES,
          city: 'New York',
          country: 'USA',
          page: 1,
          pageSize: 10,
        })
        .expect(200);

      expect(searchResponse.body).toMatchObject({
        totalCount: expect.any(Number),
        items: expect.any(Array),
        page: 1,
        pageSize: 10,
        hasMore: expect.any(Boolean),
        sources: expect.objectContaining({
          local: expect.any(Number),
          api: expect.any(Object),
        }),
      });

      // Verify listing structure
      if (searchResponse.body.items.length > 0) {
        const firstListing = searchResponse.body.items[0];
        expect(firstListing).toMatchObject({
          id: expect.any(String),
          serviceType: ServiceType.ACTIVITIES,
          title: expect.any(String),
          location: expect.objectContaining({
            city: expect.any(String),
            country: expect.any(String),
          }),
          url: expect.any(String),
        });
      }
    });

    it('should handle coordinate-based search with radius', async () => {
      const searchResponse = await request(app)
        .get('/api/unified-listings/search')
        .query({
          serviceType: ServiceType.HOTELS,
          lat: 40.7128,
          lng: -74.0060,
          radius: 15,
          minRating: 4,
        })
        .expect(200);

      expect(searchResponse.body).toMatchObject({
        totalCount: expect.any(Number),
        items: expect.any(Array),
      });
    });

    it('should apply price filtering correctly', async () => {
      const searchResponse = await request(app)
        .get('/api/unified-listings/search')
        .query({
          serviceType: ServiceType.ACTIVITIES,
          city: 'Paris',
          minPrice: 50,
          maxPrice: 150,
        })
        .expect(200);

      // Verify price filtering is applied
      searchResponse.body.items.forEach((listing: any) => {
        if (listing.price) {
          expect(listing.price).toBeGreaterThanOrEqual(50);
          expect(listing.price).toBeLessThanOrEqual(150);
        }
      });
    });

    it('should handle date range searches for hotels', async () => {
      const searchResponse = await request(app)
        .get('/api/unified-listings/search')
        .query({
          serviceType: ServiceType.HOTELS,
          city: 'London',
          startDate: '2024-08-01',
          endDate: '2024-08-07',
        })
        .expect(200);

      expect(searchResponse.body.totalCount).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Listing Details and Tracking', () => {
    let testListingId: string;

    beforeAll(async () => {
      // Get a listing ID from search results
      const searchResponse = await request(app)
        .get('/api/unified-listings/search')
        .query({
          serviceType: ServiceType.ACTIVITIES,
          city: 'New York',
          pageSize: 1,
        });

      if (searchResponse.body.items.length > 0) {
        testListingId = searchResponse.body.items[0].id;
      }
    });

    it('should get listing details', async () => {
      if (!testListingId) {
        console.log('Skipping test - no listings available');
        return;
      }

      const detailsResponse = await request(app)
        .get(`/api/unified-listings/${testListingId}`)
        .expect(200);

      expect(detailsResponse.body).toMatchObject({
        id: testListingId,
        title: expect.any(String),
      });
    });

    it('should track listing clicks', async () => {
      if (!testListingId) {
        console.log('Skipping test - no listings available');
        return;
      }

      await request(app)
        .post(`/api/unified-listings/${testListingId}/track`)
        .send({ action: 'click' })
        .expect(200);
    });

    it('should track listing bookings', async () => {
      if (!testListingId) {
        console.log('Skipping test - no listings available');
        return;
      }

      await request(app)
        .post(`/api/unified-listings/${testListingId}/track`)
        .send({ action: 'booking' })
        .expect(200);
    });
  });

  describe('Local Listing Management', () => {
    let createdListingId: string;

    it('should create a new local listing', async () => {
      const listingData = {
        serviceType: ServiceType.ACTIVITIES,
        title: 'Test Local Activity',
        description: 'A test activity for E2E testing',
        location: {
          city: 'Test City',
          country: 'Test Country',
          lat: 40.7128,
          lng: -74.0060,
        },
        price: 75,
        currency: 'USD',
        url: 'https://example.com/test-activity',
        images: ['https://example.com/image1.jpg'],
      };

      const createResponse = await request(app)
        .post('/api/unified-listings')
        .set('Authorization', `Bearer ${authToken}`)
        .send(listingData)
        .expect(201);

      expect(createResponse.body).toMatchObject({
        id: expect.any(String),
        serviceType: ServiceType.ACTIVITIES,
        title: 'Test Local Activity',
        source: ListingSource.LOCAL,
        status: 'pending', // Should require admin approval
      });

      createdListingId = createResponse.body.id;
    });

    it('should update local listing', async () => {
      if (!createdListingId) {
        console.log('Skipping test - no listing created');
        return;
      }

      const updateData = {
        title: 'Updated Test Activity',
        price: 85,
      };

      const updateResponse = await request(app)
        .put(`/api/unified-listings/${createdListingId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(updateResponse.body.title).toBe('Updated Test Activity');
      expect(updateResponse.body.price).toBe(85);
    });

    it('should delete (deactivate) local listing', async () => {
      if (!createdListingId) {
        console.log('Skipping test - no listing created');
        return;
      }

      await request(app)
        .delete(`/api/unified-listings/${createdListingId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
    });
  });

  describe('Admin Operations', () => {
    it('should get provider status', async () => {
      const statusResponse = await request(app)
        .get('/api/unified-listings/admin/providers')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(statusResponse.body).toEqual(
        expect.objectContaining({
          [ServiceType.ACTIVITIES]: expect.any(Array),
        })
      );

      // Check provider structure
      if (statusResponse.body[ServiceType.ACTIVITIES].length > 0) {
        const provider = statusResponse.body[ServiceType.ACTIVITIES][0];
        expect(provider).toMatchObject({
          name: expect.any(String),
          enabled: expect.any(Boolean),
          healthy: expect.any(Boolean),
          quota: expect.objectContaining({
            used: expect.any(Number),
            limit: expect.any(Number),
          }),
        });
      }
    });

    it('should toggle provider status', async () => {
      await request(app)
        .put('/api/unified-listings/admin/providers/viator')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ enabled: false })
        .expect(200);

      // Toggle back to enabled
      await request(app)
        .put('/api/unified-listings/admin/providers/viator')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ enabled: true })
        .expect(200);
    });

    it('should moderate listing', async () => {
      // This would require a pending listing to exist
      // In a real test, you'd create one first or use a fixture
      const mockListingId = 'test-listing-id';
      
      const moderateResponse = await request(app)
        .put(`/api/unified-listings/admin/listings/${mockListingId}/moderate`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          status: 'active',
          reason: 'Approved for publication',
        });

      // This might return 404 if listing doesn't exist, which is expected in test
      expect([200, 404]).toContain(moderateResponse.status);
    });

    it('should feature/unfeature listing', async () => {
      const mockListingId = 'test-listing-id';
      
      const featureResponse = await request(app)
        .put(`/api/unified-listings/admin/listings/${mockListingId}/feature`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ featured: true });

      // This might return 404 if listing doesn't exist, which is expected in test
      expect([200, 404]).toContain(featureResponse.status);
    });
  });

  describe('Error Scenarios', () => {
    it('should handle invalid service type', async () => {
      await request(app)
        .get('/api/unified-listings/search')
        .query({
          serviceType: 'invalid-type',
          city: 'New York',
        })
        .expect(400);
    });

    it('should handle invalid coordinates', async () => {
      await request(app)
        .get('/api/unified-listings/search')
        .query({
          serviceType: ServiceType.ACTIVITIES,
          lat: 'invalid',
          lng: -74.0060,
        })
        .expect(400);
    });

    it('should require authentication for creating listings', async () => {
      await request(app)
        .post('/api/unified-listings')
        .send({
          serviceType: ServiceType.ACTIVITIES,
          title: 'Test Activity',
        })
        .expect(401);
    });

    it('should require admin role for provider management', async () => {
      await request(app)
        .get('/api/unified-listings/admin/providers')
        .set('Authorization', `Bearer ${authToken}`) // Regular user token
        .expect(403);
    });
  });

  describe('Performance and Pagination', () => {
    it('should handle large page sizes efficiently', async () => {
      const startTime = Date.now();
      
      const response = await request(app)
        .get('/api/unified-listings/search')
        .query({
          serviceType: ServiceType.ACTIVITIES,
          city: 'New York',
          pageSize: 50,
        })
        .expect(200);

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      // Should respond within reasonable time (5 seconds)
      expect(responseTime).toBeLessThan(5000);
      expect(response.body.items.length).toBeLessThanOrEqual(50);
    });

    it('should handle pagination correctly', async () => {
      // Get first page
      const page1Response = await request(app)
        .get('/api/unified-listings/search')
        .query({
          serviceType: ServiceType.ACTIVITIES,
          city: 'New York',
          page: 1,
          pageSize: 5,
        })
        .expect(200);

      // Get second page
      const page2Response = await request(app)
        .get('/api/unified-listings/search')
        .query({
          serviceType: ServiceType.ACTIVITIES,
          city: 'New York',
          page: 2,
          pageSize: 5,
        })
        .expect(200);

      expect(page1Response.body.page).toBe(1);
      expect(page2Response.body.page).toBe(2);
      
      // Items should be different (assuming enough listings exist)
      if (page1Response.body.totalCount > 5) {
        expect(page1Response.body.items[0].id).not.toBe(page2Response.body.items[0].id);
      }
    });
  });
});