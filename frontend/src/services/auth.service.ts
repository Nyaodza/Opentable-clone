import axiosInstance from '@/lib/axios'

export interface LoginCredentials {
  email: string
  password: string
}

export interface RegisterData {
  email: string
  password: string
  firstName: string
  lastName: string
  phone?: string
  role?: string
}

export interface AuthResponse {
  user: {
    id: string
    email: string
    firstName: string
    lastName: string
    role: string
  }
  tokens: {
    accessToken: string
    refreshToken: string
  }
}

export const authService = {
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const { data } = await axiosInstance.post<AuthResponse>('/auth/login', credentials)
    return data
  },

  async register(userData: RegisterData): Promise<AuthResponse> {
    const { data } = await axiosInstance.post<AuthResponse>('/auth/register', userData)
    return data
  },

  async logout(): Promise<void> {
    await axiosInstance.post('/auth/logout')
  },

  async forgotPassword(email: string): Promise<{ message: string }> {
    const { data } = await axiosInstance.post('/auth/forgot-password', { email })
    return data
  },

  async resetPassword(token: string, password: string): Promise<{ message: string }> {
    const { data } = await axiosInstance.post('/auth/reset-password', { token, password })
    return data
  },

  async verifyEmail(token: string): Promise<{ message: string }> {
    const { data } = await axiosInstance.post('/auth/verify-email', { token })
    return data
  },

  async refreshToken(refreshToken: string): Promise<{ accessToken: string; refreshToken: string }> {
    const { data } = await axiosInstance.post('/auth/refresh', { refreshToken })
    return data
  },

  async getCurrentUser() {
    const { data } = await axiosInstance.get('/auth/me')
    return data
  },
}