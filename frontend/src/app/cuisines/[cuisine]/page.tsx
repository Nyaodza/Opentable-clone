'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

interface Restaurant {
  id: string;
  name: string;
  location: string;
  rating: number;
  reviews: number;
  priceRange: string;
  image: string;
  availableTimes: string[];
}

// Mock cuisine data
const cuisineInfo: Record<string, { name: string; description: string; image: string }> = {
  italian: {
    name: 'Italian',
    description: 'Discover authentic Italian cuisine from pasta and pizza to risotto and tiramisu. Experience the rich flavors of Italy\'s culinary traditions.',
    image: 'https://images.unsplash.com/photo-1498579150354-977475b7ea0b?w=800'
  },
  french: {
    name: 'French',
    description: 'Indulge in the elegance of French gastronomy. From classic bistro fare to haute cuisine, explore the art of French cooking.',
    image: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800'
  },
  japanese: {
    name: 'Japanese',
    description: 'Experience the precision and artistry of Japanese cuisine. From sushi and ramen to kaiseki and izakaya dining.',
    image: 'https://images.unsplash.com/photo-1579584425555-c3ce17fd4351?w=800'
  },
  mexican: {
    name: 'Mexican',
    description: 'Savor the bold flavors of Mexican cuisine. Enjoy authentic tacos, enchiladas, moles, and more.',
    image: 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=800'
  },
  indian: {
    name: 'Indian',
    description: 'Explore the diverse and aromatic world of Indian cuisine. From curries and tandoori to biryani and dosas.',
    image: 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=800'
  },
  chinese: {
    name: 'Chinese',
    description: 'Discover the regional diversity of Chinese cuisine. From Cantonese dim sum to Sichuan spice and beyond.',
    image: 'https://images.unsplash.com/photo-1525755662778-989d0524087e?w=800'
  },
  thai: {
    name: 'Thai',
    description: 'Experience the perfect balance of sweet, sour, salty, and spicy in Thai cuisine. From pad thai to green curry.',
    image: 'https://images.unsplash.com/photo-1562565652-a0d8f0c59eb4?w=800'
  },
  mediterranean: {
    name: 'Mediterranean',
    description: 'Enjoy the fresh, healthy flavors of Mediterranean cuisine. Olive oil, fresh vegetables, seafood, and more.',
    image: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=800'
  },
  american: {
    name: 'American',
    description: 'From classic comfort food to modern American cuisine. Burgers, BBQ, farm-to-table, and everything in between.',
    image: 'https://images.unsplash.com/photo-1550547660-d9450f859349?w=800'
  },
  seafood: {
    name: 'Seafood',
    description: 'Fresh catches and oceanic delights. From oyster bars to fine dining seafood restaurants.',
    image: 'https://images.unsplash.com/photo-1535140728325-a4d3707eee61?w=800'
  },
  steakhouse: {
    name: 'Steakhouse',
    description: 'Premium cuts and expert preparation. Experience the finest steakhouses for meat lovers.',
    image: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=800'
  },
  pizza: {
    name: 'Pizza',
    description: 'From Neapolitan to New York style, deep dish to artisan. Find your perfect pizza.',
    image: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800'
  }
};

const mockRestaurants: Restaurant[] = [
  {
    id: '1',
    name: 'Bella Italia',
    location: 'Downtown',
    rating: 4.7,
    reviews: 324,
    priceRange: '$$',
    image: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400',
    availableTimes: ['6:00 PM', '7:00 PM', '8:00 PM']
  },
  {
    id: '2',
    name: 'Trattoria Roma',
    location: 'Midtown',
    rating: 4.5,
    reviews: 218,
    priceRange: '$$$',
    image: 'https://images.unsplash.com/photo-1552566626-52f8b828add9?w=400',
    availableTimes: ['5:30 PM', '7:30 PM', '9:00 PM']
  },
  {
    id: '3',
    name: 'La Cucina',
    location: 'Little Italy',
    rating: 4.8,
    reviews: 456,
    priceRange: '$$$$',
    image: 'https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=400',
    availableTimes: ['6:30 PM', '8:30 PM']
  },
  {
    id: '4',
    name: 'Pasta Paradise',
    location: 'West Village',
    rating: 4.4,
    reviews: 189,
    priceRange: '$$',
    image: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=400',
    availableTimes: ['5:00 PM', '6:00 PM', '7:00 PM', '8:00 PM']
  },
  {
    id: '5',
    name: 'Osteria del Mare',
    location: 'Financial District',
    rating: 4.6,
    reviews: 278,
    priceRange: '$$$',
    image: 'https://images.unsplash.com/photo-1466978913421-dad2ebd01d17?w=400',
    availableTimes: ['7:00 PM', '8:00 PM', '9:00 PM']
  },
  {
    id: '6',
    name: 'Il Giardino',
    location: 'Upper East Side',
    rating: 4.3,
    reviews: 156,
    priceRange: '$$',
    image: 'https://images.unsplash.com/photo-1559339352-11d035aa65de?w=400',
    availableTimes: ['6:00 PM', '7:30 PM', '8:30 PM']
  }
];

