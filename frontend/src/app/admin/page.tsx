'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface AdminStats {
  totalUsers: number;
  totalRestaurants: number;
  totalReservations: number;
  totalRevenue: number;
  activeUsers: number;
  pendingRestaurants: number;
  todayReservations: number;
  monthlyGrowth: number;
}

interface PendingRestaurant {
  id: string;
  name: string;
  ownerName: string;
  createdAt: string;
  status: string;
}

interface SystemHealth {
  database: 'healthy' | 'warning' | 'error';
  redis: 'healthy' | 'warning' | 'error';
  api: 'healthy' | 'warning' | 'error';
  storage: 'healthy' | 'warning' | 'error';
}

// Mock data for demonstration
const mockStats: AdminStats = {
  totalUsers: 12543,
  totalRestaurants: 3421,
  totalReservations: 89234,
  totalRevenue: 1234567,
  activeUsers: 4532,
  pendingRestaurants: 12,
  todayReservations: 342,
  monthlyGrowth: 15.7
};

const mockPendingRestaurants: PendingRestaurant[] = [
  {
    id: '1',
    name: 'Golden Dragon Restaurant',
    ownerName: 'John Chen',
    createdAt: '2025-01-18',
    status: 'pending'
  },
  {
    id: '2',
    name: 'La Bella Vista',
    ownerName: 'Maria Rodriguez',
    createdAt: '2025-01-17',
    status: 'pending'
  },
  {
    id: '3',
    name: 'The Garden Bistro',
    ownerName: 'Sarah Johnson',
    createdAt: '2025-01-16',
    status: 'pending'
  }
];

const mockSystemHealth: SystemHealth = {
  database: 'healthy',
  redis: 'healthy',
  api: 'healthy',
  storage: 'warning'
};

