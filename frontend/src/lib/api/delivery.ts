import { apiClient } from './client';
import {
  DeliveryOrder,
  Driver,
  DeliveryTracking,
  Review,
  DeliveryOrdersResponse,
  DriverSearchResponse,
  ReviewsResponse,
  OrderStatus,
  DeliveryAddress,
  PromoCode,
  Location
} from '@/types/delivery';

export interface CreateOrderRequest {
  restaurantId: string;
  items: Array<{
    menuItemId: string;
    quantity: number;
    customizations?: Array<{
      name: string;
      value: string;
      price?: number;
    }>;
  }>;
  deliveryAddress: DeliveryAddress;
  paymentMethod: string;
  specialInstructions?: string;
  scheduledFor?: string;
  promoCode?: string;
  tip: number;
}

export interface DriverLocationUpdate {
  latitude: number;
  longitude: number;
  accuracy?: number;
}

export const deliveryService = {
  // Order Management
  async createOrder(orderData: CreateOrderRequest): Promise<DeliveryOrder> {
    return await apiClient.post('/delivery/orders', orderData);
  },

  async getOrder(orderId: string): Promise<DeliveryOrder> {
    return await apiClient.get(`/delivery/orders/${orderId}`);
  },

  async getUserOrders(params?: {
    status?: OrderStatus;
    limit?: number;
    offset?: number;
  }): Promise<DeliveryOrdersResponse> {
    const queryParams = new URLSearchParams();
    if (params?.status) queryParams.append('status', params.status);
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.offset) queryParams.append('offset', params.offset.toString());
    
    return await apiClient.get(`/delivery/orders/user?${queryParams}`);
  },

  async cancelOrder(orderId: string, reason?: string): Promise<void> {
    await apiClient.post(`/delivery/orders/${orderId}/cancel`, { reason });
  },

  async updateOrderStatus(orderId: string, status: OrderStatus): Promise<DeliveryOrder> {
    return await apiClient.patch(`/delivery/orders/${orderId}/status`, { status });
  },

  // Order Tracking
  async trackOrder(orderId: string): Promise<DeliveryTracking> {
    return await apiClient.get(`/delivery/orders/${orderId}/tracking`);
  },

  async getEstimatedDeliveryTime(restaurantId: string, deliveryAddress: DeliveryAddress): Promise<{
    prepTime: number;
    deliveryTime: number;
    totalTime: number;
  }> {
    return await apiClient.post('/delivery/estimate-time', {
      restaurantId,
      deliveryAddress
    });
  },

  // Driver Management
  async searchDrivers(params: {
    location: Location;
    radius?: number;
    vehicleType?: string;
  }): Promise<DriverSearchResponse> {
    return await apiClient.post('/delivery/drivers/search', params);
  },

  async assignDriver(orderId: string, driverId?: string): Promise<DeliveryOrder> {
    return await apiClient.post(`/delivery/orders/${orderId}/assign-driver`, {
      driverId
    });
  },

  async getDriver(driverId: string): Promise<Driver> {
    return await apiClient.get(`/delivery/drivers/${driverId}`);
  },

  async updateDriverLocation(location: DriverLocationUpdate): Promise<void> {
    await apiClient.post('/delivery/drivers/location', location);
  },

  async setDriverAvailability(isAvailable: boolean): Promise<void> {
    await apiClient.patch('/delivery/drivers/availability', { isAvailable });
  },

  // Driver Orders (for driver app)
  async getDriverOrders(params?: {
    status?: OrderStatus;
    limit?: number;
  }): Promise<DeliveryOrdersResponse> {
    const queryParams = new URLSearchParams();
    if (params?.status) queryParams.append('status', params.status);
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    
    return await apiClient.get(`/delivery/drivers/orders?${queryParams}`);
  },

  async acceptOrder(orderId: string): Promise<DeliveryOrder> {
    return await apiClient.post(`/delivery/orders/${orderId}/accept`);
  },

  async rejectOrder(orderId: string, reason?: string): Promise<void> {
    await apiClient.post(`/delivery/orders/${orderId}/reject`, { reason });
  },

  // Reviews and Ratings
  async createReview(reviewData: {
    orderId: string;
    revieweeId: string;
    revieweeType: 'restaurant' | 'driver';
    rating: number;
    title?: string;
    comment?: string;
    aspects?: Array<{ name: string; rating: number }>;
    photos?: string[];
  }): Promise<Review> {
    return await apiClient.post('/delivery/reviews', reviewData);
  },

  async getReviews(params: {
    revieweeId: string;
    revieweeType: 'restaurant' | 'driver';
    limit?: number;
    offset?: number;
  }): Promise<ReviewsResponse> {
    const queryParams = new URLSearchParams();
    queryParams.append('revieweeId', params.revieweeId);
    queryParams.append('revieweeType', params.revieweeType);
    if (params.limit) queryParams.append('limit', params.limit.toString());
    if (params.offset) queryParams.append('offset', params.offset.toString());
    
    return await apiClient.get(`/delivery/reviews?${queryParams}`);
  },

  async updateReview(reviewId: string, updates: {
    rating?: number;
    title?: string;
    comment?: string;
    aspects?: Array<{ name: string; rating: number }>;
  }): Promise<Review> {
    return await apiClient.patch(`/delivery/reviews/${reviewId}`, updates);
  },

  async markReviewHelpful(reviewId: string): Promise<void> {
    await apiClient.post(`/delivery/reviews/${reviewId}/helpful`);
  },

  async respondToReview(reviewId: string, response: string): Promise<Review> {
    return await apiClient.post(`/delivery/reviews/${reviewId}/respond`, {
      response
    });
  },

  // Promo Codes
  async validatePromoCode(code: string, restaurantId: string, orderAmount: number): Promise<{
    isValid: boolean;
    discount: number;
    promoCode?: PromoCode;
    error?: string;
  }> {
    return await apiClient.post('/delivery/promo-codes/validate', {
      code,
      restaurantId,
      orderAmount
    });
  },

  // Address Management
  async saveAddress(address: DeliveryAddress): Promise<DeliveryAddress> {
    return await apiClient.post('/delivery/addresses', address);
  },

  async getUserAddresses(): Promise<DeliveryAddress[]> {
    return await apiClient.get('/delivery/addresses');
  },

  async updateAddress(addressId: string, updates: Partial<DeliveryAddress>): Promise<DeliveryAddress> {
    return await apiClient.patch(`/delivery/addresses/${addressId}`, updates);
  },

  async deleteAddress(addressId: string): Promise<void> {
    await apiClient.delete(`/delivery/addresses/${addressId}`);
  },

  // Restaurant Integration
  async getRestaurantOrders(restaurantId: string, params?: {
    status?: OrderStatus;
    date?: string;
    limit?: number;
  }): Promise<DeliveryOrdersResponse> {
    const queryParams = new URLSearchParams();
    if (params?.status) queryParams.append('status', params.status);
    if (params?.date) queryParams.append('date', params.date);
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    
    return await apiClient.get(`/delivery/restaurants/${restaurantId}/orders?${queryParams}`);
  },

  async updatePreparationTime(orderId: string, estimatedMinutes: number): Promise<void> {
    await apiClient.patch(`/delivery/orders/${orderId}/prep-time`, {
      estimatedMinutes
    });
  },

  async markOrderReady(orderId: string): Promise<DeliveryOrder> {
    return await apiClient.post(`/delivery/orders/${orderId}/ready`);
  },

  // Analytics and Reports
  async getDeliveryAnalytics(params: {
    restaurantId?: string;
    driverId?: string;
    startDate: string;
    endDate: string;
  }): Promise<{
    totalOrders: number;
    totalRevenue: number;
    averageRating: number;
    averageDeliveryTime: number;
    topItems: Array<{ name: string; count: number }>;
    ordersByHour: Array<{ hour: number; count: number }>;
    ratingTrends: Array<{ date: string; rating: number }>;
  }> {
    return await apiClient.post('/delivery/analytics', params);
  }
};

export default deliveryService;