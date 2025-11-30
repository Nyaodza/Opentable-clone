import { signIn, signOut } from 'next-auth/react';
import { loginUser, logoutUser, registerUser, updateUserProfile } from '../auth';
import { unifiedApiClient } from '../../api/unified-client';

// Mock dependencies
jest.mock('next-auth/react');
jest.mock('../../api/unified-client');

describe('Auth Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('loginUser', () => {
    it('should login with credentials successfully', async () => {
      const mockCredentials = { email: 'test@example.com', password: 'password123' };
      (signIn as jest.Mock).mockResolvedValueOnce({ ok: true });

      const result = await loginUser(mockCredentials);

      expect(signIn).toHaveBeenCalledWith('credentials', {
        email: mockCredentials.email,
        password: mockCredentials.password,
        redirect: false,
      });
      expect(result).toEqual({ ok: true });
    });

    it('should handle login failure', async () => {
      const mockCredentials = { email: 'test@example.com', password: 'wrong' };
      (signIn as jest.Mock).mockResolvedValueOnce({ 
        ok: false, 
        error: 'Invalid credentials' 
      });

      const result = await loginUser(mockCredentials);

      expect(result).toEqual({ ok: false, error: 'Invalid credentials' });
    });
  });

  describe('logoutUser', () => {
    it('should logout successfully', async () => {
      (signOut as jest.Mock).mockResolvedValueOnce(undefined);

      await logoutUser();

      expect(signOut).toHaveBeenCalledWith({ redirect: false });
    });
  });

  describe('registerUser', () => {
    it('should register user successfully', async () => {
      const mockUserData = {
        email: 'new@example.com',
        password: 'password123',
        name: 'Test User',
      };
      const mockResponse = { id: '123', ...mockUserData };

      (unifiedApiClient.post as jest.Mock).mockResolvedValueOnce(mockResponse);
      (signIn as jest.Mock).mockResolvedValueOnce({ ok: true });

      const result = await registerUser(mockUserData);

      expect(unifiedApiClient.post).toHaveBeenCalledWith('/auth/register', mockUserData);
      expect(signIn).toHaveBeenCalledWith('credentials', {
        email: mockUserData.email,
        password: mockUserData.password,
        redirect: false,
      });
      expect(result).toEqual(mockResponse);
    });

    it('should handle registration failure', async () => {
      const mockUserData = {
        email: 'existing@example.com',
        password: 'password123',
        name: 'Test User',
      };

      (unifiedApiClient.post as jest.Mock).mockRejectedValueOnce(
        new Error('Email already exists')
      );

      await expect(registerUser(mockUserData)).rejects.toThrow('Email already exists');
      expect(signIn).not.toHaveBeenCalled();
    });
  });

  describe('updateUserProfile', () => {
    it('should update profile successfully', async () => {
      const mockProfileData = {
        name: 'Updated Name',
        phone: '1234567890',
      };
      const mockResponse = { id: '123', ...mockProfileData };

      (unifiedApiClient.put as jest.Mock).mockResolvedValueOnce(mockResponse);

      const result = await updateUserProfile(mockProfileData);

      expect(unifiedApiClient.put).toHaveBeenCalledWith('/auth/profile', mockProfileData);
      expect(result).toEqual(mockResponse);
    });

    it('should handle update failure', async () => {
      const mockProfileData = { name: 'Updated Name' };

      (unifiedApiClient.put as jest.Mock).mockRejectedValueOnce(
        new Error('Update failed')
      );

      await expect(updateUserProfile(mockProfileData)).rejects.toThrow('Update failed');
    });
  });
});