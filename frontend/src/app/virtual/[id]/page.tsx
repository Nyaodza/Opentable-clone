'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

interface VirtualExperience {
  id: string;
  restaurantId: string;
  restaurantName: string;
  type: 'tour' | 'cooking-class' | 'chef-session' | 'tasting';
  title: string;
  description: string;
  duration: number; // minutes
  price: number;
  rating: number;
  reviews: number;
  image: string;
  availableDates: string[];
  maxParticipants: number;
  currentParticipants: number;
  features: string[];
  requirements: string[];
}

// Mock data
const mockExperience: VirtualExperience = {
  id: '1',
  restaurantId: '1',
  restaurantName: 'The French Laundry',
  type: 'tour',
  title: 'Virtual Kitchen Tour & Tasting Experience',
  description: 'Join Chef Thomas on an exclusive virtual tour of our Michelin-starred kitchen. Learn about our farm-to-table philosophy, watch dishes being prepared in real-time, and enjoy a paired tasting experience delivered to your home.',
  duration: 90,
  price: 149.00,
  rating: 4.9,
  reviews: 234,
  image: 'https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=800',
  availableDates: ['2025-01-25', '2025-01-26', '2025-02-01', '2025-02-08'],
  maxParticipants: 20,
  currentParticipants: 12,
  features: [
    'Live interactive session with head chef',
    'Behind-the-scenes kitchen access',
    'Tasting box delivered to your home',
    'Recipe cards and techniques',
    'Q&A session with culinary team',
    'Certificate of participation'
  ],
  requirements: [
    'Stable internet connection',
    'Computer with camera and microphone',
    'Zoom installed',
    'Delivery address in continental US'
  ]
};

export default function VirtualExperiencePage() {
  const params = useParams();
  const router = useRouter();
  const [experience, setExperience] = useState<VirtualExperience | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState('');
  const [participants, setParticipants] = useState(1);
  const [isBooking, setIsBooking] = useState(false);

  useEffect(() => {
    // Simulate API fetch
    const loadExperience = async () => {
      await new Promise(resolve => setTimeout(resolve, 500));
      setExperience(mockExperience);
      setIsLoading(false);
    };
    loadExperience();
  }, [params.id]);

  const handleBooking = async () => {
    if (!selectedDate) {
      alert('Please select a date');
      return;
    }

    setIsBooking(true);
    await new Promise(resolve => setTimeout(resolve, 1500));
    router.push(`/reservations?virtual=true&id=${params.id}`);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-red-600"></div>
      </div>
    );
  }

  if (!experience) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">🥽</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Experience Not Found</h1>
          <p className="text-gray-600 mb-6">This virtual experience doesn't exist or is no longer available.</p>
          <Link href="/restaurants" className="bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700">
            Browse Restaurants
          </Link>
        </div>
      </div>
    );
  }

  const spotsLeft = experience.maxParticipants - experience.currentParticipants;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <div className="relative h-96 bg-gray-900">
        <img
          src={experience.image}
          alt={experience.title}
          className="w-full h-full object-cover opacity-60"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/50 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-8">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center gap-2 mb-3">
              <span className="bg-purple-600 text-white px-3 py-1 rounded-full text-sm font-medium">
                🥽 Virtual Experience
              </span>
              <span className="bg-white/20 text-white px-3 py-1 rounded-full text-sm">
                {experience.duration} min
              </span>
            </div>
            <h1 className="text-4xl font-bold text-white mb-2">{experience.title}</h1>
            <p className="text-white/90 text-lg">
              <Link href={`/restaurants/${experience.restaurantId}`} className="hover:underline">
                {experience.restaurantName}
              </Link>
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Rating & Stats */}
            <div className="flex items-center gap-6">
              <div className="flex items-center">
                <span className="text-yellow-400 text-xl">★</span>
                <span className="ml-1 font-semibold text-gray-900">{experience.rating}</span>
                <span className="ml-1 text-gray-500">({experience.reviews} reviews)</span>
              </div>
              <div className="text-gray-500">
                {spotsLeft} spots left for next session
              </div>
            </div>

            {/* Description */}
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">About This Experience</h2>
              <p className="text-gray-700 leading-relaxed">{experience.description}</p>
            </div>

            {/* What's Included */}
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">What's Included</h2>
              <div className="grid md:grid-cols-2 gap-4">
                {experience.features.map((feature, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <span className="text-green-500 mt-1">✓</span>
                    <span className="text-gray-700">{feature}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Requirements */}
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Requirements</h2>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <ul className="space-y-2">
                  {experience.requirements.map((req, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <span className="text-yellow-600">•</span>
                      <span className="text-gray-700">{req}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* How It Works */}
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">How It Works</h2>
              <div className="grid md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3 text-red-600 font-bold">1</div>
                  <h3 className="font-semibold text-gray-900 mb-2">Book Your Spot</h3>
                  <p className="text-sm text-gray-600">Select your date and complete your booking</p>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3 text-red-600 font-bold">2</div>
                  <h3 className="font-semibold text-gray-900 mb-2">Receive Your Kit</h3>
                  <p className="text-sm text-gray-600">We'll ship your tasting box 2 days before</p>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3 text-red-600 font-bold">3</div>
                  <h3 className="font-semibold text-gray-900 mb-2">Join Live</h3>
                  <p className="text-sm text-gray-600">Connect via Zoom and enjoy the experience</p>
                </div>
              </div>
            </div>
          </div>

          {/* Booking Card */}
          <div className="lg:sticky lg:top-4 h-fit">
            <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
              <div className="text-center mb-6">
                <p className="text-3xl font-bold text-gray-900">${experience.price.toFixed(2)}</p>
                <p className="text-gray-500">per person</p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Select Date</label>
                  <select
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600 focus:border-transparent"
                  >
                    <option value="">Choose a date</option>
                    {experience.availableDates.map((date) => (
                      <option key={date} value={date}>
                        {new Date(date).toLocaleDateString('en-US', {
                          weekday: 'long',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Participants</label>
                  <select
                    value={participants}
                    onChange={(e) => setParticipants(parseInt(e.target.value))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600 focus:border-transparent"
                  >
                    {[1, 2, 3, 4, 5].map((num) => (
                      <option key={num} value={num}>
                        {num} {num === 1 ? 'person' : 'people'}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="border-t border-gray-200 pt-4">
                  <div className="flex justify-between text-gray-600 mb-2">
                    <span>${experience.price.toFixed(2)} × {participants}</span>
                    <span>${(experience.price * participants).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-gray-600 mb-2">
                    <span>Shipping</span>
                    <span>Free</span>
                  </div>
                  <div className="flex justify-between font-bold text-lg pt-2 border-t border-gray-200">
                    <span>Total</span>
                    <span>${(experience.price * participants).toFixed(2)}</span>
                  </div>
                </div>

                <button
                  onClick={handleBooking}
                  disabled={isBooking || !selectedDate}
                  className={`w-full py-3 rounded-lg font-semibold transition-colors ${
                    isBooking || !selectedDate
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-red-600 text-white hover:bg-red-700'
                  }`}
                >
                  {isBooking ? 'Booking...' : 'Book Now'}
                </button>

                <p className="text-xs text-gray-500 text-center">
                  Free cancellation up to 48 hours before
                </p>
              </div>
            </div>

            {/* Share */}
            <div className="mt-4 flex justify-center gap-4">
              <button className="p-2 text-gray-500 hover:text-gray-700">
                Share
              </button>
              <button className="p-2 text-gray-500 hover:text-gray-700">
                Save
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


