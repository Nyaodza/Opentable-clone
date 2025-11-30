import React, { useState } from 'react';
import { DateRangePicker } from '../components/filters/DateRangePicker';
import { LineChart } from '../components/charts/LineChart';
import { BarChart } from '../components/charts/BarChart';
import { KPICard } from '../components/metrics/KPICard';
import { useQuery } from 'react-query';
import axios from 'axios';
import { 
  FaSearch, FaMousePointer, FaEye, FaChartLine,
  FaArrowUp, FaArrowDown, FaExternalLinkAlt 
} from 'react-icons/fa';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

export const SearchConsole: React.FC = () => {
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    preset: 'last30days' as const,
  });

  const { data: searchData, isLoading } = useQuery(
    ['searchConsole', dateRange],
    async () => {
      const response = await axios.get(`${API_URL}/admin/travel/search-console`, {
        params: dateRange,
      });
      return response.data;
    },
    {
      placeholderData: getPlaceholderSearchData(),
    }
  );

  if (isLoading) {
    return <div className="flex items-center justify-center h-screen">Loading search data...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Search Console</h1>
        <DateRangePicker dateRange={dateRange} onChange={setDateRange} />
      </div>

      {/* Search Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPICard
          title="Total Impressions"
          value={searchData.totalImpressions.toLocaleString()}
          change={searchData.impressionsChange}
          icon={<FaEye className="text-blue-500" />}
        />
        <KPICard
          title="Total Clicks"
          value={searchData.totalClicks.toLocaleString()}
          change={searchData.clicksChange}
          icon={<FaMousePointer className="text-green-500" />}
        />
        <KPICard
          title="Average CTR"
          value={`${searchData.avgCTR.toFixed(1)}%`}
          change={searchData.ctrChange}
          icon={<FaChartLine className="text-purple-500" />}
        />
        <KPICard
          title="Average Position"
          value={searchData.avgPosition.toFixed(1)}
          change={-searchData.positionChange} // Negative because lower is better
          icon={<FaSearch className="text-orange-500" />}
        />
      </div>

      {/* Search Performance Trend */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Search Performance Trend</h2>
        <div className="h-96">
          <LineChart
            data={searchData.performanceTrend}
            xKey="date"
            yKeys={['impressions', 'clicks']}
            colors={['#3B82F6', '#10B981']}
          />
        </div>
      </div>

      {/* Top Search Queries */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Top Search Queries</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2">Query</th>
                <th className="text-right py-2">Impressions</th>
                <th className="text-right py-2">Clicks</th>
                <th className="text-right py-2">CTR</th>
                <th className="text-right py-2">Position</th>
                <th className="text-center py-2">Trend</th>
              </tr>
            </thead>
            <tbody>
              {searchData.topQueries.map((query: any, index: number) => (
                <tr key={index} className="border-b hover:bg-gray-50">
                  <td className="py-2 flex items-center gap-2">
                    {query.query}
                    <FaExternalLinkAlt className="text-gray-400 text-sm" />
                  </td>
                  <td className="text-right">{query.impressions.toLocaleString()}</td>
                  <td className="text-right">{query.clicks.toLocaleString()}</td>
                  <td className="text-right">{query.ctr.toFixed(1)}%</td>
                  <td className="text-right">{query.position.toFixed(1)}</td>
                  <td className="text-center">
                    {query.trend > 0 ? (
                      <FaArrowUp className="text-green-500 inline" />
                    ) : (
                      <FaArrowDown className="text-red-500 inline" />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Pages */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Top Performing Pages</h2>
          <div className="space-y-3">
            {searchData.topPages.map((page: any, index: number) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <p className="font-medium text-sm truncate">{page.url}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {page.clicks.toLocaleString()} clicks • {page.ctr.toFixed(1)}% CTR
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold">#{page.position.toFixed(1)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Search Query Categories */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Query Categories</h2>
          <div className="h-80">
            <BarChart
              data={searchData.queryCategories}
              xKey="category"
              yKeys={['queries', 'clicks']}
              colors={['#8B5CF6', '#EC4899']}
            />
          </div>
        </div>
      </div>

      {/* Position Distribution */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Position Distribution</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <p className="text-3xl font-bold text-green-600">{searchData.positionDistribution.top3}%</p>
            <p className="text-sm text-gray-600 mt-1">Top 3 Positions</p>
          </div>
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <p className="text-3xl font-bold text-blue-600">{searchData.positionDistribution.top10}%</p>
            <p className="text-sm text-gray-600 mt-1">Top 10 Positions</p>
          </div>
          <div className="text-center p-4 bg-orange-50 rounded-lg">
            <p className="text-3xl font-bold text-orange-600">{searchData.positionDistribution.beyond10}%</p>
            <p className="text-sm text-gray-600 mt-1">Beyond Position 10</p>
          </div>
        </div>
      </div>

      {/* Search Intent Analysis */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Search Intent Analysis</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {searchData.searchIntent.map((intent: any, index: number) => (
            <div key={index} className="text-center p-4 bg-gray-50 rounded-lg">
              <p className="text-2xl font-bold text-gray-700">{intent.percentage}%</p>
              <p className="text-sm text-gray-600 mt-1">{intent.type}</p>
              <p className="text-xs text-gray-500 mt-1">{intent.queries} queries</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

function getPlaceholderSearchData() {
  return {
    totalImpressions: 850000,
    impressionsChange: 15.3,
    totalClicks: 42500,
    clicksChange: 22.7,
    avgCTR: 5.0,
    ctrChange: 0.5,
    avgPosition: 8.2,
    positionChange: -1.3,
    performanceTrend: Array.from({ length: 30 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - 30 + i);
      return {
        date: date.toISOString().split('T')[0],
        impressions: Math.floor(25000 + Math.random() * 10000),
        clicks: Math.floor(1200 + Math.random() * 500),
      };
    }),
    topQueries: [
      { query: 'cheap flights to paris', impressions: 25000, clicks: 1250, ctr: 5.0, position: 2.3, trend: 1 },
      { query: 'luxury hotels maldives', impressions: 18000, clicks: 1080, ctr: 6.0, position: 1.8, trend: 1 },
      { query: 'best tours rome', impressions: 15000, clicks: 600, ctr: 4.0, position: 4.5, trend: -1 },
      { query: 'vacation rentals hawaii', impressions: 12000, clicks: 720, ctr: 6.0, position: 3.2, trend: 1 },
      { query: 'car rental deals', impressions: 10000, clicks: 400, ctr: 4.0, position: 5.8, trend: -1 },
      { query: 'adventure activities bali', impressions: 8500, clicks: 425, ctr: 5.0, position: 4.1, trend: 1 },
      { query: 'cruise packages caribbean', impressions: 7500, clicks: 300, ctr: 4.0, position: 6.3, trend: -1 },
      { query: 'restaurant reservations nyc', impressions: 6000, clicks: 360, ctr: 6.0, position: 2.9, trend: 1 },
    ],
    topPages: [
      { url: '/hotels/luxury-maldives', clicks: 2500, ctr: 8.5, position: 1.5 },
      { url: '/flights/cheap-europe', clicks: 2200, ctr: 6.2, position: 2.8 },
      { url: '/tours/rome-colosseum', clicks: 1800, ctr: 5.8, position: 3.2 },
      { url: '/vacation-rentals/hawaii-beach', clicks: 1500, ctr: 7.1, position: 2.1 },
      { url: '/activities/bali-surfing', clicks: 1200, ctr: 5.5, position: 4.3 },
    ],
    queryCategories: [
      { category: 'Hotels', queries: 125, clicks: 8500 },
      { category: 'Flights', queries: 98, clicks: 7200 },
      { category: 'Tours', queries: 85, clicks: 5100 },
      { category: 'Vacation Rentals', queries: 72, clicks: 4300 },
      { category: 'Activities', queries: 65, clicks: 3900 },
      { category: 'Car Rentals', queries: 45, clicks: 2700 },
    ],
    positionDistribution: {
      top3: 35,
      top10: 65,
      beyond10: 35,
    },
    searchIntent: [
      { type: 'Transactional', percentage: 45, queries: 285 },
      { type: 'Informational', percentage: 30, queries: 190 },
      { type: 'Navigational', percentage: 15, queries: 95 },
      { type: 'Commercial', percentage: 10, queries: 63 },
    ],
  };
}