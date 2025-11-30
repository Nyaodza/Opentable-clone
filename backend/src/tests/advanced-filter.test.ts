import request from 'supertest';
import { AdvancedFilterService } from '../services/AdvancedFilterService';
import { ServiceType } from '../models/UnifiedListing';
import { sequelize } from '../config/database';
import { createApp } from '../app';

describe('Advanced Filter System', () => {
  let filterService: AdvancedFilterService;
  let authToken: string;
  let testUserId: string;
  let app: any;

  beforeAll(async () => {
    app = await createApp();
    await sequelize.sync({ force: true });
    filterService = AdvancedFilterService.getInstance();
    
    // Create test user and get auth token
    const userResponse = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'filter-test@example.com',
        password: 'TestPassword123!',
        firstName: 'Filter',
        lastName: 'Test',
      });
    
    authToken = userResponse.body.token;
    testUserId = userResponse.body.user.id;

    // Create test listings with advanced filter data
    await sequelize.query(`
      INSERT INTO unified_listings (
        id, title, description, price, currency, rating, "serviceType", source,
        location, "isAvailable", amenities, categories, "instantConfirmation",
        "cancellationPolicy", accessibility, "languagesSupported", tags,
        difficulty, duration, "createdAt", "updatedAt"
      ) VALUES 
      ('test-1', 'Beach Resort', 'Luxury beach resort', 200, 'USD', 4.5, 'hotels', 'local',
       '{"address": "Miami Beach"}', true, 
       '["pool", "wifi", "parking", "spa"]', 
       '["luxury", "beachfront"]', true, 'free',
       '{"wheelchairAccessible": true}', '["en", "es"]', 
       '["romantic", "family-friendly"]', null,
       '{"min": 1440, "max": 2880}', NOW(), NOW()),
      ('test-2', 'City Walking Tour', 'Historic city tour', 25, 'USD', 4.8, 'activities', 'viator',
       '{"address": "Downtown"}', true,
       '["guide", "audio_equipment"]',
       '["cultural", "historical"]', true, 'flexible',
       '{"hearingImpaired": true}', '["en", "fr", "de"]',
       '["educational", "walking"]', 'easy',
       '{"min": 120, "max": 180}', NOW(), NOW()),
      ('test-3', 'Mountain Hiking', 'Challenging mountain trail', 75, 'USD', 4.2, 'activities', 'getyourguide',
       '{"address": "Mountain Range"}', true,
       '["equipment", "safety_gear"]',
       '["adventure", "outdoor"]', false, 'strict',
       '{"mobilityAssistance": false}', '["en"]',
       '["adventure", "nature"]', 'challenging',
       '{"min": 360, "max": 480}', NOW(), NOW())
    `);
  });

  afterAll(async () => {
    await sequelize.close();
  });

  describe('AdvancedFilterService', () => {
    describe('applyFilters', () => {
      it('should filter by price range', async () => {
        const result = await filterService.applyFilters({
          minPrice: 20,
          maxPrice: 50,
        });

        expect(result.listings.length).toBe(1);
        expect(result.listings[0].title).toBe('City Walking Tour');
        expect(result.totalCount).toBe(1);
      });

      it('should filter by rating range', async () => {
        const result = await filterService.applyFilters({
          minRating: 4.0,
          maxRating: 4.6,
        });

        expect(result.listings.length).toBe(2);
        expect(result.totalCount).toBe(2);
      });

      it('should filter by amenities', async () => {
        const result = await filterService.applyFilters({
          amenities: ['pool', 'wifi'],
        });

        expect(result.listings.length).toBe(1);
        expect(result.listings[0].title).toBe('Beach Resort');
      });

      it('should filter by categories', async () => {
        const result = await filterService.applyFilters({
          categories: ['cultural'],
        });

        expect(result.listings.length).toBe(1);
        expect(result.listings[0].title).toBe('City Walking Tour');
      });

      it('should filter by instant confirmation', async () => {
        const result = await filterService.applyFilters({
          instantConfirmation: true,
        });

        expect(result.listings.length).toBe(2);
        expect(result.listings.every(l => l.instantConfirmation)).toBe(true);
      });

      it('should filter by cancellation policy', async () => {
        const result = await filterService.applyFilters({
          cancellationPolicy: 'free',
        });

        expect(result.listings.length).toBe(1);
        expect(result.listings[0].title).toBe('Beach Resort');
      });

      it('should filter by difficulty', async () => {
        const result = await filterService.applyFilters({
          difficulty: 'easy',
        });

        expect(result.listings.length).toBe(1);
        expect(result.listings[0].title).toBe('City Walking Tour');
      });

      it('should filter by duration', async () => {
        const result = await filterService.applyFilters({
          duration: {
            min: 100,
            max: 200,
          },
        });

        expect(result.listings.length).toBe(1);
        expect(result.listings[0].title).toBe('City Walking Tour');
      });

      it('should filter by accessibility features', async () => {
        const result = await filterService.applyFilters({
          accessibility: {
            wheelchairAccessible: true,
          },
        });

        expect(result.listings.length).toBe(1);
        expect(result.listings[0].title).toBe('Beach Resort');
      });

      it('should filter by languages supported', async () => {
        const result = await filterService.applyFilters({
          languagesSupported: ['fr'],
        });

        expect(result.listings.length).toBe(1);
        expect(result.listings[0].title).toBe('City Walking Tour');
      });

      it('should filter by tags', async () => {
        const result = await filterService.applyFilters({
          tags: ['adventure'],
        });

        expect(result.listings.length).toBe(1);
        expect(result.listings[0].title).toBe('Mountain Hiking');
      });

      it('should combine multiple filters', async () => {
        const result = await filterService.applyFilters({
          serviceType: ServiceType.ACTIVITIES,
          minPrice: 20,
          maxPrice: 80,
          difficulty: 'easy',
          instantConfirmation: true,
        });

        expect(result.listings.length).toBe(1);
        expect(result.listings[0].title).toBe('City Walking Tour');
      });

      it('should return suggestions when results are limited', async () => {
        const result = await filterService.applyFilters({
          minPrice: 500, // Very high price
          maxPrice: 1000,
        });

        expect(result.listings.length).toBe(0);
        expect(result.suggestions).toBeDefined();
        expect(result.suggestions?.length).toBeGreaterThan(0);
      });

      it('should sort results correctly', async () => {
        const result = await filterService.applyFilters({
          sortBy: 'price',
          sortOrder: 'asc',
        });

        expect(result.listings.length).toBeGreaterThan(1);
        expect(result.listings[0].price).toBeLessThanOrEqual(result.listings[1].price);
      });

      it('should paginate results', async () => {
        const result = await filterService.applyFilters({
          page: 1,
          limit: 2,
        });

        expect(result.listings.length).toBeLessThanOrEqual(2);
        expect(result.totalCount).toBeGreaterThanOrEqual(result.listings.length);
      });
    });

    describe('getAvailableFilters', () => {
      it('should return available filter options', async () => {
        const result = await filterService.getAvailableFilters(ServiceType.ACTIVITIES);

        expect(result.amenities).toBeDefined();
        expect(result.categories).toBeDefined();
        expect(result.languages).toBeDefined();
        expect(result.tags).toBeDefined();
        expect(result.priceRange).toBeDefined();
        expect(result.ratingRange).toBeDefined();
        expect(result.durationRange).toBeDefined();

        expect(result.amenities).toContain('guide');
        expect(result.categories).toContain('cultural');
        expect(result.languages).toContain('en');
        expect(result.tags).toContain('adventure');
      });
    });

    describe('createFilterPreset', () => {
      it('should create a filter preset', async () => {
        const preset = await filterService.createFilterPreset(
          'Budget Activities',
          'Affordable activities under $50',
          ServiceType.ACTIVITIES,
          {
            maxPrice: 50,
            instantConfirmation: true,
          },
          testUserId,
          true
        );

        expect(preset.name).toBe('Budget Activities');
        expect(preset.serviceType).toBe(ServiceType.ACTIVITIES);
        expect(preset.filters.maxPrice).toBe(50);
        expect(preset.isPublic).toBe(true);
        expect(preset.createdBy).toBe(testUserId);
      });
    });

    describe('saveFilter', () => {
      it('should save a user filter', async () => {
        const savedFilter = await filterService.saveFilter(
          testUserId,
          'My Beach Preferences',
          ServiceType.HOTELS,
          {
            amenities: ['pool', 'wifi'],
            categories: ['luxury'],
            minRating: 4.0,
          },
          false
        );

        expect(savedFilter.name).toBe('My Beach Preferences');
        expect(savedFilter.userId).toBe(testUserId);
        expect(savedFilter.serviceType).toBe(ServiceType.HOTELS);
        expect(savedFilter.filters.amenities).toContain('pool');
        expect(savedFilter.isDefault).toBe(false);
      });

      it('should set default filter correctly', async () => {
        await filterService.saveFilter(
          testUserId,
          'Default Hotel Filter',
          ServiceType.HOTELS,
          { minRating: 4.5 },
          true
        );

        const savedFilters = await filterService.getSavedFilters(testUserId, ServiceType.HOTELS);
        const defaultFilter = savedFilters.find(f => f.isDefault);

        expect(defaultFilter).toBeDefined();
        expect(defaultFilter?.name).toBe('Default Hotel Filter');
      });
    });

    describe('getSavedFilters', () => {
      it('should return user saved filters', async () => {
        const savedFilters = await filterService.getSavedFilters(testUserId);

        expect(savedFilters.length).toBeGreaterThan(0);
        expect(savedFilters.every(f => f.userId === testUserId)).toBe(true);
      });

      it('should filter by service type', async () => {
        const hotelFilters = await filterService.getSavedFilters(testUserId, ServiceType.HOTELS);

        expect(hotelFilters.every(f => f.serviceType === ServiceType.HOTELS)).toBe(true);
      });
    });

    describe('getFilterPresets', () => {
      it('should return public filter presets', async () => {
        const presets = await filterService.getFilterPresets();

        expect(presets.length).toBeGreaterThan(0);
        expect(presets.every(p => p.isPublic)).toBe(true);
      });

      it('should filter presets by service type', async () => {
        const activityPresets = await filterService.getFilterPresets(ServiceType.ACTIVITIES);

        expect(activityPresets.every(p => p.serviceType === ServiceType.ACTIVITIES)).toBe(true);
      });
    });
  });

  describe('Advanced Filter API Routes', () => {
    describe('GET /api/filters/search', () => {
      it('should apply filters and return results', async () => {
        const response = await request(app)
          .get('/api/filters/search')
          .query({
            serviceType: ServiceType.ACTIVITIES,
            minPrice: 20,
            maxPrice: 80,
            instantConfirmation: true,
          });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.listings).toBeDefined();
        expect(response.body.data.totalCount).toBeDefined();
        expect(response.body.data.appliedFilters).toBeDefined();
        expect(response.body.pagination).toBeDefined();
      });

      it('should handle invalid filter parameters', async () => {
        const response = await request(app)
          .get('/api/filters/search')
          .query({
            serviceType: 'invalid',
            minPrice: -10,
            maxPrice: 'not-a-number',
          });

        expect(response.status).toBe(400);
        expect(response.body.error).toBe('Validation failed');
      });
    });

    describe('GET /api/filters/available/:serviceType', () => {
      it('should return available filters for service type', async () => {
        const response = await request(app)
          .get(`/api/filters/available/${ServiceType.ACTIVITIES}`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.amenities).toBeDefined();
        expect(response.body.data.categories).toBeDefined();
        expect(response.body.data.priceRange).toBeDefined();
      });

      it('should reject invalid service type', async () => {
        const response = await request(app)
          .get('/api/filters/available/invalid');

        expect(response.status).toBe(400);
        expect(response.body.error).toBe('Invalid service type');
      });
    });

    describe('GET /api/filters/presets', () => {
      it('should return filter presets', async () => {
        const response = await request(app)
          .get('/api/filters/presets');

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data).toBeDefined();
      });

      it('should filter presets by service type', async () => {
        const response = await request(app)
          .get('/api/filters/presets')
          .query({ serviceType: ServiceType.ACTIVITIES });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });
    });

    describe('POST /api/filters/presets', () => {
      it('should create filter preset', async () => {
        const response = await request(app)
          .post('/api/filters/presets')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            name: 'Luxury Hotels',
            description: 'High-end hotel options',
            serviceType: ServiceType.HOTELS,
            filters: {
              minRating: 4.5,
              amenities: ['spa', 'pool'],
              categories: ['luxury'],
            },
            isPublic: true,
          });

        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
        expect(response.body.data.name).toBe('Luxury Hotels');
      });

      it('should require authentication', async () => {
        const response = await request(app)
          .post('/api/filters/presets')
          .send({
            name: 'Test Preset',
            serviceType: ServiceType.HOTELS,
            filters: {},
          });

        expect(response.status).toBe(401);
      });

      it('should validate input', async () => {
        const response = await request(app)
          .post('/api/filters/presets')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            name: '',
            serviceType: 'invalid',
            filters: 'not-an-object',
          });

        expect(response.status).toBe(400);
        expect(response.body.error).toBe('Validation failed');
      });
    });

    describe('GET /api/filters/saved', () => {
      it('should return user saved filters', async () => {
        const response = await request(app)
          .get('/api/filters/saved')
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data).toBeDefined();
      });

      it('should require authentication', async () => {
        const response = await request(app)
          .get('/api/filters/saved');

        expect(response.status).toBe(401);
      });
    });

    describe('POST /api/filters/saved', () => {
      it('should save user filter', async () => {
        const response = await request(app)
          .post('/api/filters/saved')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            name: 'My Activity Preferences',
            serviceType: ServiceType.ACTIVITIES,
            filters: {
              difficulty: 'easy',
              maxPrice: 100,
              tags: ['family-friendly'],
            },
            isDefault: false,
          });

        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
        expect(response.body.data.name).toBe('My Activity Preferences');
      });

      it('should require authentication', async () => {
        const response = await request(app)
          .post('/api/filters/saved')
          .send({
            name: 'Test Filter',
            serviceType: ServiceType.ACTIVITIES,
            filters: {},
          });

        expect(response.status).toBe(401);
      });
    });

    describe('GET /api/filters/stats', () => {
      it('should return filter statistics', async () => {
        const response = await request(app)
          .get('/api/filters/stats');

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.presets).toBeDefined();
        expect(response.body.data.savedFilters).toBeDefined();
      });
    });
  });

  describe('Filter Performance', () => {
    it('should handle large result sets efficiently', async () => {
      const startTime = Date.now();
      
      await filterService.applyFilters({
        serviceType: ServiceType.ACTIVITIES,
        limit: 100,
      });
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Should complete within 2 seconds
      expect(duration).toBeLessThan(2000);
    });

    it('should cache filter results', async () => {
      const filters = {
        serviceType: ServiceType.HOTELS,
        minRating: 4.0,
      };

      // First call
      const start1 = Date.now();
      await filterService.applyFilters(filters);
      const duration1 = Date.now() - start1;

      // Second call (should be cached)
      const start2 = Date.now();
      await filterService.applyFilters(filters);
      const duration2 = Date.now() - start2;

      // Cached call should be significantly faster
      expect(duration2).toBeLessThan(duration1 * 0.5);
    });
  });

  describe('Filter Edge Cases', () => {
    it('should handle empty results gracefully', async () => {
      const result = await filterService.applyFilters({
        minPrice: 10000, // Unrealistic high price
      });

      expect(result.listings).toEqual([]);
      expect(result.totalCount).toBe(0);
      expect(result.suggestions).toBeDefined();
    });

    it('should handle invalid filter combinations', async () => {
      const result = await filterService.applyFilters({
        minPrice: 100,
        maxPrice: 50, // Invalid range
      });

      expect(result.listings).toEqual([]);
      expect(result.totalCount).toBe(0);
    });

    it('should handle null/undefined filter values', async () => {
      const result = await filterService.applyFilters({
        amenities: null as any,
        categories: undefined,
        minPrice: 0,
      });

      expect(result.listings).toBeDefined();
      expect(result.totalCount).toBeGreaterThanOrEqual(0);
    });
  });
});