import { UnifiedListingsService } from '../../../src/services/UnifiedListingsService';
import { UnifiedListing, ServiceType, ListingSource, ListingStatus } from '../../../src/models/UnifiedListing';
import { CacheManager } from '../../../src/config/redis';
import { ApiProviderFactory } from '../../../src/services/api-providers/ApiProviderFactory';
import { SearchParams, NormalizedListing } from '../../../src/types/api-providers.types';

// Mock dependencies
jest.mock('../../../src/config/redis');
jest.mock('../../../src/services/api-providers/ApiProviderFactory');
jest.mock('../../../src/models/UnifiedListing');

describe('UnifiedListingsService', () => {
  let service: UnifiedListingsService;
  let mockCache: jest.Mocked<CacheManager>;
  let mockApiProviders: any;

  beforeEach(() => {
    // Reset singleton
    (UnifiedListingsService as any).instance = undefined;
    
    // Setup mocks
    mockCache = {
      get: jest.fn(),
      set: jest.fn(),
      clear: jest.fn(),
    } as any;
    
    (CacheManager.getInstance as jest.Mock).mockReturnValue(mockCache);
    
    mockApiProviders = {
      [ServiceType.ACTIVITIES]: [
        {
          config: { enabled: true, maxListingsPerRequest: 4, name: 'TestProvider' },
          searchListings: jest.fn(),
          isHealthy: jest.fn(),
          getQuota: jest.fn(),
        },
      ],
    };
    
    (ApiProviderFactory.createProviders as jest.Mock).mockReturnValue(mockApiProviders);
    
    service = UnifiedListingsService.getInstance();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('searchCombinedListings', () => {
    const mockSearchParams: SearchParams = {
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

    const mockLocalListings = [
      {
        id: 'local-1',
        source: ListingSource.LOCAL,
        serviceType: ServiceType.ACTIVITIES,
        title: 'Local Activity 1',
        score: 85,
        calculateScore: jest.fn(),
        save: jest.fn(),
        toJSON: jest.fn(),
      },
      {
        id: 'local-2',
        source: ListingSource.LOCAL,
        serviceType: ServiceType.ACTIVITIES,
        title: 'Local Activity 2',
        score: 75,
        calculateScore: jest.fn(),
        save: jest.fn(),
        toJSON: jest.fn(),
      },
    ];

    const mockApiListings: NormalizedListing[] = [
      {
        id: 'viator_12345',
        source: ListingSource.VIATOR,
        externalId: '12345',
        serviceType: ServiceType.ACTIVITIES,
        title: 'Viator Activity 1',
        score: 90,
        location: { lat: 40.7128, lng: -74.0060, city: 'New York', country: 'USA' },
        url: 'https://viator.com/12345',
      },
      {
        id: 'viator_67890',
        source: ListingSource.VIATOR,
        externalId: '67890',
        serviceType: ServiceType.ACTIVITIES,
        title: 'Viator Activity 2',
        score: 80,
        location: { lat: 40.7128, lng: -74.0060, city: 'New York', country: 'USA' },
        url: 'https://viator.com/67890',
      },
    ];

    it('should return cached results when available', async () => {
      const cachedResponse = {
        totalCount: 4,
        items: [...mockLocalListings, ...mockApiListings],
        page: 1,
        pageSize: 20,
        hasMore: false,
        sources: { local: 2, api: { viator: 2 } },
      };
      
      mockCache.get.mockResolvedValue(cachedResponse);
      
      const result = await service.searchCombinedListings(mockSearchParams);
      
      expect(result).toEqual(cachedResponse);
      expect(mockCache.get).toHaveBeenCalledWith(expect.stringContaining('combined_listings'));
    });

    it('should fetch and merge local and API listings when cache miss', async () => {
      mockCache.get.mockResolvedValue(null);
      
      // Mock local listings fetch
      (UnifiedListing.findAll as jest.Mock).mockResolvedValue(mockLocalListings);
      
      // Mock API listings fetch
      mockApiProviders[ServiceType.ACTIVITIES][0].searchListings.mockResolvedValue({
        success: true,
        data: mockApiListings,
      });
      
      const result = await service.searchCombinedListings(mockSearchParams);
      
      expect(result.totalCount).toBe(4);
      expect(result.items).toHaveLength(4);
      expect(result.sources.local).toBe(2);
      expect(result.sources.api.viator).toBe(2);
      expect(mockCache.set).toHaveBeenCalled();
    });

    it('should handle API provider failures gracefully', async () => {
      mockCache.get.mockResolvedValue(null);
      (UnifiedListing.findAll as jest.Mock).mockResolvedValue(mockLocalListings);
      
      // Mock API provider failure
      mockApiProviders[ServiceType.ACTIVITIES][0].searchListings.mockRejectedValue(
        new Error('API Error')
      );
      
      const result = await service.searchCombinedListings(mockSearchParams);
      
      expect(result.totalCount).toBe(2); // Only local listings
      expect(result.sources.local).toBe(2);
      expect(result.sources.api).toEqual({});
    });

    it('should apply pagination correctly', async () => {
      const paginatedParams = { ...mockSearchParams, page: 2, pageSize: 2 };
      mockCache.get.mockResolvedValue(null);
      (UnifiedListing.findAll as jest.Mock).mockResolvedValue(mockLocalListings);
      mockApiProviders[ServiceType.ACTIVITIES][0].searchListings.mockResolvedValue({
        success: true,
        data: mockApiListings,
      });
      
      const result = await service.searchCombinedListings(paginatedParams);
      
      expect(result.page).toBe(2);
      expect(result.pageSize).toBe(2);
      expect(result.items).toHaveLength(2);
      expect(result.hasMore).toBe(false);
    });

    it('should prioritize local listings in merge strategy', async () => {
      mockCache.get.mockResolvedValue(null);
      (UnifiedListing.findAll as jest.Mock).mockResolvedValue(mockLocalListings);
      mockApiProviders[ServiceType.ACTIVITIES][0].searchListings.mockResolvedValue({
        success: true,
        data: mockApiListings,
      });
      
      const result = await service.searchCombinedListings(mockSearchParams);
      
      // First items should be local listings (higher priority)
      expect(result.items[0].id).toBe('local-1');
      expect(result.items[1].id).toBe('local-2');
    });
  });

  describe('getProviderStatus', () => {
    it('should return status for all providers', async () => {
      mockApiProviders[ServiceType.ACTIVITIES][0].isHealthy.mockResolvedValue(true);
      mockApiProviders[ServiceType.ACTIVITIES][0].getQuota.mockResolvedValue({
        used: 50,
        limit: 100,
        resetAt: new Date(),
      });
      
      const status = await service.getProviderStatus();
      
      expect(status[ServiceType.ACTIVITIES]).toHaveLength(1);
      expect(status[ServiceType.ACTIVITIES][0]).toMatchObject({
        name: 'TestProvider',
        enabled: true,
        healthy: true,
        quota: {
          used: 50,
          limit: 100,
        },
      });
    });
  });

  describe('toggleProvider', () => {
    it('should enable/disable provider and clear cache', async () => {
      await service.toggleProvider(ListingSource.VIATOR, false);
      
      expect(mockApiProviders[ServiceType.ACTIVITIES][0].config.enabled).toBe(false);
      expect(mockCache.clear).toHaveBeenCalledWith('listing:viator:*');
    });
  });

  describe('syncLocalListing', () => {
    it('should update listing score and clear cache', async () => {
      const mockListing = {
        id: 'test-id',
        serviceType: ServiceType.ACTIVITIES,
        calculateScore: jest.fn(),
        save: jest.fn(),
      };
      
      (UnifiedListing.findByPk as jest.Mock).mockResolvedValue(mockListing);
      
      await service.syncLocalListing('test-id');
      
      expect(mockListing.calculateScore).toHaveBeenCalled();
      expect(mockListing.save).toHaveBeenCalled();
      expect(mockCache.clear).toHaveBeenCalledWith('combined_listings:activities:*');
    });
  });
});

// Test helper functions
describe('UnifiedListingsService - Helper Methods', () => {
  let service: UnifiedListingsService;
  
  beforeEach(() => {
    (UnifiedListingsService as any).instance = undefined;
    (CacheManager.getInstance as jest.Mock).mockReturnValue({});
    (ApiProviderFactory.createProviders as jest.Mock).mockReturnValue({});
    service = UnifiedListingsService.getInstance();
  });

  describe('buildWhereClause', () => {
    it('should build correct where clause for city search', () => {
      const params: SearchParams = {
        serviceType: ServiceType.ACTIVITIES,
        location: { city: 'New York', country: 'USA' },
      };
      
      const whereClause = (service as any).buildWhereClause(params);
      
      expect(whereClause.serviceType).toBe(ServiceType.ACTIVITIES);
      expect(whereClause.source).toBe(ListingSource.LOCAL);
      expect(whereClause.status).toBe(ListingStatus.ACTIVE);
      expect(whereClause.cityLower).toBe('new york');
      expect(whereClause.countryLower).toBe('usa');
    });

    it('should handle price filters correctly', () => {
      const params: SearchParams = {
        serviceType: ServiceType.ACTIVITIES,
        location: { city: 'New York', country: 'USA' },
        filters: {
          minPrice: 50,
          maxPrice: 200,
        },
      };
      
      const whereClause = (service as any).buildWhereClause(params);
      
      expect(whereClause.price).toMatchObject({
        [Symbol.for('gte')]: 50,
        [Symbol.for('lte')]: 200,
      });
    });
  });

  describe('mergeListings', () => {
    it('should merge listings with local first strategy', () => {
      const localListings = [
        { id: 'local-1', source: ListingSource.LOCAL, score: 85 },
        { id: 'local-2', source: ListingSource.LOCAL, score: 75 },
      ];
      
      const apiListings = [
        { id: 'api-1', source: ListingSource.VIATOR, score: 90 },
        { id: 'api-2', source: ListingSource.GETYOURGUIDE, score: 80 },
      ];
      
      const merged = (service as any).mergeListings(localListings, apiListings, {});
      
      expect(merged).toHaveLength(4);
      expect(merged[0].id).toBe('local-1');
      expect(merged[1].id).toBe('local-2');
      expect(merged.slice(2).some(item => item.id === 'api-1')).toBe(true);
      expect(merged.slice(2).some(item => item.id === 'api-2')).toBe(true);
    });
  });
});