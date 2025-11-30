'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Head from 'next/head';
import { LoadingSkeleton } from '@/components/ui/loading-skeleton';
import { ErrorBoundary } from '@/components/common/error-boundary';

interface Restaurant {
  id: string;
  name: string;
  cuisine: string;
  location: string;
  rating: number;
  priceRange: string;
  imageUrl?: string;
  images?: string[];
  availableTimes: string[];
  description?: string;
  phone?: string;
  address?: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
}

interface RestaurantsResponse {
  restaurants: Restaurant[];
  total: number;
  page: number;
  limit: number;
}

// API service for restaurants
const restaurantService = {
  async fetchRestaurants(params: {
    search?: string;
    cuisine?: string;
    priceRange?: string;
    location?: string;
    sortBy?: string;
    page?: number;
    limit?: number;
  }): Promise<RestaurantsResponse> {
    try {
      const queryParams = new URLSearchParams();
      
      Object.entries(params).forEach(([key, value]) => {
        if (value && value !== 'All') {
          queryParams.append(key, value.toString());
        }
      });

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002'}/api/restaurants?${queryParams}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Transform API response to match frontend interface
      const rawRestaurants = data.data?.restaurants || data.restaurants || [];
      const transformedRestaurants = rawRestaurants.map((r: any) => ({
        id: r.id,
        name: r.name,
        cuisine: r.cuisineType || r.cuisine,
        location: r.city || r.location,
        rating: r.averageRating || r.rating,
        priceRange: r.priceRange,
        imageUrl: r.images?.[0] || r.imageUrl,
        images: r.images,
        availableTimes: ['6:00 PM', '6:30 PM', '7:00 PM', '8:00 PM'],
        description: r.description,
        phone: r.phone,
        address: r.address,
      }));
      
      return {
        restaurants: transformedRestaurants,
        total: data.data?.total || data.total || 0,
        page: data.data?.page || data.page || 1,
        limit: data.data?.limit || data.limit || 20
      };
    } catch (error) {
      // Log error in development only
      if (process.env.NODE_ENV === 'development') {
        console.error('Error fetching restaurants:', error);
      }
      
      // Return fallback data in case of API failure
      return {
        restaurants: getFallbackRestaurants(),
        total: 6,
        page: 1,
        limit: 20
      };
    }
  }
};

// Fallback data for offline/error scenarios
const getFallbackRestaurants = (): Restaurant[] => [
  {
    id: 'fallback-1',
    name: 'The Modern Bistro',
    cuisine: 'French',
    location: 'Downtown',
    rating: 4.8,
    priceRange: '$$$',
    imageUrl: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400',
    availableTimes: ['6:00 PM', '6:30 PM', '7:00 PM', '8:00 PM', '9:00 PM'],
    description: 'Modern French cuisine in an elegant setting'
  },
  {
    id: 'fallback-2',
    name: 'Sakura Sushi House',
    cuisine: 'Japanese',
    location: 'Midtown',
    rating: 4.9,
    priceRange: '$$$$',
    imageUrl: 'https://images.unsplash.com/photo-1579584425555-c3ce17fd4351?w=400',
    availableTimes: ['5:30 PM', '7:00 PM', '8:30 PM', '9:00 PM'],
    description: 'Authentic Japanese sushi and sashimi'
  },
  {
    id: 'fallback-3',
    name: 'Pasta Paradise',
    cuisine: 'Italian',
    location: 'Little Italy',
    rating: 4.6,
    priceRange: '$$',
    imageUrl: 'https://images.unsplash.com/photo-1551183053-bf91a1d81141?w=400',
    availableTimes: ['5:00 PM', '6:00 PM', '7:00 PM', '7:30 PM', '8:00 PM', '9:00 PM'],
    description: 'Traditional Italian pasta and pizza'
  }
];

const cuisineTypes = ['All', 'French', 'Japanese', 'Italian', 'American', 'Indian', 'Mexican', 'Chinese', 'Thai'];
const priceRanges = ['All', '$', '$$', '$$$', '$$$$'];
const locations = ['All', 'Downtown', 'Midtown', 'Little Italy', 'Financial District', 'East Side', 'West Village'];

