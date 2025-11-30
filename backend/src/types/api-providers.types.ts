import { ServiceType, ListingSource } from '../models/UnifiedListing';

export interface ApiProviderConfig {
  name: string;
  source: ListingSource;
  enabled: boolean;
  apiKey?: string;
  apiSecret?: string;
  baseUrl: string;
  maxListingsPerRequest: number;
  timeout: number;
  retryAttempts: number;
  cacheTTL: number;
  rateLimit: {
    maxRequests: number;
    windowMs: number;
  };
}

export interface SearchParams {
  serviceType: ServiceType;
  location: {
    city?: string;
    country?: string;
    lat?: number;
    lng?: number;
    radius?: number;
  };
  dateRange?: {
    startDate: Date;
    endDate: Date;
  };
  page?: number;
  pageSize?: number;
  filters?: {
    minPrice?: number;
    maxPrice?: number;
    minRating?: number;
    amenities?: string[];
    categories?: string[];
    instantConfirmation?: boolean;
    [key: string]: any;
  };
  sortBy?: 'price' | 'rating' | 'distance' | 'popularity';
  sortOrder?: 'asc' | 'desc';
}

export interface ApiSearchParams {
  query?: string;
  location?: {
    lat: number;
    lng: number;
    radius?: number;
  };
  // Location fields used by different providers
  latitude?: number;
  longitude?: number;
  radius?: number;
  dest_id?: string;
  dest_type?: string;
  destinationString?: string;
  searchRadius?: number;
  searchRadiusUnit?: string;
  // Date fields
  startDate?: string;
  endDate?: string;
  from?: string;
  to?: string;
  checkin?: string;
  checkout?: string;
  arrivalDate?: string;
  departureDate?: string;
  // Guest fields
  adults?: number;
  children?: number;
  // Common fields
  currency?: string;
  locale?: string;
  language?: string;
  limit?: number;
  offset?: number;
  rows?: number;
  resultsPerPage?: number;
  pageIndex?: number;
  // Price filters
  min_price?: number;
  max_price?: number;
  price_min?: number;
  price_max?: number;
  minRate?: number;
  maxRate?: number;
  // Rating filters
  rating?: number;
  review_score_min?: number;
  minStarRating?: number;
  // Other filters
  categories?: string;
  facility_ids?: string;
  amenities?: string;
  // Sorting
  sort?: string;
  order?: string;
  // Allow any additional provider-specific fields
  [key: string]: any;
}

export interface NormalizedListing {
  id: string;
  source: ListingSource;
  externalId: string;
  serviceType: ServiceType;
  title: string;
  description?: string;
  location: {
    lat: number;
    lng: number;
    address?: string;
    city: string;
    state?: string;
    country: string;
    postalCode?: string;
  };
  rating?: number;
  reviewCount?: number;
  price?: number;
  currency?: string;
  priceUnit?: string;
  images: string[];
  thumbnailUrl?: string;
  url: string;
  amenities?: Record<string, boolean>;
  metadata?: Record<string, any>;
  score?: number;
  availableFrom?: Date;
  availableUntil?: Date;
}

export interface ApiProviderResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  totalCount?: number;
  hasMore?: boolean;
  nextPage?: string | number;
}

export interface ApiProvider {
  config: ApiProviderConfig;
  searchListings(params: SearchParams): Promise<ApiProviderResponse<NormalizedListing[]>>;
  normalizeResponse(rawData: any): NormalizedListing[];
  isHealthy(): Promise<boolean>;
  getQuota(): Promise<{ used: number; limit: number; resetAt: Date }>;
}

export interface ServiceTypeProviders {
  [ServiceType.ACTIVITIES]: ApiProvider[];
  [ServiceType.CAR_RENTALS]: ApiProvider[];
  [ServiceType.CRUISES]: ApiProvider[];
  [ServiceType.EVENTS]: ApiProvider[];
  [ServiceType.FLIGHTS]: ApiProvider[];
  [ServiceType.HOTELS]: ApiProvider[];
  [ServiceType.NIGHTLIFE]: ApiProvider[];
  [ServiceType.RESTAURANTS]: ApiProvider[];
  [ServiceType.TOURS]: ApiProvider[];
  [ServiceType.VACATION_RENTALS]: ApiProvider[];
}

export interface CombinedListingsResponse {
  totalCount: number;
  items: NormalizedListing[];
  page: number;
  pageSize: number;
  hasMore: boolean;
  sources: {
    local: number;
    api: Record<string, number>;
  };
}