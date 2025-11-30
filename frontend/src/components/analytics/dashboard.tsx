'use client';

import React, { useState } from 'react';
import { useDashboardData, useRealTimeMetrics, analyticsService } from '@/lib/analytics/service';

interface DateRange {
  start: string;
  end: string;
}

interface AnalyticsDashboardProps {
  className?: string;
}

export function AnalyticsDashboard({ className = '' }: AnalyticsDashboardProps) {
  const [dateRange, setDateRange] = useState<DateRange>({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days ago
    end: new Date().toISOString().split('T')[0], // today
  });
  
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'revenue' | 'restaurants'>('overview');
  const { data, loading, error } = useDashboardData(dateRange);

  const tabs = [
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'users', label: 'Users', icon: '👥' },
    { id: 'revenue', label: 'Revenue', icon: '💰' },
    { id: 'restaurants', label: 'Restaurants', icon: '🍽️' },
  ] as const;

  if (loading) {
    return (
      <div className={`p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white p-6 rounded-lg shadow-lg">
                <div className="h-4 bg-gray-200 rounded mb-2"></div>
                <div className="h-8 bg-gray-200 rounded mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white p-6 rounded-lg shadow-lg">
                <div className="h-64 bg-gray-200 rounded"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`p-6 ${className}`}>
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          Failed to load analytics data: {error}
        </div>
      </div>
    );
  }

  return (
    <div className={`p-6 ${className}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4 sm:mb-0">Analytics Dashboard</h1>
        
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Date Range Picker */}
          <div className="flex gap-2">
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          {/* Export Button */}
          <button
            onClick={() => handleExport('csv')}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            Export CSV
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-8">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <span className="text-lg">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Real-time Stats */}
      <RealTimeStats className="mb-8" />

      {/* Main Content */}
      {activeTab === 'overview' && data && <OverviewTab data={data} />}
      {activeTab === 'users' && data && <UsersTab data={data} />}
      {activeTab === 'revenue' && data && <RevenueTab data={data} />}
      {activeTab === 'restaurants' && data && <RestaurantsTab data={data} />}
    </div>
  );

  async function handleExport(format: 'csv' | 'xlsx') {
    try {
      const blob = await analyticsService.exportData(format, 'dashboard', dateRange);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `analytics-${dateRange.start}-to-${dateRange.end}.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
    }
  }
}

function RealTimeStats({ className = '' }: { className?: string }) {
  const { metrics, loading } = useRealTimeMetrics();

  if (loading || !metrics) {
    return (
      <div className={`bg-white rounded-lg shadow-lg p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded mb-4"></div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="text-center">
                <div className="h-8 bg-gray-200 rounded mb-2"></div>
                <div className="h-4 bg-gray-200 rounded"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const stats = [
    { label: 'Active Users', value: metrics.activeUsers, icon: '👥' },
    { label: 'Page Views', value: metrics.pageViews, icon: '👀' },
    { label: 'Live Events', value: metrics.events, icon: '⚡' },
    { label: 'Conversions', value: metrics.conversions, icon: '🎯' },
  ];

  return (
    <div className={`bg-white rounded-lg shadow-lg p-6 ${className}`}>
      <div className="flex items-center gap-2 mb-4">
        <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
        <h2 className="text-lg font-semibold text-gray-900">Real-time Activity</h2>
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <div key={index} className="text-center">
            <div className="text-2xl mb-1">{stat.icon}</div>
            <div className="text-2xl font-bold text-gray-900">{stat.value.toLocaleString()}</div>
            <div className="text-sm text-gray-600">{stat.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function OverviewTab({ data }: { data: any }) {
  const keyMetrics = [
    {
      title: 'Total Users',
      value: data.overview.totalUsers.value,
      change: data.overview.totalUsers.change,
      changeType: data.overview.totalUsers.changeType,
      icon: '👥',
    },
    {
      title: 'Active Users',
      value: data.overview.activeUsers.value,
      change: data.overview.activeUsers.change,
      changeType: data.overview.activeUsers.changeType,
      icon: '✅',
    },
    {
      title: 'Total Reservations',
      value: data.overview.totalReservations.value,
      change: data.overview.totalReservations.change,
      changeType: data.overview.totalReservations.changeType,
      icon: '🍽️',
    },
    {
      title: 'Revenue',
      value: `$${data.overview.revenue.value.toLocaleString()}`,
      change: data.overview.revenue.change,
      changeType: data.overview.revenue.changeType,
      icon: '💰',
    },
  ];

  return (
    <div className="space-y-8">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {keyMetrics.map((metric, index) => (
          <MetricCard key={index} {...metric} />
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard
          title="User Activity"
          data={data.charts.userActivity}
          type="line"
        />
        <ChartCard
          title="Reservation Trends"
          data={data.charts.reservationTrends}
          type="bar"
        />
        <ChartCard
          title="Revenue by Day"
          data={data.charts.revenueByDay}
          type="line"
        />
        <ChartCard
          title="Device Types"
          data={data.charts.deviceTypes}
          type="pie"
        />
      </div>

      {/* Insights */}
      <InsightsPanel insights={data.insights} />
    </div>
  );
}

function UsersTab({ data }: { data: any }) {
  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard
          title="User Growth"
          data={data.charts.userActivity}
          type="line"
        />
        <ChartCard
          title="Traffic Sources"
          data={data.charts.trafficSources}
          type="pie"
        />
      </div>
      
      <UserBehaviorInsights />
    </div>
  );
}

function RevenueTab({ data }: { data: any }) {
  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <MetricCard
          title="Total Revenue"
          value={`$${data.overview.revenue.value.toLocaleString()}`}
          change={data.overview.revenue.change}
          changeType={data.overview.revenue.changeType}
          icon="💰"
        />
        <MetricCard
          title="Average Order Value"
          value={`$${data.overview.averageOrderValue.value}`}
          change={data.overview.averageOrderValue.change}
          changeType={data.overview.averageOrderValue.changeType}
          icon="🛒"
        />
        <MetricCard
          title="Conversion Rate"
          value={`${data.overview.conversionRate.value}%`}
          change={data.overview.conversionRate.change}
          changeType={data.overview.conversionRate.changeType}
          icon="🎯"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard
          title="Revenue Trends"
          data={data.charts.revenueByDay}
          type="line"
        />
        <RevenueBreakdown />
      </div>
    </div>
  );
}

function RestaurantsTab({ data }: { data: any }) {
  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard
          title="Top Restaurants"
          data={data.charts.topRestaurants}
          type="bar"
        />
        <RestaurantPerformanceTable />
      </div>
    </div>
  );
}

interface MetricCardProps {
  title: string;
  value: string | number;
  change: number;
  changeType: 'increase' | 'decrease' | 'neutral';
  icon: string;
}

function MetricCard({ title, value, change, changeType, icon }: MetricCardProps) {
  const getChangeColor = () => {
    switch (changeType) {
      case 'increase': return 'text-green-600';
      case 'decrease': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getChangeIcon = () => {
    switch (changeType) {
      case 'increase': return '↗️';
      case 'decrease': return '↘️';
      default: return '➡️';
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-lg">
      <div className="flex items-center justify-between mb-2">
        <div className="text-2xl">{icon}</div>
        <div className={`flex items-center gap-1 text-sm ${getChangeColor()}`}>
          <span>{getChangeIcon()}</span>
          <span>{Math.abs(change)}%</span>
        </div>
      </div>
      <div className="text-2xl font-bold text-gray-900 mb-1">
        {typeof value === 'number' ? value.toLocaleString() : value}
      </div>
      <div className="text-sm text-gray-600">{title}</div>
    </div>
  );
}

interface ChartCardProps {
  title: string;
  data: any;
  type: 'line' | 'bar' | 'pie';
}

function ChartCard({ title, data, type }: ChartCardProps) {
  return (
    <div className="bg-white p-6 rounded-lg shadow-lg">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
      <div className="h-64 flex items-center justify-center bg-gray-50 rounded">
        {/* Placeholder for actual chart implementation */}
        <div className="text-center text-gray-500">
          <div className="text-4xl mb-2">📊</div>
          <div>{type.charAt(0).toUpperCase() + type.slice(1)} Chart</div>
          <div className="text-sm">Chart implementation needed</div>
        </div>
      </div>
    </div>
  );
}

function InsightsPanel({ insights }: { insights: any[] }) {
  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Insights & Recommendations</h3>
      
      <div className="space-y-4">
        {insights.map((insight) => (
          <div
            key={insight.id}
            className={`p-4 rounded-lg border-l-4 ${
              insight.type === 'alert' ? 'border-red-500 bg-red-50' :
              insight.type === 'insight' ? 'border-blue-500 bg-blue-50' :
              'border-green-500 bg-green-50'
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h4 className="font-medium text-gray-900 mb-1">{insight.title}</h4>
                <p className="text-sm text-gray-700 mb-2">{insight.description}</p>
                
                {insight.recommendations && (
                  <div className="mt-2">
                    <p className="text-sm font-medium text-gray-900 mb-1">Recommendations:</p>
                    <ul className="text-sm text-gray-700 list-disc list-inside">
                      {insight.recommendations.map((rec: string, index: number) => (
                        <li key={index}>{rec}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
              
              <div className={`px-2 py-1 rounded text-xs font-medium ${
                insight.impact === 'high' ? 'bg-red-100 text-red-800' :
                insight.impact === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                'bg-green-100 text-green-800'
              }`}>
                {insight.impact} impact
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function UserBehaviorInsights() {
  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">User Behavior Insights</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h4 className="font-medium text-gray-900 mb-3">Top User Journeys</h4>
          <div className="space-y-2">
            {[
              { path: 'Home → Search → Restaurant → Booking', users: 1234 },
              { path: 'Home → Featured → Restaurant → Booking', users: 987 },
              { path: 'Search → Filter → Restaurant → Booking', users: 765 },
            ].map((journey, index) => (
              <div key={index} className="flex justify-between p-2 bg-gray-50 rounded">
                <span className="text-sm text-gray-700">{journey.path}</span>
                <span className="text-sm font-medium text-gray-900">{journey.users}</span>
              </div>
            ))}
          </div>
        </div>
        
        <div>
          <h4 className="font-medium text-gray-900 mb-3">Drop-off Points</h4>
          <div className="space-y-2">
            {[
              { page: 'Checkout Page', rate: '15%' },
              { page: 'Registration Form', rate: '12%' },
              { page: 'Payment Form', rate: '8%' },
            ].map((dropoff, index) => (
              <div key={index} className="flex justify-between p-2 bg-gray-50 rounded">
                <span className="text-sm text-gray-700">{dropoff.page}</span>
                <span className="text-sm font-medium text-red-600">{dropoff.rate}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function RevenueBreakdown() {
  const revenueData = [
    { source: 'Reservations', amount: 125000, percentage: 65 },
    { source: 'Delivery Orders', amount: 48000, percentage: 25 },
    { source: 'Gift Cards', amount: 12000, percentage: 6 },
    { source: 'Subscriptions', amount: 8000, percentage: 4 },
  ];

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue Breakdown</h3>
      
      <div className="space-y-4">
        {revenueData.map((item, index) => (
          <div key={index}>
            <div className="flex justify-between mb-1">
              <span className="text-sm text-gray-700">{item.source}</span>
              <span className="text-sm font-medium text-gray-900">
                ${item.amount.toLocaleString()} ({item.percentage}%)
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full"
                style={{ width: `${item.percentage}%` }}
              ></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function RestaurantPerformanceTable() {
  const restaurants = [
    { name: 'The Garden Bistro', reservations: 245, revenue: 15400, rating: 4.8 },
    { name: 'Sushi Master', reservations: 189, revenue: 12300, rating: 4.6 },
    { name: 'Pizza Corner', reservations: 167, revenue: 8900, rating: 4.4 },
    { name: 'Steakhouse Prime', reservations: 123, revenue: 18700, rating: 4.9 },
  ];

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Restaurant Performance</h3>
      
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-2">Restaurant</th>
              <th className="text-right py-2">Reservations</th>
              <th className="text-right py-2">Revenue</th>
              <th className="text-right py-2">Rating</th>
            </tr>
          </thead>
          <tbody>
            {restaurants.map((restaurant, index) => (
              <tr key={index} className="border-b border-gray-100">
                <td className="py-2 font-medium text-gray-900">{restaurant.name}</td>
                <td className="text-right py-2">{restaurant.reservations}</td>
                <td className="text-right py-2">${restaurant.revenue.toLocaleString()}</td>
                <td className="text-right py-2 flex items-center justify-end gap-1">
                  <span>{restaurant.rating}</span>
                  <span className="text-yellow-400">⭐</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}