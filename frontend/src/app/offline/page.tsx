'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';

export default function OfflinePage() {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    // Check initial online status
    setIsOnline(navigator.onLine);

    // Listen for online/offline events
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOnline) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center">
          <div className="mb-6">
            <svg className="w-24 h-24 text-green-500 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>

          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            You're Back Online!
          </h1>

          <p className="text-gray-600 mb-8">
            Your internet connection has been restored. You can now continue browsing and making reservations.
          </p>

          <Link
            href="/"
            className="inline-block bg-red-600 text-white px-8 py-3 rounded-lg font-medium hover:bg-red-700 transition-colors"
          >
            Return to Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        {/* Offline Icon */}
        <div className="mb-6">
          <svg className="w-24 h-24 text-gray-400 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3m8.293 8.293l1.414 1.414" />
          </svg>
        </div>

        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          You're Offline
        </h1>

        <p className="text-gray-600 mb-8">
          It looks like you've lost your internet connection. Don't worry, you can still view your saved reservations and favorite restaurants.
        </p>

        {/* Features available offline */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8 text-left">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Available Offline:
          </h2>
          <ul className="space-y-3">
            <li className="flex items-start">
              <svg className="w-6 h-6 text-green-500 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-gray-700">View your upcoming reservations</span>
            </li>
            <li className="flex items-start">
              <svg className="w-6 h-6 text-green-500 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-gray-700">Browse saved restaurants</span>
            </li>
            <li className="flex items-start">
              <svg className="w-6 h-6 text-green-500 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-gray-700">View restaurant details</span>
            </li>
            <li className="flex items-start">
              <svg className="w-6 h-6 text-green-500 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-gray-700">Access your profile</span>
            </li>
          </ul>
        </div>

        {/* Not available offline */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-8 text-left">
          <h3 className="text-sm font-semibold text-yellow-800 mb-2">
            Requires Internet Connection:
          </h3>
          <ul className="text-sm text-yellow-700 space-y-1">
            <li>• Making new reservations</li>
            <li>• Searching for restaurants</li>
            <li>• Modifying existing bookings</li>
            <li>• Leaving reviews</li>
          </ul>
        </div>

        {/* Action buttons */}
        <div className="space-y-3">
          <Link
            href="/reservations"
            className="block bg-red-600 text-white px-8 py-3 rounded-lg font-medium hover:bg-red-700 transition-colors"
          >
            View My Reservations
          </Link>
          
          <Link
            href="/favorites"
            className="block bg-white border border-gray-300 text-gray-700 px-8 py-3 rounded-lg font-medium hover:bg-gray-50 transition-colors"
          >
            View Favorites
          </Link>
        </div>

        {/* Retry button */}
        <button
          onClick={() => window.location.reload()}
          className="mt-6 text-red-600 hover:text-red-700 font-medium"
        >
          Retry Connection
        </button>

        {/* Connection status indicator */}
        <div className="mt-8 flex items-center justify-center text-sm text-gray-500">
          <div className="w-2 h-2 bg-red-500 rounded-full mr-2 animate-pulse"></div>
          No internet connection
        </div>
      </div>
    </div>
  );
}
