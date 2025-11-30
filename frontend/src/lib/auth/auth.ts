import { signIn, signOut } from 'next-auth/react';
import { unifiedApiClient } from '../api/unified-client';

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  name: string;
  phone?: string;
}

export interface UpdateProfileData {
  name?: string;
  email?: string;
  phone?: string;
  preferences?: {
    cuisine?: string[];
    dietaryRestrictions?: string[];
    notifications?: boolean;
  };
}

/**
 * Login user with credentials
 */
export async function loginUser(credentials: LoginCredentials) {
  const result = await signIn('credentials', {
    email: credentials.email,
    password: credentials.password,
    redirect: false,
  });
  
  return result;
}

/**
 * Logout current user
 */
export async function logoutUser() {
  await signOut({ redirect: false });
}

/**
 * Register new user
 */
export async function registerUser(data: RegisterData) {
  // Register user via API
  const user = await unifiedApiClient.post('/auth/register', data);
  
  // Auto-login after registration
  await signIn('credentials', {
    email: data.email,
    password: data.password,
    redirect: false,
  });
  
  return user;
}

/**
 * Update user profile
 */
export async function updateUserProfile(data: UpdateProfileData) {
  return await unifiedApiClient.put('/auth/profile', data);
}

/**
 * Request password reset
 */
export async function requestPasswordReset(email: string) {
  return await unifiedApiClient.post('/auth/forgot-password', { email });
}

/**
 * Reset password with token
 */
export async function resetPassword(token: string, newPassword: string) {
  return await unifiedApiClient.post('/auth/reset-password', {
    token,
    password: newPassword,
  });
}

/**
 * Verify email with token
 */
export async function verifyEmail(token: string) {
  return await unifiedApiClient.post('/auth/verify-email', { token });
}

/**
 * Change password
 */
export async function changePassword(currentPassword: string, newPassword: string) {
  return await unifiedApiClient.post('/auth/change-password', {
    currentPassword,
    newPassword,
  });
}

/**
 * Delete user account
 */
export async function deleteAccount(password: string) {
  await unifiedApiClient.delete('/auth/account', {
    data: { password },
  });
  await signOut({ redirect: false });
}