import { BaseApiProvider } from '../BaseApiProvider';
import {
  ApiSearchParams,
  NormalizedListing,
  SearchParams,
} from '../../../types/api-providers.types';
import { ServiceType, ListingSource } from '../../../models/UnifiedListing';

export class ViatorProvider extends BaseApiProvider {
  protected getDefaultHeaders(): Record<string, string> {
    return {
      'Accept': 'application/json',
      'Accept-Language': 'en-US',
      'X-Viator-API-Key': this.config.apiKey || '',
    };
  }

  protected convertSearchParams(params: SearchParams): ApiSearchParams {
    const apiParams: ApiSearchParams = {
      location: {
        lat: params.location.lat || 0,
        lng: params.location.lng || 0,
        radius: params.location.radius || 25,
      },
      limit: params.pageSize || 20,
      offset: ((params.page || 1) - 1) * (params.pageSize || 20),
      currency: 'USD',
      locale: 'en',
    };

    // Location handling
    if (params.location.lat && params.location.lng) {
      apiParams.latitude = params.location.lat;
      apiParams.longitude = params.location.lng;
      apiParams.radius = params.location.radius || 25; // km
    } else if (params.location.city) {
      apiParams.destination = `${params.location.city}, ${params.location.country || ''}`.trim();
    }

    // Date handling
    if (params.dateRange) {
      apiParams.startDate = params.dateRange.startDate.toISOString().split('T')[0];
      apiParams.endDate = params.dateRange.endDate.toISOString().split('T')[0];
    }

    // Filters
    if (params.filters) {
      if (params.filters.minPrice) {
        apiParams.minPrice = params.filters.minPrice;
      }
      if (params.filters.maxPrice) {
        apiParams.maxPrice = params.filters.maxPrice;
      }
      if (params.filters.categories?.length) {
        apiParams.categories = params.filters.categories.join(',');
      }
    }

    // Sorting
    if (params.sortBy) {
      const sortMap: Record<string, string> = {
        price: 'PRICE',
        rating: 'RATING',
        popularity: 'POPULARITY',
        distance: 'DISTANCE',
      };
      apiParams.sortBy = sortMap[params.sortBy] || 'POPULARITY';
    }

    return apiParams;
  }

  normalizeResponse(rawData: any): NormalizedListing[] {
    if (!rawData || !rawData.data || !Array.isArray(rawData.data)) {
      return [];
    }

    return rawData.data.map((item: any) => this.normalizeActivity(item));
  }

  private normalizeActivity(activity: any): NormalizedListing {
    const priceInfo = this.normalizePrice(
      activity.pricing?.price || activity.price,
      activity.pricing?.currency || activity.currency
    );

    const listing: NormalizedListing = {
      id: this.generateListingId(activity.productCode || activity.id),
      source: ListingSource.VIATOR,
      externalId: activity.productCode || activity.id,
      serviceType: ServiceType.ACTIVITIES,
      title: activity.title || activity.name,
      description: activity.description || activity.summary,
      location: {
        lat: activity.location?.latitude || activity.latitude || 0,
        lng: activity.location?.longitude || activity.longitude || 0,
        address: activity.location?.address || activity.address,
        city: activity.location?.city || activity.destinationName || '',
        state: activity.location?.state,
        country: activity.location?.country || activity.destinationCountry || '',
        postalCode: activity.location?.postalCode,
      },
      rating: this.normalizeRating(activity.rating || activity.avgRating),
      reviewCount: activity.reviewCount || activity.numReviews || 0,
      price: priceInfo.price,
      currency: priceInfo.currency,
      priceUnit: 'per person',
      images: this.extractImages(activity.images || activity.photos),
      thumbnailUrl: activity.thumbnailUrl || activity.primaryPhoto?.url,
      url: activity.deepLink || activity.url || `https://www.viator.com/tours/${activity.productCode}`,
      amenities: this.extractAmenities(activity),
      metadata: {
        duration: activity.duration || activity.durationText,
        category: activity.primaryCategory?.name,
        subcategory: activity.subcategory?.name,
        tags: activity.tags || [],
        highlights: activity.highlights || [],
        cancellationPolicy: activity.cancellationPolicy || activity.cancellationType,
        instantConfirmation: activity.instantConfirmation || false,
        mobileTicket: activity.mobileTicketAvailable || false,
        languages: activity.languages || [],
        inclusions: activity.inclusions || [],
        exclusions: activity.exclusions || [],
        minParticipants: activity.minParticipants,
        maxParticipants: activity.maxParticipants,
      },
      score: this.calculateActivityScore(activity),
    };

    return listing;
  }

  private extractAmenities(activity: any): Record<string, boolean> {
    const amenities: Record<string, boolean> = {};

    if (activity.instantConfirmation) {
      amenities.instantConfirmation = true;
    }
    if (activity.mobileTicketAvailable) {
      amenities.mobileTicket = true;
    }
    if (activity.wheelchairAccessible) {
      amenities.wheelchairAccessible = true;
    }
    if (activity.audioGuideAvailable) {
      amenities.audioGuide = true;
    }
    if (activity.liveGuideAvailable) {
      amenities.liveGuide = true;
    }
    if (activity.pickupOffered) {
      amenities.hotelPickup = true;
    }
    if (activity.smallGroupTour) {
      amenities.smallGroup = true;
    }
    if (activity.privateTour) {
      amenities.privateTour = true;
    }

    return amenities;
  }

  private calculateActivityScore(activity: any): number {
    let score = 0;

    // Base on rating (0-50 points)
    const rating = this.normalizeRating(activity.rating || activity.avgRating);
    if (rating) {
      score += rating * 10;
    }

    // Review count (0-20 points)
    const reviewCount = activity.reviewCount || activity.numReviews || 0;
    if (reviewCount > 0) {
      score += Math.min(20, Math.log10(reviewCount) * 10);
    }

    // Popularity indicators (0-20 points)
    if (activity.bestSeller) score += 5;
    if (activity.instantConfirmation) score += 3;
    if (activity.featured) score += 5;
    if (activity.specialOffer) score += 3;
    if (activity.smallGroupTour || activity.privateTour) score += 4;

    // Content quality (0-10 points)
    if (activity.images?.length > 3) score += 3;
    if (activity.description?.length > 200) score += 3;
    if (activity.highlights?.length > 0) score += 2;
    if (activity.inclusions?.length > 0) score += 2;

    return Math.min(100, score);
  }

  async isHealthy(): Promise<boolean> {
    try {
      const response = await this.axiosInstance.get('/health/check', {
        timeout: 5000,
      });
      return response.status === 200;
    } catch {
      // Try a simple search as health check
      try {
        const response = await this.axiosInstance.get('/products/search', {
          params: { destination: 'New York', limit: 1 },
          timeout: 5000,
        });
        return response.status === 200;
      } catch {
        return false;
      }
    }
  }
}