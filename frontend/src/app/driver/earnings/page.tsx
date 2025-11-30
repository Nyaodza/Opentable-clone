'use client';

import React, { useState } from 'react';
import Link from 'next/link';

// Mock earnings data
const mockEarningsData = {
  currentWeek: {
    deliveries: 47,
    hours: 32.5,
    earnings: 625.80,
    tips: 189.45,
    bonuses: 50.00,
    total: 865.25
  },
  lastWeek: {
    deliveries: 52,
    hours: 38,
    earnings: 712.40,
    tips: 215.60,
    bonuses: 25.00,
    total: 953.00
  },
  monthlyTotal: 3456.78,
  yearlyTotal: 28945.32,
  avgPerDelivery: 14.25,
  avgPerHour: 22.80
};

const weeklyBreakdown = [
  { day: 'Mon', deliveries: 8, earnings: 124.50 },
  { day: 'Tue', deliveries: 6, earnings: 98.20 },
  { day: 'Wed', deliveries: 0, earnings: 0 },
  { day: 'Thu', deliveries: 9, earnings: 142.80 },
  { day: 'Fri', deliveries: 12, earnings: 198.45 },
  { day: 'Sat', deliveries: 10, earnings: 175.30 },
  { day: 'Sun', deliveries: 2, earnings: 36.00 }
];

const recentDeliveries = [
  { id: '1', restaurant: 'Sakura Sushi', customer: 'John D.', earnings: 12.50, tip: 5.00, time: '2 hours ago' },
  { id: '2', restaurant: 'Pizza Palace', customer: 'Sarah M.', earnings: 8.75, tip: 3.00, time: '3 hours ago' },
  { id: '3', restaurant: 'Thai Garden', customer: 'Mike R.', earnings: 15.00, tip: 6.50, time: '5 hours ago' },
  { id: '4', restaurant: 'Burger Joint', customer: 'Emily K.', earnings: 9.25, tip: 2.00, time: 'Yesterday' },
  { id: '5', restaurant: 'Mediterranean Grill', customer: 'David L.', earnings: 18.00, tip: 8.00, time: 'Yesterday' }
];

