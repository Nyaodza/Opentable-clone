export enum ServiceType {
  ACTIVITIES = 'activities',
  CAR_RENTALS = 'car_rentals',
  CRUISES = 'cruises',
  EVENTS = 'events',
  FLIGHTS = 'flights',
  HOTELS = 'hotels',
  NIGHTLIFE = 'nightlife',
  RESTAURANTS = 'restaurants',
  TOURS = 'tours',
  VACATION_RENTALS = 'vacation_rentals',
}

export enum ListingSource {
  LOCAL = 'local',
  VIATOR = 'viator',
  GETYOURGUIDE = 'getyourguide',
  TRAVELPAYOUTS = 'travelpayouts',
  DISCOVERCARS = 'discovercars',
  RENTALCARS = 'rentalcars',
  CRUISEDIRECT = 'cruisedirect',
  EXPEDIA = 'expedia',
  GOTOSEA = 'gotosea',
  EVENTBRITE = 'eventbrite',
  TICKETMASTER = 'ticketmaster',
  KIWI = 'kiwi',
  SKYSCANNER = 'skyscanner',
  BOOKING = 'booking',
  OPENTABLE = 'opentable',
  VRBO = 'vrbo',
}

export interface Location {
  lat: number;
  lng: number;
  address?: string;
  city: string;
  state?: string;
  country: string;
  postalCode?: string;
}

export interface NormalizedListing {
  id: string;
  source: ListingSource;
  externalId: string;
  serviceType: ServiceType;
  title: string;
  description?: string;
  location: Location;
  rating?: number;
  reviewCount?: number;
  price?: number;
  currency?: string;
  priceUnit?: string;
  images: string[];
  thumbnailUrl?: string;
  url: string;
  amenities?: Record<string, boolean>;
  metadata?: {
    duration?: string;
    capacity?: number;
    category?: string;
    subcategory?: string;
    tags?: string[];
    highlights?: string[];
    cancellationPolicy?: string;
    instantConfirmation?: boolean;
    mobileTicket?: boolean;
    languages?: string[];
    openingHours?: Record<string, string>;
    checkIn?: string;
    checkOut?: string;
    departureTime?: string;
    arrivalTime?: string;
    vehicleType?: string;
    shipName?: string;
    eventDate?: Date;
    [key: string]: any;
  };
  score?: number;
  availableFrom?: Date;
  availableUntil?: Date;
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

export interface ProviderStatus {
  name: string;
  enabled: boolean;
  healthy: boolean;
  quota: {
    used: number;
    limit: number;
    resetAt: Date;
  };
}