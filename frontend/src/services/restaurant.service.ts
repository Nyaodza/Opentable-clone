import axiosInstance from '@/lib/axios'

export interface Restaurant {
  id: string
  name: string
  description: string
  cuisineType: string
  priceRange: string
  address: string
  city: string
  state: string
  zipCode: string
  country: string
  phone: string
  email: string
  website?: string
  images: string[]
  features: string[]
  amenities: string[]
  latitude?: number
  longitude?: number
  averageRating: number
  totalReviews: number
  isActive: boolean
  hours: RestaurantHours[]
}

export interface RestaurantHours {
  id: string
  dayOfWeek: string
  openTime: string
  closeTime: string
  isClosed: boolean
}

export interface SearchParams {
  query?: string
  cuisineType?: string
  priceRange?: string
  city?: string
  state?: string
  rating?: number
  features?: string[]
  amenities?: string[]
  latitude?: number
  longitude?: number
  radius?: number
  date?: string
  time?: string
  partySize?: number
  page?: number
  limit?: number
  sortBy?: string
}

export interface SearchResult {
  restaurants: Restaurant[]
  total: number
  page: number
  totalPages: number
  facets?: {
    cuisineTypes: { value: string; count: number }[]
    priceRanges: { value: string; count: number }[]
    cities: { value: string; count: number }[]
  }
}

export const restaurantService = {
  async search(params: SearchParams): Promise<SearchResult> {
    const { data } = await axiosInstance.get('/restaurants/search', { params })
    return data
  },

  async getById(id: string): Promise<Restaurant> {
    const { data } = await axiosInstance.get(`/restaurants/${id}`)
    return data
  },

  async getAvailability(id: string, date: string, partySize: number) {
    const { data } = await axiosInstance.get(`/restaurants/${id}/availability`, {
      params: { date, partySize },
    })
    return data
  },

  async getReviews(id: string, page = 1, limit = 10) {
    const { data } = await axiosInstance.get(`/restaurants/${id}/reviews`, {
      params: { page, limit },
    })
    return data
  },

  async getMenu(id: string) {
    const { data } = await axiosInstance.get(`/restaurants/${id}/menu`)
    return data
  },

  async getNearby(latitude: number, longitude: number, radius = 5) {
    const { data } = await axiosInstance.get('/restaurants/nearby', {
      params: { latitude, longitude, radius },
    })
    return data
  },

  async getFeatured() {
    const { data } = await axiosInstance.get('/restaurants/featured')
    return data
  },

  async getPopular() {
    const { data } = await axiosInstance.get('/restaurants/popular')
    return data
  },

  // Restaurant owner endpoints
  async create(restaurantData: Partial<Restaurant>) {
    const { data } = await axiosInstance.post('/restaurants', restaurantData)
    return data
  },

  async update(id: string, restaurantData: Partial<Restaurant>) {
    const { data } = await axiosInstance.put(`/restaurants/${id}`, restaurantData)
    return data
  },

  async updateHours(id: string, hours: RestaurantHours[]) {
    const { data } = await axiosInstance.put(`/restaurants/${id}/hours`, { hours })
    return data
  },

  async uploadImages(id: string, images: File[]) {
    const formData = new FormData()
    images.forEach((image) => formData.append('images', image))
    
    const { data } = await axiosInstance.post(`/restaurants/${id}/images`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return data
  },

  async deleteImage(id: string, imageUrl: string) {
    const { data } = await axiosInstance.delete(`/restaurants/${id}/images`, {
      data: { imageUrl },
    })
    return data
  },

  async getAnalytics(id: string, period: 'day' | 'week' | 'month' | 'year' = 'month') {
    const { data } = await axiosInstance.get(`/restaurants/${id}/analytics`, {
      params: { period },
    })
    return data
  },
}