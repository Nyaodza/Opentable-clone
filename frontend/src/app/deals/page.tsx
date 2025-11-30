'use client';

import React, { useState } from 'react';
import Link from 'next/link';

interface Deal {
  id: string;
  title: string;
  description: string;
  restaurant: {
    id: string;
    name: string;
    cuisine: string;
    location: string;
    rating: number;
  };
  discount: string;
  originalPrice?: number;
  discountedPrice?: number;
  validUntil: string;
  terms: string[];
  type: 'percentage' | 'fixed' | 'special';
  category: 'lunch' | 'dinner' | 'brunch' | 'happy-hour' | 'wine' | 'special-event';
}

const mockDeals: Deal[] = [
  {
    id: '1',
    title: '50% Off Lunch Menu',
    description: 'Enjoy half-price lunch specials Monday through Friday',
    restaurant: {
      id: '1',
      name: 'The Modern Bistro',
      cuisine: 'French',
      location: 'Downtown',
      rating: 4.8
    },
    discount: '50% OFF',
    originalPrice: 45,
    discountedPrice: 22.50,
    validUntil: '2025-02-28',
    terms: ['Valid Monday-Friday 11:30 AM - 3:00 PM', 'Cannot be combined with other offers', 'Excludes beverages'],
    type: 'percentage',
    category: 'lunch'
  },
  {
    id: '2',
    title: 'Free Appetizer with Entree',
    description: 'Choose any appetizer free with the purchase of an entree',
    restaurant: {
      id: '2',
      name: 'Sakura Sushi House',
      cuisine: 'Japanese',
      location: 'Midtown',
      rating: 4.9
    },
    discount: 'FREE APPETIZER',
    validUntil: '2025-02-15',
    terms: ['Valid for dinner only', 'One appetizer per entree', 'Dine-in only'],
    type: 'special',
    category: 'dinner'
  },
  {
    id: '3',
    title: '$20 Off Your Bill',
    description: 'Save $20 on any bill over $60',
    restaurant: {
      id: '4',
      name: 'The Steakhouse',
      cuisine: 'Steakhouse',
      location: 'Midtown',
      rating: 4.7
    },
    discount: '$20 OFF',
    validUntil: '2025-03-15',
    terms: ['Minimum spend $60', 'Valid any day', 'Cannot be combined with other offers'],
    type: 'fixed',
    category: 'dinner'
  },
  {
    id: '4',
    title: 'Happy Hour: 30% Off Wine',
    description: 'All wines by the glass 30% off during happy hour',
    restaurant: {
      id: '3',
      name: 'Bella Italia',
      cuisine: 'Italian',
      location: 'Little Italy',
      rating: 4.6
    },
    discount: '30% OFF WINE',
    validUntil: '2025-12-31',
    terms: ['Monday-Friday 4:00 PM - 6:00 PM', 'Wine by the glass only', 'Dine-in only'],
    type: 'percentage',
    category: 'happy-hour'
  },
  {
    id: '5',
    title: 'Weekend Brunch Special',
    description: 'Unlimited mimosas with any brunch entree',
    restaurant: {
      id: '1',
      name: 'The Modern Bistro',
      cuisine: 'French',
      location: 'Downtown',
      rating: 4.8
    },
    discount: 'UNLIMITED MIMOSAS',
    originalPrice: 35,
    discountedPrice: 28,
    validUntil: '2025-02-29',
    terms: ['Weekends only 10:00 AM - 3:00 PM', '90-minute seating', 'Must be 21+'],
    type: 'special',
    category: 'brunch'
  },
  {
    id: '6',
    title: 'Buy One Get One 50% Off',
    description: 'Second entree 50% off when you order two entrees',
    restaurant: {
      id: '5',
      name: 'Spice Garden',
      cuisine: 'Indian',
      location: 'East Side',
      rating: 4.5
    },
    discount: 'BOGO 50% OFF',
    validUntil: '2025-02-20',
    terms: ['Must order two entrees', 'Lower-priced item discounted', 'Valid any day'],
    type: 'percentage',
    category: 'dinner'
  }
];

const categories = [
  { id: 'all', name: 'All Deals', count: mockDeals.length },
  { id: 'lunch', name: 'Lunch', count: mockDeals.filter(d => d.category === 'lunch').length },
  { id: 'dinner', name: 'Dinner', count: mockDeals.filter(d => d.category === 'dinner').length },
  { id: 'brunch', name: 'Brunch', count: mockDeals.filter(d => d.category === 'brunch').length },
  { id: 'happy-hour', name: 'Happy Hour', count: mockDeals.filter(d => d.category === 'happy-hour').length },
  { id: 'wine', name: 'Wine', count: mockDeals.filter(d => d.category === 'wine').length },
  { id: 'special-event', name: 'Special Events', count: mockDeals.filter(d => d.category === 'special-event').length },
];

