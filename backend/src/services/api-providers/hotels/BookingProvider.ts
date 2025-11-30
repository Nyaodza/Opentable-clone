import { BaseApiProvider } from '../BaseApiProvider';
import {
  ApiSearchParams,
  NormalizedListing,
  SearchParams,
} from '../../../types/api-providers.types';
import { ServiceType, ListingSource } from '../../../models/UnifiedListing';

export class BookingProvider extends BaseApiProvider {
  protected getDefaultHeaders(): Record<string, string> {
    return {
      'Accept': 'application/json',
      'Accept-Language': 'en-US',
      'Authorization': `Basic ${Buffer.from(`${this.config.apiKey}:${this.config.apiSecret}`).toString('base64')}`,
      'User-Agent': 'TravelPlatform/1.0',
    };
  }

  protected convertSearchParams(params: SearchParams): ApiSearchParams {
    const apiParams: ApiSearchParams = {
      rows: params.pageSize || 20,
      offset: ((params.page || 1) - 1) * (params.pageSize || 20),
      currency: 'USD',
      language: 'en',
    };

    // Location handling
    if (params.location.lat && params.location.lng) {
      apiParams.latitude = params.location.lat;
      apiParams.longitude = params.location.lng;
      apiParams.radius = params.location.radius || 25; // km
    } else if (params.location.city) {
      apiParams.dest_id = params.location.city; // Would need city ID lookup
      apiParams.dest_type = 'city';
    }

    // Date handling
    if (params.dateRange) {
      apiParams.checkin = params.dateRange.startDate.toISOString().split('T')[0];
      apiParams.checkout = params.dateRange.endDate.toISOString().split('T')[0];
    }

    // Filters
    if (params.filters) {
      if (params.filters.minPrice) {
        apiParams.price_min = params.filters.minPrice;
      }
      if (params.filters.maxPrice) {
        apiParams.price_max = params.filters.maxPrice;
      }
      if (params.filters.minRating) {
        apiParams.review_score_min = params.filters.minRating * 2; // Booking uses 0-10 scale
      }
      if (params.filters.amenities?.length) {
        apiParams.facility_ids = params.filters.amenities.join(',');
      }
    }

    // Sorting
    if (params.sortBy) {
      const sortMap: Record<string, string> = {
        price: 'price',
        rating: 'review_score',
        popularity: 'popularity',
        distance: 'distance',
      };
      apiParams.order = sortMap[params.sortBy] || 'popularity';
    }

    return apiParams;
  }

  normalizeResponse(rawData: any): NormalizedListing[] {
    if (!rawData || !rawData.result || !Array.isArray(rawData.result)) {
      return [];
    }

    return rawData.result.map((item: any) => this.normalizeHotel(item));
  }

  private normalizeHotel(hotel: any): NormalizedListing {
    const priceInfo = this.normalizePrice(
      hotel.min_total_price || hotel.price_breakdown?.gross_price,
      hotel.currency
    );

    const listing: NormalizedListing = {
      id: this.generateListingId(hotel.hotel_id),
      source: ListingSource.BOOKING,
      externalId: hotel.hotel_id,
      serviceType: ServiceType.HOTELS,
      title: hotel.hotel_name || hotel.name,
      description: hotel.hotel_description || hotel.description,
      location: {
        lat: hotel.latitude || 0,
        lng: hotel.longitude || 0,
        address: hotel.address,
        city: hotel.city || '',
        state: hotel.state,
        country: hotel.country_trans || hotel.country || '',
        postalCode: hotel.zip,
      },
      rating: this.normalizeRating(hotel.review_score),
      reviewCount: hotel.review_nr || 0,
      price: priceInfo.price,
      currency: priceInfo.currency,
      priceUnit: 'per night',
      images: this.extractImages(hotel.photos || hotel.main_photo_url),
      thumbnailUrl: hotel.main_photo_url,
      url: hotel.url || `https://www.booking.com/hotel/${hotel.hotel_id}.html`,
      amenities: this.extractAmenities(hotel),
      metadata: {
        starRating: hotel.class || hotel.star_rating,
        propertyType: hotel.accommodation_type_name,
        checkIn: hotel.checkin?.from,
        checkOut: hotel.checkout?.until,
        facilities: hotel.facilities || [],
        policies: {
          cancellation: hotel.cancellation_policy,
          prepayment: hotel.prepayment_policy,
          children: hotel.children_policy,
          pets: hotel.pets_policy,
        },
        roomTypes: hotel.room_types || [],
        distanceToCenter: hotel.distance,
        nearbyAttractions: hotel.nearby_attractions || [],
      },
      score: this.calculateHotelScore(hotel),
    };

    return listing;
  }

  private extractAmenities(hotel: any): Record<string, boolean> {
    const amenities: Record<string, boolean> = {};
    const facilities = hotel.facilities || [];

    // Map common Booking.com facility IDs to amenities
    const facilityMap: Record<string, string> = {
      '2': 'airConditioning',
      '8': 'parking',
      '16': 'wifi',
      '17': 'pool',
      '22': 'restaurant',
      '25': 'roomService',
      '28': 'elevator',
      '33': 'spa',
      '47': 'fitnessCenter',
      '51': 'businessCenter',
      '53': 'petFriendly',
      '96': 'wheelchairAccessible',
      '107': 'concierge',
      '126': 'laundry',
      '134': 'bar',
      '162': 'breakfast',
      '182': 'beachfront',
    };

    facilities.forEach((facility: any) => {
      const facilityId = facility.facilitytype_id || facility.id;
      const amenityKey = facilityMap[facilityId];
      if (amenityKey) {
        amenities[amenityKey] = true;
      }
    });

    // Additional amenities based on other fields
    if (hotel.is_free_cancellable) {
      amenities.freeCancellation = true;
    }
    if (hotel.is_genius_deal) {
      amenities.specialOffer = true;
    }
    if (hotel.is_mobile_deal) {
      amenities.mobileExclusive = true;
    }

    return amenities;
  }

  private calculateHotelScore(hotel: any): number {
    let score = 0;

    // Base on rating (0-50 points)
    const rating = this.normalizeRating(hotel.review_score);
    if (rating) {
      score += rating * 10;
    }

    // Review count (0-20 points)
    const reviewCount = hotel.review_nr || 0;
    if (reviewCount > 0) {
      score += Math.min(20, Math.log10(reviewCount) * 10);
    }

    // Star rating (0-10 points)
    const starRating = hotel.class || hotel.star_rating || 0;
    score += starRating * 2;

    // Special indicators (0-15 points)
    if (hotel.is_genius_deal) score += 5;
    if (hotel.is_free_cancellable) score += 3;
    if (hotel.is_mobile_deal) score += 3;
    if (hotel.genius_discount_percentage > 0) score += 4;

    // Content quality (0-5 points)
    if (hotel.photos?.length > 5) score += 2;
    if (hotel.hotel_description?.length > 200) score += 3;

    return Math.min(100, score);
  }

  async isHealthy(): Promise<boolean> {
    try {
      const response = await this.axiosInstance.get('/hotels', {
        params: { rows: 1, dest_type: 'city', dest_id: '1' },
        timeout: 5000,
      });
      return response.status === 200;
    } catch {
      return false;
    }
  }
}