import { apiClient } from './client';

export interface UserProfile {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  role: 'diner' | 'restaurant_owner' | 'admin' | 'driver';
  profileImage?: string;
  loyaltyPoints: number;
  loyaltyTier: 'bronze' | 'silver' | 'gold' | 'platinum';
  preferences: {
    notifications?: {
      email: boolean;
      push: boolean;
      sms: boolean;
      marketing: boolean;
    };
    dietary?: string[];
    cuisinePreferences?: string[];
    priceRange?: string;
    location?: {
      city: string;
      state: string;
      country: string;
      latitude?: number;
      longitude?: number;
    };
  };
  dateOfBirth?: string;
  addresses?: Array<{
    id: string;
    type: 'home' | 'work' | 'other';
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
    isDefault: boolean;
  }>;
  paymentMethods?: Array<{
    id: string;
    type: 'card' | 'paypal' | 'apple_pay' | 'google_pay';
    last4?: string;
    brand?: string;
    isDefault: boolean;
  }>;
  socialConnections?: {
    google?: boolean;
    facebook?: boolean;
    apple?: boolean;
  };
  twoFactorEnabled: boolean;
  emailVerified: boolean;
  phoneVerified: boolean;
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DashboardStats {
  totalReservations: number;
  upcomingReservations: number;
  pastReservations: number;
  cancelledReservations: number;
  loyaltyPoints: number;
  loyaltyPointsEarned: number;
  loyaltyPointsRedeemed: number;
  favoriteRestaurants: number;
  totalSpent: number;
  averageSpending: number;
  lastReservationDate?: string;
  mostVisitedCuisine?: string;
  mostVisitedRestaurant?: string;
}

export interface UpdateProfileDto {
  firstName?: string;
  lastName?: string;
  phone?: string;
  dateOfBirth?: string;
  profileImage?: string;
  preferences?: {
    notifications?: {
      email: boolean;
      push: boolean;
      sms: boolean;
      marketing: boolean;
    };
    dietary?: string[];
    cuisinePreferences?: string[];
    priceRange?: string;
    location?: {
      city: string;
      state: string;
      country: string;
    };
  };
}

export interface AddressDto {
  type: 'home' | 'work' | 'other';
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  isDefault?: boolean;
}

export interface PaymentMethodDto {
  type: 'card';
  cardToken: string;
  isDefault?: boolean;
}

export const userService = {
  async getProfile(): Promise<UserProfile> {
    return await apiClient.get('/users/profile');
  },

  async updateProfile(data: UpdateProfileDto): Promise<UserProfile> {
    return await apiClient.patch('/users/profile', data);
  },

  async getDashboardStats(): Promise<DashboardStats> {
    return await apiClient.get('/users/dashboard-stats');
  },

  async changePassword(data: {
    currentPassword: string;
    newPassword: string;
  }): Promise<{ success: boolean }> {
    return await apiClient.post('/users/change-password', data);
  },

  async deleteAccount(password: string): Promise<{ success: boolean }> {
    return await apiClient.delete('/users/account', { password });
  },

  async uploadProfileImage(file: File): Promise<{ imageUrl: string }> {
    const formData = new FormData();
    formData.append('profileImage', file);
    return await apiClient.upload('/users/profile/image', formData);
  },

  async verifyEmail(token: string): Promise<{ success: boolean }> {
    return await apiClient.post('/users/verify-email', { token });
  },

  async resendEmailVerification(): Promise<{ success: boolean }> {
    return await apiClient.post('/users/resend-verification');
  },

  async verifyPhone(code: string): Promise<{ success: boolean }> {
    return await apiClient.post('/users/verify-phone', { code });
  },

  async sendPhoneVerification(): Promise<{ success: boolean }> {
    return await apiClient.post('/users/send-phone-verification');
  },

  async enableTwoFactor(): Promise<{ qrCode: string; backupCodes: string[] }> {
    return await apiClient.post('/users/2fa/enable');
  },

  async confirmTwoFactor(code: string): Promise<{ success: boolean }> {
    return await apiClient.post('/users/2fa/confirm', { code });
  },

  async disableTwoFactor(password: string): Promise<{ success: boolean }> {
    return await apiClient.post('/users/2fa/disable', { password });
  },

  // Address management
  async getAddresses(): Promise<UserProfile['addresses']> {
    return await apiClient.get('/users/addresses');
  },

  async addAddress(address: AddressDto): Promise<{ id: string }> {
    return await apiClient.post('/users/addresses', address);
  },

  async updateAddress(id: string, address: Partial<AddressDto>): Promise<{ success: boolean }> {
    return await apiClient.patch(`/users/addresses/${id}`, address);
  },

  async deleteAddress(id: string): Promise<{ success: boolean }> {
    return await apiClient.delete(`/users/addresses/${id}`);
  },

  async setDefaultAddress(id: string): Promise<{ success: boolean }> {
    return await apiClient.post(`/users/addresses/${id}/default`);
  },

  // Payment methods
  async getPaymentMethods(): Promise<UserProfile['paymentMethods']> {
    return await apiClient.get('/users/payment-methods');
  },

  async addPaymentMethod(method: PaymentMethodDto): Promise<{ id: string }> {
    return await apiClient.post('/users/payment-methods', method);
  },

  async deletePaymentMethod(id: string): Promise<{ success: boolean }> {
    return await apiClient.delete(`/users/payment-methods/${id}`);
  },

  async setDefaultPaymentMethod(id: string): Promise<{ success: boolean }> {
    return await apiClient.post(`/users/payment-methods/${id}/default`);
  },

  // Favorites
  async getFavoriteRestaurants(): Promise<Array<{ id: string; name: string; image: string; cuisineType: string }>> {
    return await apiClient.get('/users/favorites');
  },

  async addFavoriteRestaurant(restaurantId: string): Promise<{ success: boolean }> {
    return await apiClient.post('/users/favorites', { restaurantId });
  },

  async removeFavoriteRestaurant(restaurantId: string): Promise<{ success: boolean }> {
    return await apiClient.delete(`/users/favorites/${restaurantId}`);
  },

  // Loyalty points
  async getLoyaltyHistory(params?: { page?: number; limit?: number }): Promise<{
    transactions: Array<{
      id: string;
      type: 'earned' | 'redeemed';
      points: number;
      description: string;
      createdAt: string;
    }>;
    total: number;
    page: number;
    totalPages: number;
  }> {
    return await apiClient.get('/users/loyalty/history', params);
  },

  async redeemLoyaltyPoints(points: number, reward: string): Promise<{ success: boolean; code?: string }> {
    return await apiClient.post('/users/loyalty/redeem', { points, reward });
  },

  // Social connections
  async disconnectSocial(provider: 'google' | 'facebook' | 'apple'): Promise<{ success: boolean }> {
    return await apiClient.delete(`/users/social/${provider}`);
  },

  // Account export
  async exportData(): Promise<{ downloadUrl: string }> {
    return await apiClient.post('/users/export');
  },
};