export default function RestaurantsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [partySize, setPartySize] = useState('2');
  const [selectedCuisine, setSelectedCuisine] = useState('All');
  const [selectedPrice, setSelectedPrice] = useState('All');
  const [selectedLocation, setSelectedLocation] = useState('All');
  const [sortBy, setSortBy] = useState('rating');
  
  // API state management
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalResults, setTotalResults] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);

  // Fetch restaurants from API
  const fetchRestaurants = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await restaurantService.fetchRestaurants({
        search: searchQuery || undefined,
        cuisine: selectedCuisine !== 'All' ? selectedCuisine : undefined,
        priceRange: selectedPrice !== 'All' ? selectedPrice : undefined,
        location: selectedLocation !== 'All' ? selectedLocation : undefined,
        sortBy,
        page: currentPage,
        limit: 20
      });
      
      setRestaurants(response.restaurants);
      setTotalResults(response.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch restaurants');
    } finally {
      setLoading(false);
    }
  };

  // Effect to fetch data on component mount and when filters change
  useEffect(() => {
    fetchRestaurants();
  }, [searchQuery, selectedCuisine, selectedPrice, selectedLocation, sortBy, currentPage]);

  // Handle search form submission
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1); // Reset to first page on new search
    fetchRestaurants();
  };

  // Reset filters
  const resetFilters = () => {
    setSearchQuery('');
    setSelectedCuisine('All');
    setSelectedPrice('All');
    setSelectedLocation('All');
    setSortBy('rating');
    setCurrentPage(1);
  };

  const sortedRestaurants = restaurants;

  const renderStars = (rating: number) => {
    const fullStars = Math.floor(rating);
    const halfStar = rating % 1 >= 0.5;
    const emptyStars = 5 - fullStars - (halfStar ? 1 : 0);

    return (
      <div className="flex items-center">
        {[...Array(fullStars)].map((_, i) => (
          <span key={`full-${i}`} className="text-yellow-400">★</span>
        ))}
        {halfStar && <span className="text-yellow-400">★</span>}
        {[...Array(emptyStars)].map((_, i) => (
          <span key={`empty-${i}`} className="text-gray-300">★</span>
        ))}
        <span className="ml-2 text-sm text-gray-600">({rating})</span>
      </div>
    );
  };

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gray-50">
        {/* Search Header */}
        <div className="bg-white shadow-sm border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <h1 className="text-3xl font-bold text-gray-900 mb-6">Find Your Table</h1>
            
            {/* Search Form */}
            <form onSubmit={handleSearch}>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-600"
                />
                <select
                  value={selectedTime}
                  onChange={(e) => setSelectedTime(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-600"
                >
                  <option value="">Select Time</option>
                  <option value="5:00 PM">5:00 PM</option>
                  <option value="5:30 PM">5:30 PM</option>
                  <option value="6:00 PM">6:00 PM</option>
                  <option value="6:30 PM">6:30 PM</option>
                  <option value="7:00 PM">7:00 PM</option>
                  <option value="7:30 PM">7:30 PM</option>
                  <option value="8:00 PM">8:00 PM</option>
                  <option value="8:30 PM">8:30 PM</option>
                  <option value="9:00 PM">9:00 PM</option>
                </select>
                <select
                  value={partySize}
                  onChange={(e) => setPartySize(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-600"
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(size => (
                    <option key={size} value={size}>
                      {size} {size === 1 ? 'Person' : 'People'}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  placeholder="Restaurant name or cuisine"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-600"
                />
                <button 
                  type="submit"
                  disabled={loading}
                  className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Searching...' : 'Search'}
                </button>
              </div>
            </form>

          {/* Filters */}
          <div className="flex flex-wrap gap-4 items-center">
            <select
              value={selectedCuisine}
              onChange={(e) => setSelectedCuisine(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-600"
            >
              {cuisineTypes.map(cuisine => (
                <option key={cuisine} value={cuisine}>{cuisine}</option>
              ))}
            </select>
            <select
              value={selectedPrice}
              onChange={(e) => setSelectedPrice(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-600"
            >
              {priceRanges.map(price => (
                <option key={price} value={price}>
                  {price === 'All' ? 'All Prices' : price}
                </option>
              ))}
            </select>
            <select
              value={selectedLocation}
              onChange={(e) => setSelectedLocation(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-600"
            >
              {locations.map(location => (
                <option key={location} value={location}>{location}</option>
              ))}
            </select>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-600"
            >
              <option value="rating">Sort by Rating</option>
              <option value="name">Sort by Name</option>
              <option value="price">Sort by Price</option>
            </select>
            
            {/* Reset Filters Button */}
            <button
              onClick={resetFilters}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Reset Filters
            </button>
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Error State */}
        {error && !loading && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error loading restaurants</h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>{error}</p>
                </div>
                <div className="mt-4">
                  <button
                    onClick={fetchRestaurants}
                    className="bg-red-100 px-3 py-2 rounded-md text-sm font-medium text-red-800 hover:bg-red-200 transition-colors"
                  >
                    Try again
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Results Header */}
        {!loading && !error && (
          <div className="flex justify-between items-center mb-6">
            <div className="text-gray-600">
              {totalResults === 0 ? 'No restaurants found' : `${totalResults} restaurants found`}
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, index) => (
              <div key={index} className="bg-white rounded-lg shadow overflow-hidden animate-pulse">
                <div className="h-48 bg-gray-200"></div>
                <div className="p-4">
                  <div className="h-6 bg-gray-200 rounded mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded mb-2 w-3/4"></div>
                  <div className="h-4 bg-gray-200 rounded mb-3 w-1/2"></div>
                  <div className="h-4 bg-gray-200 rounded mb-3"></div>
                  <div className="flex gap-2">
                    <div className="h-6 bg-gray-200 rounded w-16"></div>
                    <div className="h-6 bg-gray-200 rounded w-16"></div>
                    <div className="h-6 bg-gray-200 rounded w-16"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Restaurant Grid */}
        {!loading && !error && sortedRestaurants.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sortedRestaurants.map((restaurant) => (
              <Link
                key={restaurant.id}
                href={`/restaurants/${restaurant.id}`}
                className="block bg-white rounded-lg shadow hover:shadow-lg transition-shadow overflow-hidden"
              >
                <div className="h-48 bg-gray-200 relative overflow-hidden">
                  {restaurant.imageUrl ? (
                    <img
                      src={restaurant.imageUrl}
                      alt={restaurant.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        // Fallback to placeholder on image error
                        e.currentTarget.style.display = 'none';
                        e.currentTarget.nextElementSibling?.classList.remove('hidden');
                      }}
                    />
                  ) : null}
                  <div className={`w-full h-full flex items-center justify-center text-gray-500 text-4xl ${restaurant.imageUrl ? 'hidden' : ''}`}>
                    🍽️
                  </div>
                </div>
                <div className="p-4">
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">{restaurant.name}</h3>
                  {restaurant.description && (
                    <p className="text-sm text-gray-600 mb-2 line-clamp-2">{restaurant.description}</p>
                  )}
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-600">{restaurant.cuisine}</span>
                    <span className="text-sm font-medium">{restaurant.priceRange}</span>
                  </div>
                  <div className="mb-3">
                    {renderStars(restaurant.rating)}
                  </div>
                  <p className="text-sm text-gray-600 mb-3">📍 {restaurant.location}</p>
                  
                  {/* Available Times */}
                  {restaurant.availableTimes && restaurant.availableTimes.length > 0 && (
                    <div className="border-t pt-3">
                      <p className="text-sm text-gray-600 mb-2">Available times:</p>
                      <div className="flex flex-wrap gap-2">
                        {restaurant.availableTimes.slice(0, 3).map((time) => (
                          <span
                            key={time}
                            className="text-xs bg-red-50 text-red-600 px-2 py-1 rounded-lg"
                          >
                            {time}
                          </span>
                        ))}
                        {restaurant.availableTimes.length > 3 && (
                          <span className="text-xs text-gray-500">
                            +{restaurant.availableTimes.length - 3} more
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {/* Book Now Button */}
                  <div className="mt-4 pt-3 border-t">
                    <span className="block w-full text-center bg-red-600 text-white py-2 rounded-lg hover:bg-red-700 transition-colors font-medium">
                      Book Now
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && sortedRestaurants.length === 0 && (
          <div className="text-center py-16">
            <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No restaurants found</h3>
            <p className="text-gray-500 mb-4">Try adjusting your filters or search terms to find more restaurants.</p>
            <button
              onClick={resetFilters}
              className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 transition-colors"
            >
              Reset all filters
            </button>
          </div>
        )}
      </div>
    </div>
    </ErrorBoundary>
  );
}