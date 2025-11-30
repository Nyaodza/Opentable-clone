'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

interface Restaurant {
  id: string;
  name: string;
  cuisine: string;
  neighborhood: string;
  rating: number;
  reviews: number;
  priceRange: string;
  image: string;
  availableTimes: string[];
}

// Mock city data
const cityInfo: Record<string, { name: string; state: string; description: string; image: string; neighborhoods: string[] }> = {
  'new-york': {
    name: 'New York',
    state: 'NY',
    description: 'The culinary capital of America. From Michelin-starred restaurants to iconic pizzerias, NYC offers endless dining possibilities.',
    image: 'https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=800',
    neighborhoods: ['Manhattan', 'Brooklyn', 'Queens', 'SoHo', 'Tribeca', 'Williamsburg']
  },
  'los-angeles': {
    name: 'Los Angeles',
    state: 'CA',
    description: 'A melting pot of global cuisines with a focus on fresh, local ingredients and innovative dining concepts.',
    image: 'https://images.unsplash.com/photo-1534190760961-74e8c1c5c3da?w=800',
    neighborhoods: ['Downtown', 'Santa Monica', 'Beverly Hills', 'Hollywood', 'West Hollywood', 'Silver Lake']
  },
  'chicago': {
    name: 'Chicago',
    state: 'IL',
    description: 'Home to deep-dish pizza, world-class steakhouses, and an innovative culinary scene along the lake.',
    image: 'https://images.unsplash.com/photo-1494522855154-9297ac14b55f?w=800',
    neighborhoods: ['River North', 'West Loop', 'Lincoln Park', 'Wicker Park', 'Gold Coast', 'Pilsen']
  },
  'san-francisco': {
    name: 'San Francisco',
    state: 'CA',
    description: 'Pioneering farm-to-table dining, diverse ethnic cuisines, and breathtaking views.',
    image: 'https://images.unsplash.com/photo-1501594907352-04cda38ebc29?w=800',
    neighborhoods: ['Mission', 'Marina', 'North Beach', 'Hayes Valley', 'SOMA', 'Nob Hill']
  },
  'miami': {
    name: 'Miami',
    state: 'FL',
    description: 'Latin flavors meet beach vibes. Experience Cuban, Caribbean, and upscale waterfront dining.',
    image: 'https://images.unsplash.com/photo-1506966953602-c20cc11f75e3?w=800',
    neighborhoods: ['South Beach', 'Brickell', 'Wynwood', 'Coral Gables', 'Design District', 'Little Havana']
  },
  'seattle': {
    name: 'Seattle',
    state: 'WA',
    description: 'Fresh seafood, craft coffee culture, and Pacific Northwest innovation.',
    image: 'https://images.unsplash.com/photo-1502175353174-a7a70e73b362?w=800',
    neighborhoods: ['Capitol Hill', 'Pike Place', 'Ballard', 'Queen Anne', 'Fremont', 'South Lake Union']
  },
  'boston': {
    name: 'Boston',
    state: 'MA',
    description: 'Historic charm meets contemporary dining. Famous for seafood and Italian cuisine.',
    image: 'https://images.unsplash.com/photo-1501979376754-2ff867a4f659?w=800',
    neighborhoods: ['North End', 'Back Bay', 'Beacon Hill', 'Seaport', 'Cambridge', 'South End']
  },
  'austin': {
    name: 'Austin',
    state: 'TX',
    description: 'Keep it weird with Texas BBQ, Tex-Mex, and a thriving food truck scene.',
    image: 'https://images.unsplash.com/photo-1531218150217-54595bc2b934?w=800',
    neighborhoods: ['Downtown', 'East Austin', 'South Congress', 'Rainey Street', 'Mueller', 'Zilker']
  }
};

