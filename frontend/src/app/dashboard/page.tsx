'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface DashboardMetrics {
  todayReservations: number;
  weeklyReservations: number;
  monthlyReservations: number;
  totalRevenue: number;
  averageRating: number;
  occupancyRate: number;
  noShowRate: number;
  returningCustomers: number;
  upcomingReservations: Reservation[];
  recentReviews: Review[];
  weeklyData: WeeklyData[];
  popularTimes: PopularTime[];
}

interface Reservation {
  id: string;
  time: string;
  date: string;
  name: string;
  email: string;
  phone: string;
  partySize: number;
  status: 'confirmed' | 'pending' | 'cancelled' | 'completed' | 'no-show';
  specialRequests?: string;
  tableNumber?: number;
}

interface Review {
  id: string;
  author: string;
  avatar?: string;
  rating: number;
  comment: string;
  date: string;
  response?: string;
}

interface WeeklyData {
  day: string;
  reservations: number;
  revenue: number;
}

interface PopularTime {
  time: string;
  bookings: number;
  percentage: number;
}

const tabs = [
  { id: 'overview', label: 'Overview', icon: '📊' },
  { id: 'reservations', label: 'Reservations', icon: '📅' },
  { id: 'analytics', label: 'Analytics', icon: '📈' },
  { id: 'reviews', label: 'Reviews', icon: '⭐' },
];

const statusColors: Record<string, string> = {
  confirmed: 'bg-green-100 text-green-800',
  pending: 'bg-yellow-100 text-yellow-800',
  cancelled: 'bg-red-100 text-red-800',
  completed: 'bg-blue-100 text-blue-800',
  'no-show': 'bg-gray-100 text-gray-800',
};

