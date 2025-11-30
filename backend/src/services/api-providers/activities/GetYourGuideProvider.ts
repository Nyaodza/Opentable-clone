import { BaseApiProvider } from '../BaseApiProvider';
import {
  ApiSearchParams,
  NormalizedListing,
  SearchParams,
} from '../../../types/api-providers.types';
import { ServiceType, ListingSource } from '../../../models/UnifiedListing';

export class GetYourGuideProvider extends BaseApiProvider {
  protected getDefaultHeaders(): Record<string, string> {
    return {
      'Accept': 'application/json',
      'Accept-Language': 'en-US',
      'X-ACCESS-TOKEN': this.config.apiKey || '',
      'User-Agent': 'TravelPlatform/1.0',
    };
  }

  protected convertSearchParams(params: SearchParams): ApiSearchParams {
    const apiParams: ApiSearchParams = {
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
      apiParams.query = `${params.location.city}, ${params.location.country || ''}`.trim();
    }

    // Date handling
    if (params.dateRange) {
      apiParams.from = params.dateRange.startDate.toISOString().split('T')[0];
      apiParams.to = params.dateRange.endDate.toISOString().split('T')[0];
    }

    // Filters
    if (params.filters) {
      if (params.filters.minPrice) {
        apiParams.min_price = params.filters.minPrice;
      }
      if (params.filters.maxPrice) {
        apiParams.max_price = params.filters.maxPrice;
      }
      if (params.filters.categories?.length) {
        apiParams.categories = params.filters.categories.join(',');
      }
      if (params.filters.minRating) {
        apiParams.rating = params.filters.minRating;
      }
    }

    // Sorting
    if (params.sortBy) {
      const sortMap: Record<string, string> = {
        price: 'price',
        rating: 'rating',
        popularity: 'popularity',
        distance: 'distance',
      };
      apiParams.sort = sortMap[params.sortBy] || 'popularity';
      apiParams.order = params.sortOrder || 'desc';
    }

    return apiParams;
  }

  normalizeResponse(rawData: any): NormalizedListing[] {
    if (!rawData || !rawData.results || !Array.isArray(rawData.results)) {
      return [];
    }

    return rawData.results.map((item: any) => this.normalizeActivity(item));
  }

  private normalizeActivity(activity: any): NormalizedListing {
    const priceInfo = this.normalizePrice(
      activity.price?.amount || activity.pricing?.price,
      activity.price?.currency || activity.pricing?.currency
    );

    const listing: NormalizedListing = {
      id: this.generateListingId(activity.tour_id || activity.id),
      source: ListingSource.GETYOURGUIDE,
      externalId: activity.tour_id || activity.id,
      serviceType: ServiceType.ACTIVITIES,
      title: activity.title || activity.name,
      description: activity.abstract || activity.description,
      location: {
        lat: activity.latitude || activity.location?.latitude || 0,
        lng: activity.longitude || activity.location?.longitude || 0,
        address: activity.meeting_point?.location || activity.address,
        city: activity.location?.city || activity.city || '',
        state: activity.location?.state,
        country: activity.location?.country || activity.country || '',
        postalCode: activity.location?.postal_code,
      },
      rating: this.normalizeRating(activity.rating?.overall || activity.overall_rating),
      reviewCount: activity.rating?.count || activity.review_count || 0,
      price: priceInfo.price,
      currency: priceInfo.currency,
      priceUnit: 'per person',
      images: this.extractImages(activity.pictures || activity.images),
      thumbnailUrl: activity.pictures?.[0]?.url || activity.main_photo?.url,
      url: activity.url || `https://www.getyourguide.com/activity/t${activity.tour_id}`,
      amenities: this.extractAmenities(activity),
      metadata: {
        duration: activity.duration || activity.duration_range,
        category: activity.categories?.[0]?.name,
        subcategory: activity.subcategories?.[0]?.name,
        tags: activity.tags || [],
        highlights: activity.highlights || [],
        cancellationPolicy: activity.cancellation_policy_text,
        instantConfirmation: activity.instant_confirmation || false,
        mobileTicket: activity.mobile_ticket || false,
        languages: activity.languages || [],
        inclusions: activity.inclusions || [],
        exclusions: activity.exclusions || [],
        minParticipants: activity.group_size?.min,
        maxParticipants: activity.group_size?.max,
        difficulty: activity.difficulty_level,
        accessibility: activity.accessibility,
      },
      score: this.calculateActivityScore(activity),
    };

    return listing;
  }

  private extractAmenities(activity: any): Record<string, boolean> {
    const amenities: Record<string, boolean> = {};

    if (activity.instant_confirmation) {
      amenities.instantConfirmation = true;
    }
    if (activity.mobile_ticket) {
      amenities.mobileTicket = true;
    }
    if (activity.wheelchair_accessible) {
      amenities.wheelchairAccessible = true;
    }
    if (activity.audio_supported) {
      amenities.audioGuide = true;
    }
    if (activity.live_guide) {
      amenities.liveGuide = true;
    }
    if (activity.hotel_pickup) {
      amenities.hotelPickup = true;
    }
    if (activity.skip_the_line) {
      amenities.skipTheLine = true;
    }
    if (activity.free_cancellation) {
      amenities.freeCancellation = true;
    }
    if (activity.group_size?.max <= 15) {
      amenities.smallGroup = true;
    }
    if (activity.private_tour) {
      amenities.privateTour = true;
    }

    return amenities;
  }

  private calculateActivityScore(activity: any): number {
    let score = 0;

    // Base on rating (0-50 points)
    const rating = this.normalizeRating(activity.rating?.overall || activity.overall_rating);
    if (rating) {
      score += rating * 10;
    }

    // Review count (0-20 points)
    const reviewCount = activity.rating?.count || activity.review_count || 0;
    if (reviewCount > 0) {
      score += Math.min(20, Math.log10(reviewCount) * 10);
    }

    // Popularity indicators (0-20 points)
    if (activity.bestseller) score += 5;
    if (activity.instant_confirmation) score += 3;
    if (activity.featured) score += 5;
    if (activity.free_cancellation) score += 3;
    if (activity.skip_the_line) score += 4;

    // Content quality (0-10 points)
    if (activity.pictures?.length > 3) score += 3;
    if (activity.abstract?.length > 200) score += 3;
    if (activity.highlights?.length > 0) score += 2;
    if (activity.inclusions?.length > 0) score += 2;

    return Math.min(100, score);
  }

  async isHealthy(): Promise<boolean> {
    try {
      const response = await this.axiosInstance.get('/tours', {
        params: { limit: 1, query: 'test' },
        timeout: 5000,
      });
      return response.status === 200;
    } catch {
      return false;
    }
  }
}