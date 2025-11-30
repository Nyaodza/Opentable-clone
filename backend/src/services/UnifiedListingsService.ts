import { Op, FindOptions, WhereOptions, Sequelize } from 'sequelize';
import { UnifiedListing, ServiceType, ListingSource, ListingStatus } from '../models/UnifiedListing';
import { CacheManager } from '../config/redis';
import { logger } from '../utils/logger';
import {
  SearchParams,
  CombinedListingsResponse,
  NormalizedListing,
  ApiProvider,
  ServiceTypeProviders,
} from '../types/api-providers.types';
import { ApiProviderFactory } from './api-providers/ApiProviderFactory';

export class UnifiedListingsService {
  private static instance: UnifiedListingsService;
  private cache: CacheManager;
  private apiProviders: ServiceTypeProviders;

  private constructor() {
    this.cache = CacheManager.getInstance();
    this.apiProviders = ApiProviderFactory.createProviders();
  }

  static getInstance(): UnifiedListingsService {
    if (!UnifiedListingsService.instance) {
      UnifiedListingsService.instance = new UnifiedListingsService();
    }
    return UnifiedListingsService.instance;
  }

  async searchCombinedListings(params: SearchParams): Promise<CombinedListingsResponse> {
    try {
      // Check cache first
      const cacheKey = this.getCacheKey(params);
      const cachedResult = await this.cache.get(cacheKey);
      
      if (cachedResult) {
        logger.debug(`Cache hit for combined listings: ${cacheKey}`);
        return cachedResult as CombinedListingsResponse;
      }

      // Fetch local and API listings in parallel
      const [localListings, apiListings] = await Promise.all([
        this.fetchLocalListings(params),
        this.fetchApiListings(params),
      ]);

      // Merge and order listings
      const mergedListings = this.mergeListings(localListings, apiListings, params);

      // Apply pagination
      const paginatedListings = this.paginateListings(mergedListings, params);

      // Prepare response
      const response: CombinedListingsResponse = {
        totalCount: mergedListings.length,
        items: paginatedListings.items,
        page: params.page || 1,
        pageSize: params.pageSize || 20,
        hasMore: paginatedListings.hasMore,
        sources: this.countSources(mergedListings),
      };

      // Cache the result
      await this.cache.set(cacheKey, response, 300); // 5 minutes

      return response;
    } catch (error) {
      logger.error('Error searching combined listings:', error);
      throw error;
    }
  }

  private async fetchLocalListings(params: SearchParams): Promise<NormalizedListing[]> {
    try {
      const whereClause = this.buildWhereClause(params);
      const orderClause = this.buildOrderClause(params);

      const listings = await UnifiedListing.findAll({
        where: whereClause,
        order: orderClause,
        limit: 100, // Fetch more than needed for better sorting
      });

      // Calculate scores for local listings asynchronously
      await Promise.all(
        listings.map(async (listing) => {
          listing.calculateScore();
          return listing.save();
        })
      );

      return listings.map(listing => this.normalizeLocalListing(listing));
    } catch (error) {
      logger.error('Error fetching local listings:', error);
      return [];
    }
  }

  private async fetchApiListings(params: SearchParams): Promise<NormalizedListing[]> {
    const providers = this.apiProviders[params.serviceType] || [];
    const enabledProviders = providers.filter(p => p.config.enabled);

    if (enabledProviders.length === 0) {
      return [];
    }

    // Fetch from all providers in parallel
    const apiPromises = enabledProviders.map(provider =>
      provider.searchListings(params).catch(error => {
        logger.error(`Error fetching from ${provider.config.name}:`, error);
        return { success: false, data: [] };
      })
    );

    const results = await Promise.allSettled(apiPromises);
    const allApiListings: NormalizedListing[] = [];

    results.forEach((result, index) => {
      if (result.status === 'fulfilled' && result.value.success && result.value.data) {
        const provider = enabledProviders[index];
        const listings = result.value.data.slice(0, provider.config.maxListingsPerRequest);
        allApiListings.push(...listings);
      }
    });

    return allApiListings;
  }

