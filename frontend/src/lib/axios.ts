import axios from 'axios'
import { getSession } from 'next-auth/react'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002/api'

const axiosInstance = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor to add auth token
axiosInstance.interceptors.request.use(
  async (config) => {
    const session = await getSession()
    if (session?.accessToken) {
      config.headers.Authorization = `Bearer ${session.accessToken}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor to handle errors
axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true
      
      try {
        const session = await getSession()
        if (session?.refreshToken) {
          // Try to refresh the token
          const response = await axios.post(`${API_URL}/auth/refresh`, {
            refreshToken: session.refreshToken,
          })
          
          if (response.data.accessToken) {
            originalRequest.headers.Authorization = `Bearer ${response.data.accessToken}`
            return axiosInstance(originalRequest)
          }
        }
      } catch (refreshError) {
        // Refresh failed, redirect to login
        window.location.href = '/auth/login'
      }
    }

    return Promise.reject(error)
  }
)

export default axiosInstance