export default function DriverEarningsPage() {
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month' | 'year'>('week');
  const [isAuthenticated, setIsAuthenticated] = useState(true); // Mock auth state

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4">
        <div className="max-w-md w-full text-center">
          <div className="text-6xl mb-6">🔐</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Sign In Required</h1>
          <p className="text-gray-600 mb-8">
            Please sign in to your driver account to view your earnings.
          </p>
          <Link
            href="/driver"
            className="inline-block bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700 transition-colors"
          >
            Go to Driver Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Earnings</h1>
            <p className="text-gray-600">Track your delivery earnings and payouts</p>
          </div>
          <Link
            href="/driver"
            className="text-red-600 hover:text-red-700 font-medium"
          >
            ← Back to Dashboard
          </Link>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm p-6">
            <p className="text-sm text-gray-600 mb-1">This Week</p>
            <p className="text-3xl font-bold text-gray-900">${mockEarningsData.currentWeek.total.toFixed(2)}</p>
            <p className="text-sm text-green-600 mt-1">↑ 12% from last week</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-6">
            <p className="text-sm text-gray-600 mb-1">This Month</p>
            <p className="text-3xl font-bold text-gray-900">${mockEarningsData.monthlyTotal.toFixed(2)}</p>
            <p className="text-sm text-gray-500 mt-1">{mockEarningsData.currentWeek.deliveries * 4} deliveries</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-6">
            <p className="text-sm text-gray-600 mb-1">Avg per Delivery</p>
            <p className="text-3xl font-bold text-gray-900">${mockEarningsData.avgPerDelivery.toFixed(2)}</p>
            <p className="text-sm text-gray-500 mt-1">Including tips</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-6">
            <p className="text-sm text-gray-600 mb-1">Avg per Hour</p>
            <p className="text-3xl font-bold text-gray-900">${mockEarningsData.avgPerHour.toFixed(2)}</p>
            <p className="text-sm text-gray-500 mt-1">Active time only</p>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Earnings Breakdown */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-sm p-6 mb-8">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-900">This Week's Breakdown</h2>
                <div className="flex gap-2">
                  {['week', 'month', 'year'].map((period) => (
                    <button
                      key={period}
                      onClick={() => setSelectedPeriod(period as 'week' | 'month' | 'year')}
                      className={`px-4 py-2 text-sm rounded-lg transition-colors ${
                        selectedPeriod === period
                          ? 'bg-red-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {period.charAt(0).toUpperCase() + period.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Weekly Chart (Simplified) */}
              <div className="mb-6">
                <div className="flex items-end justify-between gap-2 h-40">
                  {weeklyBreakdown.map((day) => {
                    const maxEarnings = Math.max(...weeklyBreakdown.map(d => d.earnings));
                    const height = day.earnings > 0 ? (day.earnings / maxEarnings) * 100 : 5;
                    return (
                      <div key={day.day} className="flex-1 flex flex-col items-center">
                        <div className="w-full bg-gray-100 rounded-t relative" style={{ height: '120px' }}>
                          <div
                            className="absolute bottom-0 w-full bg-red-500 rounded-t transition-all"
                            style={{ height: `${height}%` }}
                          />
                        </div>
                        <p className="text-xs text-gray-500 mt-2">{day.day}</p>
                        <p className="text-xs font-medium">${day.earnings.toFixed(0)}</p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Breakdown Details */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-6 border-t border-gray-200">
                <div>
                  <p className="text-sm text-gray-600">Base Earnings</p>
                  <p className="text-lg font-semibold">${mockEarningsData.currentWeek.earnings.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Tips</p>
                  <p className="text-lg font-semibold text-green-600">${mockEarningsData.currentWeek.tips.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Bonuses</p>
                  <p className="text-lg font-semibold text-blue-600">${mockEarningsData.currentWeek.bonuses.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Deliveries</p>
                  <p className="text-lg font-semibold">{mockEarningsData.currentWeek.deliveries}</p>
                </div>
              </div>
            </div>

            {/* Recent Deliveries */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-6">Recent Deliveries</h2>
              <div className="space-y-4">
                {recentDeliveries.map((delivery) => (
                  <div key={delivery.id} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center text-red-600">
                        🍽️
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{delivery.restaurant}</p>
                        <p className="text-sm text-gray-500">To {delivery.customer} • {delivery.time}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-900">${(delivery.earnings + delivery.tip).toFixed(2)}</p>
                      <p className="text-sm text-green-600">+${delivery.tip.toFixed(2)} tip</p>
                    </div>
                  </div>
                ))}
              </div>
              <button className="w-full mt-4 py-2 text-red-600 hover:text-red-700 font-medium">
                View All Deliveries →
              </button>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Payout Card */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Next Payout</h3>
              <div className="text-center py-4">
                <p className="text-4xl font-bold text-gray-900">${mockEarningsData.currentWeek.total.toFixed(2)}</p>
                <p className="text-gray-600 mt-2">Arrives Tuesday, Jan 21</p>
              </div>
              <div className="pt-4 border-t border-gray-200 mt-4">
                <button className="w-full py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm">
                  Get Instant Payout ($0.50 fee)
                </button>
              </div>
            </div>

            {/* Payment Method */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Payment Method</h3>
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <div className="w-10 h-10 bg-blue-600 rounded flex items-center justify-center text-white font-bold text-sm">
                  BANK
                </div>
                <div>
                  <p className="font-medium text-gray-900">Bank Account</p>
                  <p className="text-sm text-gray-500">••••6789</p>
                </div>
              </div>
              <button className="w-full mt-4 py-2 text-red-600 hover:text-red-700 font-medium text-sm">
                Update Payment Method →
              </button>
            </div>

            {/* Incentives */}
            <div className="bg-gradient-to-br from-red-500 to-orange-500 rounded-xl shadow-sm p-6 text-white">
              <h3 className="text-lg font-bold mb-3">Weekend Bonus</h3>
              <p className="text-white/90 mb-4">
                Complete 20 deliveries this weekend and earn an extra $50 bonus!
              </p>
              <div className="bg-white/20 rounded-lg p-3">
                <div className="flex justify-between text-sm mb-2">
                  <span>Progress</span>
                  <span>8/20 deliveries</span>
                </div>
                <div className="w-full bg-white/30 rounded-full h-2">
                  <div className="bg-white rounded-full h-2" style={{ width: '40%' }} />
                </div>
              </div>
            </div>

            {/* Quick Links */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Quick Links</h3>
              <div className="space-y-3">
                <Link href="/driver/support" className="block text-red-600 hover:text-red-700">
                  Earnings Help →
                </Link>
                <Link href="/driver" className="block text-red-600 hover:text-red-700">
                  Tax Documents →
                </Link>
                <Link href="/driver/support" className="block text-red-600 hover:text-red-700">
                  Payment Issues →
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


