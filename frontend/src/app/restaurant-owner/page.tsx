'use client';

import React, { useState, useEffect } from 'react';
import { unifiedApiClient } from '@/lib/api/unified-client';
import { formatCurrency, formatPercentage } from '@/utils/format';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

export default function RestaurantOwnerDashboard() {
  const [stats, setStats] = useState<any>(null);
  const [recentReservations, setRecentReservations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const [statsData, reservationsData] = await Promise.all([
        unifiedApiClient.get('/restaurant-owner/stats'),
        unifiedApiClient.get('/restaurant-owner/reservations/recent'),
      ]);
      setStats(statsData);
      setRecentReservations(reservationsData.reservations);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="p-8">Loading...</div>;

  const revenueChartData = {
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    datasets: [
      {
        label: 'Revenue',
        data: stats?.weeklyRevenue || [],
        borderColor: 'rgb(79, 70, 229)',
        backgroundColor: 'rgba(79, 70, 229, 0.1)',
      },
    ],
  };

  const reservationChartData = {
    labels: ['12pm', '1pm', '2pm', '5pm', '6pm', '7pm', '8pm', '9pm'],
    datasets: [
      {
        label: 'Reservations',
        data: stats?.hourlyReservations || [],
        backgroundColor: 'rgba(34, 197, 94, 0.8)',
      },
    ],
  };

  const cuisineChartData = {
    labels: stats?.topDishes?.map((d: any) => d.name) || [],
    datasets: [
      {
        data: stats?.topDishes?.map((d: any) => d.orders) || [],
        backgroundColor: [
          'rgba(255, 99, 132, 0.8)',
          'rgba(54, 162, 235, 0.8)',
          'rgba(255, 206, 86, 0.8)',
          'rgba(75, 192, 192, 0.8)',
          'rgba(153, 102, 255, 0.8)',
        ],
      },
    ],
  };

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard Overview</h1>
        <p className="text-gray-600">Welcome back! Here's what's happening at your restaurant.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Today's Revenue</p>
              <p className="text-2xl font-bold">{formatCurrency(stats?.todayRevenue || 0)}</p>
            </div>
            <div className="text-3xl">💰</div>
          </div>
          <p className="text-sm text-green-600 mt-2">
            {formatPercentage((stats?.revenueChange || 0) / 100, 1)} from yesterday
          </p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Reservations</p>
              <p className="text-2xl font-bold">{stats?.totalReservations || 0}</p>
            </div>
            <div className="text-3xl">📅</div>
          </div>
          <p className="text-sm text-gray-600 mt-2">
            {stats?.upcomingReservations || 0} upcoming
          </p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Average Rating</p>
              <p className="text-2xl font-bold">{stats?.averageRating || 0}</p>
            </div>
            <div className="text-3xl">⭐</div>
          </div>
          <p className="text-sm text-gray-600 mt-2">
            Based on {stats?.totalReviews || 0} reviews
          </p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Table Occupancy</p>
              <p className="text-2xl font-bold">{formatPercentage((stats?.occupancyRate || 0) / 100)}</p>
            </div>
            <div className="text-3xl">🪑</div>
          </div>
          <p className="text-sm text-gray-600 mt-2">
            {stats?.availableTables || 0} tables available
          </p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">Weekly Revenue</h2>
          <Line data={revenueChartData} options={{ responsive: true }} />
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">Reservations by Hour</h2>
          <Bar data={reservationChartData} options={{ responsive: true }} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Reservations */}
        <div className="lg:col-span-2 bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">Recent Reservations</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Guest
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date & Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Party
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {recentReservations.map((reservation) => (
                  <tr key={reservation.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{reservation.guestName}</div>
                      <div className="text-sm text-gray-500">{reservation.guestEmail}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(reservation.dateTime).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {reservation.partySize}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        reservation.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                        reservation.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {reservation.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Top Dishes */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">Top Dishes</h2>
          <Doughnut data={cuisineChartData} options={{ responsive: true }} />
        </div>
      </div>
    </div>
  );
}