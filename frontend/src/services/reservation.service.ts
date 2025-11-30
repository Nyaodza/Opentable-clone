import axiosInstance from '@/lib/axios'

export interface Reservation {
  id: string
  userId: string
  restaurantId: string
  restaurantName: string
  tableId?: string
  dateTime: string
  partySize: number
  status: 'pending' | 'confirmed' | 'seated' | 'completed' | 'cancelled' | 'no_show'
  specialRequests?: string
  confirmationCode: string
  totalAmount?: number
  depositAmount?: number
  user?: {
    firstName: string
    lastName: string
    email: string
    phone: string
  }
  restaurant?: {
    name: string
    address: string
    city: string
    phone: string
  }
}

export interface CreateReservationData {
  restaurantId: string
  dateTime: string
  partySize: number
  specialRequests?: string
  tableId?: string
  guestInfo?: {
    firstName: string
    lastName: string
    email: string
    phone: string
  }
}

export interface AvailabilitySlot {
  time: string
  available: boolean
  tableId?: string
}

export const reservationService = {
  async create(data: CreateReservationData): Promise<Reservation> {
    const response = await axiosInstance.post('/reservations', data)
    return response.data
  },

  async getById(id: string): Promise<Reservation> {
    const { data } = await axiosInstance.get(`/reservations/${id}`)
    return data
  },

  async getMyReservations(params?: {
    status?: string
    startDate?: string
    endDate?: string
    page?: number
    limit?: number
  }) {
    const { data } = await axiosInstance.get('/reservations/my', { params })
    return data
  },

  async cancel(id: string, reason?: string): Promise<Reservation> {
    const { data } = await axiosInstance.post(`/reservations/${id}/cancel`, { reason })
    return data
  },

  async confirm(id: string): Promise<Reservation> {
    const { data } = await axiosInstance.post(`/reservations/${id}/confirm`)
    return data
  },

  async checkAvailability(
    restaurantId: string,
    date: string,
    partySize: number,
    time?: string
  ): Promise<AvailabilitySlot[]> {
    const { data } = await axiosInstance.get(`/restaurants/${restaurantId}/availability`, {
      params: { date, partySize, time },
    })
    return data.slots
  },

  // Restaurant owner endpoints
  async getRestaurantReservations(
    restaurantId: string,
    params?: {
      date?: string
      status?: string
      page?: number
      limit?: number
    }
  ) {
    const { data } = await axiosInstance.get(`/restaurants/${restaurantId}/reservations`, {
      params,
    })
    return data
  },

  async updateStatus(
    id: string,
    status: 'confirmed' | 'seated' | 'completed' | 'cancelled' | 'no_show'
  ): Promise<Reservation> {
    const { data } = await axiosInstance.put(`/reservations/${id}/status`, { status })
    return data
  },

  async markAsSeated(id: string): Promise<Reservation> {
    const { data } = await axiosInstance.post(`/reservations/${id}/seat`)
    return data
  },

  async markAsCompleted(id: string): Promise<Reservation> {
    const { data } = await axiosInstance.post(`/reservations/${id}/complete`)
    return data
  },

  async markAsNoShow(id: string): Promise<Reservation> {
    const { data } = await axiosInstance.post(`/reservations/${id}/no-show`)
    return data
  },
}