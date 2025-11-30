'use client';

import { useState, useEffect, useMemo, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

interface Restaurant {
  id: string;
  name: string;
  cuisine: string;
  rating: number;
  reviewCount: number;
  priceRange: number;
  location: string;
  imageUrl: string;
  availableTimes: string[];
  features: string[];
  distance?: string;
}

const mockRestaurants: Restaurant[] = [
  {
    id: '1',
    name: 'The Gourmet Kitchen',
    cuisine: 'Italian',
    rating: 4.8,
    reviewCount: 342,
    priceRange: 3,
    location: 'Downtown',
    imageUrl: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400',
    availableTimes: ['6:00 PM', '6:30 PM', '7:00 PM', '8:00 PM'],
    features: ['Outdoor Seating', 'Private Dining'],
    distance: '0.5 mi',
  },
  {
    id: '2',
    name: 'Sakura Sushi Bar',
    cuisine: 'Japanese',
    rating: 4.6,
    reviewCount: 186,
    priceRange: 2,
    location: 'Midtown',
    imageUrl: 'https://images.unsplash.com/photo-1579584425555-c3ce17fd4351?w=400',
    availableTimes: ['5:30 PM', '7:00 PM', '8:30 PM'],
    features: ['Sushi Bar', 'Sake Selection'],
    distance: '1.2 mi',
  },
  {
    id: '3',
    name: 'Le Petit Bistro',
    cuisine: 'French',
    rating: 4.9,
    reviewCount: 521,
    priceRange: 4,
    location: 'West Village',
    imageUrl: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=400',
    availableTimes: ['6:00 PM', '7:30 PM', '9:00 PM'],
    features: ['Wine Pairing', 'Romantic'],
    distance: '2.1 mi',
  },
  {
    id: '4',
    name: 'Taco Loco',
    cuisine: 'Mexican',
    rating: 4.4,
    reviewCount: 89,
    priceRange: 1,
    location: 'East Side',
    imageUrl: 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=400',
    availableTimes: ['5:00 PM', '6:00 PM', '7:00 PM', '8:00 PM', '9:00 PM'],
    features: ['Happy Hour', 'Family Friendly'],
    distance: '0.8 mi',
  },
  {
    id: '5',
    name: 'Spice Garden',
    cuisine: 'Indian',
    rating: 4.7,
    reviewCount: 234,
    priceRange: 2,
    location: 'Little India',
    imageUrl: 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=400',
    availableTimes: ['6:00 PM', '7:00 PM', '8:00 PM'],
    features: ['Vegetarian Options', 'Buffet'],
    distance: '1.5 mi',
  },
  {
    id: '6',
    name: 'The Steakhouse',
    cuisine: 'American',
    rating: 4.5,
    reviewCount: 412,
    priceRange: 4,
    location: 'Financial District',
    imageUrl: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=400',
    availableTimes: ['6:30 PM', '7:30 PM', '8:30 PM'],
    features: ['Dry Aged', 'Bar'],
    distance: '3.0 mi',
  },
];

const cuisines = ['All', 'Italian', 'Japanese', 'French', 'Mexican', 'Indian', 'American', 'Chinese', 'Thai'];
const priceOptions = [
  { value: 0, label: 'All Prices' },
  { value: 1, label: '$' },
  { value: 2, label: '$$' },
  { value: 3, label: '$$$' },
  { value: 4, label: '$$$$' },
];
const sortOptions = [
  { value: 'relevance', label: 'Relevance' },
  { value: 'rating', label: 'Highest Rated' },
  { value: 'reviews', label: 'Most Reviewed' },
  { value: 'distance', label: 'Nearest' },
  { value: 'price-low', label: 'Price: Low to High' },
  { value: 'price-high', label: 'Price: High to Low' },
];

function SearchContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [searchQuery, setSearchQuery] = useState(searchParams?.get('q') || '');
  const [selectedCuisine, setSelectedCuisine] = useState(searchParams?.get('cuisine') || 'All');
  const [selectedPrice, setSelectedPrice] = useState(Number(searchParams?.get('price')) || 0);
  const [sortBy, setSortBy] = useState(searchParams?.get('sort') || 'relevance');
  const [selectedDate, setSelectedDate] = useState(searchParams?.get('date') || '');
  const [selectedTime, setSelectedTime] = useState(searchParams?.get('time') || '');
  const [partySize, setPartySize] = useState(searchParams?.get('party') || '2');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [loading, setLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // Filter and sort restaurants
  const filteredRestaurants = useMemo(() => {
    let results = [...mockRestaurants];

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      results = results.filter(
        (r) =>
          r.name.toLowerCase().includes(query) ||
          r.cuisine.toLowerCase().includes(query) ||
          r.location.toLowerCase().includes(query)
      );
    }

    // Filter by cuisine
    if (selectedCuisine !== 'All') {
      results = results.filter((r) => r.cuisine === selectedCuisine);
    }

    // Filter by price
    if (selectedPrice > 0) {
      results = results.filter((r) => r.priceRange === selectedPrice);
    }

    // Sort results
    switch (sortBy) {
      case 'rating':
        results.sort((a, b) => b.rating - a.rating);
        break;
      case 'reviews':
        results.sort((a, b) => b.reviewCount - a.reviewCount);
        break;
      case 'distance':
        results.sort((a, b) => parseFloat(a.distance || '0') - parseFloat(b.distance || '0'));
        break;
      case 'price-low':
        results.sort((a, b) => a.priceRange - b.priceRange);
        break;
      case 'price-high':
        results.sort((a, b) => b.priceRange - a.priceRange);
        break;
    }

    return results;
  }, [searchQuery, selectedCuisine, selectedPrice, sortBy]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // Simulate search delay
    setTimeout(() => setLoading(false), 500);
  };

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedCuisine('All');
    setSelectedPrice(0);
    setSortBy('relevance');
    setSelectedDate('');
    setSelectedTime('');
    setPartySize('2');
  };

  const renderPriceRange = (price: number) => {
    return '$'.repeat(price);
  };

  const renderStars = (rating: number) => {
    const fullStars = Math.floor(rating);
    const hasHalf = rating % 1 >= 0.5;
    
    return (
      <div className="flex items-center">
        {[...Array(5)].map((_, i) => (
          <span
            key={i}
            className={`text-sm ${
              i < fullStars ? 'text-yellow-400' : i === fullStars && hasHalf ? 'text-yellow-400' : 'text-gray-300'
            }`}
          >
            ★
          </span>
        ))}
        <span className="ml-1 text-sm text-gray-600">{rating}</span>
        <span className="ml-1 text-sm text-gray-400">({filteredRestaurants.find(r => r.rating === rating)?.reviewCount})</span>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Search Header */}
      <div className="bg-white border-b border-gray-200 sticky top-16 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <form onSubmit={handleSearch}>
            <div className="flex flex-col lg:flex-row gap-4">
              {/* Main Search Input */}
              <div className="flex-1 relative">
                <input
                  type="text"
                  placeholder="Search restaurants, cuisines, locations..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-base"
                />
                <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>

              {/* Date, Time, Party Size */}
              <div className="flex gap-2">
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 text-sm"
                />
                <select
                  value={selectedTime}
                  onChange={(e) => setSelectedTime(e.target.value)}
                  className="px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 text-sm"
                >
                  <option value="">Time</option>
                  {['5:00 PM', '5:30 PM', '6:00 PM', '6:30 PM', '7:00 PM', '7:30 PM', '8:00 PM', '8:30 PM', '9:00 PM'].map((time) => (
                    <option key={time} value={time}>{time}</option>
                  ))}
                </select>
                <select
                  value={partySize}
                  onChange={(e) => setPartySize(e.target.value)}
                  className="px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 text-sm"
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((size) => (
                    <option key={size} value={size}>{size} {size === 1 ? 'Guest' : 'Guests'}</option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="px-8 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors font-medium disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    Search
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Filters Sidebar */}
          <div className={`lg:w-64 flex-shrink-0 ${showFilters ? 'block' : 'hidden lg:block'}`}>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 sticky top-40">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-semibold text-gray-900">Filters</h3>
                <button
                  onClick={clearFilters}
                  className="text-sm text-red-600 hover:text-red-700"
                >
                  Clear all
                </button>
              </div>

              {/* Cuisine Filter */}
              <div className="mb-6">
                <h4 className="text-sm font-medium text-gray-700 mb-3">Cuisine</h4>
                <div className="space-y-2">
                  {cuisines.map((cuisine) => (
                    <label key={cuisine} className="flex items-center cursor-pointer">
                      <input
                        type="radio"
                        name="cuisine"
                        checked={selectedCuisine === cuisine}
                        onChange={() => setSelectedCuisine(cuisine)}
                        className="w-4 h-4 text-red-600 border-gray-300 focus:ring-red-500"
                      />
                      <span className="ml-2 text-sm text-gray-600">{cuisine}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Price Filter */}
              <div className="mb-6">
                <h4 className="text-sm font-medium text-gray-700 mb-3">Price Range</h4>
                <div className="flex flex-wrap gap-2">
                  {priceOptions.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => setSelectedPrice(option.value)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                        selectedPrice === option.value
                          ? 'bg-red-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Features Filter */}
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-3">Features</h4>
                <div className="space-y-2">
                  {['Outdoor Seating', 'Private Dining', 'Bar', 'Vegetarian'].map((feature) => (
                    <label key={feature} className="flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        className="w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
                      />
                      <span className="ml-2 text-sm text-gray-600">{feature}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Results */}
          <div className="flex-1">
            {/* Results Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  {filteredRestaurants.length} restaurants found
                </h2>
                {searchQuery && (
                  <p className="text-sm text-gray-500 mt-1">
                    Showing results for "{searchQuery}"
                  </p>
                )}
              </div>
              
              <div className="flex items-center gap-4">
                {/* Mobile Filter Toggle */}
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="lg:hidden flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                  </svg>
                  Filters
                </button>

                {/* Sort */}
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  {sortOptions.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>

                {/* View Toggle */}
                <div className="hidden sm:flex items-center border border-gray-300 rounded-lg overflow-hidden">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-2 ${viewMode === 'grid' ? 'bg-gray-100' : 'hover:bg-gray-50'}`}
                  >
                    <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`p-2 ${viewMode === 'list' ? 'bg-gray-100' : 'hover:bg-gray-50'}`}
                  >
                    <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            {/* Results Grid/List */}
            {filteredRestaurants.length === 0 ? (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
                <div className="text-6xl mb-4">🍽️</div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">No restaurants found</h3>
                <p className="text-gray-500 mb-6">Try adjusting your filters or search terms</p>
                <button
                  onClick={clearFilters}
                  className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  Clear all filters
                </button>
              </div>
            ) : viewMode === 'grid' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {filteredRestaurants.map((restaurant) => (
                  <Link
                    key={restaurant.id}
                    href={`/restaurants/${restaurant.id}`}
                    className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-lg transition-all duration-300 card-hover group"
                  >
                    <div className="relative h-48 overflow-hidden">
                      <img
                        src={restaurant.imageUrl}
                        alt={restaurant.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute top-3 left-3 flex gap-2">
                        <span className="bg-white/90 backdrop-blur-sm px-2 py-1 rounded-lg text-xs font-medium">
                          {restaurant.cuisine}
                        </span>
                      </div>
                      <button className="absolute top-3 right-3 p-2 bg-white/90 backdrop-blur-sm rounded-full hover:bg-white transition-colors">
                        <svg className="w-4 h-4 text-gray-600 hover:text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                        </svg>
                      </button>
                    </div>
                    <div className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-semibold text-gray-900 group-hover:text-red-600 transition-colors">
                          {restaurant.name}
                        </h3>
                        <span className="text-sm font-medium text-gray-500">
                          {renderPriceRange(restaurant.priceRange)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mb-2">
                        <div className="flex items-center">
                          <span className="text-yellow-400 text-sm">★</span>
                          <span className="ml-1 text-sm font-medium text-gray-900">{restaurant.rating}</span>
                        </div>
                        <span className="text-gray-300">•</span>
                        <span className="text-sm text-gray-500">{restaurant.reviewCount} reviews</span>
                      </div>
                      <p className="text-sm text-gray-500 mb-3 flex items-center">
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        {restaurant.location} • {restaurant.distance}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {restaurant.availableTimes.slice(0, 3).map((time) => (
                          <span
                            key={time}
                            className="px-3 py-1 bg-red-50 text-red-600 rounded-lg text-xs font-medium hover:bg-red-100 transition-colors"
                          >
                            {time}
                          </span>
                        ))}
                        {restaurant.availableTimes.length > 3 && (
                          <span className="text-xs text-gray-500 py-1">
                            +{restaurant.availableTimes.length - 3} more
                          </span>
                        )}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {filteredRestaurants.map((restaurant) => (
                  <Link
                    key={restaurant.id}
                    href={`/restaurants/${restaurant.id}`}
                    className="flex bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-lg transition-all duration-300 card-hover group"
                  >
                    <div className="w-48 h-36 flex-shrink-0 overflow-hidden">
                      <img
                        src={restaurant.imageUrl}
                        alt={restaurant.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                    <div className="flex-1 p-4 flex flex-col justify-between">
                      <div>
                        <div className="flex items-start justify-between mb-1">
                          <h3 className="font-semibold text-gray-900 group-hover:text-red-600 transition-colors">
                            {restaurant.name}
                          </h3>
                          <span className="text-sm font-medium text-gray-500">
                            {renderPriceRange(restaurant.priceRange)}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 mb-2">
                          <span className="text-sm text-gray-500">{restaurant.cuisine}</span>
                          <span className="text-gray-300">•</span>
                          <div className="flex items-center">
                            <span className="text-yellow-400 text-sm">★</span>
                            <span className="ml-1 text-sm font-medium">{restaurant.rating}</span>
                            <span className="text-sm text-gray-400 ml-1">({restaurant.reviewCount})</span>
                          </div>
                          <span className="text-gray-300">•</span>
                          <span className="text-sm text-gray-500">{restaurant.location}</span>
                        </div>
                        <div className="flex flex-wrap gap-2 mb-2">
                          {restaurant.features.map((feature) => (
                            <span key={feature} className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">
                              {feature}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {restaurant.availableTimes.slice(0, 4).map((time) => (
                          <span
                            key={time}
                            className="px-3 py-1 bg-red-50 text-red-600 rounded-lg text-xs font-medium"
                          >
                            {time}
                          </span>
                        ))}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-red-600 border-t-transparent"></div>
      </div>
    }>
      <SearchContent />
    </Suspense>
  );
}
