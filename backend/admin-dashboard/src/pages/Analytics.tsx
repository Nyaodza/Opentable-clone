import React, { useState } from 'react';
import { DateRangePicker } from '../components/filters/DateRangePicker';
import { LineChart } from '../components/charts/LineChart';
import { BarChart } from '../components/charts/BarChart';
import { DonutChart } from '../components/charts/DonutChart';
import { KPICard } from '../components/metrics/KPICard';
import { useQuery } from 'react-query';
import axios from 'axios';
import { 
  FaChartLine, FaUsers, FaEye, FaClock, 
  FaPercentage, FaGlobe, FaMobile, FaDesktop 
} from 'react-icons/fa';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

export const Analytics: React.FC = () => {
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    preset: 'last30days' as const,
  });

  const { data: analyticsData, isLoading } = useQuery(
    ['analytics', dateRange],
    async () => {
      const response = await axios.get(`${API_URL}/admin/travel/analytics`, {
        params: dateRange,
      });
      return response.data;
    },
    {
      placeholderData: getPlaceholderAnalyticsData(),
    }
  );

  if (isLoading) {
    return <div className="flex items-center justify-center h-screen">Loading analytics...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Analytics Dashboard</h1>
        <DateRangePicker dateRange={dateRange} onChange={setDateRange} />
      </div>

      {/* User Behavior Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPICard
          title="Avg. Session Duration"
          value={formatDuration(analyticsData.avgSessionDuration)}
          change={12.5}
          icon={<FaClock className="text-blue-500" />}
        />
        <KPICard
          title="Pages per Session"
          value={analyticsData.pagesPerSession.toFixed(1)}
          change={5.3}
          icon={<FaEye className="text-green-500" />}
        />
        <KPICard
          title="Bounce Rate"
          value={`${analyticsData.bounceRate.toFixed(1)}%`}
          change={-3.2}
          icon={<FaPercentage className="text-orange-500" />}
        />
        <KPICard
          title="Conversion Rate"
          value={`${analyticsData.conversionRate.toFixed(2)}%`}
          change={8.7}
          icon={<FaChartLine className="text-purple-500" />}
        />
      </div>

      {/* User Flow Analysis */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">User Journey Flow</h2>
        <div className="h-96">
          <LineChart
            data={analyticsData.userFlow}
            xKey="page"
            yKeys={['users', 'dropoff']}
            colors={['#3B82F6', '#EF4444']}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Traffic Sources */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Traffic Sources</h2>
          <div className="h-80">
            <DonutChart
              data={analyticsData.trafficSources}
              dataKey="visits"
              nameKey="source"
            />
          </div>
        </div>

        {/* Device Breakdown */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Device Usage</h2>
          <div className="h-80">
            <BarChart
              data={analyticsData.deviceBreakdown}
              xKey="device"
              yKeys={['sessions', 'conversions']}
              colors={['#8B5CF6', '#10B981']}
            />
          </div>
        </div>
      </div>

      {/* Geographic Performance */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Top Performing Regions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {analyticsData.topRegions.map((region: any, index: number) => (
            <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <FaGlobe className="text-gray-400" />
                <div>
                  <p className="font-medium">{region.name}</p>
                  <p className="text-sm text-gray-500">{region.country}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-semibold">{region.sessions.toLocaleString()}</p>
                <p className="text-sm text-green-600">+{region.growth.toFixed(1)}%</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Popular Pages */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Most Visited Pages</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2">Page</th>
                <th className="text-right py-2">Page Views</th>
                <th className="text-right py-2">Unique Views</th>
                <th className="text-right py-2">Avg. Time</th>
                <th className="text-right py-2">Exit Rate</th>
              </tr>
            </thead>
            <tbody>
              {analyticsData.popularPages.map((page: any, index: number) => (
                <tr key={index} className="border-b">
                  <td className="py-2">{page.path}</td>
                  <td className="text-right">{page.views.toLocaleString()}</td>
                  <td className="text-right">{page.uniqueViews.toLocaleString()}</td>
                  <td className="text-right">{formatDuration(page.avgTime)}</td>
                  <td className="text-right">{page.exitRate.toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

function getPlaceholderAnalyticsData() {
  return {
    avgSessionDuration: 245,
    pagesPerSession: 3.8,
    bounceRate: 42.3,
    conversionRate: 2.78,
    userFlow: [
      { page: 'Homepage', users: 10000, dropoff: 0 },
      { page: 'Search Results', users: 7500, dropoff: 2500 },
      { page: 'Listing Details', users: 5000, dropoff: 2500 },
      { page: 'Checkout', users: 2000, dropoff: 3000 },
      { page: 'Confirmation', users: 1500, dropoff: 500 },
    ],
    trafficSources: [
      { source: 'Organic Search', visits: 45000 },
      { source: 'Direct', visits: 30000 },
      { source: 'Social Media', visits: 15000 },
      { source: 'Referral', visits: 10000 },
      { source: 'Email', visits: 5000 },
    ],
    deviceBreakdown: [
      { device: 'Desktop', sessions: 55000, conversions: 1800 },
      { device: 'Mobile', sessions: 40000, conversions: 800 },
      { device: 'Tablet', sessions: 10000, conversions: 200 },
    ],
    topRegions: [
      { name: 'New York', country: 'USA', sessions: 15000, growth: 22.5 },
      { name: 'London', country: 'UK', sessions: 12000, growth: 18.3 },
      { name: 'Tokyo', country: 'Japan', sessions: 10000, growth: 35.2 },
      { name: 'Paris', country: 'France', sessions: 8000, growth: 15.8 },
      { name: 'Sydney', country: 'Australia', sessions: 6000, growth: 28.7 },
      { name: 'Toronto', country: 'Canada', sessions: 5000, growth: 12.4 },
    ],
    popularPages: [
      { path: '/hotels', views: 45000, uniqueViews: 35000, avgTime: 180, exitRate: 25.3 },
      { path: '/flights', views: 38000, uniqueViews: 30000, avgTime: 150, exitRate: 30.2 },
      { path: '/tours', views: 25000, uniqueViews: 20000, avgTime: 240, exitRate: 20.5 },
      { path: '/vacation-rentals', views: 22000, uniqueViews: 18000, avgTime: 200, exitRate: 22.8 },
      { path: '/activities', views: 18000, uniqueViews: 15000, avgTime: 160, exitRate: 28.1 },
    ],
  };
}