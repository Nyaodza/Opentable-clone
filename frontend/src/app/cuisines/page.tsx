import React from 'react';
import Link from 'next/link';

const cuisineTypes = [
  { name: 'Italian', count: 1847, emoji: '🍝', featured: true, description: 'Pasta, pizza, and authentic Italian classics' },
  { name: 'Mexican', count: 1423, emoji: '🌮', featured: true, description: 'Traditional and modern Mexican dishes' },
  { name: 'American', count: 2156, emoji: '🍔', featured: true, description: 'Burgers, steaks, and American comfort food' },
  { name: 'Chinese', count: 1234, emoji: '🥢', featured: true, description: 'Dim sum, noodles, and regional Chinese specialties' },
  { name: 'Japanese', count: 967, emoji: '🍣', featured: true, description: 'Sushi, ramen, and traditional Japanese cuisine' },
  { name: 'French', count: 543, emoji: '🥐', featured: true, description: 'Fine dining and classic French bistro fare' },
  { name: 'Indian', count: 834, emoji: '🍛', featured: true, description: 'Curries, tandoor, and regional Indian dishes' },
  { name: 'Thai', count: 756, emoji: '🌶️', featured: true, description: 'Spicy and aromatic Thai specialties' },
  { name: 'Mediterranean', count: 634, emoji: '🫒', description: 'Fresh, healthy Mediterranean dishes' },
  { name: 'Korean', count: 423, emoji: '🥢', description: 'BBQ, kimchi, and Korean comfort food' },
  { name: 'Vietnamese', count: 345, emoji: '🍜', description: 'Pho, banh mi, and Vietnamese street food' },
  { name: 'Spanish', count: 298, emoji: '🥘', description: 'Tapas, paella, and Spanish classics' },
  { name: 'Greek', count: 267, emoji: '🫒', description: 'Authentic Greek dishes and mezze' },
  { name: 'Brazilian', count: 189, emoji: '🥩', description: 'Churrasco and Brazilian specialties' },
  { name: 'Lebanese', count: 156, emoji: '🥙', description: 'Hummus, kebabs, and Middle Eastern cuisine' },
  { name: 'Ethiopian', count: 134, emoji: '🌶️', description: 'Spicy stews and traditional Ethiopian dishes' },
  { name: 'German', count: 123, emoji: '🥨', description: 'Sausages, pretzels, and German beer hall fare' },
  { name: 'Turkish', count: 112, emoji: '🥙', description: 'Kebabs, baklava, and Turkish delights' },
  { name: 'Moroccan', count: 98, emoji: '🍲', description: 'Tagines and North African cuisine' },
  { name: 'Peruvian', count: 87, emoji: '🐟', description: 'Ceviche and modern Peruvian dishes' },
  { name: 'Russian', count: 76, emoji: '🥟', description: 'Borscht, pierogies, and Russian classics' },
  { name: 'Cuban', count: 65, emoji: '🥪', description: 'Sandwiches, rice, and Caribbean flavors' },
  { name: 'Vegetarian', count: 432, emoji: '🥗', description: 'Plant-based and vegetarian options' },
  { name: 'Vegan', count: 298, emoji: '🌱', description: 'Completely plant-based cuisine' },
  { name: 'Steakhouse', count: 378, emoji: '🥩', description: 'Premium steaks and fine dining' },
  { name: 'Seafood', count: 567, emoji: '🦞', description: 'Fresh fish and seafood specialties' },
  { name: 'Pizza', count: 891, emoji: '🍕', description: 'Traditional and artisanal pizzas' },
  { name: 'Sushi', count: 445, emoji: '🍣', description: 'Fresh sushi and sashimi' },
  { name: 'BBQ', count: 356, emoji: '🍖', description: 'Smoked meats and barbecue classics' },
  { name: 'Bakery', count: 234, emoji: '🥐', description: 'Fresh bread, pastries, and baked goods' },
];

// Group cuisines
const featuredCuisines = cuisineTypes.filter(cuisine => cuisine.featured);
const popularCuisines = cuisineTypes.filter(cuisine => !cuisine.featured && cuisine.count > 200);
const otherCuisines = cuisineTypes.filter(cuisine => !cuisine.featured && cuisine.count <= 200);

