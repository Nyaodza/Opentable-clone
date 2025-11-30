import React, { useState } from 'react';
import { DateRangePicker } from '../components/filters/DateRangePicker';
import { LineChart } from '../components/charts/LineChart';
import { BarChart } from '../components/charts/BarChart';
import { DonutChart } from '../components/charts/DonutChart';
import { KPICard } from '../components/metrics/KPICard';
import { useQuery } from 'react-query';
import axios from 'axios';
import { 
  FaDollarSign, FaChartLine, FaPercentage, FaArrowUp,
  FaArrowDown, FaFileInvoiceDollar, FaCreditCard, FaMoneyBillWave
} from 'react-icons/fa';
import { ServiceCategory } from '../types/travel.types';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

export const Revenue: React.FC = () => {
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    preset: 'last30days' as const,
  });

  const [selectedCategory, setSelectedCategory] = useState<ServiceCategory | 'all'>('all');
  const [comparisonPeriod, setComparisonPeriod] = useState('previous_period');

  const { data: revenueData, isLoading } = useQuery(
    ['revenue', dateRange, selectedCategory],
    async () => {
      const response = await axios.get(`${API_URL}/admin/travel/metrics/revenue`, {
        params: { ...dateRange, category: selectedCategory },
      });
      return response.data;
    },
    {
      placeholderData: getPlaceholderRevenueData(),
    }
  );

  if (isLoading) {
    return <div className="flex items-center justify-center h-screen">Loading revenue data...</div>;
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Revenue Analytics</h1>
        <div className="flex gap-4">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value as ServiceCategory | 'all')}
            className="border rounded-lg px-3 py-2"
          >
            <option value="all">All Categories</option>
            {Object.values(ServiceCategory).map((category) => (
              <option key={category} value={category}>
                {category.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())}
              </option>
            ))}
          </select>
          <DateRangePicker dateRange={dateRange} onChange={setDateRange} />
        </div>
      </div>

      {/* Revenue KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPICard
          title="Total Revenue"
          value={formatCurrency(revenueData.totalRevenue)}
          change={revenueData.revenueGrowth}
          icon={<FaDollarSign className="text-green-500" />}
        />
        <KPICard
          title="Average Order Value"
          value={formatCurrency(revenueData.averageOrderValue)}
          change={revenueData.aovGrowth}
          icon={<FaFileInvoiceDollar className="text-blue-500" />}
        />
        <KPICard
          title="Take Rate"
          value={`${revenueData.takeRate}%`}
          change={revenueData.takeRateChange}
          icon={<FaPercentage className="text-purple-500" />}
        />
        <KPICard
          title="Net Revenue"
          value={formatCurrency(revenueData.netRevenue)}
          change={revenueData.netRevenueGrowth}
          icon={<FaMoneyBillWave className="text-orange-500" />}
        />
      </div>

      {/* Revenue Trend */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Revenue Trend</h2>
          <select
            value={comparisonPeriod}
            onChange={(e) => setComparisonPeriod(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm"
          >
            <option value="previous_period">vs Previous Period</option>
            <option value="previous_year">vs Previous Year</option>
            <option value="no_comparison">No Comparison</option>
          </select>
        </div>
        <div className="h-96">
          <LineChart
            data={revenueData.revenueTrend}
            xKey="date"
            yKeys={['currentRevenue', 'previousRevenue']}
            colors={['#3B82F6', '#E5E7EB']}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue by Source */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Revenue by Source</h2>
          <div className="h-80">
            <DonutChart
              data={revenueData.revenueBySource}
              dataKey="amount"
              nameKey="source"
            />
          </div>
          <div className="mt-4 space-y-2">
            {revenueData.revenueBySource.map((source: any, index: number) => (
              <div key={index} className="flex justify-between items-center text-sm">
                <span className="text-gray-600">{source.source}</span>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{formatCurrency(source.amount)}</span>
                  <span className="text-gray-500">({source.percentage}%)</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Revenue by Category */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Revenue by Category</h2>
          <div className="h-80">
            <BarChart
              data={revenueData.revenueByCategory}
              xKey="category"
              yKeys={['revenue']}
              colors={['#8B5CF6']}
            />
          </div>
        </div>
      </div>

      {/* Revenue Target Progress */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Revenue Target Progress</h2>
        <div className="space-y-4">
          {revenueData.revenueTargets.map((target: any, index: number) => (
            <div key={index}>
              <div className="flex justify-between items-center mb-2">
                <span className="font-medium">{target.name}</span>
                <span className="text-sm text-gray-600">
                  {formatCurrency(target.achieved)} / {formatCurrency(target.target)}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div
                  className={`h-2.5 rounded-full ${
                    target.percentage >= 100 ? 'bg-green-600' : 
                    target.percentage >= 75 ? 'bg-blue-600' : 
                    target.percentage >= 50 ? 'bg-yellow-600' : 'bg-red-600'
                  }`}
                  style={{ width: `${Math.min(target.percentage, 100)}%` }}
                ></div>
              </div>
              <div className="flex justify-between items-center mt-1">
                <span className="text-xs text-gray-500">{target.percentage}% achieved</span>
                <span className={`text-xs flex items-center gap-1 ${
                  target.trend > 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {target.trend > 0 ? <FaArrowUp /> : <FaArrowDown />}
                  {Math.abs(target.trend)}%
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Payment Methods Breakdown */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Payment Methods</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {revenueData.paymentMethods.map((method: any, index: number) => (
            <div key={index} className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <FaCreditCard className="text-gray-400" />
                  <span className="font-medium">{method.name}</span>
                </div>
                <span className="text-sm text-gray-500">{method.percentage}%</span>
              </div>
              <p className="text-2xl font-bold">{formatCurrency(method.amount)}</p>
              <p className="text-sm text-gray-600 mt-1">{method.transactions} transactions</p>
            </div>
          ))}
        </div>
      </div>

      {/* Revenue Metrics Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-6 border-b">
          <h2 className="text-xl font-semibold">Detailed Revenue Metrics</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Metric
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Current Period
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Previous Period
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Change
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  YoY Change
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {revenueData.detailedMetrics.map((metric: any, index: number) => (
                <tr key={index}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {metric.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                    {formatCurrency(metric.current)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                    {formatCurrency(metric.previous)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                    <span className={`flex items-center justify-end gap-1 ${
                      metric.change > 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {metric.change > 0 ? <FaArrowUp /> : <FaArrowDown />}
                      {Math.abs(metric.change)}%
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                    <span className={`flex items-center justify-end gap-1 ${
                      metric.yoyChange > 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {metric.yoyChange > 0 ? <FaArrowUp /> : <FaArrowDown />}
                      {Math.abs(metric.yoyChange)}%
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

function getPlaceholderRevenueData() {
  const generateTrend = (days: number) => {
    return Array.from({ length: days }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - days + i);
      return {
        date: date.toISOString().split('T')[0],
        currentRevenue: Math.floor(25000 + Math.random() * 10000),
        previousRevenue: Math.floor(20000 + Math.random() * 8000),
      };
    });
  };

  return {
    totalRevenue: 850000,
    revenueGrowth: 18.5,
    averageOrderValue: 485,
    aovGrowth: 5.2,
    takeRate: 14.0,
    takeRateChange: 0.5,
    netRevenue: 731000,
    netRevenueGrowth: 16.3,
    revenueTrend: generateTrend(30),
    revenueBySource: [
      { source: 'Commission', amount: 600000, percentage: 70.6 },
      { source: 'Booking Fees', amount: 150000, percentage: 17.6 },
      { source: 'Subscriptions', amount: 75000, percentage: 8.8 },
      { source: 'Advertising', amount: 25000, percentage: 2.9 },
    ],
    revenueByCategory: [
      { category: 'Hotels', revenue: 350000 },
      { category: 'Flights', revenue: 245000 },
      { category: 'Vacation Rentals', revenue: 168000 },
      { category: 'Tours', revenue: 50400 },
      { category: 'Car Rentals', revenue: 21000 },
      { category: 'Activities', revenue: 15600 },
    ],
    revenueTargets: [
      { name: 'Q4 2023 Target', target: 1000000, achieved: 850000, percentage: 85, trend: 3.2 },
      { name: 'Annual Target', target: 3500000, achieved: 2950000, percentage: 84.3, trend: 2.1 },
      { name: 'Monthly Target', target: 300000, achieved: 285000, percentage: 95, trend: 5.4 },
    ],
    paymentMethods: [
      { name: 'Credit Card', amount: 595000, percentage: 70, transactions: 8750 },
      { name: 'PayPal', amount: 170000, percentage: 20, transactions: 2500 },
      { name: 'Bank Transfer', amount: 85000, percentage: 10, transactions: 350 },
    ],
    detailedMetrics: [
      { name: 'Gross Revenue', current: 850000, previous: 717500, change: 18.5, yoyChange: 45.2 },
      { name: 'Commission Revenue', current: 600000, previous: 520000, change: 15.4, yoyChange: 38.5 },
      { name: 'Transaction Fees', current: 150000, previous: 125000, change: 20.0, yoyChange: 55.0 },
      { name: 'Subscription Revenue', current: 75000, previous: 60000, change: 25.0, yoyChange: 87.5 },
      { name: 'Advertising Revenue', current: 25000, previous: 12500, change: 100.0, yoyChange: 150.0 },
      { name: 'Refunds & Chargebacks', current: -119000, previous: -100450, change: -18.5, yoyChange: -45.2 },
    ],
  };
}