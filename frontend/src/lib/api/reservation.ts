import { apiClient } from './client';

export interface CreateReservationDto {
  restaurantId: string;
  date: string;
  time: string;
  partySize: number;
  specialRequests?: string;
  dietaryRestrictions?: string[];
  occasionType?: 'birthday' | 'anniversary' | 'business' | 'date' | 'celebration' | 'other';
  contactInfo?: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
  };
}

export interface Reservation {
  id: string;
  userId: string;
  restaurantId: string;
  date: string;
  time: string;
  partySize: number;
  specialRequests?: string;
  dietaryRestrictions?: string[];
  occasionType?: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'no_show';
  confirmationCode: string;
  totalAmount: number;
  depositAmount: number;
  depositPaid: boolean;
  paymentStatus: 'pending' | 'paid' | 'refunded' | 'failed';
  restaurant: {
    id: string;
    name: string;
    address: string;
    city: string;
    state: string;
    phone: string;
    email: string;
    cuisineType: string;
    priceRange: string;
    images: string[];
  };
  user?: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
  };
  cancellationReason?: string;
  cancellationPolicy?: {
    cutoffHours: number;
    refundPercentage: number;
  };
  remindersSent: boolean;
  checkInTime?: string;
  checkOutTime?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ReservationSearchParams {
  status?: string;
  upcoming?: boolean;
  past?: boolean;
  date?: string;
  restaurantId?: string;
  page?: number;
  limit?: number;
}

export const reservationService = {
  async createReservation(data: CreateReservationDto): Promise<Reservation> {
    return await apiClient.post('/reservations', data);
  },

  async getReservation(id: string): Promise<Reservation> {
    return await apiClient.get(`/reservations/${id}`);
  },

  async getUserReservations(params?: ReservationSearchParams): Promise<{
    reservations: Reservation[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    return await apiClient.get('/reservations/user', params);
  },

  async cancelReservation(id: string, reason?: string): Promise<{
    success: boolean;
    refundAmount?: number;
    refundMethod?: string;
  }> {
    return await apiClient.post(`/reservations/${id}/cancel`, { reason });
  },

  async updateReservation(
    id: string,
    data: Partial<CreateReservationDto>
  ): Promise<Reservation> {
    return await apiClient.patch(`/reservations/${id}`, data);
  },

  async confirmReservation(id: string): Promise<Reservation> {
    return await apiClient.post(`/reservations/${id}/confirm`);
  },

  async checkInReservation(id: string): Promise<Reservation> {
    return await apiClient.post(`/reservations/${id}/checkin`);
  },

  async noShowReservation(id: string): Promise<Reservation> {
    return await apiClient.post(`/reservations/${id}/no-show`);
  },

  async getReservationByConfirmationCode(code: string): Promise<Reservation> {
    return await apiClient.get(`/reservations/lookup/${code}`);
  },

  async sendReservationReminder(id: string): Promise<{ success: boolean }> {
    return await apiClient.post(`/reservations/${id}/reminder`);
  },

  async getReservationHistory(params?: {
    page?: number;
    limit?: number;
    startDate?: string;
    endDate?: string;
  }): Promise<{
    reservations: Reservation[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    return await apiClient.get('/reservations/history', params);
  },

  async rateReservation(id: string, rating: {
    foodRating: number;
    serviceRating: number;
    ambienceRating: number;
    valueRating: number;
    overallRating: number;
    comment?: string;
    photos?: string[];
  }): Promise<{ success: boolean }> {
    return await apiClient.post(`/reservations/${id}/rate`, rating);
  },
};