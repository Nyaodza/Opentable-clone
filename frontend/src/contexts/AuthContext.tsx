'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  avatar?: string;
  emailVerified: boolean;
  phoneNumber?: string;
  loyaltyPoints: number;
  loyaltyTier: string;
  preferences?: any;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  googleLogin: (token: string) => Promise<void>;
  facebookLogin: (accessToken: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<void>;
  updateProfile: (data: Partial<User>) => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  requestPasswordReset: (email: string) => Promise<void>;
  resetPassword: (token: string, password: string) => Promise<void>;
  verifyEmail: (token: string) => Promise<void>;
  resendVerificationEmail: () => Promise<void>;
}

interface RegisterData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phoneNumber?: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Configure axios defaults
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002/api';
axios.defaults.baseURL = API_URL;

// Add request interceptor for auth token
axios.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Load user from token on mount
  useEffect(() => {
    const loadUser = async () => {
      const token = localStorage.getItem('accessToken');
      if (token) {
        try {
          const response = await axios.get('/auth/me');
          setUser(response.data.data);
        } catch (error) {
          // Token might be expired
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
        }
      }
      setLoading(false);
    };

    loadUser();
  }, []);

  // Setup axios response interceptor for token refresh
  useEffect(() => {
    const interceptor = axios.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;

        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          try {
            await refreshToken();
            return axios(originalRequest);
          } catch (refreshError) {
            // Refresh failed, redirect to login
            setUser(null);
            localStorage.removeItem('accessToken');
            localStorage.removeItem('refreshToken');
            router.push('/login');
            return Promise.reject(refreshError);
          }
        }

        return Promise.reject(error);
      }
    );

    return () => {
      axios.interceptors.response.eject(interceptor);
    };
  }, [router]);

  const login = async (email: string, password: string, rememberMe = false) => {
    try {
      const response = await axios.post('/auth/login', {
        email,
        password,
        rememberMe
      });

      const { accessToken, refreshToken, user } = response.data.data;

      // Store tokens
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);

      // Set user
      setUser(user);

      toast.success('Login successful!');
      router.push('/');
    } catch (error: any) {
      const message = error.response?.data?.message || 'Login failed';
      toast.error(message);
      throw new Error(message);
    }
  };

  const register = async (data: RegisterData) => {
    try {
      const response = await axios.post('/auth/register', data);

      const { accessToken, refreshToken, user } = response.data.data;

      // Store tokens
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);

      // Set user
      setUser(user);

      toast.success('Registration successful! Please check your email to verify your account.');
      router.push('/');
    } catch (error: any) {
      const message = error.response?.data?.message || 'Registration failed';
      toast.error(message);
      throw new Error(message);
    }
  };

  const googleLogin = async (token: string) => {
    try {
      const response = await axios.post('/auth/google', { token });

      const { accessToken, refreshToken, user } = response.data.data;

      // Store tokens
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);

      // Set user
      setUser(user);

      toast.success('Google login successful!');
      router.push('/');
    } catch (error: any) {
      const message = error.response?.data?.message || 'Google login failed';
      toast.error(message);
      throw new Error(message);
    }
  };

  const facebookLogin = async (accessToken: string) => {
    try {
      const response = await axios.post('/auth/facebook', { accessToken });

      const { accessToken: newAccessToken, refreshToken, user } = response.data.data;

      // Store tokens
      localStorage.setItem('accessToken', newAccessToken);
      localStorage.setItem('refreshToken', refreshToken);

      // Set user
      setUser(user);

      toast.success('Facebook login successful!');
      router.push('/');
    } catch (error: any) {
      const message = error.response?.data?.message || 'Facebook login failed';
      toast.error(message);
      throw new Error(message);
    }
  };

  const logout = async () => {
    try {
      await axios.post('/auth/logout');
    } catch (error) {
      // Ignore logout errors
    } finally {
      // Clear local data
      setUser(null);
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      router.push('/');
      toast.success('Logged out successfully');
    }
  };

  const refreshToken = async () => {
    const token = localStorage.getItem('refreshToken');
    if (!token) throw new Error('No refresh token');

    const response = await axios.post('/auth/refresh', {
      refreshToken: token
    });

    const { accessToken, refreshToken: newRefreshToken } = response.data.data;

    // Update tokens
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', newRefreshToken);
  };

  const updateProfile = async (data: Partial<User>) => {
    try {
      const response = await axios.put('/auth/profile', data);
      setUser(response.data.data);
      toast.success('Profile updated successfully');
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to update profile';
      toast.error(message);
      throw new Error(message);
    }
  };

  const changePassword = async (currentPassword: string, newPassword: string) => {
    try {
      await axios.post('/auth/change-password', {
        currentPassword,
        newPassword
      });
      toast.success('Password changed successfully');
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to change password';
      toast.error(message);
      throw new Error(message);
    }
  };

  const requestPasswordReset = async (email: string) => {
    try {
      await axios.post('/auth/forgot-password', { email });
      toast.success('Password reset link sent to your email');
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to send reset email';
      toast.error(message);
      throw new Error(message);
    }
  };

  const resetPassword = async (token: string, password: string) => {
    try {
      await axios.post('/auth/reset-password', { token, password });
      toast.success('Password reset successfully');
      router.push('/login');
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to reset password';
      toast.error(message);
      throw new Error(message);
    }
  };

  const verifyEmail = async (token: string) => {
    try {
      await axios.get(`/auth/verify-email?token=${token}`);
      if (user) {
        setUser({ ...user, emailVerified: true });
      }
      toast.success('Email verified successfully');
    } catch (error: any) {
      const message = error.response?.data?.message || 'Email verification failed';
      toast.error(message);
      throw new Error(message);
    }
  };

  const resendVerificationEmail = async () => {
    try {
      await axios.post('/auth/resend-verification');
      toast.success('Verification email sent');
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to send verification email';
      toast.error(message);
      throw new Error(message);
    }
  };

  const value = {
    user,
    loading,
    isAuthenticated: !!user,
    login,
    register,
    googleLogin,
    facebookLogin,
    logout,
    refreshToken,
    updateProfile,
    changePassword,
    requestPasswordReset,
    resetPassword,
    verifyEmail,
    resendVerificationEmail
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}