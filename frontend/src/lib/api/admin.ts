import { apiClient } from './client'

export interface AdminStats {
  totalUsers: number
  totalRestaurants: number
  totalReservations: number
  totalRevenue: number
  activeUsers: number
  pendingRestaurants: number
  todayReservations: number
  monthlyGrowth: number
}

export interface PendingRestaurant {
  id: string
  name: string
  ownerName: string
  ownerEmail: string
  createdAt: string
  status: string
  cuisineType: string
  city: string
  state: string
}

export interface SystemHealth {
  database: 'healthy' | 'warning' | 'error'
  redis: 'healthy' | 'warning' | 'error'
  api: 'healthy' | 'warning' | 'error'
  storage: 'healthy' | 'warning' | 'error'
}

export interface User {
  id: string
  firstName: string
  lastName: string
  email: string
  role: string
  isActive: boolean
  createdAt: string
  lastLogin?: string
}

export const adminService = {
  async getStats(): Promise<AdminStats> {
    return await apiClient.get('/admin/stats');
  },

  async getPendingRestaurants(): Promise<PendingRestaurant[]> {
    return await apiClient.get('/admin/restaurants/pending');
  },

  async getSystemHealth(): Promise<SystemHealth> {
    return await apiClient.get('/admin/system/health')
  },

  async approveRestaurant(id: string): Promise<void> {
    await apiClient.post(`/admin/restaurants/${id}/approve`)
  },

  async rejectRestaurant(id: string, reason?: string): Promise<void> {
    await apiClient.post(`/admin/restaurants/${id}/reject`, { reason })
  },

  async getUsers(params?: {
    search?: string
    role?: string
    isActive?: boolean
    page?: number
    limit?: number
  }): Promise<{ users: User[]; total: number }> {
    return await apiClient.get('/admin/users')
  },

  async updateUserStatus(userId: string, isActive: boolean): Promise<void> {
    await apiClient.patch(`/admin/users/${userId}/status`, { isActive })
  },

  async updateUserRole(userId: string, role: string): Promise<void> {
    await apiClient.patch(`/admin/users/${userId}/role`, { role })
  },

  async getAnalytics(params?: {
    startDate?: string
    endDate?: string
    metric?: string
  }): Promise<any> {
    return await apiClient.get('/admin/analytics')
  },

  async getSystemSettings(): Promise<any> {
    return await apiClient.get('/admin/settings')
  },

  async updateSystemSettings(settings: any): Promise<void> {
    await apiClient.patch('/admin/settings', settings)
  },
}