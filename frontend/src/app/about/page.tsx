import React from 'react';
import Link from 'next/link';

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <div className="bg-red-600 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">About OpenTable Clone</h1>
          <p className="text-xl">Connecting diners with great restaurants since 2025</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid md:grid-cols-2 gap-12">
          {/* Our Story */}
          <div>
            <h2 className="text-3xl font-bold mb-6">Our Story</h2>
            <div className="space-y-4 text-gray-600">
              <p>
                OpenTable Clone was founded with a simple mission: to make dining out more accessible 
                and enjoyable for everyone. We believe that great dining experiences start with easy 
                reservations.
              </p>
              <p>
                Since our launch, we've helped millions of diners discover new restaurants and secure 
                tables at their favorite spots. Our platform connects food lovers with thousands of 
                restaurants across the country.
              </p>
              <p>
                We're passionate about supporting the restaurant industry and helping local businesses 
                thrive in the digital age. By providing powerful reservation management tools and 
                bringing them new customers, we're making a difference one meal at a time.
              </p>
            </div>
          </div>

          {/* Our Mission */}
          <div>
            <h2 className="text-3xl font-bold mb-6">Our Mission</h2>
            <div className="space-y-4 text-gray-600">
              <p>
                We exist to help restaurants fill every seat and to help diners discover their next 
                great meal. Our platform makes it easy to:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Find available tables at restaurants near you</li>
                <li>Read reviews from real diners</li>
                <li>Make instant reservations 24/7</li>
                <li>Manage your dining history and preferences</li>
                <li>Discover new restaurants based on your tastes</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Stats Section */}
        <div className="mt-16 bg-white rounded-lg shadow-lg p-8">
          <h2 className="text-3xl font-bold text-center mb-8">By the Numbers</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-4xl font-bold text-red-600">10K+</div>
              <div className="text-gray-600">Restaurants</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-red-600">1M+</div>
              <div className="text-gray-600">Diners</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-red-600">5M+</div>
              <div className="text-gray-600">Reservations</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-red-600">50+</div>
              <div className="text-gray-600">Cities</div>
            </div>
          </div>
        </div>

        {/* Values Section */}
        <div className="mt-16">
          <h2 className="text-3xl font-bold text-center mb-8">Our Values</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">🤝</span>
              </div>
              <h3 className="text-xl font-semibold mb-2">Partnership</h3>
              <p className="text-gray-600">
                We're committed to being a true partner to restaurants, helping them grow and succeed.
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">💡</span>
              </div>
              <h3 className="text-xl font-semibold mb-2">Innovation</h3>
              <p className="text-gray-600">
                We continuously improve our platform with new features and technologies.
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">❤️</span>
              </div>
              <h3 className="text-xl font-semibold mb-2">Hospitality</h3>
              <p className="text-gray-600">
                We bring the warmth of hospitality to every digital interaction.
              </p>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="mt-16 bg-gray-900 text-white rounded-lg p-8 text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to start dining?</h2>
          <p className="text-lg mb-6">Join millions of diners who use OpenTable Clone every day.</p>
          <div className="space-x-4">
            <Link 
              href="/register"
              className="inline-block bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700 transition-colors"
            >
              Sign Up Free
            </Link>
            <Link 
              href="/restaurants"
              className="inline-block bg-white text-gray-900 px-6 py-3 rounded-lg hover:bg-gray-100 transition-colors"
            >
              Browse Restaurants
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}