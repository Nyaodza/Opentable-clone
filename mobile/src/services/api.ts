const API_BASE_URL = 'http://localhost:3001/api';

interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

class ApiService {
  private baseURL: string;
  private authToken: string | null = null;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }

  setAuthToken(token: string | null) {
    this.authToken = token;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.authToken) {
      headers.Authorization = `Bearer ${this.authToken}`;
    }

    const config: RequestInit = {
      ...options,
      headers,
    };

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('API Request Error:', error);
      throw error;
    }
  }

  async get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  async post<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async put<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }

  async uploadImage(endpoint: string, imageUri: string): Promise<any> {
    const formData = new FormData();
    formData.append('image', {
      uri: imageUri,
      type: 'image/jpeg',
      name: 'image.jpg',
    } as any);

    const headers: HeadersInit = {};
    if (this.authToken) {
      headers.Authorization = `Bearer ${this.authToken}`;
    }

    const response = await fetch(`${this.baseURL}${endpoint}`, {
      method: 'POST',
      headers,
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Upload failed: ${response.status}`);
    }

    return response.json();
  }
}

export const apiService = new ApiService(API_BASE_URL);

// Auth API
export const authApi = {
  login: (email: string, password: string) =>
    apiService.post('/auth/login', { email, password }),
  register: (userData: any) =>
    apiService.post('/auth/register', userData),
  forgotPassword: (email: string) =>
    apiService.post('/auth/forgot-password', { email }),
  resetPassword: (token: string, password: string) =>
    apiService.post('/auth/reset-password', { token, password }),
  refreshToken: () =>
    apiService.post('/auth/refresh'),
};

// Restaurant API
export const restaurantApi = {
  getRestaurants: (params?: any) =>
    apiService.get(`/restaurants${params ? `?${new URLSearchParams(params)}` : ''}`),
  getRestaurantById: (id: string) =>
    apiService.get(`/restaurants/${id}`),
  searchRestaurants: (query: string, filters?: any) =>
    apiService.get(`/restaurants/search?q=${query}${filters ? `&${new URLSearchParams(filters)}` : ''}`),
  getNearbyRestaurants: (lat: number, lng: number, radius?: number) =>
    apiService.get(`/restaurants/nearby?lat=${lat}&lng=${lng}${radius ? `&radius=${radius}` : ''}`),
  getRestaurantAvailability: (id: string, date: string, time: string, partySize: number) =>
    apiService.get(`/restaurants/${id}/availability?date=${date}&time=${time}&partySize=${partySize}`),
};

// Reservation API
export const reservationApi = {
  createReservation: (reservationData: any) =>
    apiService.post('/reservations', reservationData),
  getMyReservations: (params?: any) =>
    apiService.get(`/reservations/my${params ? `?${new URLSearchParams(params)}` : ''}`),
  getReservationById: (id: string) =>
    apiService.get(`/reservations/${id}`),
  updateReservation: (id: string, data: any) =>
    apiService.put(`/reservations/${id}`, data),
  cancelReservation: (id: string, reason?: string) =>
    apiService.delete(`/reservations/${id}${reason ? `?reason=${encodeURIComponent(reason)}` : ''}`),
};

// Review API
export const reviewApi = {
  createReview: (reviewData: any, photos?: string[]) =>
    apiService.post('/reviews', { ...reviewData, photos }),
  getRestaurantReviews: (restaurantId: string, params?: any) =>
    apiService.get(`/reviews/restaurant/${restaurantId}${params ? `?${new URLSearchParams(params)}` : ''}`),
  getMyReviews: () =>
    apiService.get('/reviews/my'),
  updateReview: (id: string, data: any) =>
    apiService.put(`/reviews/${id}`, data),
  deleteReview: (id: string) =>
    apiService.delete(`/reviews/${id}`),
  markHelpful: (id: string) =>
    apiService.post(`/reviews/${id}/helpful`),
};

// User API
export const userApi = {
  getProfile: () =>
    apiService.get('/users/profile'),
  updateProfile: (data: any) =>
    apiService.put('/users/profile', data),
  uploadAvatar: (imageUri: string) =>
    apiService.uploadImage('/users/avatar', imageUri),
  getNotifications: () =>
    apiService.get('/users/notifications'),
  markNotificationRead: (id: string) =>
    apiService.put(`/users/notifications/${id}/read`),
};

// Waitlist API
export const waitlistApi = {
  joinWaitlist: (data: any) =>
    apiService.post('/waitlist', data),
  getMyWaitlistEntries: () =>
    apiService.get('/waitlist/my'),
  updateWaitlistEntry: (id: string, data: any) =>
    apiService.put(`/waitlist/${id}`, data),
  cancelWaitlistEntry: (id: string) =>
    apiService.delete(`/waitlist/${id}`),
};

// Loyalty API
export const loyaltyApi = {
  getBalance: () =>
    apiService.get('/loyalty/balance'),
  getTransactions: (params?: any) =>
    apiService.get(`/loyalty/transactions${params ? `?${new URLSearchParams(params)}` : ''}`),
  getRewards: () =>
    apiService.get('/loyalty/rewards'),
  redeemReward: (rewardId: string) =>
    apiService.post(`/loyalty/redeem/${rewardId}`),
  getMyRewards: () =>
    apiService.get('/loyalty/my-rewards'),
};

// Payment API
export const paymentApi = {
  getPaymentMethods: () =>
    apiService.get('/payments/methods'),
  addPaymentMethod: (paymentMethodData: any) =>
    apiService.post('/payments/methods', paymentMethodData),
  deletePaymentMethod: (id: string) =>
    apiService.delete(`/payments/methods/${id}`),
  setDefaultPaymentMethod: (id: string) =>
    apiService.put(`/payments/methods/${id}/default`),
  createPaymentIntent: (amount: number, currency = 'usd') =>
    apiService.post('/payments/create-intent', { amount, currency }),
};