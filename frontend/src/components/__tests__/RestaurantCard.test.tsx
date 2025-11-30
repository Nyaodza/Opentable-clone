import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { useRouter } from 'next/navigation';
import { RestaurantCard } from '../RestaurantCard';

// Mock next/navigation
jest.mock('next/navigation');

// Mock next/image
jest.mock('next/image', () => ({
  __esModule: true,
  default: ({ src, alt, ...props }: any) => <img src={src} alt={alt} {...props} />,
}));

describe('RestaurantCard', () => {
  const mockRouter = {
    push: jest.fn(),
  };

  const mockRestaurant = {
    id: '1',
    name: 'Test Restaurant',
    cuisine: 'Italian',
    priceRange: '$$',
    rating: 4.5,
    reviewCount: 150,
    imageUrl: '/test-image.jpg',
    location: {
      address: '123 Test St',
      city: 'Test City',
      state: 'TC',
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
  });

  it('should render restaurant information', () => {
    render(<RestaurantCard restaurant={mockRestaurant} />);
    
    expect(screen.getByText('Test Restaurant')).toBeInTheDocument();
    expect(screen.getByText('Italian • $$')).toBeInTheDocument();
    expect(screen.getByText('⭐ 4.5')).toBeInTheDocument();
    expect(screen.getByText('(150 reviews)')).toBeInTheDocument();
    expect(screen.getByText('📍 Test City, TC')).toBeInTheDocument();
  });

  it('should render restaurant image', () => {
    render(<RestaurantCard restaurant={mockRestaurant} />);
    
    const image = screen.getByAltText('Test Restaurant');
    expect(image).toBeInTheDocument();
    expect(image).toHaveAttribute('src', '/test-image.jpg');
  });

  it('should navigate to restaurant page on click', () => {
    render(<RestaurantCard restaurant={mockRestaurant} />);
    
    const card = screen.getByRole('article');
    fireEvent.click(card);
    
    expect(mockRouter.push).toHaveBeenCalledWith('/restaurants/1');
  });

  it('should handle missing location gracefully', () => {
    const restaurantWithoutLocation = {
      ...mockRestaurant,
      location: undefined,
    };
    
    render(<RestaurantCard restaurant={restaurantWithoutLocation} />);
    
    expect(screen.queryByText('📍')).not.toBeInTheDocument();
  });

  it('should display placeholder when no image', () => {
    const restaurantWithoutImage = {
      ...mockRestaurant,
      imageUrl: undefined,
    };
    
    render(<RestaurantCard restaurant={restaurantWithoutImage} />);
    
    const image = screen.getByAltText('Test Restaurant');
    expect(image).toHaveAttribute('src', '/placeholder-restaurant.jpg');
  });

  it('should apply custom className', () => {
    render(<RestaurantCard restaurant={mockRestaurant} className="custom-class" />);
    
    const card = screen.getByRole('article');
    expect(card).toHaveClass('custom-class');
  });

  it('should show "New" badge for recently added restaurants', () => {
    const newRestaurant = {
      ...mockRestaurant,
      isNew: true,
    };
    
    render(<RestaurantCard restaurant={newRestaurant} />);
    
    expect(screen.getByText('New')).toBeInTheDocument();
  });

  it('should show availability status', () => {
    const restaurantWithAvailability = {
      ...mockRestaurant,
      availability: {
        tonight: true,
        nextAvailable: '7:30 PM',
      },
    };
    
    render(<RestaurantCard restaurant={restaurantWithAvailability} />);
    
    expect(screen.getByText('Available tonight')).toBeInTheDocument();
    expect(screen.getByText('Next: 7:30 PM')).toBeInTheDocument();
  });
});