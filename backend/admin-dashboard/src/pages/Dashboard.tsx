import React, { useState, useEffect } from 'react';
import { 
  FaUsers, FaChartLine, FaShoppingCart, FaDollarSign, 
  FaGlobe, FaList, FaEye, FaCalendarAlt 
} from 'react-icons/fa';
import { KPICard } from '../components/metrics/KPICard';
import { LineChart } from '../components/charts/LineChart';
import { BarChart } from '../components/charts/BarChart';
import { DonutChart } from '../components/charts/DonutChart';
import { GeographicMap } from '../components/charts/GeographicMap';
import { ConversionFunnel } from '../components/charts/ConversionFunnel';
import { DateRangePicker } from '../components/common/DateRangePicker';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { useTravelDashboard } from '../hooks/useTravelDashboard';
import { ServiceCategory } from '../types/travel.types';

export const Dashboard: React.FC = () => {
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    preset: 'last30days' as const,
  });

  const { data, isLoading, error, refetch } = useTravelDashboard({ dateRange });

  if (isLoading || !data) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-red-600 mb-4">Error loading dashboard data</p>
          <button 
            onClick={() => refetch()}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const { 
    userMetrics, 
    trafficMetrics, 
    bookingMetrics, 
    revenueMetrics,
    listingMetrics,
    geographicMetrics,
    topPerformers,
    categoryPerformance
  } = data;

  // Prepare chart data
  const userGrowthData = {
    labels: userMetrics.signupTrend.map(d => d.date),
    datasets: [{
      label: 'New Users',
      data: userMetrics.signupTrend.map(d => d.count),
    }],
  };

  const trafficTrendData = {
    labels: trafficMetrics.trafficTrend.map(d => d.date),
    datasets: [
      {
        label: 'Visits',
        data: trafficMetrics.trafficTrend.map(d => d.visits),
      },
      {
        label: 'Unique Visitors',
        data: trafficMetrics.trafficTrend.map(d => d.uniqueVisitors),
      },
    ],
  };

  const bookingTrendData = {
    labels: bookingMetrics.bookingVolume.map(d => d.date),
    datasets: [{
      label: 'Bookings',
      data: bookingMetrics.bookingVolume.map(d => d.count),
    }],
  };

  const revenueTrendData = {
    labels: revenueMetrics.revenueTrend.map(d => d.date),
    datasets: [{
      label: 'Revenue',
      data: revenueMetrics.revenueTrend.map(d => d.amount),
    }],
  };

  const categoryBookingsData = {
    labels: bookingMetrics.bookingsByCategory.map(c => 
      c.category.replace(/_/g, ' ').charAt(0).toUpperCase() + 
      c.category.replace(/_/g, ' ').slice(1)
    ),
    datasets: [{
      label: 'Bookings',
      data: bookingMetrics.bookingsByCategory.map(c => c.count),
    }],
  };

  const revenueSourceData = {
    labels: ['Commission', 'Booking Fees', 'Subscriptions', 'Advertising'],
    values: [
      revenueMetrics.revenueBySource.commission,
      revenueMetrics.revenueBySource.bookingFees,
      revenueMetrics.revenueBySource.subscriptions,
      revenueMetrics.revenueBySource.advertising,
    ],
  };

  const conversionFunnelData = [
    { label: 'Site Visits', value: trafficMetrics.visits },
    { label: 'Searches', value: Math.floor(trafficMetrics.visits * 0.6) },
    { label: 'View Details', value: Math.floor(trafficMetrics.visits * 0.3) },
    { label: 'Add to Cart', value: Math.floor(trafficMetrics.visits * 0.1) },
    { label: 'Completed Bookings', value: bookingMetrics.totalBookings },
  ];

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Travel Platform Dashboard</h1>
          <div className="mt-4 flex items-center justify-between">
            <p className="text-gray-600">
              Monitor your platform's performance across all travel services
            </p>
            <DateRangePicker
              value={dateRange}
              onChange={setDateRange}
            />
          </div>
        </div>

        {/* User & Traffic Metrics */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">User & Traffic Metrics</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <KPICard
              title="Total Users"
              value={userMetrics.totalUsers}
              change={userMetrics.userGrowth}
              icon={<FaUsers />}
              trend="up"
            />
            <KPICard
              title="New Users"
              value={userMetrics.newUsers}
              changeLabel="vs last period"
              icon={<FaUsers />}
            />
            <KPICard
              title="Site Visits"
              value={trafficMetrics.visits}
              icon={<FaEye />}
            />
            <KPICard
              title="Bounce Rate"
              value={trafficMetrics.bounceRate}
              format="percentage"
              trend={trafficMetrics.bounceRate > 50 ? 'down' : 'stable'}
              icon={<FaChartLine />}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-4">User Growth Trend</h3>
              <LineChart data={userGrowthData} height={250} />
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-4">Traffic Overview</h3>
              <LineChart data={trafficTrendData} height={250} />
            </div>
          </div>
        </div>

        {/* Booking & Revenue Metrics */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Booking & Revenue Performance</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <KPICard
              title="Total Bookings"
              value={bookingMetrics.totalBookings}
              trend={bookingMetrics.bookingTrend}
              icon={<FaShoppingCart />}
            />
            <KPICard
              title="Gross Booking Value"
              value={bookingMetrics.grossBookingValue}
              format="currency"
              icon={<FaDollarSign />}
            />
            <KPICard
              title="Total Revenue"
              value={revenueMetrics.totalRevenue}
              change={revenueMetrics.revenueGrowth}
              format="currency"
              icon={<FaDollarSign />}
            />
            <KPICard
              title="Conversion Rate"
              value={bookingMetrics.conversionRate}
              format="percentage"
              icon={<FaChartLine />}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-4">Booking Trends</h3>
              <LineChart data={bookingTrendData} height={250} />
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-4">Revenue Growth</h3>
              <LineChart data={revenueTrendData} height={250} currency />
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-4">Revenue Sources</h3>
              <DonutChart data={revenueSourceData} height={250} currency />
            </div>
          </div>
        </div>

        {/* Category Performance */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Service Category Performance</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-4">Bookings by Category</h3>
              <BarChart data={categoryBookingsData} height={300} horizontal />
            </div>
            <div className="lg:col-span-1">
              <ConversionFunnel 
                steps={conversionFunnelData}
                title="Booking Conversion Funnel"
              />
            </div>
          </div>
        </div>

        {/* Geographic Insights */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Geographic Performance</h2>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Global Booking Distribution</h3>
              <div className="flex gap-2">
                <button className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded">
                  Bookings
                </button>
                <button className="px-3 py-1 text-sm text-gray-600 hover:bg-gray-100 rounded">
                  Revenue
                </button>
                <button className="px-3 py-1 text-sm text-gray-600 hover:bg-gray-100 rounded">
                  Users
                </button>
              </div>
            </div>
            <GeographicMap 
              data={geographicMetrics} 
              metric="bookings"
              onCountryClick={(country) => console.log('Country clicked:', country)}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-4">Top Countries</h3>
              <div className="space-y-3">
                {geographicMetrics.topCountries.slice(0, 5).map((country, index) => (
                  <div key={country.code} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-lg font-semibold text-gray-500">
                        #{index + 1}
                      </span>
                      <span className="font-medium">{country.country}</span>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">
                        {new Intl.NumberFormat('en-US').format(country.bookings)} bookings
                      </div>
                      <div className="text-sm text-gray-500">
                        {new Intl.NumberFormat('en-US', {
                          style: 'currency',
                          currency: 'USD'
                        }).format(country.revenue)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-4">Top Cities</h3>
              <div className="space-y-3">
                {geographicMetrics.topCities.slice(0, 5).map((city, index) => (
                  <div key={`${city.city}-${city.country}`} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-lg font-semibold text-gray-500">
                        #{index + 1}
                      </span>
                      <div>
                        <span className="font-medium">{city.city}</span>
                        <span className="text-sm text-gray-500 ml-1">({city.country})</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">
                        {new Intl.NumberFormat('en-US').format(city.bookings)} bookings
                      </div>
                      <div className="text-sm text-gray-500">
                        {new Intl.NumberFormat('en-US', {
                          style: 'currency',
                          currency: 'USD'
                        }).format(city.revenue)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Top Performers */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Top Performers</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-4">Top Listings</h3>
              <div className="space-y-3">
                {topPerformers.listings.slice(0, 5).map((listing, index) => (
                  <div key={listing.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-lg font-semibold text-gray-500">
                        #{index + 1}
                      </span>
                      <div>
                        <p className="font-medium">{listing.name}</p>
                        <p className="text-sm text-gray-500">
                          {listing.category.replace(/_/g, ' ')}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">
                        {new Intl.NumberFormat('en-US').format(listing.bookings)} bookings
                      </div>
                      <div className="text-sm text-gray-500">
                        {new Intl.NumberFormat('en-US', {
                          style: 'currency',
                          currency: 'USD'
                        }).format(listing.revenue)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-4">Top Providers</h3>
              <div className="space-y-3">
                {topPerformers.providers.slice(0, 5).map((provider, index) => (
                  <div key={provider.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-lg font-semibold text-gray-500">
                        #{index + 1}
                      </span>
                      <div>
                        <p className="font-medium">{provider.name}</p>
                        <p className="text-sm text-gray-500">
                          {provider.listingsCount} listings
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">
                        {new Intl.NumberFormat('en-US').format(provider.totalBookings)} bookings
                      </div>
                      <div className="text-sm text-gray-500">
                        {new Intl.NumberFormat('en-US', {
                          style: 'currency',
                          currency: 'USD'
                        }).format(provider.totalRevenue)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Listing Metrics */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Listing Overview</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <KPICard
              title="Total Listings"
              value={listingMetrics.totalListings}
              icon={<FaList />}
            />
            <KPICard
              title="New Listings"
              value={listingMetrics.newListings}
              changeLabel="this period"
              icon={<FaList />}
            />
            <KPICard
              title="Pending Approval"
              value={listingMetrics.pendingApproval}
              icon={<FaList />}
            />
            <KPICard
              title="Active Listings"
              value={listingMetrics.listingQuality.active}
              icon={<FaList />}
            />
          </div>
        </div>

        {/* Revenue Target Progress */}
        {revenueMetrics.revenueTarget && (
          <div className="mb-8">
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-4">Revenue Target Progress</h3>
              <div className="relative pt-1">
                <div className="flex mb-2 items-center justify-between">
                  <div>
                    <span className="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full text-blue-600 bg-blue-200">
                      Progress
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-semibold inline-block text-blue-600">
                      {revenueMetrics.revenueTarget.percentage.toFixed(0)}%
                    </span>
                  </div>
                </div>
                <div className="overflow-hidden h-4 mb-4 text-xs flex rounded bg-blue-100">
                  <div
                    style={{ width: `${revenueMetrics.revenueTarget.percentage}%` }}
                    className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-blue-600 transition-all duration-500"
                  />
                </div>
                <div className="flex justify-between text-sm">
                  <span>
                    Achieved: {new Intl.NumberFormat('en-US', {
                      style: 'currency',
                      currency: 'USD'
                    }).format(revenueMetrics.revenueTarget.achieved)}
                  </span>
                  <span>
                    Target: {new Intl.NumberFormat('en-US', {
                      style: 'currency',
                      currency: 'USD'
                    }).format(revenueMetrics.revenueTarget.target)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};