  private buildWhereClause(params: SearchParams): WhereOptions<UnifiedListing> {
    const where: WhereOptions<UnifiedListing> = {
      serviceType: params.serviceType,
      source: ListingSource.LOCAL,
      status: ListingStatus.ACTIVE,
    };

    // Location filtering
    if (params.location.city) {
      where.cityLower = params.location.city.toLowerCase();
    }
    if (params.location.country) {
      where.countryLower = params.location.country.toLowerCase();
    }

    // If coordinates are provided, use distance-based search
    if (params.location.lat && params.location.lng) {
      const radius = params.location.radius || 25; // km
      // This would require a custom query with PostGIS or Haversine formula
      // For now, we'll use city/country matching
    }

    // Date range filtering
    if (params.dateRange) {
      (where as any)[Op.and] = [
        {
          [Op.or]: [
            { availableFrom: null },
            { availableFrom: { [Op.lte]: params.dateRange.startDate } },
          ]
        },
        {
          [Op.or]: [
            { availableUntil: null },
            { availableUntil: { [Op.gte]: params.dateRange.endDate } },
          ]
        }
      ];
    }

    // Price filtering
    if (params.filters?.minPrice || params.filters?.maxPrice) {
      const priceFilter: any = {};
      if (params.filters.minPrice) {
        priceFilter[Op.gte] = params.filters.minPrice;
      }
      if (params.filters.maxPrice) {
        priceFilter[Op.lte] = params.filters.maxPrice;
      }
      where.price = priceFilter;
    }

    // Rating filtering
    if (params.filters?.minRating) {
      where.rating = { [Op.gte]: params.filters.minRating };
    }

    return where;
  }

  private buildOrderClause(params: SearchParams): any[] {
    const order: any[] = [];

    // Always prioritize featured listings
    order.push(['isFeatured', 'DESC']);

    // Apply requested sorting
    switch (params.sortBy) {
      case 'price':
        order.push(['price', params.sortOrder || 'ASC']);
        break;
      case 'rating':
        order.push(['rating', params.sortOrder || 'DESC']);
        order.push(['reviewCount', 'DESC']);
        break;
      case 'popularity':
        order.push(['score', 'DESC']);
        order.push(['bookingCount', 'DESC']);
        break;
      case 'distance':
        // Would require distance calculation
        order.push(['score', 'DESC']);
        break;
      default:
        // Default: score, then newest
        order.push(['score', 'DESC']);
        order.push(['createdAt', 'DESC']);
    }

    return order;
  }

  private normalizeLocalListing(listing: UnifiedListing): NormalizedListing {
    return {
      id: listing.id,
      source: listing.source,
      externalId: listing.externalId || listing.id,
      serviceType: listing.serviceType,
      title: listing.title,
      description: listing.description,
      location: listing.location,
      rating: listing.rating,
      reviewCount: listing.reviewCount,
      price: listing.price,
      currency: listing.currency,
      priceUnit: listing.priceUnit,
      images: listing.images,
      thumbnailUrl: listing.thumbnailUrl,
      url: listing.url,
      amenities: listing.amenities,
      metadata: listing.metadata,
      score: listing.score,
      availableFrom: listing.availableFrom,
      availableUntil: listing.availableUntil,
    };
  }

