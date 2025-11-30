import { apiClient } from './client';

export interface Restaurant {
  id: string;
  name: string;
  description: string;
  cuisineType: string;
  priceRange: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  phone: string;
  email: string;
  website?: string;
  latitude?: number;
  longitude?: number;
  images: string[];
  logo?: string;
  coverImage?: string;
  features: string[];
  amenities: string[];
  dietaryRestrictions: string[];
  averageRating: number;
  totalReviews: number;
  totalReservations: number;
  isActive: boolean;
  isVerified: boolean;
  operatingHours?: {
    [key: string]: {
      openTime: string;
      closeTime: string;
      isClosed: boolean;
    };
  };
}

export interface RestaurantSearchParams {
  query?: string;
  cuisine?: string;
  priceRange?: string;
  location?: string;
  rating?: number;
  features?: string[];
  date?: string;
  time?: string;
  partySize?: number;
  latitude?: number;
  longitude?: number;
  radius?: number;
  page?: number;
  limit?: number;
}

export interface AvailabilitySlot {
  time: string;
  available: boolean;
  seatsAvailable?: number;
}

export const restaurantService = {
  async getRestaurants(params?: Partial<RestaurantSearchParams>): Promise<Restaurant[]> {
    return await apiClient.get('/restaurants', params);
  },

  async getRestaurant(id: string): Promise<Restaurant> {
    return await apiClient.get(`/restaurants/${id}`);
  },

  async searchRestaurants(params: RestaurantSearchParams): Promise<{
    restaurants: Restaurant[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    return await apiClient.get('/restaurants/search', params);
  },

  async getAvailableSlots(
    restaurantId: string,
    date: string,
    partySize: number
  ): Promise<AvailabilitySlot[]> {
    return await apiClient.get(
      `/restaurants/${restaurantId}/availability`,
      { date, partySize }
    );
  },

  async getFeaturedRestaurants(): Promise<Restaurant[]> {
    return await apiClient.get('/restaurants/featured');
  },

  async getNearbyRestaurants(
    latitude: number,
    longitude: number,
    radius = 10
  ): Promise<Restaurant[]> {
    return await apiClient.get('/restaurants/nearby', {
      latitude,
      longitude,
      radius,
    });
  },

  async getRestaurantReviews(restaurantId: string, page = 1, limit = 10) {
    return await apiClient.get(`/restaurants/${restaurantId}/reviews`, {
      page,
      limit,
    });
  },

  async addReview(restaurantId: string, review: {
    rating: number;
    comment: string;
    photos?: string[];
  }) {
    return await apiClient.post(`/restaurants/${restaurantId}/reviews`, review);
  },

  async getRestaurantMenu(restaurantId: string) {
    return await apiClient.get(`/restaurants/${restaurantId}/menu`);
  },

  async reportRestaurant(restaurantId: string, reason: string, details: string) {
    return await apiClient.post(`/restaurants/${restaurantId}/report`, {
      reason,
      details,
    });
  },
};