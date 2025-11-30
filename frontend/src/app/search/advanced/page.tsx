'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { unifiedApiClient } from '@/lib/api/unified-client';
import { RestaurantCard } from '@/components/RestaurantCard';

interface SearchFilters {
  cuisine: string[];
  priceRange: string[];
  rating: number;
  features: string[];
  dietary: string[];
  distance: number;
  availability: {
    date: string;
    time: string;
    partySize: number;
  };
}

export default function AdvancedSearchPage() {
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [filters, setFilters] = useState<SearchFilters>({
    cuisine: [],
    priceRange: [],
    rating: 0,
    features: [],
    dietary: [],
    distance: 10,
    availability: {
      date: new Date().toISOString().split('T')[0],
      time: '19:00',
      partySize: 2,
    },
  });
  const [results, setResults] = useState<any[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [aiMode, setAiMode] = useState(false);

  const cuisineOptions = ['Italian', 'Japanese', 'Mexican', 'American', 'French', 'Chinese', 'Indian', 'Thai'];
  const priceOptions = ['$', '$$', '$$$', '$$$$'];
  const featureOptions = ['Outdoor Seating', 'Private Dining', 'Bar', 'Live Music', 'Pet Friendly', 'Waterfront'];
  const dietaryOptions = ['Vegetarian', 'Vegan', 'Gluten-Free', 'Halal', 'Kosher'];

  useEffect(() => {
    if (query.length > 2) {
      fetchSuggestions();
    }
  }, [query]);

  const fetchSuggestions = async () => {
    try {
      const data = await unifiedApiClient.get(`/search/suggestions?q=${query}`);
      setSuggestions(data.suggestions);
    } catch (error) {
      console.error('Failed to fetch suggestions:', error);
    }
  };

  const handleSearch = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        q: query,
        ...filters.availability,
        cuisine: filters.cuisine.join(','),
        priceRange: filters.priceRange.join(','),
        rating: filters.rating.toString(),
        features: filters.features.join(','),
        dietary: filters.dietary.join(','),
        distance: filters.distance.toString(),
        aiMode: aiMode.toString(),
      });

      const data = await unifiedApiClient.get(`/search/advanced?${params}`);
      setResults(data.restaurants);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleFilter = (category: keyof SearchFilters, value: string) => {
    setFilters(prev => ({
      ...prev,
      [category]: Array.isArray(prev[category])
        ? prev[category].includes(value)
          ? prev[category].filter((v: string) => v !== value)
          : [...prev[category], value]
        : value,
    }));
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Advanced Search</h1>

        {/* Search Bar */}
        <div className="bg-white p-6 rounded-lg shadow mb-6">
          <div className="flex gap-4 mb-4">
            <div className="flex-1 relative">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search restaurants, cuisines, or dishes..."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
              {suggestions.length > 0 && (
                <div className="absolute z-10 w-full bg-white border border-gray-200 rounded-lg mt-1 shadow-lg">
                  {suggestions.map((suggestion, index) => (
                    <button
                      key={index}
                      onClick={() => {
                        setQuery(suggestion);
                        setSuggestions([]);
                      }}
                      className="w-full px-4 py-2 text-left hover:bg-gray-100"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button
              onClick={() => setAiMode(!aiMode)}
              className={`px-6 py-3 rounded-lg font-medium ${
                aiMode
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              🤖 AI Mode
            </button>
            <button
              onClick={handleSearch}
              className="px-8 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium"
            >
              Search
            </button>
          </div>

          {aiMode && (
            <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
              <p className="text-sm text-indigo-800">
                🤖 AI Mode enabled: Get personalized recommendations based on your preferences and past dining history
              </p>
            </div>
          )}
        </div>

        <div className="flex gap-6">
          {/* Filters Sidebar */}
          <div className="w-80 bg-white p-6 rounded-lg shadow h-fit">
            <h2 className="text-lg font-semibold mb-4">Filters</h2>

            {/* Availability */}
            <div className="mb-6">
              <h3 className="font-medium mb-2">Availability</h3>
              <input
                type="date"
                value={filters.availability.date}
                onChange={(e) => setFilters(prev => ({
                  ...prev,
                  availability: { ...prev.availability, date: e.target.value }
                }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md mb-2"
              />
              <div className="flex gap-2">
                <input
                  type="time"
                  value={filters.availability.time}
                  onChange={(e) => setFilters(prev => ({
                    ...prev,
                    availability: { ...prev.availability, time: e.target.value }
                  }))}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md"
                />
                <select
                  value={filters.availability.partySize}
                  onChange={(e) => setFilters(prev => ({
                    ...prev,
                    availability: { ...prev.availability, partySize: parseInt(e.target.value) }
                  }))}
                  className="px-3 py-2 border border-gray-300 rounded-md"
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8].map(size => (
                    <option key={size} value={size}>{size} {size === 1 ? 'Guest' : 'Guests'}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Cuisine */}
            <div className="mb-6">
              <h3 className="font-medium mb-2">Cuisine</h3>
              <div className="space-y-2">
                {cuisineOptions.map(cuisine => (
                  <label key={cuisine} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={filters.cuisine.includes(cuisine)}
                      onChange={() => toggleFilter('cuisine', cuisine)}
                      className="mr-2"
                    />
                    {cuisine}
                  </label>
                ))}
              </div>
            </div>

            {/* Price Range */}
            <div className="mb-6">
              <h3 className="font-medium mb-2">Price Range</h3>
              <div className="flex gap-2">
                {priceOptions.map(price => (
                  <button
                    key={price}
                    onClick={() => toggleFilter('priceRange', price)}
                    className={`px-3 py-1 rounded ${
                      filters.priceRange.includes(price)
                        ? 'bg-indigo-600 text-white'
                        : 'bg-gray-200 text-gray-700'
                    }`}
                  >
                    {price}
                  </button>
                ))}
              </div>
            </div>

            {/* Rating */}
            <div className="mb-6">
              <h3 className="font-medium mb-2">Minimum Rating</h3>
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map(star => (
                  <button
                    key={star}
                    onClick={() => setFilters(prev => ({ ...prev, rating: star }))}
                    className={`text-2xl ${star <= filters.rating ? 'text-yellow-400' : 'text-gray-300'}`}
                  >
                    ⭐
                  </button>
                ))}
              </div>
            </div>

            {/* Features */}
            <div className="mb-6">
              <h3 className="font-medium mb-2">Features</h3>
              <div className="space-y-2">
                {featureOptions.map(feature => (
                  <label key={feature} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={filters.features.includes(feature)}
                      onChange={() => toggleFilter('features', feature)}
                      className="mr-2"
                    />
                    {feature}
                  </label>
                ))}
              </div>
            </div>

            {/* Dietary */}
            <div className="mb-6">
              <h3 className="font-medium mb-2">Dietary Options</h3>
              <div className="space-y-2">
                {dietaryOptions.map(diet => (
                  <label key={diet} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={filters.dietary.includes(diet)}
                      onChange={() => toggleFilter('dietary', diet)}
                      className="mr-2"
                    />
                    {diet}
                  </label>
                ))}
              </div>
            </div>

            {/* Distance */}
            <div className="mb-6">
              <h3 className="font-medium mb-2">Distance: {filters.distance} miles</h3>
              <input
                type="range"
                min="1"
                max="50"
                value={filters.distance}
                onChange={(e) => setFilters(prev => ({ ...prev, distance: parseInt(e.target.value) }))}
                className="w-full"
              />
            </div>
          </div>

          {/* Results */}
          <div className="flex-1">
            {loading ? (
              <div className="text-center py-8">Loading...</div>
            ) : results.length > 0 ? (
              <>
                <div className="mb-4 flex justify-between items-center">
                  <p className="text-gray-600">{results.length} restaurants found</p>
                  <select className="px-4 py-2 border border-gray-300 rounded-md">
                    <option>Sort by: Recommended</option>
                    <option>Sort by: Rating</option>
                    <option>Sort by: Price (Low to High)</option>
                    <option>Sort by: Price (High to Low)</option>
                    <option>Sort by: Distance</option>
                  </select>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {results.map(restaurant => (
                    <RestaurantCard key={restaurant.id} restaurant={restaurant} />
                  ))}
                </div>
              </>
            ) : (
              <div className="text-center py-8 text-gray-500">
                {query ? 'No restaurants found matching your criteria' : 'Enter a search query to find restaurants'}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}