export default function RestaurantDashboard() {
  const router = useRouter();
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [reservationFilter, setReservationFilter] = useState<string>('all');

  useEffect(() => {
    fetchDashboardData();
  }, [selectedDate]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 800));
      
      const mockData: DashboardMetrics = {
        todayReservations: 24,
        weeklyReservations: 156,
        monthlyReservations: 623,
        totalRevenue: 12450,
        averageRating: 4.7,
        occupancyRate: 78,
        noShowRate: 5,
        returningCustomers: 42,
        upcomingReservations: [
          { id: '1', time: '6:00 PM', date: '2025-01-28', name: 'John Smith', email: 'john@example.com', phone: '(555) 123-4567', partySize: 4, status: 'confirmed', tableNumber: 12, specialRequests: 'Window seat preferred' },
          { id: '2', time: '6:30 PM', date: '2025-01-28', name: 'Sarah Johnson', email: 'sarah@example.com', phone: '(555) 234-5678', partySize: 2, status: 'confirmed', tableNumber: 8 },
          { id: '3', time: '7:00 PM', date: '2025-01-28', name: 'Mike Wilson', email: 'mike@example.com', phone: '(555) 345-6789', partySize: 6, status: 'pending', specialRequests: 'Birthday celebration' },
          { id: '4', time: '7:30 PM', date: '2025-01-28', name: 'Emily Brown', email: 'emily@example.com', phone: '(555) 456-7890', partySize: 3, status: 'confirmed', tableNumber: 5 },
          { id: '5', time: '8:00 PM', date: '2025-01-28', name: 'David Lee', email: 'david@example.com', phone: '(555) 567-8901', partySize: 2, status: 'cancelled' },
          { id: '6', time: '8:30 PM', date: '2025-01-28', name: 'Lisa Chen', email: 'lisa@example.com', phone: '(555) 678-9012', partySize: 4, status: 'confirmed', tableNumber: 15 },
        ],
        recentReviews: [
          { id: '1', author: 'Alice M.', rating: 5, comment: 'Excellent food and service! The ambiance was perfect for our anniversary dinner.', date: '2 hours ago' },
          { id: '2', author: 'Robert K.', rating: 4, comment: 'Great experience overall. Food was delicious but service was a bit slow.', date: '5 hours ago' },
          { id: '3', author: 'Jennifer P.', rating: 5, comment: 'Best Italian restaurant in the city! Will definitely come back.', date: '1 day ago' },
          { id: '4', author: 'Thomas W.', rating: 3, comment: 'Food was good but portion sizes could be larger for the price.', date: '2 days ago' },
        ],
        weeklyData: [
          { day: 'Mon', reservations: 18, revenue: 1450 },
          { day: 'Tue', reservations: 22, revenue: 1820 },
          { day: 'Wed', reservations: 25, revenue: 2100 },
          { day: 'Thu', reservations: 28, revenue: 2340 },
          { day: 'Fri', reservations: 35, revenue: 3200 },
          { day: 'Sat', reservations: 42, revenue: 3890 },
          { day: 'Sun', reservations: 30, revenue: 2650 },
        ],
        popularTimes: [
          { time: '5:00 PM', bookings: 8, percentage: 40 },
          { time: '6:00 PM', bookings: 15, percentage: 75 },
          { time: '7:00 PM', bookings: 20, percentage: 100 },
          { time: '8:00 PM', bookings: 18, percentage: 90 },
          { time: '9:00 PM', bookings: 12, percentage: 60 },
        ],
      };
      setMetrics(mockData);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredReservations = metrics?.upcomingReservations.filter(r => 
    reservationFilter === 'all' || r.status === reservationFilter
  ) || [];

  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center">
        {[1, 2, 3, 4, 5].map((star) => (
          <span
            key={star}
            className={`text-lg ${star <= rating ? 'text-yellow-400' : 'text-gray-300'}`}
          >
            ★
          </span>
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex justify-center items-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-red-600 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
              <p className="text-gray-600 mt-1">Welcome back! Here's what's happening today.</p>
            </div>
            <div className="flex items-center gap-4">
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
              />
              <Link
                href="/reservations/new"
                className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors font-medium"
              >
                + New Reservation
              </Link>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex space-x-1 mt-6 border-b border-gray-200 -mb-px">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-red-600 text-red-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-8">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 card-hover">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                    <span className="text-2xl">📅</span>
                  </div>
                  <span className="text-green-600 text-sm font-medium flex items-center">
                    <span className="mr-1">↑</span> 12%
                  </span>
                </div>
                <h3 className="text-gray-500 text-sm font-medium">Today's Reservations</h3>
                <p className="text-3xl font-bold text-gray-900 mt-1">{metrics?.todayReservations}</p>
                <p className="text-xs text-gray-500 mt-2">{metrics?.weeklyReservations} this week</p>
              </div>

              <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 card-hover">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                    <span className="text-2xl">💰</span>
                  </div>
                  <span className="text-green-600 text-sm font-medium flex items-center">
                    <span className="mr-1">↑</span> 8%
                  </span>
                </div>
                <h3 className="text-gray-500 text-sm font-medium">Weekly Revenue</h3>
                <p className="text-3xl font-bold text-gray-900 mt-1">${metrics?.totalRevenue?.toLocaleString()}</p>
                <p className="text-xs text-gray-500 mt-2">Avg $52 per cover</p>
              </div>

              <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 card-hover">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <span className="text-2xl">📊</span>
                  </div>
                  <span className="text-green-600 text-sm font-medium flex items-center">
                    <span className="mr-1">↑</span> 5%
                  </span>
                </div>
                <h3 className="text-gray-500 text-sm font-medium">Occupancy Rate</h3>
                <p className="text-3xl font-bold text-gray-900 mt-1">{metrics?.occupancyRate}%</p>
                <div className="w-full bg-gray-200 rounded-full h-2 mt-3">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${metrics?.occupancyRate}%` }}
                  ></div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 card-hover">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                    <span className="text-2xl">⭐</span>
                  </div>
                  <span className="text-green-600 text-sm font-medium flex items-center">
                    <span className="mr-1">↑</span> 0.2
                  </span>
                </div>
                <h3 className="text-gray-500 text-sm font-medium">Average Rating</h3>
                <p className="text-3xl font-bold text-gray-900 mt-1">{metrics?.averageRating}</p>
                <div className="flex mt-2">
                  {renderStars(Math.round(metrics?.averageRating || 0))}
                </div>
              </div>
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Weekly Performance Chart */}
              <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                <h3 className="text-lg font-semibold text-gray-900 mb-6">Weekly Performance</h3>
                <div className="space-y-4">
                  {metrics?.weeklyData.map((data, index) => (
                    <div key={data.day} className="flex items-center">
                      <span className="w-10 text-sm text-gray-600">{data.day}</span>
                      <div className="flex-1 mx-4">
                        <div className="h-8 bg-gray-100 rounded-lg overflow-hidden relative">
                          <div 
                            className="h-full bg-gradient-to-r from-red-500 to-red-600 rounded-lg transition-all duration-500 flex items-center justify-end pr-2"
                            style={{ width: `${(data.reservations / 50) * 100}%` }}
                          >
                            <span className="text-xs text-white font-medium">{data.reservations}</span>
                          </div>
                        </div>
                      </div>
                      <span className="text-sm font-medium text-gray-900 w-20 text-right">${data.revenue}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Popular Times */}
              <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                <h3 className="text-lg font-semibold text-gray-900 mb-6">Popular Dining Times</h3>
                <div className="space-y-4">
                  {metrics?.popularTimes.map((time) => (
                    <div key={time.time} className="flex items-center">
                      <span className="w-20 text-sm text-gray-600">{time.time}</span>
                      <div className="flex-1 mx-4">
                        <div className="h-6 bg-gray-100 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full transition-all duration-500 ${
                              time.percentage > 80 ? 'bg-red-500' : time.percentage > 50 ? 'bg-yellow-500' : 'bg-green-500'
                            }`}
                            style={{ width: `${time.percentage}%` }}
                          ></div>
                        </div>
                      </div>
                      <span className="text-sm font-medium text-gray-900 w-16 text-right">{time.bookings} bookings</span>
                    </div>
                  ))}
                </div>
                <div className="mt-6 flex items-center justify-center gap-6 text-xs">
                  <span className="flex items-center"><span className="w-3 h-3 bg-green-500 rounded-full mr-2"></span>Available</span>
                  <span className="flex items-center"><span className="w-3 h-3 bg-yellow-500 rounded-full mr-2"></span>Busy</span>
                  <span className="flex items-center"><span className="w-3 h-3 bg-red-500 rounded-full mr-2"></span>Peak</span>
                </div>
              </div>
            </div>

            {/* Quick Stats Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-5 text-white">
                <p className="text-purple-200 text-sm">Returning Customers</p>
                <p className="text-2xl font-bold mt-1">{metrics?.returningCustomers}%</p>
              </div>
              <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-5 text-white">
                <p className="text-blue-200 text-sm">Monthly Bookings</p>
                <p className="text-2xl font-bold mt-1">{metrics?.monthlyReservations}</p>
              </div>
              <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl p-5 text-white">
                <p className="text-orange-200 text-sm">No-Show Rate</p>
                <p className="text-2xl font-bold mt-1">{metrics?.noShowRate}%</p>
              </div>
              <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-5 text-white">
                <p className="text-green-200 text-sm">Completion Rate</p>
                <p className="text-2xl font-bold mt-1">{100 - (metrics?.noShowRate || 0)}%</p>
              </div>
            </div>
          </div>
        )}

        {/* Reservations Tab */}
        {activeTab === 'reservations' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex flex-wrap gap-2">
                {['all', 'confirmed', 'pending', 'cancelled'].map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setReservationFilter(filter)}
                    className={`px-4 py-2 rounded-lg font-medium capitalize transition-colors ${
                      reservationFilter === filter
                        ? 'bg-red-600 text-white'
                        : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    {filter}
                  </button>
                ))}
              </div>
              <div className="text-sm text-gray-600">
                Showing {filteredReservations.length} reservations
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Guest</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Time</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Party Size</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Table</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredReservations.map((reservation) => (
                      <tr key={reservation.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4">
                          <div>
                            <p className="font-medium text-gray-900">{reservation.name}</p>
                            <p className="text-sm text-gray-500">{reservation.email}</p>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <p className="font-medium text-gray-900">{reservation.time}</p>
                          <p className="text-sm text-gray-500">{reservation.date}</p>
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center">
                            <span className="mr-1">👥</span> {reservation.partySize} guests
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          {reservation.tableNumber ? (
                            <span className="bg-gray-100 text-gray-800 px-3 py-1 rounded-full text-sm">
                              Table {reservation.tableNumber}
                            </span>
                          ) : (
                            <span className="text-gray-400">Not assigned</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-3 py-1 rounded-full text-sm font-medium capitalize ${statusColors[reservation.status]}`}>
                            {reservation.status}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                              Edit
                            </button>
                            <button className="text-gray-600 hover:text-gray-800 text-sm font-medium">
                              View
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Analytics Tab */}
        {activeTab === 'analytics' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue Breakdown</h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Dine-in</span>
                    <span className="font-semibold">$9,450</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Delivery</span>
                    <span className="font-semibold">$2,100</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Takeout</span>
                    <span className="font-semibold">$900</span>
                  </div>
                  <hr />
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-gray-900">Total</span>
                    <span className="font-bold text-lg">${metrics?.totalRevenue?.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Customer Insights</h3>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600">New Customers</span>
                      <span>58%</span>
                    </div>
                    <div className="h-2 bg-gray-200 rounded-full">
                      <div className="h-2 bg-blue-500 rounded-full" style={{ width: '58%' }}></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600">Returning</span>
                      <span>42%</span>
                    </div>
                    <div className="h-2 bg-gray-200 rounded-full">
                      <div className="h-2 bg-green-500 rounded-full" style={{ width: '42%' }}></div>
                    </div>
                  </div>
                  <div className="pt-4 border-t">
                    <p className="text-sm text-gray-600">Average visit frequency</p>
                    <p className="text-2xl font-bold">2.3x / month</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Metrics</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                    <span className="text-green-800">Best Day</span>
                    <span className="font-semibold text-green-900">Saturday</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                    <span className="text-blue-800">Peak Time</span>
                    <span className="font-semibold text-blue-900">7:00 PM</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                    <span className="text-purple-800">Avg Party</span>
                    <span className="font-semibold text-purple-900">3.2 guests</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">Monthly Trends</h3>
              <div className="h-64 flex items-end justify-between gap-2">
                {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((month, index) => {
                  const height = 30 + Math.random() * 70;
                  return (
                    <div key={month} className="flex-1 flex flex-col items-center">
                      <div 
                        className="w-full bg-gradient-to-t from-red-600 to-red-400 rounded-t-lg transition-all duration-500 hover:from-red-700 hover:to-red-500"
                        style={{ height: `${height}%` }}
                      ></div>
                      <span className="text-xs text-gray-500 mt-2">{month}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Reviews Tab */}
        {activeTab === 'reviews' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 text-center">
                <p className="text-5xl font-bold text-gray-900">{metrics?.averageRating}</p>
                <div className="flex justify-center mt-2">{renderStars(Math.round(metrics?.averageRating || 0))}</div>
                <p className="text-sm text-gray-500 mt-2">Based on 342 reviews</p>
              </div>
              <div className="md:col-span-3 bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                <h3 className="font-semibold text-gray-900 mb-4">Rating Distribution</h3>
                {[5, 4, 3, 2, 1].map((rating) => {
                  const percentage = rating === 5 ? 68 : rating === 4 ? 22 : rating === 3 ? 6 : rating === 2 ? 3 : 1;
                  return (
                    <div key={rating} className="flex items-center mb-2">
                      <span className="w-8 text-sm text-gray-600">{rating}★</span>
                      <div className="flex-1 mx-4 h-4 bg-gray-100 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-yellow-400 rounded-full"
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>
                      <span className="w-12 text-sm text-gray-600 text-right">{percentage}%</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="space-y-4">
              {metrics?.recentReviews.map((review) => (
                <div key={review.id} className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center">
                      <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center text-xl">
                        {review.author.charAt(0)}
                      </div>
                      <div className="ml-4">
                        <p className="font-semibold text-gray-900">{review.author}</p>
                        <p className="text-sm text-gray-500">{review.date}</p>
                      </div>
                    </div>
                    {renderStars(review.rating)}
                  </div>
                  <p className="mt-4 text-gray-700">{review.comment}</p>
                  <div className="mt-4 flex gap-3">
                    <button className="text-sm text-red-600 hover:text-red-700 font-medium">
                      Reply
                    </button>
                    <button className="text-sm text-gray-600 hover:text-gray-700 font-medium">
                      Flag
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