  private mergeListings(
    localListings: NormalizedListing[],
    apiListings: NormalizedListing[],
    params: SearchParams
  ): NormalizedListing[] {
    // Sort local listings by score
    localListings.sort((a, b) => (b.score || 0) - (a.score || 0));

    // Group API listings by provider
    const apiListingsByProvider = new Map<ListingSource, NormalizedListing[]>();
    
    apiListings.forEach(listing => {
      if (!apiListingsByProvider.has(listing.source)) {
        apiListingsByProvider.set(listing.source, []);
      }
      apiListingsByProvider.get(listing.source)!.push(listing);
    });

    // Sort each provider's listings by score
    apiListingsByProvider.forEach(listings => {
      listings.sort((a, b) => (b.score || 0) - (a.score || 0));
    });

    // Merge strategy: All local first, then interleave API listings
    const merged: NormalizedListing[] = [...localListings];

    // Interleave API listings from different providers
    const maxApiPerProvider = 4;
    let addedFromProviders = 0;
    let providerIndex = 0;
    const providers = Array.from(apiListingsByProvider.keys());

    while (addedFromProviders < apiListings.length && providers.length > 0) {
      const currentProvider = providers[providerIndex % providers.length];
      const providerListings = apiListingsByProvider.get(currentProvider)!;

      if (providerListings.length > 0) {
        const listing = providerListings.shift()!;
        merged.push(listing);
        addedFromProviders++;

        // Remove provider if we've added max listings or it's empty
        const addedFromThisProvider = maxApiPerProvider - providerListings.length;
        if (addedFromThisProvider >= maxApiPerProvider || providerListings.length === 0) {
          providers.splice(providerIndex % providers.length, 1);
          if (providerIndex >= providers.length && providers.length > 0) {
            providerIndex = 0;
          }
        } else {
          providerIndex++;
        }
      }
    }

    return merged;
  }

  private paginateListings(
    listings: NormalizedListing[],
    params: SearchParams
  ): { items: NormalizedListing[]; hasMore: boolean } {
    const page = params.page || 1;
    const pageSize = params.pageSize || 20;
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;

    return {
      items: listings.slice(startIndex, endIndex),
      hasMore: endIndex < listings.length,
    };
  }

  private countSources(listings: NormalizedListing[]): CombinedListingsResponse['sources'] {
    const sources: CombinedListingsResponse['sources'] = {
      local: 0,
      api: {},
    };

    listings.forEach(listing => {
      if (listing.source === ListingSource.LOCAL) {
        sources.local++;
      } else {
        sources.api[listing.source] = (sources.api[listing.source] || 0) + 1;
      }
    });

    return sources;
  }

  private getCacheKey(params: SearchParams): string {
    const keyParts = [
      'combined_listings',
      params.serviceType,
      params.location.city || `${params.location.lat},${params.location.lng}`,
      params.page || 1,
      params.pageSize || 20,
      params.sortBy || 'default',
    ];

    if (params.dateRange) {
      keyParts.push(params.dateRange.startDate.toISOString().split('T')[0]);
      keyParts.push(params.dateRange.endDate.toISOString().split('T')[0]);
    }

    if (params.filters) {
      keyParts.push(JSON.stringify(params.filters));
    }

    return keyParts.join(':');
  }

  // Admin methods
  async getProviderStatus(): Promise<Record<string, any>> {
    const status: Record<string, any> = {};

    for (const [serviceType, providers] of Object.entries(this.apiProviders)) {
      status[serviceType] = await Promise.all(
        providers.map(async (provider: ApiProvider) => ({
          name: provider.config.name,
          enabled: provider.config.enabled,
          healthy: await provider.isHealthy(),
          quota: await provider.getQuota(),
        }))
      );
    }

    return status;
  }

  async toggleProvider(source: ListingSource, enabled: boolean): Promise<void> {
    for (const providers of Object.values(this.apiProviders)) {
      const provider = providers.find((p: ApiProvider) => p.config.source === source);
      if (provider) {
        provider.config.enabled = enabled;
        // Clear cache for this provider
        await this.cache.clear(`listing:${source}:*`);
      }
    }
  }

  async syncLocalListing(listingId: string): Promise<void> {
    const listing = await UnifiedListing.findByPk(listingId);
    if (listing) {
      listing.calculateScore();
      await listing.save();
      // Clear relevant caches
      await this.cache.clear(`combined_listings:${listing.serviceType}:*`);
    }
  }
}