const mockRestaurants: Restaurant[] = [
  {
    id: '1',
    name: 'The Modern',
    cuisine: 'American',
    neighborhood: 'Midtown',
    rating: 4.8,
    reviews: 1234,
    priceRange: '$$$$',
    image: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400',
    availableTimes: ['6:00 PM', '7:30 PM', '9:00 PM']
  },
  {
    id: '2',
    name: 'Eleven Madison Park',
    cuisine: 'Contemporary',
    neighborhood: 'Flatiron',
    rating: 4.9,
    reviews: 2156,
    priceRange: '$$$$',
    image: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=400',
    availableTimes: ['5:30 PM', '8:00 PM']
  },
  {
    id: '3',
    name: 'Carbone',
    cuisine: 'Italian',
    neighborhood: 'Greenwich Village',
    rating: 4.7,
    reviews: 1876,
    priceRange: '$$$',
    image: 'https://images.unsplash.com/photo-1552566626-52f8b828add9?w=400',
    availableTimes: ['7:00 PM', '8:30 PM', '9:30 PM']
  },
  {
    id: '4',
    name: 'Le Bernardin',
    cuisine: 'French Seafood',
    neighborhood: 'Midtown West',
    rating: 4.9,
    reviews: 3421,
    priceRange: '$$$$',
    image: 'https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=400',
    availableTimes: ['6:30 PM', '8:00 PM']
  },
  {
    id: '5',
    name: 'Gramercy Tavern',
    cuisine: 'American',
    neighborhood: 'Gramercy',
    rating: 4.6,
    reviews: 987,
    priceRange: '$$$',
    image: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=400',
    availableTimes: ['5:00 PM', '6:00 PM', '7:00 PM', '8:00 PM']
  },
  {
    id: '6',
    name: 'Masa',
    cuisine: 'Japanese',
    neighborhood: 'Columbus Circle',
    rating: 4.8,
    reviews: 654,
    priceRange: '$$$$',
    image: 'https://images.unsplash.com/photo-1579584425555-c3ce17fd4351?w=400',
    availableTimes: ['6:00 PM', '8:30 PM']
  }
];