export default function CuisinePage() {
  const params = useParams();
  const cuisineSlug = params.cuisine as string;
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sortBy, setSortBy] = useState('rating');
  const [priceFilter, setPriceFilter] = useState('all');

  const cuisine = cuisineInfo[cuisineSlug?.toLowerCase()] || {
    name: cuisineSlug?.charAt(0).toUpperCase() + cuisineSlug?.slice(1) || 'Cuisine',
    description: `Discover the best ${cuisineSlug} restaurants near you.`,
    image: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800'
  };

  useEffect(() => {
    // Simulate API fetch
    const loadRestaurants = async () => {
      await new Promise(resolve => setTimeout(resolve, 500));
      setRestaurants(mockRestaurants);
      setIsLoading(false);
    };
    loadRestaurants();
  }, [cuisineSlug]);

  const filteredRestaurants = restaurants
    .filter(r => priceFilter === 'all' || r.priceRange === priceFilter)
    .sort((a, b) => {
      if (sortBy === 'rating') return b.rating - a.rating;
      if (sortBy === 'reviews') return b.reviews - a.reviews;
      return 0;
    });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <div className="relative h-64 md:h-80 bg-gray-900">
        <img
          src={cuisine.image}
          alt={cuisine.name}
          className="w-full h-full object-cover opacity-60"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-gray-900 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-8">
          <div className="max-w-7xl mx-auto">
            <nav className="text-sm text-white/70 mb-2">
              <Link href="/" className="hover:text-white">Home</Link>
              <span className="mx-2">/</span>
              <Link href="/cuisines" className="hover:text-white">Cuisines</Link>
              <span className="mx-2">/</span>
              <span className="text-white">{cuisine.name}</span>
            </nav>
            <h1 className="text-4xl font-bold text-white mb-2">{cuisine.name} Restaurants</h1>
            <p className="text-white/90 max-w-2xl">{cuisine.description}</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <span className="text-gray-600">
                {filteredRestaurants.length} restaurants found
              </span>
            </div>
            <div className="flex items-center gap-4">
              <select
                value={priceFilter}
                onChange={(e) => setPriceFilter(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600"
              >
                <option value="all">All Prices</option>
                <option value="$">$</option>
                <option value="$$">$$</option>
                <option value="$$$">$$$</option>
                <option value="$$$$">$$$$</option>
              </select>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600"
              >
                <option value="rating">Highest Rated</option>
                <option value="reviews">Most Reviewed</option>
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
                  <div className="h-4 bg-gray-200 rounded w-2/3" />
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
                className="bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-md transition-shadow"
              >
                <div className="h-48 relative">
                  <img
                    src={restaurant.image}
                    alt={restaurant.name}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-3 right-3 bg-white px-2 py-1 rounded text-sm font-medium">
                    {restaurant.priceRange}
                  </div>
                </div>
                <div className="p-4">
                  <h3 className="text-xl font-semibold text-gray-900 mb-1">{restaurant.name}</h3>
                  <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                    <span className="text-yellow-400">★</span>
                    <span>{restaurant.rating}</span>
                    <span>({restaurant.reviews} reviews)</span>
                  </div>
                  <p className="text-gray-600 text-sm mb-3">📍 {restaurant.location}</p>
                  
                  <div className="flex flex-wrap gap-2">
                    {restaurant.availableTimes.slice(0, 3).map((time) => (
                      <span
                        key={time}
                        className="px-3 py-1 bg-red-50 text-red-600 rounded-full text-sm"
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
            <div className="text-6xl mb-4">🍽️</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No restaurants found</h3>
            <p className="text-gray-600 mb-6">Try adjusting your filters or browse all restaurants.</p>
            <Link
              href="/restaurants"
              className="bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700"
            >
              Browse All Restaurants
            </Link>
          </div>
        )}
      </div>

      {/* Related Cuisines */}
      <div className="bg-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Explore Other Cuisines</h2>
          <div className="flex flex-wrap gap-3">
            {Object.entries(cuisineInfo)
              .filter(([slug]) => slug !== cuisineSlug?.toLowerCase())
              .slice(0, 8)
              .map(([slug, info]) => (
                <Link
                  key={slug}
                  href={`/cuisines/${slug}`}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-full hover:bg-red-50 hover:text-red-600 transition-colors"
                >
                  {info.name}
                </Link>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
}


