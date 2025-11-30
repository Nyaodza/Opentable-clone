import React, { useState } from 'react';
import { DateRangePicker } from '../components/filters/DateRangePicker';
import { GeographicMap } from '../components/charts/GeographicMap';
import { BarChart } from '../components/charts/BarChart';
import { LineChart } from '../components/charts/LineChart';
import { KPICard } from '../components/metrics/KPICard';
import { useQuery } from 'react-query';
import axios from 'axios';
import { 
  FaGlobe, FaMapMarkerAlt, FaUsers, FaDollarSign,
  FaArrowUp, FaArrowDown, FaChartLine, FaCity
} from 'react-icons/fa';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

export const Geographic: React.FC = () => {
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    preset: 'last30days' as const,
  });

  const [selectedMetric, setSelectedMetric] = useState<'bookings' | 'revenue' | 'users'>('bookings');
  const [selectedRegion, setSelectedRegion] = useState<string>('all');

  const { data: geoData, isLoading } = useQuery(
    ['geographic', dateRange, selectedMetric, selectedRegion],
    async () => {
      const response = await axios.get(`${API_URL}/admin/travel/metrics/geographic`, {
        params: { ...dateRange, metric: selectedMetric, region: selectedRegion },
      });
      return response.data;
    },
    {
      placeholderData: getPlaceholderGeoData(),
    }
  );

  if (isLoading) {
    return <div className="flex items-center justify-center h-screen">Loading geographic data...</div>;
  }

  const formatValue = (value: number, metric: string) => {
    if (metric === 'revenue') {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
      }).format(value);
    }
    return value.toLocaleString();
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Geographic Insights</h1>
        <div className="flex gap-4">
          <select
            value={selectedMetric}
            onChange={(e) => setSelectedMetric(e.target.value as 'bookings' | 'revenue' | 'users')}
            className="border rounded-lg px-3 py-2"
          >
            <option value="bookings">Bookings</option>
            <option value="revenue">Revenue</option>
            <option value="users">Users</option>
          </select>
          <DateRangePicker dateRange={dateRange} onChange={setDateRange} />
        </div>
      </div>

      {/* Geographic KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPICard
          title="Countries Active"
          value={geoData.totalCountries}
          change={geoData.countriesGrowth}
          icon={<FaGlobe className="text-blue-500" />}
        />
        <KPICard
          title="Cities Covered"
          value={geoData.totalCities}
          change={geoData.citiesGrowth}
          icon={<FaCity className="text-green-500" />}
        />
        <KPICard
          title="Top Country Performance"
          value={formatValue(geoData.topCountryValue, selectedMetric)}
          subtitle={geoData.topCountryName}
          change={geoData.topCountryGrowth}
          icon={<FaMapMarkerAlt className="text-purple-500" />}
        />
        <KPICard
          title="International Growth"
          value={`${geoData.internationalGrowth}%`}
          change={geoData.internationalGrowthChange}
          icon={<FaChartLine className="text-orange-500" />}
        />
      </div>

      {/* World Map */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Global Distribution</h2>
          <div className="flex gap-2">
            {['bookings', 'revenue', 'users'].map((metric) => (
              <button
                key={metric}
                onClick={() => setSelectedMetric(metric as any)}
                className={`px-3 py-1 rounded-lg text-sm transition-colors ${
                  selectedMetric === metric
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {metric.charAt(0).toUpperCase() + metric.slice(1)}
              </button>
            ))}
          </div>
        </div>
        <div className="h-[500px]">
          <GeographicMap
            data={geoData.mapData}
            metric={selectedMetric}
            onCountryClick={(country) => setSelectedRegion(country)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Countries */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Top Countries</h2>
          <div className="space-y-3">
            {geoData.topCountries.map((country: any, index: number) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer"
                onClick={() => setSelectedRegion(country.code)}
              >
                <div className="flex items-center gap-3">
                  <div className="text-2xl font-bold text-gray-400">#{index + 1}</div>
                  <div>
                    <p className="font-medium">{country.country}</p>
                    <p className="text-sm text-gray-500">
                      {country.cities} cities • {country.listings} listings
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold">{formatValue(country[selectedMetric], selectedMetric)}</p>
                  <p className={`text-sm flex items-center justify-end gap-1 ${
                    country.growth > 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {country.growth > 0 ? <FaArrowUp /> : <FaArrowDown />}
                    {Math.abs(country.growth)}%
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Cities */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Top Cities</h2>
          <div className="h-80">
            <BarChart
              data={geoData.topCities}
              xKey="city"
              yKeys={[selectedMetric]}
              colors={['#8B5CF6']}
            />
          </div>
        </div>
      </div>

      {/* Regional Performance */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Regional Performance Trends</h2>
        <div className="h-96">
          <LineChart
            data={geoData.regionalTrends}
            xKey="date"
            yKeys={geoData.regions}
            colors={['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6']}
          />
        </div>
      </div>

      {/* Regional Breakdown */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Regional Breakdown</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {geoData.regionalBreakdown.map((region: any, index: number) => (
            <div key={index} className="border rounded-lg p-4">
              <h3 className="font-semibold text-lg mb-2">{region.name}</h3>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Countries:</span>
                  <span className="font-medium">{region.countries}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Cities:</span>
                  <span className="font-medium">{region.cities}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">{selectedMetric}:</span>
                  <span className="font-medium">{formatValue(region[selectedMetric], selectedMetric)}</span>
                </div>
                <div className="pt-2 border-t">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Growth:</span>
                    <span className={`text-sm font-medium flex items-center gap-1 ${
                      region.growth > 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {region.growth > 0 ? <FaArrowUp /> : <FaArrowDown />}
                      {Math.abs(region.growth)}%
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Market Penetration */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Market Penetration</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2">Country</th>
                <th className="text-right py-2">Population</th>
                <th className="text-right py-2">Users</th>
                <th className="text-right py-2">Penetration</th>
                <th className="text-right py-2">Opportunity</th>
                <th className="text-center py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {geoData.marketPenetration.map((market: any, index: number) => (
                <tr key={index} className="border-b">
                  <td className="py-2">{market.country}</td>
                  <td className="text-right">{market.population.toLocaleString()}</td>
                  <td className="text-right">{market.users.toLocaleString()}</td>
                  <td className="text-right">{market.penetration.toFixed(2)}%</td>
                  <td className="text-right">{market.opportunity.toLocaleString()}</td>
                  <td className="text-center">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      market.status === 'mature' ? 'bg-green-100 text-green-800' :
                      market.status === 'growing' ? 'bg-blue-100 text-blue-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {market.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

function getPlaceholderGeoData() {
  const generateTrend = (days: number, regions: string[]) => {
    return Array.from({ length: days }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - days + i);
      const data: any = { date: date.toISOString().split('T')[0] };
      regions.forEach(region => {
        data[region] = Math.floor(Math.random() * 10000) + 5000;
      });
      return data;
    });
  };

  const regions = ['North America', 'Europe', 'Asia Pacific', 'Latin America', 'Middle East'];

  return {
    totalCountries: 45,
    countriesGrowth: 12.5,
    totalCities: 325,
    citiesGrowth: 18.3,
    topCountryName: 'United States',
    topCountryValue: 125000,
    topCountryGrowth: 22.5,
    internationalGrowth: 35.2,
    internationalGrowthChange: 5.8,
    mapData: [
      { country: 'United States', code: 'US', bookings: 4500, revenue: 306000, users: 45000 },
      { country: 'United Kingdom', code: 'GB', bookings: 2000, revenue: 136000, users: 20000 },
      { country: 'Canada', code: 'CA', bookings: 1500, revenue: 102000, users: 15000 },
      { country: 'Germany', code: 'DE', bookings: 1200, revenue: 81600, users: 12000 },
      { country: 'France', code: 'FR', bookings: 1000, revenue: 68000, users: 10000 },
    ],
    topCountries: [
      { country: 'United States', code: 'US', bookings: 4500, revenue: 306000, users: 45000, cities: 50, listings: 5000, growth: 22.5 },
      { country: 'United Kingdom', code: 'GB', bookings: 2000, revenue: 136000, users: 20000, cities: 20, listings: 2000, growth: 18.3 },
      { country: 'Canada', code: 'CA', bookings: 1500, revenue: 102000, users: 15000, cities: 15, listings: 1500, growth: 15.2 },
      { country: 'Germany', code: 'DE', bookings: 1200, revenue: 81600, users: 12000, cities: 12, listings: 1200, growth: 12.8 },
      { country: 'France', code: 'FR', bookings: 1000, revenue: 68000, users: 10000, cities: 10, listings: 1000, growth: -5.3 },
    ],
    topCities: [
      { city: 'New York', bookings: 1200, revenue: 81600, users: 12000 },
      { city: 'London', bookings: 1000, revenue: 68000, users: 10000 },
      { city: 'Los Angeles', bookings: 800, revenue: 54400, users: 8000 },
      { city: 'Paris', bookings: 600, revenue: 40800, users: 6000 },
      { city: 'Tokyo', bookings: 500, revenue: 34000, users: 5000 },
    ],
    regionalTrends: generateTrend(30, regions),
    regions: regions,
    regionalBreakdown: [
      { name: 'North America', countries: 3, cities: 80, bookings: 6500, revenue: 442000, users: 65000, growth: 22.5 },
      { name: 'Europe', countries: 15, cities: 120, bookings: 4800, revenue: 326400, users: 48000, growth: 18.3 },
      { name: 'Asia Pacific', countries: 12, cities: 90, bookings: 3200, revenue: 217600, users: 32000, growth: 35.2 },
      { name: 'Latin America', countries: 8, cities: 25, bookings: 800, revenue: 54400, users: 8000, growth: 28.7 },
    ],
    marketPenetration: [
      { country: 'United States', population: 331900000, users: 45000, penetration: 0.0136, opportunity: 286900000, status: 'growing' },
      { country: 'United Kingdom', population: 67530000, users: 20000, penetration: 0.0296, opportunity: 47530000, status: 'growing' },
      { country: 'Canada', population: 38250000, users: 15000, penetration: 0.0392, opportunity: 23250000, status: 'mature' },
      { country: 'Germany', population: 83240000, users: 12000, penetration: 0.0144, opportunity: 71240000, status: 'emerging' },
      { country: 'France', population: 67390000, users: 10000, penetration: 0.0148, opportunity: 57390000, status: 'emerging' },
    ],
  };
}