export default function CityPage() {
  const params = useParams();
  const citySlug = params.city as string;
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedNeighborhood, setSelectedNeighborhood] = useState('all');
  const [selectedCuisine, setSelectedCuisine] = useState('all');

  const city = cityInfo[citySlug?.toLowerCase()] || {
    name: citySlug?.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') || 'City',
    state: '',
    description: `Discover the best restaurants in ${citySlug}.`,
    image: 'https://images.unsplash.com/photo-1480714378408-67cf0d13bc1b?w=800',
    neighborhoods: ['Downtown', 'Midtown', 'Uptown']
  };

  useEffect(() => {
    const loadRestaurants = async () => {
      await new Promise(resolve => setTimeout(resolve, 500));
      setRestaurants(mockRestaurants);
      setIsLoading(false);
    };
    loadRestaurants();
  }, [citySlug]);

  const cuisines = [...new Set(restaurants.map(r => r.cuisine))];

  const filteredRestaurants = restaurants
    .filter(r => selectedNeighborhood === 'all' || r.neighborhood === selectedNeighborhood)
    .filter(r => selectedCuisine === 'all' || r.cuisine === selectedCuisine);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <div className="relative h-72 md:h-96 bg-gray-900">
        <img
          src={city.image}
          alt={city.name}
          className="w-full h-full object-cover opacity-60"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/50 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-8">
          <div className="max-w-7xl mx-auto">
            <nav className="text-sm text-white/70 mb-2">
              <Link href="/" className="hover:text-white">Home</Link>
              <span className="mx-2">/</span>
              <Link href="/cities" className="hover:text-white">Cities</Link>
              <span className="mx-2">/</span>
              <span className="text-white">{city.name}</span>
            </nav>
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-2">
              {city.name}{city.state && `, ${city.state}`}
            </h1>
            <p className="text-white/90 max-w-2xl text-lg">{city.description}</p>
          </div>
        </div>
      </div>

      {/* Neighborhoods */}
      <div className="bg-white border-b border-gray-200 py-4 overflow-x-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <span className="text-gray-600 whitespace-nowrap font-medium">Neighborhoods:</span>
            <button
              onClick={() => setSelectedNeighborhood('all')}
              className={`px-4 py-2 rounded-full whitespace-nowrap transition-colors ${
                selectedNeighborhood === 'all'
                  ? 'bg-red-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              All
            </button>
            {city.neighborhoods.map((neighborhood) => (
              <button
                key={neighborhood}
                onClick={() => setSelectedNeighborhood(neighborhood)}
                className={`px-4 py-2 rounded-full whitespace-nowrap transition-colors ${
                  selectedNeighborhood === neighborhood
                    ? 'bg-red-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {neighborhood}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <span className="text-gray-600">
              {filteredRestaurants.length} restaurants in {city.name}
            </span>
            <div className="flex items-center gap-4">
              <select
                value={selectedCuisine}
                onChange={(e) => setSelectedCuisine(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600"
              >
                <option value="all">All Cuisines</option>
                {cuisines.map((cuisine) => (
                  <option key={cuisine} value={cuisine}>{cuisine}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Restaurant Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {isLoading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white rounded-lg shadow-sm overflow-hidden animate-pulse">
                <div className="h-48 bg-gray-200" />
                <div className="p-4 space-y-3">
                  <div className="h-6 bg-gray-200 rounded w-3/4" />
                  <div className="h-4 bg-gray-200 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredRestaurants.map((restaurant) => (
              <Link
                key={restaurant.id}
                href={`/restaurants/${restaurant.id}`}
                className="bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-md transition-shadow group"
              >
                <div className="h-48 relative overflow-hidden">
                  <img
                    src={restaurant.image}
                    alt={restaurant.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute top-3 left-3 bg-white px-2 py-1 rounded text-sm font-medium text-gray-700">
                    {restaurant.cuisine}
                  </div>
                  <div className="absolute top-3 right-3 bg-white px-2 py-1 rounded text-sm font-medium">
                    {restaurant.priceRange}
                  </div>
                </div>
                <div className="p-4">
                  <h3 className="text-xl font-semibold text-gray-900 mb-1">{restaurant.name}</h3>
                  <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                    <span className="text-yellow-400">★</span>
                    <span className="font-medium">{restaurant.rating}</span>
                    <span>({restaurant.reviews.toLocaleString()} reviews)</span>
                  </div>
                  <p className="text-gray-600 text-sm mb-3">📍 {restaurant.neighborhood}</p>
                  
                  <div className="flex flex-wrap gap-2">
                    {restaurant.availableTimes.slice(0, 3).map((time) => (
                      <span
                        key={time}
                        className="px-3 py-1 bg-red-50 text-red-600 rounded-full text-sm font-medium"
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

        {!isLoading && filteredRestaurants.length === 0 && (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">🏙️</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No restaurants found</h3>
            <p className="text-gray-600 mb-6">Try adjusting your filters or explore other neighborhoods.</p>
            <button
              onClick={() => { setSelectedNeighborhood('all'); setSelectedCuisine('all'); }}
              className="bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700"
            >
              Clear Filters
            </button>
          </div>
        )}
      </div>

      {/* Other Cities */}
      <div className="bg-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Explore Other Cities</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(cityInfo)
              .filter(([slug]) => slug !== citySlug?.toLowerCase())
              .slice(0, 8)
              .map(([slug, info]) => (
                <Link
                  key={slug}
                  href={`/cities/${slug}`}
                  className="relative h-32 rounded-lg overflow-hidden group"
                >
                  <img
                    src={info.image}
                    alt={info.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                  <div className="absolute bottom-3 left-3 text-white">
                    <p className="font-semibold">{info.name}</p>
                    <p className="text-sm text-white/80">{info.state}</p>
                  </div>
                </Link>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
}


