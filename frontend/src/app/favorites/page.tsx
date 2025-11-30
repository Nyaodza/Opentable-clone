'use client';

import React, { useState } from 'react';
import Link from 'next/link';

interface FavoriteRestaurant {
  id: string;
  name: string;
  cuisine: string;
  location: string;
  rating: number;
  priceRange: string;
  imageUrl: string;
  addedDate: string;
}

// Mock favorite restaurants data
const mockFavorites: FavoriteRestaurant[] = [
  {
    id: '1',
    name: 'The Modern Bistro',
    cuisine: 'French',
    location: 'Downtown',
    rating: 4.8,
    priceRange: '$$$',
    imageUrl: '/images/restaurant1.jpg',
    addedDate: '2025-01-10'
  },
  {
    id: '2',
    name: 'Sakura Sushi House',
    cuisine: 'Japanese',
    location: 'Midtown',
    rating: 4.9,
    priceRange: '$$$$',
    imageUrl: '/images/restaurant2.jpg',
    addedDate: '2025-01-05'
  },
  {
    id: '5',
    name: 'Spice Garden',
    cuisine: 'Indian',
    location: 'East Side',
    rating: 4.5,
    priceRange: '$$',
    imageUrl: '/images/restaurant5.jpg',
    addedDate: '2024-12-28'
  }
];

export default function FavoritesPage() {
  const [favorites, setFavorites] = useState<FavoriteRestaurant[]>(mockFavorites);
  const [sortBy, setSortBy] = useState('recent');

  const sortedFavorites = [...favorites].sort((a, b) => {
    switch (sortBy) {
      case 'recent':
        return new Date(b.addedDate).getTime() - new Date(a.addedDate).getTime();
      case 'rating':
        return b.rating - a.rating;
      case 'name':
        return a.name.localeCompare(b.name);
      default:
        return 0;
    }
  });

  const handleRemoveFavorite = (id: string) => {
    if (confirm('Are you sure you want to remove this restaurant from your favorites?')) {
      setFavorites(prev => prev.filter(fav => fav.id !== id));
    }
  };

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
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">My Favorite Restaurants</h1>
          <p className="text-gray-600">Save your favorite restaurants for quick access</p>
        </div>

        {favorites.length > 0 ? (
          <>
            {/* Sort Options */}
            <div className="mb-6 flex justify-between items-center">
              <p className="text-gray-600">{favorites.length} favorite{favorites.length !== 1 ? 's' : ''}</p>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-600"
              >
                <option value="recent">Recently Added</option>
                <option value="rating">Highest Rated</option>
                <option value="name">Name (A-Z)</option>
              </select>
            </div>

            {/* Favorites Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {sortedFavorites.map((restaurant) => (
                <div key={restaurant.id} className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow overflow-hidden">
                  <div className="relative">
                    <div className="h-48 bg-gray-300">
                      <div className="w-full h-full flex items-center justify-center text-gray-500">
                        🍽️
                      </div>
                    </div>
                    <button
                      onClick={() => handleRemoveFavorite(restaurant.id)}
                      className="absolute top-2 right-2 p-2 bg-white rounded-full shadow-md hover:bg-gray-100 transition-colors"
                      aria-label="Remove from favorites"
                    >
                      <span className="text-red-600">❤️</span>
                    </button>
                  </div>
                  
                  <div className="p-4">
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">{restaurant.name}</h3>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-600">{restaurant.cuisine}</span>
                      <span className="text-sm font-medium">{restaurant.priceRange}</span>
                    </div>
                    <div className="mb-3">
                      {renderStars(restaurant.rating)}
                    </div>
                    <p className="text-sm text-gray-600 mb-4">📍 {restaurant.location}</p>
                    
                    <div className="flex gap-2">
                      <Link
                        href={`/restaurants/${restaurant.id}`}
                        className="flex-1 text-center bg-red-600 text-white py-2 rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
                      >
                        View Details
                      </Link>
                      <Link
                        href={`/restaurants/${restaurant.id}#reserve`}
                        className="flex-1 text-center border border-red-600 text-red-600 py-2 rounded-lg hover:bg-red-50 transition-colors text-sm font-medium"
                      >
                        Reserve
                      </Link>
                    </div>
                    
                    <p className="text-xs text-gray-500 mt-3">
                      Added on {new Date(restaurant.addedDate).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">❤️</div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">No favorites yet</h2>
            <p className="text-gray-600 mb-6">Start exploring restaurants and save your favorites here!</p>
            <Link
              href="/restaurants"
              className="inline-block bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700 transition-colors"
            >
              Browse Restaurants
            </Link>
          </div>
        )}

        {/* Tips Section */}
        <div className="mt-12 bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-semibold mb-4">Tips for Using Favorites</h2>
          <div className="grid md:grid-cols-3 gap-6">
            <div>
              <div className="text-2xl mb-2">⚡</div>
              <h3 className="font-medium mb-1">Quick Access</h3>
              <p className="text-sm text-gray-600">Save time by keeping your go-to restaurants in one place</p>
            </div>
            <div>
              <div className="text-2xl mb-2">🔔</div>
              <h3 className="font-medium mb-1">Get Notifications</h3>
              <p className="text-sm text-gray-600">Be the first to know about special offers from your favorites</p>
            </div>
            <div>
              <div className="text-2xl mb-2">📱</div>
              <h3 className="font-medium mb-1">Sync Across Devices</h3>
              <p className="text-sm text-gray-600">Your favorites are available on all your devices</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}