export default function AdminDashboard() {
  const router = useRouter();
  const [stats] = useState<AdminStats>(mockStats);
  const [pendingRestaurants, setPendingRestaurants] = useState<PendingRestaurant[]>(mockPendingRestaurants);
  const [systemHealth] = useState<SystemHealth>(mockSystemHealth);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('overview');
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Mock Google Analytics data
  const googleAnalyticsData = {
    realTimeUsers: 523,
    todayUsers: 4532,
    weeklyUsers: 31240,
    monthlyUsers: 124853,
    pageViews: 523401,
    bounceRate: 42.3,
    avgSessionDuration: '3:24',
    topPages: [
      { page: '/restaurants', views: 45234, percentage: 28 },
      { page: '/', views: 34521, percentage: 21 },
      { page: '/restaurants/1', views: 23412, percentage: 14 },
      { page: '/about', views: 12342, percentage: 8 },
      { page: '/help', views: 8234, percentage: 5 }
    ],
    trafficSources: [
      { source: 'Organic Search', users: 45234, percentage: 36 },
      { source: 'Direct', users: 34123, percentage: 27 },
      { source: 'Social Media', users: 23456, percentage: 19 },
      { source: 'Referral', users: 15234, percentage: 12 },
      { source: 'Email', users: 6856, percentage: 6 }
    ],
    devices: [
      { device: 'Mobile', percentage: 62 },
      { device: 'Desktop', percentage: 30 },
      { device: 'Tablet', percentage: 8 }
    ]
  };

  // Mock Search Console data
  const searchConsoleData = {
    totalImpressions: 234567,
    totalClicks: 12345,
    avgCTR: 5.3,
    avgPosition: 8.2,
    topQueries: [
      { query: 'restaurant reservations near me', clicks: 2341, impressions: 45234, ctr: 5.2, position: 3.4 },
      { query: 'book restaurant table online', clicks: 1823, impressions: 34521, ctr: 5.3, position: 4.2 },
      { query: 'opentable clone', clicks: 1234, impressions: 23456, ctr: 5.3, position: 1.2 },
      { query: 'best restaurants downtown', clicks: 892, impressions: 18234, ctr: 4.9, position: 7.8 },
      { query: 'italian restaurant booking', clicks: 623, impressions: 12345, ctr: 5.0, position: 9.3 }
    ],
    topPages: [
      { page: '/restaurants', clicks: 3421, impressions: 67234, ctr: 5.1, position: 6.2 },
      { page: '/', clicks: 2856, impressions: 54321, ctr: 5.3, position: 4.5 },
      { page: '/restaurants/search', clicks: 2134, impressions: 43210, ctr: 4.9, position: 8.7 },
      { page: '/about', clicks: 1234, impressions: 23456, ctr: 5.3, position: 7.2 }
    ],
    crawlStats: {
      pagesIndexed: 3421,
      pagesCrawled: 3856,
      crawlErrors: 12,
      avgResponseTime: 234
    }
  };

  useEffect(() => {
    // Check if user is admin (mock authentication)
    const isAdmin = localStorage.getItem('isAdmin');
    if (!isAdmin) {
      router.push('/login');
    } else {
      setIsAuthenticated(true);
    }
  }, [router]);

  const handleApproveRestaurant = (id: string) => {
    setPendingRestaurants(prev => prev.filter(r => r.id !== id));
    alert(`Restaurant approved (ID: ${id})`);
  };

  const handleRejectRestaurant = (id: string) => {
    setPendingRestaurants(prev => prev.filter(r => r.id !== id));
    alert(`Restaurant rejected (ID: ${id})`);
  };

  if (!isAuthenticated) {
    return null;
  }

  const getHealthIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <span className="text-green-500">✓</span>;
      case 'warning':
        return <span className="text-yellow-500">⚠️</span>;
      case 'error':
        return <span className="text-red-500">✗</span>;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <p className="text-gray-600">System overview and management</p>
        </div>

        {/* System Health */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <span>🏥</span>
            System Health
          </h2>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {Object.entries(systemHealth).map(([service, status]) => (
              <div key={service} className="flex items-center gap-2">
                {getHealthIcon(status)}
                <span className="text-sm font-medium capitalize">{service}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Stats Grid */}
        <div className="mb-8 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-600">Total Users</h3>
              <span className="text-2xl">👥</span>
            </div>
            <div className="text-2xl font-bold">{stats.totalUsers.toLocaleString()}</div>
            <p className="text-xs text-gray-500 mt-1">
              {stats.activeUsers.toLocaleString()} active today
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-600">Total Restaurants</h3>
              <span className="text-2xl">🏢</span>
            </div>
            <div className="text-2xl font-bold">{stats.totalRestaurants.toLocaleString()}</div>
            <p className="text-xs text-gray-500 mt-1">
              {stats.pendingRestaurants} pending approval
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-600">Total Reservations</h3>
              <span className="text-2xl">📅</span>
            </div>
            <div className="text-2xl font-bold">{stats.totalReservations.toLocaleString()}</div>
            <p className="text-xs text-gray-500 mt-1">
              {stats.todayReservations} today
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-600">Total Revenue</h3>
              <span className="text-2xl">💰</span>
            </div>
            <div className="text-2xl font-bold">
              ${stats.totalRevenue.toLocaleString()}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              <span className="text-green-600">↑</span>{' '}
              {stats.monthlyGrowth}% this month
            </p>
          </div>
        </div>

        {/* Management Tabs */}
        <div className="bg-white rounded-lg shadow-sm">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex overflow-x-auto">
              {['overview', 'restaurants', 'users', 'analytics', 'google-analytics', 'search-console', 'settings'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`py-4 px-6 text-sm font-medium capitalize whitespace-nowrap border-b-2 ${
                    activeTab === tab
                      ? 'border-red-600 text-red-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {tab === 'restaurants' ? 'Pending Restaurants' : 
                   tab === 'google-analytics' ? 'Google Analytics' :
                   tab === 'search-console' ? 'Search Console' : tab}
                </button>
              ))}
            </nav>
          </div>

          <div className="p-6">
            {activeTab === 'overview' && (
              <div>
                <h3 className="text-lg font-semibold mb-4">Recent Activity</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between py-3 border-b">
                    <div>
                      <p className="font-medium">New restaurant registration</p>
                      <p className="text-sm text-gray-600">Golden Dragon Restaurant - 2 hours ago</p>
                    </div>
                    <span className="text-sm text-blue-600">Review</span>
                  </div>
                  <div className="flex items-center justify-between py-3 border-b">
                    <div>
                      <p className="font-medium">High traffic alert</p>
                      <p className="text-sm text-gray-600">Server load exceeded 80% - 4 hours ago</p>
                    </div>
                    <span className="text-sm text-yellow-600">Warning</span>
                  </div>
                  <div className="flex items-center justify-between py-3 border-b">
                    <div>
                      <p className="font-medium">Successful payment processed</p>
                      <p className="text-sm text-gray-600">Monthly revenue target reached - 1 day ago</p>
                    </div>
                    <span className="text-sm text-green-600">Success</span>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'restaurants' && (
              <div>
                <h3 className="text-lg font-semibold mb-4">Pending Restaurant Approvals</h3>
                {pendingRestaurants.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead>
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Restaurant Name
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Owner
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Submitted
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Status
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {pendingRestaurants.map((restaurant) => (
                          <tr key={restaurant.id}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {restaurant.name}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {restaurant.ownerName}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {new Date(restaurant.createdAt).toLocaleDateString()}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                                {restaurant.status}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                              <button
                                onClick={() => handleApproveRestaurant(restaurant.id)}
                                className="text-green-600 hover:text-green-900 mr-3"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => handleRejectRestaurant(restaurant.id)}
                                className="text-red-600 hover:text-red-900"
                              >
                                Reject
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="py-8 text-center text-gray-600">No pending restaurants</p>
                )}
              </div>
            )}

            {activeTab === 'users' && (
              <div>
                <h3 className="text-lg font-semibold mb-4">User Management</h3>
                <div className="mb-4">
                  <input
                    type="text"
                    placeholder="Search users by name or email..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full max-w-md px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-600"
                  />
                </div>
                <p className="text-gray-600">User management interface - shows list of users with ability to view details, suspend accounts, etc.</p>
              </div>
            )}

            {activeTab === 'analytics' && (
              <div>
                <h3 className="text-lg font-semibold mb-4">Platform Analytics</h3>
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-medium mb-3 flex items-center gap-2">
                      <span>📊</span>
                      Key Metrics
                    </h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Average booking value</span>
                        <span className="font-medium">$142</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Conversion rate</span>
                        <span className="font-medium">3.2%</span>
                      </div>
                      <div className="flex justify-between">
                        <span>User retention</span>
                        <span className="font-medium">68%</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Avg. party size</span>
                        <span className="font-medium">2.8</span>
                      </div>
                    </div>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-medium mb-3">Popular Cuisines</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Italian</span>
                        <span className="font-medium">28%</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Japanese</span>
                        <span className="font-medium">22%</span>
                      </div>
                      <div className="flex justify-between">
                        <span>American</span>
                        <span className="font-medium">18%</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Mexican</span>
                        <span className="font-medium">12%</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'google-analytics' && (
              <div>
                <h3 className="text-lg font-semibold mb-4">Google Analytics</h3>
                
                {/* Real-time Stats */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-600">Real-time Users</span>
                      <span className="text-green-500">🟢</span>
                    </div>
                    <div className="text-2xl font-bold">{googleAnalyticsData.realTimeUsers}</div>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="text-sm text-gray-600 mb-2">Today</div>
                    <div className="text-2xl font-bold">{googleAnalyticsData.todayUsers.toLocaleString()}</div>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="text-sm text-gray-600 mb-2">This Week</div>
                    <div className="text-2xl font-bold">{googleAnalyticsData.weeklyUsers.toLocaleString()}</div>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="text-sm text-gray-600 mb-2">This Month</div>
                    <div className="text-2xl font-bold">{googleAnalyticsData.monthlyUsers.toLocaleString()}</div>
                  </div>
                </div>

                {/* Key Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div className="border rounded-lg p-4">
                    <h4 className="font-medium mb-2">Page Views</h4>
                    <div className="text-2xl font-bold">{googleAnalyticsData.pageViews.toLocaleString()}</div>
                  </div>
                  <div className="border rounded-lg p-4">
                    <h4 className="font-medium mb-2">Bounce Rate</h4>
                    <div className="text-2xl font-bold">{googleAnalyticsData.bounceRate}%</div>
                  </div>
                  <div className="border rounded-lg p-4">
                    <h4 className="font-medium mb-2">Avg. Session Duration</h4>
                    <div className="text-2xl font-bold">{googleAnalyticsData.avgSessionDuration}</div>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Top Pages */}
                  <div className="border rounded-lg p-4">
                    <h4 className="font-medium mb-3">Top Pages</h4>
                    <div className="space-y-2">
                      {googleAnalyticsData.topPages.map((page, index) => (
                        <div key={index} className="flex items-center justify-between">
                          <span className="text-sm">{page.page}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-600">{page.views.toLocaleString()}</span>
                            <div className="w-20 bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-blue-600 h-2 rounded-full" 
                                style={{ width: `${page.percentage}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Traffic Sources */}
                  <div className="border rounded-lg p-4">
                    <h4 className="font-medium mb-3">Traffic Sources</h4>
                    <div className="space-y-2">
                      {googleAnalyticsData.trafficSources.map((source, index) => (
                        <div key={index} className="flex items-center justify-between">
                          <span className="text-sm">{source.source}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-600">{source.percentage}%</span>
                            <div className="w-20 bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-green-600 h-2 rounded-full" 
                                style={{ width: `${source.percentage}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Device Breakdown */}
                  <div className="border rounded-lg p-4">
                    <h4 className="font-medium mb-3">Device Breakdown</h4>
                    <div className="space-y-2">
                      {googleAnalyticsData.devices.map((device, index) => (
                        <div key={index} className="flex items-center justify-between">
                          <span className="text-sm">{device.device}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-600">{device.percentage}%</span>
                            <div className="w-20 bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-purple-600 h-2 rounded-full" 
                                style={{ width: `${device.percentage}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'search-console' && (
              <div>
                <h3 className="text-lg font-semibold mb-4">Google Search Console</h3>
                
                {/* Search Performance Overview */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                  <div className="bg-purple-50 p-4 rounded-lg">
                    <div className="text-sm text-gray-600 mb-2">Total Impressions</div>
                    <div className="text-2xl font-bold">{searchConsoleData.totalImpressions.toLocaleString()}</div>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg">
                    <div className="text-sm text-gray-600 mb-2">Total Clicks</div>
                    <div className="text-2xl font-bold">{searchConsoleData.totalClicks.toLocaleString()}</div>
                  </div>
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <div className="text-sm text-gray-600 mb-2">Average CTR</div>
                    <div className="text-2xl font-bold">{searchConsoleData.avgCTR}%</div>
                  </div>
                  <div className="bg-yellow-50 p-4 rounded-lg">
                    <div className="text-sm text-gray-600 mb-2">Average Position</div>
                    <div className="text-2xl font-bold">{searchConsoleData.avgPosition}</div>
                  </div>
                </div>

                {/* Top Search Queries */}
                <div className="mb-6">
                  <h4 className="font-medium mb-3">Top Search Queries</h4>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Query</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Clicks</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Impressions</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">CTR</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Position</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {searchConsoleData.topQueries.map((query, index) => (
                          <tr key={index}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{query.query}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{query.clicks.toLocaleString()}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{query.impressions.toLocaleString()}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{query.ctr}%</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{query.position}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Top Pages */}
                <div className="mb-6">
                  <h4 className="font-medium mb-3">Top Pages by Search Performance</h4>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Page</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Clicks</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Impressions</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">CTR</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Position</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {searchConsoleData.topPages.map((page, index) => (
                          <tr key={index}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{page.page}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{page.clicks.toLocaleString()}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{page.impressions.toLocaleString()}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{page.ctr}%</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{page.position}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Crawl Stats */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="border rounded-lg p-4">
                    <h4 className="font-medium mb-2">Pages Indexed</h4>
                    <div className="text-2xl font-bold text-green-600">{searchConsoleData.crawlStats.pagesIndexed.toLocaleString()}</div>
                  </div>
                  <div className="border rounded-lg p-4">
                    <h4 className="font-medium mb-2">Pages Crawled</h4>
                    <div className="text-2xl font-bold text-blue-600">{searchConsoleData.crawlStats.pagesCrawled.toLocaleString()}</div>
                  </div>
                  <div className="border rounded-lg p-4">
                    <h4 className="font-medium mb-2">Crawl Errors</h4>
                    <div className="text-2xl font-bold text-red-600">{searchConsoleData.crawlStats.crawlErrors}</div>
                  </div>
                  <div className="border rounded-lg p-4">
                    <h4 className="font-medium mb-2">Avg Response Time</h4>
                    <div className="text-2xl font-bold">{searchConsoleData.crawlStats.avgResponseTime}ms</div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'settings' && (
              <div>
                <h3 className="text-lg font-semibold mb-4">System Settings</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between rounded-lg border p-4">
                    <div>
                      <p className="font-medium">Google Analytics Integration</p>
                      <p className="text-sm text-gray-600">
                        Connect your Google Analytics account for real-time data
                      </p>
                    </div>
                    <button className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                      Connect GA4
                    </button>
                  </div>
                  <div className="flex items-center justify-between rounded-lg border p-4">
                    <div>
                      <p className="font-medium">Search Console Integration</p>
                      <p className="text-sm text-gray-600">
                        Connect your Google Search Console for SEO insights
                      </p>
                    </div>
                    <button className="px-4 py-2 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700">
                      Connect GSC
                    </button>
                  </div>
                  <div className="flex items-center justify-between rounded-lg border p-4">
                    <div>
                      <p className="font-medium">Maintenance Mode</p>
                      <p className="text-sm text-gray-600">
                        Temporarily disable the platform for maintenance
                      </p>
                    </div>
                    <button className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">
                      Enable
                    </button>
                  </div>
                  <div className="flex items-center justify-between rounded-lg border p-4">
                    <div>
                      <p className="font-medium">Email Notifications</p>
                      <p className="text-sm text-gray-600">Configure system email settings</p>
                    </div>
                    <button className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">
                      Configure
                    </button>
                  </div>
                  <div className="flex items-center justify-between rounded-lg border p-4">
                    <div>
                      <p className="font-medium">Payment Settings</p>
                      <p className="text-sm text-gray-600">Manage payment gateway integration</p>
                    </div>
                    <button className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">
                      Configure
                    </button>
                  </div>
                  <div className="flex items-center justify-between rounded-lg border p-4">
                    <div>
                      <p className="font-medium">Backup Settings</p>
                      <p className="text-sm text-gray-600">Configure automatic database backups</p>
                    </div>
                    <button className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">
                      Configure
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}