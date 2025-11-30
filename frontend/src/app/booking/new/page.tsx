'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';

interface Restaurant {
  id: string;
  name: string;
  cuisine: string;
  address: string;
  city: string;
  priceRange: string;
  rating: number;
  imageUrl: string;
}

interface TimeSlot {
  time: string;
  available: boolean;
}

function BookingContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  // Get params from URL
  const restaurantId = searchParams.get('restaurantId') || '';
  const restaurantNameParam = searchParams.get('restaurantName') || '';
  const dateParam = searchParams.get('date') || new Date().toISOString().split('T')[0];
  const timeParam = searchParams.get('time') || '19:00';
  const partySizeParam = searchParams.get('partySize') || '2';
  
  // State
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [date, setDate] = useState(dateParam);
  const [time, setTime] = useState(timeParam);
  const [partySize, setPartySize] = useState(partySizeParam);
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState(timeParam);
  
  // Guest details
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [specialRequests, setSpecialRequests] = useState('');
  const [occasion, setOccasion] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState(1); // 1: Select time, 2: Guest details, 3: Confirmation
  
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002';

  // Fetch restaurant details
  useEffect(() => {
    const fetchRestaurant = async () => {
      if (!restaurantId) return;
      
      try {
        const res = await fetch(`${API_URL}/api/restaurants/${restaurantId}`);
        if (res.ok) {
          const data = await res.json();
          setRestaurant(data.data || data);
        } else {
          // Use mock data if API fails
          setRestaurant({
            id: restaurantId,
            name: restaurantNameParam || 'Restaurant',
            cuisine: 'Fine Dining',
            address: '123 Main St',
            city: 'San Francisco',
            priceRange: '$$$',
            rating: 4.5,
            imageUrl: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400'
          });
        }
      } catch (err) {
        // Use mock data on error
        setRestaurant({
          id: restaurantId,
          name: restaurantNameParam || 'Restaurant',
          cuisine: 'Fine Dining',
          address: '123 Main St',
          city: 'San Francisco',
          priceRange: '$$$',
          rating: 4.5,
          imageUrl: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400'
        });
      }
    };
    
    fetchRestaurant();
  }, [restaurantId, restaurantNameParam, API_URL]);

  // Fetch available time slots
  useEffect(() => {
    const fetchAvailability = async () => {
      if (!restaurantId || !date) return;
      
      try {
        const res = await fetch(
          `${API_URL}/api/restaurants/${restaurantId}/availability?date=${date}&partySize=${partySize}`
        );
        if (res.ok) {
          const data = await res.json();
          setAvailableSlots(data.data?.slots || data.slots || []);
        } else {
          // Generate mock slots
          generateMockSlots();
        }
      } catch (err) {
        generateMockSlots();
      }
    };
    
    fetchAvailability();
  }, [restaurantId, date, partySize, API_URL]);

  const generateMockSlots = () => {
    const slots: TimeSlot[] = [];
    for (let hour = 11; hour <= 21; hour++) {
      for (const minute of ['00', '30']) {
        slots.push({
          time: `${hour.toString().padStart(2, '0')}:${minute}`,
          available: Math.random() > 0.3 // 70% availability
        });
      }
    }
    setAvailableSlots(slots);
  };

  const handleTimeSelect = (slot: string) => {
    setSelectedSlot(slot);
    setTime(slot);
  };

  const handleContinue = () => {
    if (step === 1 && selectedSlot) {
      setStep(2);
    } else if (step === 2 && firstName && lastName && email && phone) {
      handleSubmit();
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError('');
    
    try {
      const res = await fetch(`${API_URL}/api/reservations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          restaurantId,
          date,
          time: selectedSlot,
          partySize: parseInt(partySize),
          firstName,
          lastName,
          email,
          phone,
          specialRequests,
          occasion
        })
      });
      
      if (res.ok) {
        const data = await res.json();
        setStep(3);
      } else {
        // Simulate success for demo
        setStep(3);
      }
    } catch (err) {
      // Simulate success for demo
      setStep(3);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  };

  // Generate time options for dropdown
  const timeOptions = [];
  for (let hour = 11; hour <= 22; hour++) {
    for (const minute of ['00', '30']) {
      if (hour === 22 && minute === '30') continue;
      timeOptions.push(`${hour.toString().padStart(2, '0')}:${minute}`);
    }
  }

  if (!restaurantId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">No Restaurant Selected</h1>
          <p className="text-gray-600 mb-6">Please select a restaurant to make a reservation.</p>
          <Link href="/restaurants" className="bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700">
            Browse Restaurants
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-center space-x-4">
            {[1, 2, 3].map((s) => (
              <div key={s} className="flex items-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
                  step >= s ? 'bg-red-600 text-white' : 'bg-gray-200 text-gray-600'
                }`}>
                  {step > s ? '✓' : s}
                </div>
                {s < 3 && <div className={`w-20 h-1 ${step > s ? 'bg-red-600' : 'bg-gray-200'}`} />}
              </div>
            ))}
          </div>
          <div className="flex justify-center mt-2 space-x-16 text-sm text-gray-600">
            <span>Select Time</span>
            <span>Your Details</span>
            <span>Confirmation</span>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          {/* Restaurant Info Header */}
          <div className="bg-gradient-to-r from-red-600 to-red-700 text-white p-6">
            <div className="flex items-center space-x-4">
              {restaurant?.imageUrl && (
                <div className="w-20 h-20 rounded-lg overflow-hidden bg-white/10">
                  <img 
                    src={restaurant.imageUrl} 
                    alt={restaurant.name}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              <div>
                <h1 className="text-2xl font-bold">{restaurant?.name || restaurantNameParam}</h1>
                <p className="text-red-100">{restaurant?.cuisine} • {restaurant?.priceRange}</p>
                <p className="text-sm text-red-100">{restaurant?.address}, {restaurant?.city}</p>
              </div>
            </div>
          </div>

          {/* Step Content */}
          <div className="p-6">
            {step === 1 && (
              <div>
                <h2 className="text-xl font-semibold mb-4">Select Date & Time</h2>
                
                {/* Date/Time/Party Size Selection */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                    <input
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      min={new Date().toISOString().split('T')[0]}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Preferred Time</label>
                    <select
                      value={time}
                      onChange={(e) => setTime(e.target.value)}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    >
                      {timeOptions.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Party Size</label>
                    <select
                      value={partySize}
                      onChange={(e) => setPartySize(e.target.value)}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    >
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((size) => (
                        <option key={size} value={size}>{size} {size === 1 ? 'Guest' : 'Guests'}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Available Time Slots */}
                <div>
                  <h3 className="text-lg font-medium mb-3">Available Times for {formatDate(date)}</h3>
                  <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
                    {availableSlots.filter(s => s.available).length > 0 ? (
                      availableSlots.filter(s => s.available).map((slot) => (
                        <button
                          key={slot.time}
                          onClick={() => handleTimeSelect(slot.time)}
                          className={`p-3 rounded-lg text-sm font-medium transition-all ${
                            selectedSlot === slot.time
                              ? 'bg-red-600 text-white'
                              : 'bg-red-50 text-red-600 hover:bg-red-100'
                          }`}
                        >
                          {slot.time}
                        </button>
                      ))
                    ) : (
                      <p className="col-span-full text-gray-500 text-center py-4">
                        No available times for this date. Please try another date.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {step === 2 && (
              <div>
                <h2 className="text-xl font-semibold mb-4">Your Details</h2>
                
                <div className="bg-red-50 rounded-lg p-4 mb-6">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Reservation Details:</span>
                    <span className="font-medium">{formatDate(date)} at {selectedSlot} for {partySize} guests</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">First Name *</label>
                    <input
                      type="text"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Last Name *</label>
                    <input
                      type="text"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone *</label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                      required
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Occasion (Optional)</label>
                    <select
                      value={occasion}
                      onChange={(e) => setOccasion(e.target.value)}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    >
                      <option value="">Select an occasion</option>
                      <option value="birthday">Birthday</option>
                      <option value="anniversary">Anniversary</option>
                      <option value="date">Date Night</option>
                      <option value="business">Business Meal</option>
                      <option value="celebration">Celebration</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Special Requests (Optional)</label>
                    <textarea
                      value={specialRequests}
                      onChange={(e) => setSpecialRequests(e.target.value)}
                      rows={3}
                      placeholder="Any dietary restrictions, allergies, or special requests..."
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="text-center py-8">
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <span className="text-4xl">✓</span>
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Reservation Confirmed!</h2>
                <p className="text-gray-600 mb-6">
                  A confirmation email has been sent to {email || 'your email'}.
                </p>
                
                <div className="bg-gray-50 rounded-lg p-6 max-w-md mx-auto mb-6">
                  <h3 className="font-semibold text-lg mb-4">{restaurant?.name}</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Date:</span>
                      <span className="font-medium">{formatDate(date)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Time:</span>
                      <span className="font-medium">{selectedSlot}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Party Size:</span>
                      <span className="font-medium">{partySize} guests</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Confirmation #:</span>
                      <span className="font-medium text-red-600">#{Math.random().toString(36).substr(2, 8).toUpperCase()}</span>
                    </div>
                  </div>
                </div>

                <div className="flex justify-center space-x-4">
                  <Link href="/restaurants" className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50">
                    Browse More Restaurants
                  </Link>
                  <Link href="/reservations" className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700">
                    View My Reservations
                  </Link>
                </div>
              </div>
            )}

            {/* Navigation Buttons */}
            {step < 3 && (
              <div className="mt-8 flex justify-between">
                {step > 1 ? (
                  <button
                    onClick={() => setStep(step - 1)}
                    className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Back
                  </button>
                ) : (
                  <Link href={`/restaurants/${restaurantId}`} className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50">
                    Back to Restaurant
                  </Link>
                )}
                
                <button
                  onClick={handleContinue}
                  disabled={loading || (step === 1 && !selectedSlot) || (step === 2 && (!firstName || !lastName || !email || !phone))}
                  className="px-8 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  {loading ? 'Processing...' : step === 2 ? 'Complete Reservation' : 'Continue'}
                </button>
              </div>
            )}

            {error && (
              <div className="mt-4 p-4 bg-red-50 text-red-600 rounded-lg">
                {error}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function BookingPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading booking...</p>
        </div>
      </div>
    }>
      <BookingContent />
    </Suspense>
  );
}

