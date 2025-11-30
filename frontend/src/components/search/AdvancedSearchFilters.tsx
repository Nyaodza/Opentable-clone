'use client';

import { useState } from 'react';
import { FunnelIcon, XMarkIcon } from '@heroicons/react/24/outline';

interface AdvancedSearchFiltersProps {
  onFilterChange: (filters: SearchFilters) => void;
  onClose?: () => void;
}

export interface SearchFilters {
  cuisine?: string[];
  priceRange?: string[];
  rating?: number;
  distance?: number;
  openNow?: boolean;
  acceptsReservations?: boolean;
  dietary?: string[];
  mealType?: string[];
  atmosphere?: string[];
  features?: string[];
  partySize?: number;
  date?: string;
  time?: string;
}

export default function AdvancedSearchFilters({ onFilterChange, onClose }: AdvancedSearchFiltersProps) {
  const [filters, setFilters] = useState<SearchFilters>({
    cuisine: [],
    priceRange: [],
    dietary: [],
    mealType: [],
    atmosphere: [],
    features: [],
  });

  const [showFilters, setShowFilters] = useState(false);

  const cuisines = [
    'Italian', 'Japanese', 'Mexican', 'American', 'Chinese', 'Thai',
    'French', 'Indian', 'Mediterranean', 'Korean', 'Vietnamese', 'Spanish'
  ];

  const priceRanges = [
    { value: '$', label: '$ (Under $15)' },
    { value: '$$', label: '$$ ($15-30)' },
    { value: '$$$', label: '$$$ ($30-60)' },
    { value: '$$$$', label: '$$$$ ($60+)' }
  ];

  const dietaryOptions = [
    'Vegetarian', 'Vegan', 'Gluten-Free', 'Dairy-Free', 
    'Nut-Free', 'Halal', 'Kosher', 'Keto'
  ];

  const mealTypes = ['Breakfast', 'Brunch', 'Lunch', 'Dinner', 'Late Night'];

  const atmospheres = [
    'Romantic', 'Family-Friendly', 'Business', 'Casual',
    'Fine Dining', 'Trendy', 'Quiet', 'Lively'
  ];

  const features = [
    'Outdoor Seating', 'Bar', 'Private Room', 'Live Music',
    'Happy Hour', 'WiFi', 'Parking', 'Wheelchair Accessible',
    'Pet Friendly', 'Fireplace', 'View', 'Waterfront'
  ];

  const toggleArrayFilter = (key: keyof SearchFilters, value: string) => {
    const currentArray = (filters[key] as string[]) || [];
    const newArray = currentArray.includes(value)
      ? currentArray.filter(item => item !== value)
      : [...currentArray, value];
    
    const newFilters = { ...filters, [key]: newArray };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  const updateFilter = (key: keyof SearchFilters, value: any) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  const clearFilters = () => {
    const emptyFilters: SearchFilters = {
      cuisine: [],
      priceRange: [],
      dietary: [],
      mealType: [],
      atmosphere: [],
      features: [],
    };
    setFilters(emptyFilters);
    onFilterChange(emptyFilters);
  };

  const getActiveFilterCount = () => {
    let count = 0;
    if (filters.cuisine && filters.cuisine.length > 0) count += filters.cuisine.length;
    if (filters.priceRange && filters.priceRange.length > 0) count += filters.priceRange.length;
    if (filters.dietary && filters.dietary.length > 0) count += filters.dietary.length;
    if (filters.mealType && filters.mealType.length > 0) count += filters.mealType.length;
    if (filters.atmosphere && filters.atmosphere.length > 0) count += filters.atmosphere.length;
    if (filters.features && filters.features.length > 0) count += filters.features.length;
    if (filters.openNow) count++;
    if (filters.rating) count++;
    return count;
  };

  const activeCount = getActiveFilterCount();

  return (
    <div className="bg-white rounded-lg shadow-lg">
      {/* Filter Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <FunnelIcon className="w-5 h-5 text-gray-600" />
          <h2 className="text-lg font-semibold">Advanced Filters</h2>
          {activeCount > 0 && (
            <span className="bg-indigo-600 text-white text-xs font-bold px-2 py-1 rounded-full">
              {activeCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {activeCount > 0 && (
            <button
              onClick={clearFilters}
              className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
            >
              Clear All
            </button>
          )}
          {onClose && (
            <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
              <XMarkIcon className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      <div className="p-4 max-h-[600px] overflow-y-auto">
        {/* Quick Filters */}
        <div className="mb-6">
          <h3 className="font-semibold mb-3">Quick Filters</h3>
          <div className="flex flex-wrap gap-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={filters.openNow || false}
                onChange={(e) => updateFilter('openNow', e.target.checked)}
                className="rounded"
              />
              <span className="text-sm">Open Now</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={filters.acceptsReservations || false}
                onChange={(e) => updateFilter('acceptsReservations', e.target.checked)}
                className="rounded"
              />
              <span className="text-sm">Accepts Reservations</span>
            </label>
          </div>
        </div>

        {/* Distance Slider */}
        <div className="mb-6">
          <h3 className="font-semibold mb-3">Distance</h3>
          <input
            type="range"
            min="1"
            max="50"
            value={filters.distance || 10}
            onChange={(e) => updateFilter('distance', parseInt(e.target.value))}
            className="w-full"
          />
          <div className="flex justify-between text-sm text-gray-600 mt-1">
            <span>1 km</span>
            <span>{filters.distance || 10} km</span>
            <span>50 km</span>
          </div>
        </div>

        {/* Rating */}
        <div className="mb-6">
          <h3 className="font-semibold mb-3">Minimum Rating</h3>
          <div className="flex gap-2">
            {[3, 3.5, 4, 4.5, 5].map((rating) => (
              <button
                key={rating}
                onClick={() => updateFilter('rating', filters.rating === rating ? undefined : rating)}
                className={`px-4 py-2 rounded-lg border ${
                  filters.rating === rating
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'bg-white border-gray-300 hover:border-indigo-600'
                }`}
              >
                {rating}⭐
              </button>
            ))}
          </div>
        </div>

        {/* Price Range */}
        <div className="mb-6">
          <h3 className="font-semibold mb-3">Price Range</h3>
          <div className="grid grid-cols-2 gap-2">
            {priceRanges.map((range) => (
              <button
                key={range.value}
                onClick={() => toggleArrayFilter('priceRange', range.value)}
                className={`px-4 py-2 rounded-lg border text-sm ${
                  filters.priceRange?.includes(range.value)
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'bg-white border-gray-300 hover:border-indigo-600'
                }`}
              >
                {range.label}
              </button>
            ))}
          </div>
        </div>

        {/* Cuisine */}
        <div className="mb-6">
          <h3 className="font-semibold mb-3">Cuisine</h3>
          <div className="flex flex-wrap gap-2">
            {cuisines.map((cuisine) => (
              <button
                key={cuisine}
                onClick={() => toggleArrayFilter('cuisine', cuisine)}
                className={`px-3 py-1 rounded-full text-sm ${
                  filters.cuisine?.includes(cuisine)
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {cuisine}
              </button>
            ))}
          </div>
        </div>

        {/* Dietary Options */}
        <div className="mb-6">
          <h3 className="font-semibold mb-3">Dietary Options</h3>
          <div className="flex flex-wrap gap-2">
            {dietaryOptions.map((option) => (
              <button
                key={option}
                onClick={() => toggleArrayFilter('dietary', option)}
                className={`px-3 py-1 rounded-full text-sm ${
                  filters.dietary?.includes(option)
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {option}
              </button>
            ))}
          </div>
        </div>

        {/* Meal Type */}
        <div className="mb-6">
          <h3 className="font-semibold mb-3">Meal Type</h3>
          <div className="flex flex-wrap gap-2">
            {mealTypes.map((meal) => (
              <button
                key={meal}
                onClick={() => toggleArrayFilter('mealType', meal)}
                className={`px-3 py-1 rounded-full text-sm ${
                  filters.mealType?.includes(meal)
                    ? 'bg-orange-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {meal}
              </button>
            ))}
          </div>
        </div>

        {/* Atmosphere */}
        <div className="mb-6">
          <h3 className="font-semibold mb-3">Atmosphere</h3>
          <div className="flex flex-wrap gap-2">
            {atmospheres.map((atm) => (
              <button
                key={atm}
                onClick={() => toggleArrayFilter('atmosphere', atm)}
                className={`px-3 py-1 rounded-full text-sm ${
                  filters.atmosphere?.includes(atm)
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {atm}
              </button>
            ))}
          </div>
        </div>

        {/* Features */}
        <div className="mb-6">
          <h3 className="font-semibold mb-3">Features & Amenities</h3>
          <div className="grid grid-cols-2 gap-2">
            {features.map((feature) => (
              <label key={feature} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.features?.includes(feature) || false}
                  onChange={() => toggleArrayFilter('features', feature)}
                  className="rounded"
                />
                <span className="text-sm">{feature}</span>
              </label>
            ))}
          </div>
        </div>
      </div>

      {/* Apply Button */}
      <div className="p-4 border-t bg-gray-50">
        <button
          onClick={() => onClose && onClose()}
          className="w-full bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700 transition"
        >
          Apply Filters
        </button>
      </div>
    </div>
  );
}
