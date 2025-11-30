import { ViatorProvider } from '../../../../src/services/api-providers/activities/ViatorProvider';
import { ServiceType, ListingSource } from '../../../../src/models/UnifiedListing';
import { ApiProviderConfig, SearchParams } from '../../../../src/types/api-providers.types';
import axios from 'axios';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Mock dependencies
jest.mock('../../../../src/config/redis');
jest.mock('opossum');
jest.mock('limiter');

describe('ViatorProvider', () => {
  let provider: ViatorProvider;
  let mockConfig: ApiProviderConfig;

  beforeEach(() => {
    mockConfig = {
      name: 'Viator',
      source: ListingSource.VIATOR,
      enabled: true,
      apiKey: 'test-api-key',
      baseUrl: 'https://api.viator.com',
      maxListingsPerRequest: 4,
      timeout: 10000,
      retryAttempts: 3,
      cacheTTL: 600,
      rateLimit: {
        maxRequests: 100,
        windowMs: 60000,
      },
    };

    // Mock axios.create to return axios itself
    mockedAxios.create = jest.fn().mockReturnValue(mockedAxios);
    
    provider = new ViatorProvider(mockConfig);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getDefaultHeaders', () => {
    it('should return correct headers with API key', () => {
      const headers = (provider as any).getDefaultHeaders();
      
      expect(headers).toEqual({
        'Accept': 'application/json',
        'Accept-Language': 'en-US',
        'X-Viator-API-Key': 'test-api-key',
      });
    });
  });

  describe('convertSearchParams', () => {
    it('should convert basic search parameters correctly', () => {
      const searchParams: SearchParams = {
        serviceType: ServiceType.ACTIVITIES,
        location: {
          city: 'New York',
          country: 'USA',
          lat: 40.7128,
          lng: -74.0060,
        },
        page: 1,
        pageSize: 20,
      };

      const apiParams = (provider as any).convertSearchParams(searchParams);
      
      expect(apiParams).toMatchObject({
        location: {
          lat: 40.7128,
          lng: -74.0060,
          radius: 25,
        },
        limit: 20,
        offset: 0,
        currency: 'USD',
        locale: 'en',
        latitude: 40.7128,
        longitude: -74.0060,
        radius: 25,
      });
    });

    it('should handle city-based search without coordinates', () => {
      const searchParams: SearchParams = {
        serviceType: ServiceType.ACTIVITIES,
        location: {
          city: 'Paris',
          country: 'France',
        },
      };

      const apiParams = (provider as any).convertSearchParams(searchParams);
      
      expect(apiParams.destination).toBe('Paris, France');
    });

    it('should apply filters correctly', () => {
      const searchParams: SearchParams = {
        serviceType: ServiceType.ACTIVITIES,
        location: { city: 'London', country: 'UK' },
        filters: {
          minPrice: 50,
          maxPrice: 200,
          categories: ['tours', 'museums'],
        },
      };

      const apiParams = (provider as any).convertSearchParams(searchParams);
      
      expect(apiParams.minPrice).toBe(50);
      expect(apiParams.maxPrice).toBe(200);
      expect(apiParams.categories).toBe('tours,museums');
    });

    it('should handle date range parameters', () => {
      const searchParams: SearchParams = {
        serviceType: ServiceType.ACTIVITIES,
        location: { city: 'Rome', country: 'Italy' },
        dateRange: {
          startDate: new Date('2024-06-01'),
          endDate: new Date('2024-06-07'),
        },
      };

      const apiParams = (provider as any).convertSearchParams(searchParams);
      
      expect(apiParams.startDate).toBe('2024-06-01');
      expect(apiParams.endDate).toBe('2024-06-07');
    });
  });

  describe('normalizeResponse', () => {
    it('should normalize valid Viator API response', () => {
      const mockApiResponse = {
        data: [
          {
            productCode: 'V001',
            title: 'Central Park Walking Tour',
            description: 'Explore the beauty of Central Park',
            pricing: {
              price: 45.00,
              currency: 'USD',
            },
            rating: 4.5,
            reviewCount: 150,
            location: {
              latitude: 40.7851,
              longitude: -73.9683,
              city: 'New York',
              country: 'USA',
            },
            images: [
              'https://example.com/image1.jpg',
              'https://example.com/image2.jpg',
            ],
            duration: '2 hours',
            instantConfirmation: true,
          },
        ],
      };

      const normalized = provider.normalizeResponse(mockApiResponse);
      
      expect(normalized).toHaveLength(1);
      expect(normalized[0]).toMatchObject({
        id: 'viator_V001',
        source: ListingSource.VIATOR,
        externalId: 'V001',
        serviceType: ServiceType.ACTIVITIES,
        title: 'Central Park Walking Tour',
        description: 'Explore the beauty of Central Park',
        price: 45.00,
        currency: 'USD',
        rating: 4.5,
        reviewCount: 150,
        location: {
          lat: 40.7851,
          lng: -73.9683,
          city: 'New York',
          country: 'USA',
        },
        images: [
          'https://example.com/image1.jpg',
          'https://example.com/image2.jpg',
        ],
      });
    });

    it('should handle empty or invalid response', () => {
      expect(provider.normalizeResponse(null)).toEqual([]);
      expect(provider.normalizeResponse({})).toEqual([]);
      expect(provider.normalizeResponse({ data: null })).toEqual([]);
      expect(provider.normalizeResponse({ data: 'invalid' })).toEqual([]);
    });
  });

  describe('calculateActivityScore', () => {
    it('should calculate score based on multiple factors', () => {
      const activity = {
        rating: 4.8,
        reviewCount: 500,
        bestSeller: true,
        instantConfirmation: true,
        images: ['img1', 'img2', 'img3', 'img4'],
        description: 'A' + 'a'.repeat(250), // Long description
        highlights: ['highlight1', 'highlight2'],
        inclusions: ['inclusion1'],
      };

      const score = (provider as any).calculateActivityScore(activity);
      
      // Should be high score due to:
      // - High rating (48 points)
      // - Many reviews (20 points)
      // - Best seller (5 points)
      // - Instant confirmation (3 points)
      // - Many images (3 points)
      // - Long description (3 points)
      // - Highlights (2 points)
      // - Inclusions (2 points)
      expect(score).toBeGreaterThan(80);
      expect(score).toBeLessThanOrEqual(100);
    });

    it('should handle activity with minimal data', () => {
      const activity = {
        rating: 3.0,
        reviewCount: 5,
      };

      const score = (provider as any).calculateActivityScore(activity);
      
      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThan(50);
    });
  });

  describe('extractAmenities', () => {
    it('should extract amenities from activity data', () => {
      const activity = {
        instantConfirmation: true,
        mobileTicketAvailable: true,
        wheelchairAccessible: false,
        pickupOffered: true,
        smallGroupTour: true,
      };

      const amenities = (provider as any).extractAmenities(activity);
      
      expect(amenities).toEqual({
        instantConfirmation: true,
        mobileTicket: true,
        hotelPickup: true,
        smallGroup: true,
      });
    });
  });

  describe('isHealthy', () => {
    it('should return true for successful health check', async () => {
      mockedAxios.get.mockResolvedValue({ status: 200 });
      
      const isHealthy = await provider.isHealthy();
      
      expect(isHealthy).toBe(true);
    });

    it('should return false for failed health check', async () => {
      mockedAxios.get.mockRejectedValue(new Error('Network error'));
      
      const isHealthy = await provider.isHealthy();
      
      expect(isHealthy).toBe(false);
    });

    it('should fallback to products search if health endpoint fails', async () => {
      mockedAxios.get
        .mockRejectedValueOnce(new Error('Health endpoint not found'))
        .mockResolvedValueOnce({ status: 200 });
      
      const isHealthy = await provider.isHealthy();
      
      expect(isHealthy).toBe(true);
      expect(mockedAxios.get).toHaveBeenCalledTimes(2);
    });
  });
});