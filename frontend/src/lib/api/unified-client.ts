import { getSession } from 'next-auth/react';

interface ApiRequestConfig {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  headers?: Record<string, string>;
  body?: any;
  cache?: RequestCache;
  timeout?: number;
}

interface ApiResponse<T = any> {
  data: T;
  success: boolean;
  message?: string;
  errors?: string[];
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
  };
}

class UnifiedApiClient {
  private baseUrl: string;
  private defaultTimeout: number = 30000; // 30 seconds

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002/api';
  }

  private async getAuthToken(): Promise<string | null> {
    try {
      const session = await getSession();
      return session?.accessToken || null;
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('Failed to get auth token:', error);
      }
      return null;
    }
  }

  private async request<T>(
    endpoint: string, 
    config: ApiRequestConfig = {}
  ): Promise<ApiResponse<T>> {
    const { 
      method = 'GET', 
      headers = {}, 
      body, 
      cache = 'no-cache',
      timeout = this.defaultTimeout 
    } = config;

    const url = `${this.baseUrl}${endpoint}`;
    const authToken = await this.getAuthToken();

    const requestHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      ...headers,
    };

    if (authToken) {
      requestHeaders.Authorization = `Bearer ${authToken}`;
    }

    // Create AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        method,
        headers: requestHeaders,
        body: body ? JSON.stringify(body) : undefined,
        cache,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Handle different response types
      let responseData: any;
      const contentType = response.headers.get('content-type');
      
      if (contentType?.includes('application/json')) {
        responseData = await response.json();
      } else {
        responseData = await response.text();
      }

      if (!response.ok) {
        throw new ApiError(
          responseData.message || `HTTP ${response.status}: ${response.statusText}`,
          response.status,
          responseData.errors || []
        );
      }

      // Handle different API response formats
      if (responseData.success !== undefined) {
        // Structured API response
        return responseData as ApiResponse<T>;
      } else {
        // Raw data response
        return {
          data: responseData,
          success: true,
        };
      }
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error instanceof ApiError) {
        throw error;
      }
      
      if (error.name === 'AbortError') {
        throw new ApiError('Request timeout', 408);
      }
      
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        throw new ApiError('Network error - please check your connection', 0);
      }
      
      throw new ApiError('An unexpected error occurred', 500);
    }
  }

  // HTTP Methods
  async get<T>(endpoint: string, params?: Record<string, any>): Promise<T> {
    let url = endpoint;
    if (params) {
      const queryString = new URLSearchParams(
        Object.entries(params).reduce((acc, [key, value]) => {
          if (value !== undefined && value !== null) {
            acc[key] = String(value);
          }
          return acc;
        }, {} as Record<string, string>)
      ).toString();
      url += queryString ? `?${queryString}` : '';
    }
    
    const response = await this.request<T>(url);
    return response.data;
  }

  async post<T>(endpoint: string, data?: any): Promise<T> {
    const response = await this.request<T>(endpoint, {
      method: 'POST',
      body: data,
    });
    return response.data;
  }

  async put<T>(endpoint: string, data?: any): Promise<T> {
    const response = await this.request<T>(endpoint, {
      method: 'PUT',
      body: data,
    });
    return response.data;
  }

  async patch<T>(endpoint: string, data?: any): Promise<T> {
    const response = await this.request<T>(endpoint, {
      method: 'PATCH',
      body: data,
    });
    return response.data;
  }

  async delete<T>(endpoint: string, data?: any): Promise<T> {
    const response = await this.request<T>(endpoint, {
      method: 'DELETE',
      body: data,
    });
    return response.data;
  }

  // File Upload
  async upload<T>(endpoint: string, formData: FormData): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const authToken = await this.getAuthToken();

    const headers: Record<string, string> = {};
    if (authToken) {
      headers.Authorization = `Bearer ${authToken}`;
    }

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new ApiError(
        errorData.message || `Upload failed: ${response.statusText}`,
        response.status,
        errorData.errors || []
      );
    }

    const result = await response.json();
    return result.data || result;
  }

  // Batch Requests
  async batch<T>(requests: Array<{
    endpoint: string;
    method?: string;
    data?: any;
  }>): Promise<T[]> {
    const promises = requests.map(req =>
      this.request(req.endpoint, {
        method: (req.method as any) || 'GET',
        body: req.data,
      })
    );

    const results = await Promise.allSettled(promises);
    return results.map(result => {
      if (result.status === 'fulfilled') {
        return result.value.data;
      } else {
        throw result.reason;
      }
    });
  }

  // Cache Management
  async getCached<T>(
    key: string, 
    endpoint: string, 
    params?: Record<string, any>,
    ttl: number = 300 // 5 minutes default
  ): Promise<T> {
    if (typeof window !== 'undefined') {
      const cached = localStorage.getItem(key);
      if (cached) {
        const { data, timestamp } = JSON.parse(cached);
        if (Date.now() - timestamp < ttl * 1000) {
          return data;
        }
      }
    }

    const data = await this.get<T>(endpoint, params);
    
    if (typeof window !== 'undefined') {
      localStorage.setItem(key, JSON.stringify({
        data,
        timestamp: Date.now()
      }));
    }

    return data;
  }

  // Real-time capabilities (Server-Sent Events)
  createEventSource(endpoint: string): EventSource {
    const url = `${this.baseUrl}${endpoint}`;
    return new EventSource(url);
  }
}

// Custom Error Class
export class ApiError extends Error {
  public status: number;
  public errors: string[];

  constructor(message: string, status: number = 500, errors: string[] = []) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.errors = errors;
  }

  public isNetworkError(): boolean {
    return this.status === 0;
  }

  public isTimeoutError(): boolean {
    return this.status === 408;
  }

  public isAuthError(): boolean {
    return this.status === 401 || this.status === 403;
  }

  public isValidationError(): boolean {
    return this.status === 422 || this.status === 400;
  }

  public isServerError(): boolean {
    return this.status >= 500;
  }
}

// Create singleton instance
export const unifiedApiClient = new UnifiedApiClient();
export const apiClient = unifiedApiClient;

// Export types
export type { ApiResponse, ApiRequestConfig };