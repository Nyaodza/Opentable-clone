import { apiClient } from './client'

export interface RestaurantStats {
  todayReservations: number
  weekReservations: number
  monthRevenue: number
  averageRating: number
  totalReviews: number
  occupancyRate: number
}

export interface TodayReservation {
  id: string
  time: string
  customerName: string
  partySize: number
  status: string
  specialRequests?: string
}

export interface WeeklyData {
  date: string
  reservations: number
  revenue: number
}

export interface RestaurantDetails {
  id: string
  name: string
  description: string
  cuisineType: string
  priceRange: string
  address: string
  city: string
  state: string
  phone: string
  email: string
  operatingHours: any
  features: string[]
  amenities: string[]
}

export const restaurantOwnerService = {
  async getMyRestaurants(): Promise<RestaurantDetails[]> {
    const response = await apiClient.get('/restaurant-owner/restaurants')
    return response
  },

  async getStats(restaurantId?: string): Promise<RestaurantStats> {
    const url = restaurantId 
      ? `/restaurant-owner/stats?restaurantId=${restaurantId}`
      : '/restaurant-owner/stats'
    const response = await apiClient.get(url)
    return response
  },

  async getTodayReservations(restaurantId?: string): Promise<TodayReservation[]> {
    const url = restaurantId
      ? `/restaurant-owner/reservations/today?restaurantId=${restaurantId}`
      : '/restaurant-owner/reservations/today'
    const response = await apiClient.get(url)
    return response
  },

  async getWeeklyData(restaurantId?: string): Promise<WeeklyData[]> {
    const url = restaurantId
      ? `/restaurant-owner/analytics/weekly?restaurantId=${restaurantId}`
      : '/restaurant-owner/analytics/weekly'
    const response = await apiClient.get(url)
    return response
  },

  async updateRestaurant(id: string, data: Partial<RestaurantDetails>): Promise<void> {
    await apiClient.patch(`/restaurant-owner/restaurants/${id}`, data)
  },

  async getReservations(params: {
    restaurantId?: string
    date?: string
    status?: string
  }): Promise<any[]> {
    const response = await apiClient.get('/restaurant-owner/reservations', { params })
    return response
  },

  async updateReservationStatus(
    reservationId: string,
    status: string
  ): Promise<void> {
    await apiClient.patch(`/restaurant-owner/reservations/${reservationId}/status`, {
      status,
    })
  },

  async getReviews(restaurantId?: string): Promise<any[]> {
    const url = restaurantId
      ? `/restaurant-owner/reviews?restaurantId=${restaurantId}`
      : '/restaurant-owner/reviews'
    const response = await apiClient.get(url)
    return response
  },

  async respondToReview(reviewId: string, response: string): Promise<void> {
    await apiClient.post(`/restaurant-owner/reviews/${reviewId}/respond`, {
      response,
    })
  },
}