import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import axios from 'axios';
import { AuthProvider, useAuth } from '../../contexts/AuthContext';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Test component to access auth context
const TestComponent = () => {
  const { user, isLoading, isAuthenticated, login, logout } = useAuth();
  
  return (
    <div>
      <div data-testid="loading">{isLoading.toString()}</div>
      <div data-testid="authenticated">{isAuthenticated.toString()}</div>
      <div data-testid="user">{user ? user.email : 'no-user'}</div>
      <button onClick={login} data-testid="login-btn">Login</button>
      <button onClick={logout} data-testid="logout-btn">Logout</button>
    </div>
  );
};

describe('AuthContext', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
    
    // Setup axios interceptors mock
    mockedAxios.interceptors = {
      request: { use: jest.fn(() => 1), eject: jest.fn() },
      response: { use: jest.fn(() => 2), eject: jest.fn() },
    } as any;
  });

  const renderWithAuth = (component: React.ReactElement) => {
    return render(
      <BrowserRouter>
        <AuthProvider>{component}</AuthProvider>
      </BrowserRouter>
    );
  };

  it('should start with loading state', () => {
    renderWithAuth(<TestComponent />);
    
    expect(screen.getByTestId('loading')).toHaveTextContent('true');
    expect(screen.getByTestId('authenticated')).toHaveTextContent('false');
    expect(screen.getByTestId('user')).toHaveTextContent('no-user');
  });

  it('should fetch user on mount if token exists', async () => {
    const mockUser = {
      id: 'user-123',
      email: 'test@example.com',
      name: 'Test User',
      role: 'admin',
      createdAt: '2023-01-01',
      lastLogin: '2023-01-01',
    };

    localStorage.setItem('accessToken', 'mock-token');
    mockedAxios.get.mockResolvedValueOnce({ data: mockUser });

    renderWithAuth(<TestComponent />);

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('false');
      expect(screen.getByTestId('authenticated')).toHaveTextContent('true');
      expect(screen.getByTestId('user')).toHaveTextContent('test@example.com');
    });

    expect(mockedAxios.get).toHaveBeenCalledWith(
      'http://localhost:8034/auth/me',
      expect.objectContaining({
        headers: { Authorization: 'Bearer mock-token' },
      })
    );
  });

  it('should handle login redirect', () => {
    const mockLocation = { href: '' };
    Object.defineProperty(window, 'location', {
      value: mockLocation,
      writable: true,
    });

    renderWithAuth(<TestComponent />);

    const loginBtn = screen.getByTestId('login-btn');
    loginBtn.click();

    expect(mockLocation.href).toBe('http://localhost:8034/auth/google');
  });

  it('should handle logout', async () => {
    const mockUser = {
      id: 'user-123',
      email: 'test@example.com',
      name: 'Test User',
      role: 'admin',
      createdAt: '2023-01-01',
      lastLogin: '2023-01-01',
    };

    localStorage.setItem('accessToken', 'mock-token');
    localStorage.setItem('refreshToken', 'mock-refresh-token');
    mockedAxios.get.mockResolvedValueOnce({ data: mockUser });
    mockedAxios.post.mockResolvedValueOnce({ data: {} });

    renderWithAuth(<TestComponent />);

    await waitFor(() => {
      expect(screen.getByTestId('authenticated')).toHaveTextContent('true');
    });

    const logoutBtn = screen.getByTestId('logout-btn');
    
    await act(async () => {
      logoutBtn.click();
    });

    await waitFor(() => {
      expect(screen.getByTestId('authenticated')).toHaveTextContent('false');
      expect(screen.getByTestId('user')).toHaveTextContent('no-user');
    });

    expect(mockedAxios.post).toHaveBeenCalledWith(
      'http://localhost:8034/auth/logout',
      { refreshToken: 'mock-refresh-token' }
    );
    expect(localStorage.getItem('accessToken')).toBeNull();
    expect(localStorage.getItem('refreshToken')).toBeNull();
  });

  it('should handle OAuth callback', async () => {
    const mockUser = {
      id: 'user-123',
      email: 'test@example.com',
      name: 'Test User',
      role: 'admin',
      createdAt: '2023-01-01',
      lastLogin: '2023-01-01',
    };

    // Mock URL params
    delete (window as any).location;
    window.location = {
      search: '?accessToken=new-token&refreshToken=new-refresh-token',
      pathname: '/auth/callback',
    } as any;

    mockedAxios.get.mockResolvedValueOnce({ data: mockUser });

    renderWithAuth(<TestComponent />);

    await waitFor(() => {
      expect(localStorage.getItem('accessToken')).toBe('new-token');
      expect(localStorage.getItem('refreshToken')).toBe('new-refresh-token');
      expect(screen.getByTestId('authenticated')).toHaveTextContent('true');
    });
  });

  it('should handle token refresh on 401', async () => {
    const mockUser = {
      id: 'user-123',
      email: 'test@example.com',
      name: 'Test User',
      role: 'admin',
      createdAt: '2023-01-01',
      lastLogin: '2023-01-01',
    };

    localStorage.setItem('accessToken', 'old-token');
    localStorage.setItem('refreshToken', 'refresh-token');

    // Mock initial user fetch
    mockedAxios.get.mockResolvedValueOnce({ data: mockUser });

    // Setup interceptor to test refresh flow
    let responseInterceptor: any;
    mockedAxios.interceptors.response.use = jest.fn((success, error) => {
      responseInterceptor = error;
      return 2;
    }) as any;

    renderWithAuth(<TestComponent />);

    await waitFor(() => {
      expect(screen.getByTestId('authenticated')).toHaveTextContent('true');
    });

    // Simulate 401 error and refresh
    const error = {
      response: { status: 401 },
      config: { headers: {} },
    };

    mockedAxios.post.mockResolvedValueOnce({
      data: {
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
      },
    });

    mockedAxios.mockResolvedValueOnce({ data: {} });

    await act(async () => {
      const result = await responseInterceptor(error);
      expect(result).toBeDefined();
    });

    expect(mockedAxios.post).toHaveBeenCalledWith(
      'http://localhost:8034/auth/refresh',
      { refreshToken: 'refresh-token' }
    );
  });
});