export default function DealsPage() {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortBy, setSortBy] = useState('expiry');

  const filteredDeals = mockDeals.filter(deal => 
    selectedCategory === 'all' || deal.category === selectedCategory
  );

  const sortedDeals = [...filteredDeals].sort((a, b) => {
    switch (sortBy) {
      case 'expiry':
        return new Date(a.validUntil).getTime() - new Date(b.validUntil).getTime();
      case 'rating':
        return b.restaurant.rating - a.restaurant.rating;
      case 'discount':
        if (a.type === 'percentage' && b.type === 'percentage') {
          const aPercent = parseInt(a.discount.replace(/\D/g, ''));
          const bPercent = parseInt(b.discount.replace(/\D/g, ''));
          return bPercent - aPercent;
        }
        return 0;
      default:
        return 0;
    }
  });

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
        <span className="ml-1 text-sm text-gray-600">({rating})</span>
      </div>
    );
  };

  const isExpiringSoon = (date: string) => {
    const expiry = new Date(date);
    const today = new Date();
    const diffTime = expiry.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= 7;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Restaurant Deals & Offers</h1>
          <p className="text-lg text-gray-600">
            Save money while enjoying great food at your favorite restaurants
          </p>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            {/* Category Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
              <div className="flex flex-wrap gap-2">
                {categories.map((category) => (
                  <button
                    key={category.id}
                    onClick={() => setSelectedCategory(category.id)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      selectedCategory === category.id
                        ? 'bg-red-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {category.name} ({category.count})
                  </button>
                ))}
              </div>
            </div>

            {/* Sort */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Sort by</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-600"
              >
                <option value="expiry">Expiring Soon</option>
                <option value="rating">Highest Rated</option>
                <option value="discount">Best Discount</option>
              </select>
            </div>
          </div>
        </div>

        {/* Deals Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {sortedDeals.map((deal) => (
            <div key={deal.id} className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow overflow-hidden">
              {/* Deal Badge */}
              <div className="bg-red-600 text-white p-3 text-center">
                <div className="text-xl font-bold">{deal.discount}</div>
                {isExpiringSoon(deal.validUntil) && (
                  <div className="text-xs bg-yellow-500 text-black px-2 py-1 rounded mt-1 inline-block">
                    Expires Soon!
                  </div>
                )}
              </div>

              <div className="p-6">
                {/* Deal Info */}
                <h3 className="text-xl font-semibold text-gray-900 mb-2">{deal.title}</h3>
                <p className="text-gray-600 mb-4">{deal.description}</p>

                {/* Restaurant Info */}
                <div className="border-t pt-4 mb-4">
                  <Link 
                    href={`/restaurants/${deal.restaurant.id}`}
                    className="text-lg font-medium text-gray-900 hover:text-red-600 transition-colors"
                  >
                    {deal.restaurant.name}
                  </Link>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-sm text-gray-600">
                      {deal.restaurant.cuisine} • {deal.restaurant.location}
                    </span>
                    {renderStars(deal.restaurant.rating)}
                  </div>
                </div>

                {/* Price */}
                {deal.originalPrice && deal.discountedPrice && (
                  <div className="mb-4">
                    <span className="text-lg font-bold text-green-600">${deal.discountedPrice}</span>
                    <span className="text-sm text-gray-500 line-through ml-2">${deal.originalPrice}</span>
                  </div>
                )}

                {/* Valid Until */}
                <div className="mb-4">
                  <span className="text-sm text-gray-600">
                    Valid until: {new Date(deal.validUntil).toLocaleDateString()}
                  </span>
                </div>

                {/* Terms */}
                <div className="mb-4">
                  <h4 className="text-sm font-medium text-gray-900 mb-2">Terms:</h4>
                  <ul className="text-xs text-gray-600 space-y-1">
                    {deal.terms.map((term, index) => (
                      <li key={index}>• {term}</li>
                    ))}
                  </ul>
                </div>

                {/* Action Button */}
                <Link
                  href={`/restaurants/${deal.restaurant.id}`}
                  className="block w-full bg-red-600 text-white text-center py-3 rounded-lg hover:bg-red-700 transition-colors font-medium"
                >
                  Book Now
                </Link>
              </div>
            </div>
          ))}
        </div>

        {/* Newsletter Signup */}
        <section className="bg-white rounded-lg shadow-sm p-8 text-center">
          <h2 className="text-2xl font-semibold mb-4">Never Miss a Deal</h2>
          <p className="text-gray-600 mb-6">
            Subscribe to our newsletter and be the first to know about new restaurant deals and special offers
          </p>
          <div className="max-w-md mx-auto flex gap-2">
            <input
              type="email"
              placeholder="Enter your email"
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-600"
            />
            <button className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 transition-colors">
              Subscribe
            </button>
          </div>
        </section>

        {/* Stats */}
        <section className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg shadow-sm p-6 text-center">
            <div className="text-3xl font-bold text-red-600 mb-2">{mockDeals.length}</div>
            <p className="text-gray-600">Active Deals</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-6 text-center">
            <div className="text-3xl font-bold text-red-600 mb-2">50%</div>
            <p className="text-gray-600">Average Savings</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-6 text-center">
            <div className="text-3xl font-bold text-red-600 mb-2">24/7</div>
            <p className="text-gray-600">New Deals Added</p>
          </div>
        </section>
      </div>
    </div>
  );
}