export default function CuisinesPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Explore Cuisines</h1>
          <p className="text-lg text-gray-600">
            Discover restaurants by your favorite cuisine type
          </p>
        </div>

        {/* Featured Cuisines */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-6">Featured Cuisines</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {featuredCuisines.map((cuisine) => (
              <Link
                key={cuisine.name}
                href={`/restaurants?cuisine=${encodeURIComponent(cuisine.name.toLowerCase())}`}
                className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow p-6 block text-center"
              >
                <div className="text-4xl mb-3">{cuisine.emoji}</div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">{cuisine.name}</h3>
                <p className="text-sm text-gray-600 mb-3">{cuisine.description}</p>
                <div className="text-red-600 font-medium">{cuisine.count} restaurants</div>
              </Link>
            ))}
          </div>
        </section>

        {/* Popular Cuisines */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-6">Popular Cuisines</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {popularCuisines.map((cuisine) => (
              <Link
                key={cuisine.name}
                href={`/restaurants?cuisine=${encodeURIComponent(cuisine.name.toLowerCase())}`}
                className="bg-white rounded-lg shadow hover:shadow-md transition-shadow p-4 block"
              >
                <div className="flex items-center">
                  <div className="text-2xl mr-4">{cuisine.emoji}</div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">{cuisine.name}</h3>
                    <p className="text-sm text-gray-600">{cuisine.description}</p>
                  </div>
                  <div className="text-red-600 font-medium ml-4">{cuisine.count}</div>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* All Other Cuisines */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-6">More Cuisines</h2>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {otherCuisines.map((cuisine) => (
                <Link
                  key={cuisine.name}
                  href={`/restaurants?cuisine=${encodeURIComponent(cuisine.name.toLowerCase())}`}
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center">
                    <span className="text-lg mr-2">{cuisine.emoji}</span>
                    <span className="font-medium text-gray-900">{cuisine.name}</span>
                  </div>
                  <span className="text-sm text-gray-500">({cuisine.count})</span>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* Dietary Preferences */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-6">Dietary Preferences</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Link
              href="/restaurants?dietary=vegetarian"
              className="bg-green-50 border border-green-200 rounded-lg p-6 text-center hover:bg-green-100 transition-colors"
            >
              <div className="text-4xl mb-3">🥗</div>
              <h3 className="text-xl font-semibold text-green-800 mb-2">Vegetarian</h3>
              <p className="text-green-600">Plant-based options available</p>
            </Link>
            <Link
              href="/restaurants?dietary=vegan"
              className="bg-green-50 border border-green-200 rounded-lg p-6 text-center hover:bg-green-100 transition-colors"
            >
              <div className="text-4xl mb-3">🌱</div>
              <h3 className="text-xl font-semibold text-green-800 mb-2">Vegan</h3>
              <p className="text-green-600">Completely plant-based cuisine</p>
            </Link>
            <Link
              href="/restaurants?dietary=gluten-free"
              className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center hover:bg-blue-100 transition-colors"
            >
              <div className="text-4xl mb-3">🌾</div>
              <h3 className="text-xl font-semibold text-blue-800 mb-2">Gluten-Free</h3>
              <p className="text-blue-600">Gluten-free options available</p>
            </Link>
          </div>
        </section>

        {/* Can't Find Section */}
        <section className="bg-white rounded-lg shadow-sm p-8 text-center">
          <h2 className="text-2xl font-semibold mb-4">Looking for something specific?</h2>
          <p className="text-gray-600 mb-6">
            Use our search filters to find exactly what you're craving
          </p>
          <Link
            href="/restaurants"
            className="inline-block bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700 transition-colors"
          >
            Search All Restaurants
          </Link>
        </section>

        {/* Stats Section */}
        <section className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg shadow-sm p-6 text-center">
            <div className="text-3xl font-bold text-red-600 mb-2">30+</div>
            <p className="text-gray-600">Cuisine Types</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-6 text-center">
            <div className="text-3xl font-bold text-red-600 mb-2">15,000+</div>
            <p className="text-gray-600">Restaurants</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-6 text-center">
            <div className="text-3xl font-bold text-red-600 mb-2">100+</div>
            <p className="text-gray-600">New Restaurants Weekly</p>
          </div>
        </section>
      </div>
    </div>
  );
}