import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useRouter } from 'next/navigation';
import HomePage from '../page';

// Mock modules
jest.mock('next/navigation');
jest.mock('../../lib/api/unified-client', () => ({
  unifiedApiClient: {
    get: jest.fn(),
  },
}));

// Mock components
jest.mock('../../components/Header', () => ({
  Header: () => <div>Header</div>,
}));

jest.mock('../../components/Footer', () => ({
  Footer: () => <div>Footer</div>,
}));

jest.mock('../../components/RestaurantCard', () => ({
  RestaurantCard: ({ restaurant }: any) => (
    <div data-testid="restaurant-card">{restaurant.name}</div>
  ),
}));

import { unifiedApiClient } from '../../lib/api/unified-client';

describe('HomePage', () => {
  const mockRouter = {
    push: jest.fn(),
  };

  const mockRestaurants = [
    {
      id: '1',
      name: 'Test Restaurant 1',
      cuisine: 'Italian',
      rating: 4.5,
      priceRange: '$$',
    },
    {
      id: '2',
      name: 'Test Restaurant 2',
      cuisine: 'Japanese',
      rating: 4.8,
      priceRange: '$$$',
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    (unifiedApiClient.get as jest.Mock).mockResolvedValue({
      restaurants: mockRestaurants,
    });
  });

  it('should render homepage components', async () => {
    render(<HomePage />);

    expect(screen.getByText('Header')).toBeInTheDocument();
    expect(screen.getByText('Footer')).toBeInTheDocument();
    expect(screen.getByText('Find Your Perfect Table')).toBeInTheDocument();
  });

  it('should render search form', () => {
    render(<HomePage />);

    expect(screen.getByPlaceholderText('Location, Restaurant, or Cuisine')).toBeInTheDocument();
    expect(screen.getByDisplayValue('2')).toBeInTheDocument(); // Party size
    expect(screen.getByText('Search')).toBeInTheDocument();
  });

  it('should handle search submission', async () => {
    render(<HomePage />);

    const searchInput = screen.getByPlaceholderText('Location, Restaurant, or Cuisine');
    const searchButton = screen.getByText('Search');

    fireEvent.change(searchInput, { target: { value: 'Italian' } });
    fireEvent.click(searchButton);

    await waitFor(() => {
      expect(mockRouter.push).toHaveBeenCalledWith('/search?q=Italian&party=2');
    });
  });

  it('should update party size', () => {
    render(<HomePage />);

    const partySizeSelect = screen.getByDisplayValue('2');
    fireEvent.change(partySizeSelect, { target: { value: '4' } });

    expect(screen.getByDisplayValue('4')).toBeInTheDocument();
  });

  it('should load and display featured restaurants', async () => {
    render(<HomePage />);

    await waitFor(() => {
      expect(unifiedApiClient.get).toHaveBeenCalledWith('/restaurants/featured');
    });

    await waitFor(() => {
      expect(screen.getByText('Test Restaurant 1')).toBeInTheDocument();
      expect(screen.getByText('Test Restaurant 2')).toBeInTheDocument();
    });
  });

  it('should show loading state', () => {
    (unifiedApiClient.get as jest.Mock).mockReturnValue(new Promise(() => {}));
    
    render(<HomePage />);

    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('should handle API error', async () => {
    (unifiedApiClient.get as jest.Mock).mockRejectedValue(new Error('API Error'));
    
    render(<HomePage />);

    await waitFor(() => {
      expect(screen.getByText('Failed to load restaurants')).toBeInTheDocument();
    });
  });

  it('should navigate to browse all restaurants', () => {
    render(<HomePage />);

    const browseAllLink = screen.getByText('Browse All Restaurants');
    fireEvent.click(browseAllLink);

    expect(mockRouter.push).toHaveBeenCalledWith('/restaurants');
  });

  it('should render cuisine types', () => {
    render(<HomePage />);

    expect(screen.getByText('Italian')).toBeInTheDocument();
    expect(screen.getByText('Japanese')).toBeInTheDocument();
    expect(screen.getByText('Mexican')).toBeInTheDocument();
    expect(screen.getByText('American')).toBeInTheDocument();
  });

  it('should navigate to cuisine search', () => {
    render(<HomePage />);

    const italianLink = screen.getByText('Italian');
    fireEvent.click(italianLink);

    expect(mockRouter.push).toHaveBeenCalledWith('/search?cuisine=Italian');
  });
});