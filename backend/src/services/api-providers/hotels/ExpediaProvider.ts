import { BaseApiProvider } from '../BaseApiProvider';
import {
  ApiSearchParams,
  NormalizedListing,
  SearchParams,
} from '../../../types/api-providers.types';
import { ServiceType, ListingSource } from '../../../models/UnifiedListing';

export class ExpediaProvider extends BaseApiProvider {
  protected getDefaultHeaders(): Record<string, string> {
    return {
      'Accept': 'application/json',
      'Accept-Language': 'en-US',
      'Authorization': `EAN APIKey=${this.config.apiKey},Signature=${this.generateSignature()}`,
      'User-Agent': 'TravelPlatform/1.0',
    };
  }

  private generateSignature(): string {
    // Simplified signature generation for Expedia API
    // In production, this would implement proper HMAC-SHA256 signature
    const timestamp = Math.floor(Date.now() / 1000);
    return Buffer.from(`${this.config.apiKey}:${this.config.apiSecret}:${timestamp}`).toString('base64');
  }

  protected convertSearchParams(params: SearchParams): ApiSearchParams {
    const apiParams: ApiSearchParams = {
      resultsPerPage: params.pageSize || 20,
      pageIndex: params.page || 1,
      currencyCode: 'USD',
      locale: 'en_US',
    };

    // Location handling
    if (params.location.lat && params.location.lng) {
      apiParams.latitude = params.location.lat;
      apiParams.longitude = params.location.lng;
      apiParams.searchRadius = params.location.radius || 25;
      apiParams.searchRadiusUnit = 'KM';
    } else if (params.location.city) {
      apiParams.destinationString = `${params.location.city}, ${params.location.country || ''}`.trim();
    }

    // Date handling
    if (params.dateRange) {
      apiParams.arrivalDate = params.dateRange.startDate.toISOString().split('T')[0];
      apiParams.departureDate = params.dateRange.endDate.toISOString().split('T')[0];
    }

    // Filters
    if (params.filters) {
      if (params.filters.minPrice) {
        apiParams.minRate = params.filters.minPrice;
      }
      if (params.filters.maxPrice) {
        apiParams.maxRate = params.filters.maxPrice;
      }
      if (params.filters.minRating) {
        apiParams.minStarRating = Math.floor(params.filters.minRating);
      }
      if (params.filters.amenities?.length) {
        apiParams.amenities = params.filters.amenities.join(',');
      }
    }

    // Sorting
    if (params.sortBy) {
      const sortMap: Record<string, string> = {
        price: 'PRICE',
        rating: 'STAR_RATING_HIGHEST_FIRST',
        popularity: 'POPULARITY',
        distance: 'PROXIMITY',
      };
      apiParams.sort = sortMap[params.sortBy] || 'POPULARITY';
    }

    return apiParams;
  }

  normalizeResponse(rawData: any): NormalizedListing[] {
    if (!rawData || !rawData.HotelListResponse?.HotelList?.HotelSummary) {
      return [];
    }

    const hotels = Array.isArray(rawData.HotelListResponse.HotelList.HotelSummary)
      ? rawData.HotelListResponse.HotelList.HotelSummary
      : [rawData.HotelListResponse.HotelList.HotelSummary];

    return hotels.map((item: any) => this.normalizeHotel(item));
  }

