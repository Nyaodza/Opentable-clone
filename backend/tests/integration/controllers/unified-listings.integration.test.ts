import request from 'supertest';
import express from 'express';
import { UnifiedListingsController } from '../../../src/controllers/unified-listings.controller';
import { UnifiedListingsService } from '../../../src/services/UnifiedListingsService';
import { ServiceType } from '../../../src/models/UnifiedListing';
import unifiedListingsRoutes from '../../../src/routes/unified-listings.routes';

// Mock dependencies
jest.mock('../../../src/services/UnifiedListingsService');
jest.mock('../../../src/middleware/auth.middleware', () => ({
  authenticate: (req: any, res: any, next: any) => {
    req.user = { id: 'test-user-id', role: 'user' };
    next();
  },
  authorize: (role: string) => (req: any, res: any, next: any) => next(),
}));

describe('Unified Listings Integration Tests', () => {
  let app: express.Application;
  let mockListingsService: jest.Mocked<UnifiedListingsService>;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/api/unified-listings', unifiedListingsRoutes);
  });

  beforeEach(() => {
    mockListingsService = {
      searchCombinedListings: jest.fn(),
      getProviderStatus: jest.fn(),
      toggleProvider: jest.fn(),
      syncLocalListing: jest.fn(),
    } as any;

    (UnifiedListingsService.getInstance as jest.Mock).mockReturnValue(mockListingsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/unified-listings/search', () => {
    it('should return combined listings successfully', async () => {
      const mockResponse = {
        totalCount: 10,
        items: [
          {
            id: 'local-1',
            title: 'Local Activity',
            serviceType: ServiceType.ACTIVITIES,
            location: { city: 'New York', country: 'USA' },
            price: 50,
            currency: 'USD',
          },
          {
            id: 'viator_123',
            title: 'Viator Activity',
            serviceType: ServiceType.ACTIVITIES,
            location: { city: 'New York', country: 'USA' },
            price: 45,
            currency: 'USD',
          },
        ],
        page: 1,
        pageSize: 20,
        hasMore: false,
        sources: {
          local: 1,
          api: { viator: 1 },
        },
      };

      mockListingsService.searchCombinedListings.mockResolvedValue(mockResponse);

      const response = await request(app)
        .get('/api/unified-listings/search')
        .query({
          serviceType: ServiceType.ACTIVITIES,
          city: 'New York',
          country: 'USA',
        })
        .expect(200);

      expect(response.body).toEqual(mockResponse);
      expect(mockListingsService.searchCombinedListings).toHaveBeenCalledWith({
        serviceType: ServiceType.ACTIVITIES,
        location: {
          city: 'New York',
          country: 'USA',
        },
        page: 1,
        pageSize: 20,
        filters: {
          instantConfirmation: false,
        },
      });
    });

    it('should validate required serviceType parameter', async () => {
      const response = await request(app)
        .get('/api/unified-listings/search')
        .query({
          city: 'New York',
        })
        .expect(400);

      expect(response.body.errors).toContainEqual(
        expect.objectContaining({
          msg: 'Invalid service type',
        })
      );
    });

    it('should handle coordinate-based search', async () => {
      const mockResponse = {
        totalCount: 5,
        items: [],
        page: 1,
        pageSize: 20,
        hasMore: false,
        sources: { local: 0, api: {} },
      };

      mockListingsService.searchCombinedListings.mockResolvedValue(mockResponse);

      await request(app)
        .get('/api/unified-listings/search')
        .query({
          serviceType: ServiceType.ACTIVITIES,
          lat: 40.7128,
          lng: -74.0060,
          radius: 10,
        })
        .expect(200);

      expect(mockListingsService.searchCombinedListings).toHaveBeenCalledWith(
        expect.objectContaining({
          location: {
            lat: 40.7128,
            lng: -74.0060,
            radius: 10,
          },
        })
      );
    });

    it('should apply price and rating filters', async () => {
      const mockResponse = {
        totalCount: 3,
        items: [],
        page: 1,
        pageSize: 20,
        hasMore: false,
        sources: { local: 0, api: {} },
      };

      mockListingsService.searchCombinedListings.mockResolvedValue(mockResponse);

      await request(app)
        .get('/api/unified-listings/search')
        .query({
          serviceType: ServiceType.HOTELS,
          city: 'Paris',
          minPrice: 100,
          maxPrice: 300,
          minRating: 4.0,
        })
        .expect(200);

      expect(mockListingsService.searchCombinedListings).toHaveBeenCalledWith(
        expect.objectContaining({
          filters: expect.objectContaining({
            minPrice: 100,
            maxPrice: 300,
            minRating: 4.0,
          }),
        })
      );
    });

    it('should handle date range searches', async () => {
      const mockResponse = {
        totalCount: 2,
        items: [],
        page: 1,
        pageSize: 20,
        hasMore: false,
        sources: { local: 0, api: {} },
      };

      mockListingsService.searchCombinedListings.mockResolvedValue(mockResponse);

      await request(app)
        .get('/api/unified-listings/search')
        .query({
          serviceType: ServiceType.HOTELS,
          city: 'London',
          startDate: '2024-07-01',
          endDate: '2024-07-07',
        })
        .expect(200);

      expect(mockListingsService.searchCombinedListings).toHaveBeenCalledWith(
        expect.objectContaining({
          dateRange: {
            startDate: new Date('2024-07-01'),
            endDate: new Date('2024-07-07'),
          },
        })
      );
    });
  });

  describe('GET /api/unified-listings/:id', () => {
    it('should return listing details for local listing', async () => {
      const mockListing = {
        id: 'local-123',
        title: 'Test Local Listing',
        incrementViewCount: jest.fn(),
        toJSON: jest.fn().mockReturnValue({
          id: 'local-123',
          title: 'Test Local Listing',
        }),
      };

      // Mock UnifiedListing.findByPk
      jest.doMock('../../../src/models/UnifiedListing', () => ({
        UnifiedListing: {
          findByPk: jest.fn().mockResolvedValue(mockListing),
        },
      }));

      const response = await request(app)
        .get('/api/unified-listings/local-123')
        .expect(200);

      expect(response.body).toMatchObject({
        id: 'local-123',
        title: 'Test Local Listing',
        isLocal: true,
      });
    });

    it('should return 404 for non-existent listing', async () => {
      jest.doMock('../../../src/models/UnifiedListing', () => ({
        UnifiedListing: {
          findByPk: jest.fn().mockResolvedValue(null),
        },
      }));

      await request(app)
        .get('/api/unified-listings/non-existent')
        .expect(404);
    });
  });

  describe('POST /api/unified-listings/:id/track', () => {
    it('should track listing clicks', async () => {
      const mockListing = {
        incrementClickCount: jest.fn(),
        calculateScore: jest.fn(),
        save: jest.fn(),
      };

      jest.doMock('../../../src/models/UnifiedListing', () => ({
        UnifiedListing: {
          findByPk: jest.fn().mockResolvedValue(mockListing),
        },
      }));

      await request(app)
        .post('/api/unified-listings/test-id/track')
        .send({ action: 'click' })
        .expect(200);

      expect(mockListing.incrementClickCount).toHaveBeenCalled();
    });

    it('should track listing bookings', async () => {
      const mockListing = {
        incrementBookingCount: jest.fn(),
        calculateScore: jest.fn(),
        save: jest.fn(),
      };

      jest.doMock('../../../src/models/UnifiedListing', () => ({
        UnifiedListing: {
          findByPk: jest.fn().mockResolvedValue(mockListing),
        },
      }));

      await request(app)
        .post('/api/unified-listings/test-id/track')
        .send({ action: 'booking' })
        .expect(200);

      expect(mockListing.incrementBookingCount).toHaveBeenCalled();
    });

    it('should validate action parameter', async () => {
      const response = await request(app)
        .post('/api/unified-listings/test-id/track')
        .send({ action: 'invalid' })
        .expect(400);

      expect(response.body.errors).toBeDefined();
    });
  });

  describe('Admin endpoints', () => {
    describe('GET /api/unified-listings/admin/providers', () => {
      it('should return provider status', async () => {
        const mockStatus = {
          activities: [
            {
              name: 'Viator',
              enabled: true,
              healthy: true,
              quota: { used: 50, limit: 100, resetAt: new Date() },
            },
          ],
        };

        mockListingsService.getProviderStatus.mockResolvedValue(mockStatus);

        const response = await request(app)
          .get('/api/unified-listings/admin/providers')
          .expect(200);

        expect(response.body).toEqual(mockStatus);
      });
    });

    describe('PUT /api/unified-listings/admin/providers/:source', () => {
      it('should toggle provider status', async () => {
        await request(app)
          .put('/api/unified-listings/admin/providers/viator')
          .send({ enabled: false })
          .expect(200);

        expect(mockListingsService.toggleProvider).toHaveBeenCalledWith('viator', false);
      });
    });
  });

  describe('Error handling', () => {
    it('should handle service errors gracefully', async () => {
      mockListingsService.searchCombinedListings.mockRejectedValue(
        new Error('Service unavailable')
      );

      const response = await request(app)
        .get('/api/unified-listings/search')
        .query({
          serviceType: ServiceType.ACTIVITIES,
          city: 'New York',
        })
        .expect(500);

      expect(response.body).toMatchObject({
        error: 'Failed to search listings',
      });
    });
  });
});