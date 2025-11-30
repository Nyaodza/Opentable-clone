'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

interface ReservationDetails {
  id: string;
  confirmationCode: string;
  restaurant: {
    id: string;
    name: string;
    address: string;
    city: string;
    state: string;
    phone: string;
    image: string;
  };
  date: string;
  time: string;
  partySize: number;
  status: 'confirmed' | 'pending' | 'cancelled';
  specialRequests?: string;
  pointsEarned: number;
  createdAt: string;
}

// Mock data
const mockReservation: ReservationDetails = {
  id: '12345',
  confirmationCode: 'OT-7X9K2M',
  restaurant: {
    id: '1',
    name: 'The French Laundry',
    address: '6640 Washington St',
    city: 'Yountville',
    state: 'CA',
    phone: '(707) 944-2380',
    image: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400'
  },
  date: '2025-01-25',
  time: '7:30 PM',
  partySize: 4,
  status: 'confirmed',
  specialRequests: 'Window seating preferred, celebrating anniversary',
  pointsEarned: 100,
  createdAt: new Date().toISOString()
};

export default function ReservationConfirmationPage() {
  const params = useParams();
  const [reservation, setReservation] = useState<ReservationDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddToCalendar, setShowAddToCalendar] = useState(false);

  useEffect(() => {
    // Simulate API fetch
    const loadReservation = async () => {
      await new Promise(resolve => setTimeout(resolve, 500));
      setReservation(mockReservation);
      setIsLoading(false);
    };
    loadReservation();
  }, [params.id]);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const generateCalendarLinks = () => {
    if (!reservation) return { google: '', apple: '', outlook: '' };
    
    const startDate = new Date(`${reservation.date}T19:30:00`);
    const endDate = new Date(startDate.getTime() + 2 * 60 * 60 * 1000); // 2 hours later
    
    const formatGoogleDate = (date: Date) => date.toISOString().replace(/-|:|\.\d{3}/g, '');
    
    const title = encodeURIComponent(`Dinner at ${reservation.restaurant.name}`);
    const location = encodeURIComponent(`${reservation.restaurant.address}, ${reservation.restaurant.city}, ${reservation.restaurant.state}`);
    const details = encodeURIComponent(`Reservation for ${reservation.partySize} at ${reservation.time}\nConfirmation: ${reservation.confirmationCode}`);
    
    return {
      google: `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${formatGoogleDate(startDate)}/${formatGoogleDate(endDate)}&location=${location}&details=${details}`,
      apple: '#', // Would generate .ics file
      outlook: `https://outlook.live.com/calendar/0/deeplink/compose?subject=${title}&startdt=${startDate.toISOString()}&enddt=${endDate.toISOString()}&location=${location}&body=${details}`
    };
  };

  const calendarLinks = generateCalendarLinks();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-red-600"></div>
      </div>
    );
  }

  if (!reservation) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">❓</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Reservation Not Found</h1>
          <p className="text-gray-600 mb-6">We couldn't find this reservation.</p>
          <Link href="/reservations" className="bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700">
            View My Reservations
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-2xl mx-auto px-4 sm:px-6">
        {/* Success Header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Reservation Confirmed!</h1>
          <p className="text-gray-600">
            Confirmation sent to your email. See you soon!
          </p>
        </div>

        {/* Confirmation Card */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden mb-8">
          {/* Restaurant Image */}
          <div className="h-48 relative">
            <img
              src={reservation.restaurant.image}
              alt={reservation.restaurant.name}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
            <div className="absolute bottom-4 left-4 text-white">
              <h2 className="text-2xl font-bold">{reservation.restaurant.name}</h2>
            </div>
          </div>

          {/* Reservation Details */}
          <div className="p-6">
            {/* Confirmation Code */}
            <div className="bg-gray-50 rounded-lg p-4 mb-6 text-center">
              <p className="text-sm text-gray-600 mb-1">Confirmation Code</p>
              <p className="text-2xl font-bold text-gray-900 font-mono">{reservation.confirmationCode}</p>
            </div>

            {/* Details Grid */}
            <div className="grid grid-cols-2 gap-6 mb-6">
              <div>
                <p className="text-sm text-gray-500 mb-1">Date</p>
                <p className="font-semibold text-gray-900">{formatDate(reservation.date)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">Time</p>
                <p className="font-semibold text-gray-900">{reservation.time}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">Party Size</p>
                <p className="font-semibold text-gray-900">{reservation.partySize} guests</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">Status</p>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium bg-green-100 text-green-800">
                  Confirmed
                </span>
              </div>
            </div>

            {/* Special Requests */}
            {reservation.specialRequests && (
              <div className="mb-6 p-4 bg-yellow-50 rounded-lg">
                <p className="text-sm font-medium text-gray-700 mb-1">Special Requests</p>
                <p className="text-gray-600">{reservation.specialRequests}</p>
              </div>
            )}

            {/* Address */}
            <div className="mb-6">
              <p className="text-sm text-gray-500 mb-1">Location</p>
              <p className="text-gray-900">{reservation.restaurant.address}</p>
              <p className="text-gray-900">{reservation.restaurant.city}, {reservation.restaurant.state}</p>
              <a
                href={`https://maps.google.com/?q=${encodeURIComponent(`${reservation.restaurant.address}, ${reservation.restaurant.city}, ${reservation.restaurant.state}`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-red-600 hover:text-red-700 text-sm font-medium mt-1 inline-block"
              >
                Get Directions →
              </a>
            </div>

            {/* Phone */}
            <div className="mb-6">
              <p className="text-sm text-gray-500 mb-1">Restaurant Phone</p>
              <a href={`tel:${reservation.restaurant.phone}`} className="text-red-600 hover:text-red-700">
                {reservation.restaurant.phone}
              </a>
            </div>

            {/* Points Earned */}
            <div className="bg-gradient-to-r from-red-500 to-orange-500 rounded-lg p-4 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/80 text-sm">Points Earned</p>
                  <p className="text-2xl font-bold">+{reservation.pointsEarned} points</p>
                </div>
                <div className="text-4xl">🎁</div>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-4">
          {/* Add to Calendar */}
          <div className="relative">
            <button
              onClick={() => setShowAddToCalendar(!showAddToCalendar)}
              className="w-full flex items-center justify-center gap-2 py-3 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Add to Calendar
            </button>
            
            {showAddToCalendar && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden z-10">
                <a
                  href={calendarLinks.google}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50"
                >
                  <span>📅</span> Google Calendar
                </a>
                <a
                  href={calendarLinks.outlook}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 border-t border-gray-100"
                >
                  <span>📧</span> Outlook Calendar
                </a>
                <button
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 border-t border-gray-100"
                >
                  <span>🍎</span> Apple Calendar
                </button>
              </div>
            )}
          </div>

          {/* Other Actions */}
          <div className="grid grid-cols-2 gap-4">
            <Link
              href={`/restaurants/${reservation.restaurant.id}`}
              className="flex items-center justify-center gap-2 py-3 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              View Restaurant
            </Link>
            <Link
              href={`/reservations/${reservation.id}`}
              className="flex items-center justify-center gap-2 py-3 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Manage Booking
            </Link>
          </div>

          <Link
            href="/restaurants"
            className="block w-full text-center py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
          >
            Book Another Restaurant
          </Link>
        </div>

        {/* Tips */}
        <div className="mt-8 bg-blue-50 rounded-lg p-6">
          <h3 className="font-semibold text-gray-900 mb-3">Dining Tips</h3>
          <ul className="space-y-2 text-sm text-gray-700">
            <li className="flex items-start gap-2">
              <span className="text-blue-600">•</span>
              Please arrive 10-15 minutes before your reservation time
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600">•</span>
              Tables are held for 15 minutes past reservation time
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600">•</span>
              Need to cancel? Please do so at least 24 hours in advance
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600">•</span>
              Don't forget to leave a review after your visit!
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
