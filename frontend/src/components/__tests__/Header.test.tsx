import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Header } from '../Header';

// Mock modules
jest.mock('next-auth/react');
jest.mock('next/navigation');
jest.mock('next/link', () => {
  return ({ children, href }: any) => <a href={href}>{children}</a>;
});

describe('Header', () => {
  const mockRouter = {
    push: jest.fn(),
    refresh: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
  });

  describe('when user is not authenticated', () => {
    beforeEach(() => {
      (useSession as jest.Mock).mockReturnValue({
        data: null,
        status: 'unauthenticated',
      });
    });

    it('should render logo and navigation links', () => {
      render(<Header />);
      
      expect(screen.getByText('🍽️ OpenTable')).toBeInTheDocument();
      expect(screen.getByText('Home')).toBeInTheDocument();
      expect(screen.getByText('Restaurants')).toBeInTheDocument();
      expect(screen.getByText('About')).toBeInTheDocument();
    });

    it('should show sign in and sign up buttons', () => {
      render(<Header />);
      
      expect(screen.getByText('Sign In')).toBeInTheDocument();
      expect(screen.getByText('Sign Up')).toBeInTheDocument();
    });

    it('should not show user menu', () => {
      render(<Header />);
      
      expect(screen.queryByText('👤')).not.toBeInTheDocument();
    });
  });

  describe('when user is authenticated', () => {
    const mockUser = {
      name: 'John Doe',
      email: 'john@example.com',
    };

    beforeEach(() => {
      (useSession as jest.Mock).mockReturnValue({
        data: { user: mockUser },
        status: 'authenticated',
      });
    });

    it('should show user menu button', () => {
      render(<Header />);
      
      expect(screen.getByText('👤')).toBeInTheDocument();
    });

    it('should not show sign in/up buttons', () => {
      render(<Header />);
      
      expect(screen.queryByText('Sign In')).not.toBeInTheDocument();
      expect(screen.queryByText('Sign Up')).not.toBeInTheDocument();
    });

    it('should toggle user menu on click', () => {
      render(<Header />);
      
      const userMenuButton = screen.getByText('👤');
      
      // Menu should be closed initially
      expect(screen.queryByText('Dashboard')).not.toBeInTheDocument();
      
      // Click to open
      fireEvent.click(userMenuButton);
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
      expect(screen.getByText('Profile')).toBeInTheDocument();
      expect(screen.getByText('Reservations')).toBeInTheDocument();
      expect(screen.getByText('Sign Out')).toBeInTheDocument();
      
      // Click to close
      fireEvent.click(userMenuButton);
      expect(screen.queryByText('Dashboard')).not.toBeInTheDocument();
    });
  });

  describe('mobile menu', () => {
    it('should toggle mobile menu', () => {
      render(<Header />);
      
      const mobileMenuButton = screen.getByLabelText('Toggle menu');
      
      // Menu should be closed initially
      expect(screen.queryByRole('navigation', { name: 'Mobile menu' })).not.toBeInTheDocument();
      
      // Click to open
      fireEvent.click(mobileMenuButton);
      const mobileNav = screen.getByRole('navigation', { name: 'Mobile menu' });
      expect(mobileNav).toBeInTheDocument();
      
      // Click to close
      fireEvent.click(mobileMenuButton);
      expect(screen.queryByRole('navigation', { name: 'Mobile menu' })).not.toBeInTheDocument();
    });
  });

  describe('loading state', () => {
    beforeEach(() => {
      (useSession as jest.Mock).mockReturnValue({
        data: null,
        status: 'loading',
      });
    });

    it('should render header while loading', () => {
      render(<Header />);
      
      expect(screen.getByText('🍽️ OpenTable')).toBeInTheDocument();
      expect(screen.getByText('Sign In')).toBeInTheDocument();
    });
  });
});