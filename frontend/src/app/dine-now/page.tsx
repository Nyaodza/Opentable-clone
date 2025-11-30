'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ClockIcon, MapPinIcon, UserGroupIcon } from '@heroicons/react/24/outline';

interface DineNowRestaurant {
  restaurant: {
    id: string;
    name: string;
    cuisine: string;
    address: string;
    priceRange: string;
    rating: number;
    images: string[];
  };
  availableTables: number;
  estimatedWaitTime: number;
  distance?: number;
}

export default function DineNowPage() {
  const router = useRouter();
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [partySize, setPartySize] = useState(2);
  const [restaurants, setRestaurants] = useState<DineNowRestaurant[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [filters, setFilters] = useState({
    cuisine: '',
    priceRange: '',
    maxDistance: 10,
  });

  useEffect(() => {
    // Get user's location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        (error) => {
          console.error('Location error:', error);
        }
      );
    }
  }, []);

  const searchDineNow = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        partySize: partySize.toString(),
        ...(location && {
          latitude: location.lat.toString(),
          longitude: location.lng.toString(),
        }),
        maxDistance: filters.maxDistance.toString(),
        ...(filters.cuisine && { cuisine: filters.cuisine }),
        ...(filters.priceRange && { priceRange: filters.priceRange }),
      });

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/dine-now?${params}`
      );
      const data = await response.json();

      if (data.success) {
        setRestaurants(data.data);
        setHasSearched(true);
      }
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBook = (restaurant: DineNowRestaurant) => {
    router.push(
      `/guest-booking?restaurantId=${restaurant.restaurant.id}&restaurantName=${encodeURIComponent(restaurant.restaurant.name)}&partySize=${partySize}&dineNow=true`
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-orange-500 to-red-600 text-white py-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-5xl font-bold mb-4">🍽️ Dine Now</h1>
          <p className="text-xl mb-8">
            Find restaurants with immediate availability. No waiting, just dining!
          </p>

          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 text-left">
                  Party Size
                </label>
                <select
                  value={partySize}
                  onChange={(e) => setPartySize(parseInt(e.target.value))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900"
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((size) => (
                    <option key={size} value={size}>
                      {size} {size === 1 ? 'guest' : 'guests'}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 text-left">
                  Cuisine
                </label>
                <select
                  value={filters.cuisine}
                  onChange={(e) => setFilters({ ...filters, cuisine: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900"
                >
                  <option value="">Any</option>
                  <option value="italian">Italian</option>
                  <option value="japanese">Japanese</option>
                  <option value="mexican">Mexican</option>
                  <option value="american">American</option>
                  <option value="chinese">Chinese</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 text-left">
                  Distance
                </label>
                <select
                  value={filters.maxDistance}
                  onChange={(e) =>
                    setFilters({ ...filters, maxDistance: parseInt(e.target.value) })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900"
                >
                  <option value="5">Within 5 km</option>
                  <option value="10">Within 10 km</option>
                  <option value="25">Within 25 km</option>
                  <option value="50">Within 50 km</option>
                </select>
              </div>

              <div className="flex items-end">
                <button
                  onClick={searchDineNow}
                  disabled={isLoading}
                  className="w-full bg-orange-600 text-white py-2 rounded-lg font-semibold hover:bg-orange-700 transition disabled:opacity-50"
                >
                  {isLoading ? 'Searching...' : 'Find Tables'}
                </button>
              </div>
            </div>

            {!location && (
              <p className="text-sm text-gray-500 mt-4 text-left">
                📍 Enable location services for distance-based results
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Results Section */}
      <div className="max-w-7xl mx-auto px-4 py-12">
        {isLoading && (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Finding available restaurants...</p>
          </div>
        )}

        {!isLoading && hasSearched && restaurants.length === 0 && (
          <div className="text-center py-12">
            <p className="text-xl text-gray-600">
              No restaurants with immediate availability found.
            </p>
            <p className="text-gray-500 mt-2">Try adjusting your filters or booking for later.</p>
          </div>
        )}

        {!isLoading && restaurants.length > 0 && (
          <>
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900">
                {restaurants.length} Restaurants Available Now
              </h2>
              <p className="text-gray-600">Sorted by wait time and distance</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {restaurants.map((item) => (
                <div
                  key={item.restaurant.id}
                  className="bg-white rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition"
                >
                  <div className="relative h-48">
                    <img
                      src={item.restaurant.images?.[0] || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400'}
                      alt={item.restaurant.name}
                      className="w-full h-full object-cover"
                    />
                    {item.estimatedWaitTime === 0 && (
                      <div className="absolute top-4 right-4 bg-green-500 text-white px-3 py-1 rounded-full text-sm font-semibold">
                        Available Now!
                      </div>
                    )}
                    {item.estimatedWaitTime > 0 && (
                      <div className="absolute top-4 right-4 bg-orange-500 text-white px-3 py-1 rounded-full text-sm font-semibold">
                        {item.estimatedWaitTime} min wait
                      </div>
                    )}
                  </div>

                  <div className="p-6">
                    <h3 className="text-xl font-bold text-gray-900 mb-2">
                      {item.restaurant.name}
                    </h3>
                    <p className="text-gray-600 mb-4">
                      {item.restaurant.cuisine} • {item.restaurant.priceRange}
                    </p>

                    <div className="space-y-2 mb-4">
                      <div className="flex items-center text-sm text-gray-600">
                        <MapPinIcon className="w-4 h-4 mr-2" />
                        {item.distance
                          ? `${item.distance.toFixed(1)} km away`
                          : item.restaurant.address}
                      </div>
                      <div className="flex items-center text-sm text-gray-600">
                        <UserGroupIcon className="w-4 h-4 mr-2" />
                        {item.availableTables} tables available
                      </div>
                      <div className="flex items-center text-sm text-gray-600">
                        <ClockIcon className="w-4 h-4 mr-2" />
                        {item.estimatedWaitTime === 0
                          ? 'Immediate seating'
                          : `Ready in ~${item.estimatedWaitTime} minutes`}
                      </div>
                    </div>

                    <button
                      onClick={() => handleBook(item)}
                      className="w-full bg-orange-600 text-white py-2 rounded-lg font-semibold hover:bg-orange-700 transition"
                    >
                      Book Now
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