  private normalizeHotel(hotel: any): NormalizedListing {
    const priceInfo = this.normalizePrice(
      hotel.lowRate || hotel.RoomRateDetailsList?.RoomRateDetails?.RateInfos?.RateInfo?.ChargeableRateInfo?.total,
      hotel.rateCurrencyCode
    );

    const listing: NormalizedListing = {
      id: this.generateListingId(hotel.hotelId),
      source: ListingSource.EXPEDIA,
      externalId: hotel.hotelId,
      serviceType: ServiceType.HOTELS,
      title: hotel.name,
      description: hotel.shortDescription || hotel.locationDescription,
      location: {
        lat: hotel.latitude || 0,
        lng: hotel.longitude || 0,
        address: hotel.address1,
        city: hotel.city || '',
        state: hotel.stateProvinceCode,
        country: hotel.countryCode || '',
        postalCode: hotel.postalCode,
      },
      rating: this.normalizeRating(hotel.hotelRating),
      reviewCount: hotel.tripAdvisorRatingUrl ? 100 : 0, // Expedia doesn't always provide review count
      price: priceInfo.price,
      currency: priceInfo.currency,
      priceUnit: 'per night',
      images: this.extractImages(hotel.thumbNailUrl || hotel.mainHotelImage),
      thumbnailUrl: hotel.thumbNailUrl,
      url: hotel.deepLink || `https://www.expedia.com/h${hotel.hotelId}`,
      amenities: this.extractAmenities(hotel),
      metadata: {
        starRating: hotel.hotelRating,
        propertyType: hotel.propertyCategory,
        checkIn: hotel.checkInTime,
        checkOut: hotel.checkOutTime,
        policies: {
          cancellation: hotel.cancellationPolicy,
          deposit: hotel.depositPolicy,
        },
        propertyAmenities: hotel.PropertyAmenities || [],
        location: {
          landmark: hotel.landmark,
          confidenceRating: hotel.confidenceRating,
          supplierType: hotel.supplierType,
        },
        proximity: hotel.proximityDistance,
        promotions: hotel.RoomRateDetailsList?.RoomRateDetails?.RateInfos?.RateInfo?.Promos || [],
      },
      score: this.calculateHotelScore(hotel),
    };

    return listing;
  }

  private extractAmenities(hotel: any): Record<string, boolean> {
    const amenities: Record<string, boolean> = {};
    const propertyAmenities = hotel.PropertyAmenities || [];

    // Map Expedia amenity IDs to our amenities
    const amenityMap: Record<string, string> = {
      '1': 'businessCenter',
      '2': 'fitnessCenter',
      '3': 'pool',
      '4': 'spa',
      '5': 'restaurant',
      '6': 'bar',
      '7': 'roomService',
      '8': 'concierge',
      '9': 'laundry',
      '10': 'parking',
      '11': 'wifi',
      '12': 'airConditioning',
      '13': 'petFriendly',
      '14': 'wheelchairAccessible',
      '15': 'elevator',
      '16': 'breakfast',
    };

    propertyAmenities.forEach((amenity: any) => {
      const amenityId = amenity.amenityId || amenity.id;
      const amenityKey = amenityMap[amenityId];
      if (amenityKey) {
        amenities[amenityKey] = true;
      }
    });

    // Additional amenities based on other fields
    if (hotel.isECommerce) {
      amenities.instantBooking = true;
    }
    if (hotel.isOpaqueInventory === false) {
      amenities.transparentPricing = true;
    }

    return amenities;
  }

  private calculateHotelScore(hotel: any): number {
    let score = 0;

    // Base on star rating (0-50 points)
    const starRating = hotel.hotelRating || 0;
    score += starRating * 10;

    // Supplier confidence (0-20 points)
    const confidence = hotel.confidenceRating || 0;
    score += confidence * 4;

    // Special indicators (0-20 points)
    if (hotel.isECommerce) score += 5;
    if (hotel.isOpaqueInventory === false) score += 5;
    if (hotel.promotionalBadges?.length > 0) score += 5;
    if (hotel.lowRate && hotel.highRate && hotel.lowRate < hotel.highRate * 0.8) score += 5;

    // Content quality (0-10 points)
    if (hotel.shortDescription?.length > 100) score += 3;
    if (hotel.PropertyAmenities?.length > 5) score += 3;
    if (hotel.thumbNailUrl) score += 2;
    if (hotel.deepLink) score += 2;

    return Math.min(100, score);
  }

  async isHealthy(): Promise<boolean> {
    try {
      const response = await this.axiosInstance.get('/hotels/list', {
        params: {
          destinationString: 'New York',
          resultsPerPage: 1,
          currencyCode: 'USD',
        },
        timeout: 5000,
      });
      return response.status === 200;
    } catch {
      return false;
    }
  }
}