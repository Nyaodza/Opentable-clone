'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { financialService } from '@/lib/api/financial';
import { EarningsReport } from '@/types/financial';
import { PRICING_CONFIG, DRIVER_PAY_CONFIG, SUBSCRIPTION_PLANS } from '@/types/financial';

export default function FinancialDashboard() {
  const [report, setReport] = useState<EarningsReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState<'daily' | 'weekly' | 'monthly'>('monthly');

  useEffect(() => {
    loadFinancialData();
  }, [selectedPeriod]);

  const loadFinancialData = async () => {
    try {
      setLoading(true);
      const endDate = new Date().toISOString().split('T')[0];
      const startDate = new Date(Date.now() - (selectedPeriod === 'daily' ? 1 : selectedPeriod === 'weekly' ? 7 : 30) * 24 * 60 * 60 * 1000)
        .toISOString().split('T')[0];
      
      const reportData = await financialService.getEarningsReport({
        period: selectedPeriod,
        startDate,
        endDate
      });
      setReport(reportData);
    } catch (error) {
      console.error('Failed to load financial data:', error);
      // For demo, use mock data
      setReport(mockEarningsReport);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Financial Dashboard</h1>
              <p className="text-gray-600">Revenue, payouts, and financial analytics</p>
            </div>
            <div className="flex gap-2">
              {(['daily', 'weekly', 'monthly'] as const).map((period) => (
                <button
                  key={period}
                  onClick={() => setSelectedPeriod(period)}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    selectedPeriod === period
                      ? 'bg-red-600 text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
                  }`}
                >
                  {period.charAt(0).toUpperCase() + period.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Revenue Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Revenue</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(report?.revenue.total || 0)}</p>
              </div>
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                💰
              </div>
            </div>
            <div className="mt-2 text-sm text-green-600">
              +{formatPercentage(12.5)} from last period
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Delivery Revenue</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(report?.revenue.delivery || 0)}</p>
              </div>
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                🚚
              </div>
            </div>
            <div className="mt-2 text-sm text-blue-600">
              {formatPercentage((report?.revenue.delivery || 0) / (report?.revenue.total || 1) * 100)} of total
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Reservation Revenue</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(report?.revenue.reservations || 0)}</p>
              </div>
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                🍽️
              </div>
            </div>
            <div className="mt-2 text-sm text-purple-600">
              {formatPercentage((report?.revenue.reservations || 0) / (report?.revenue.total || 1) * 100)} of total
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Net Profit</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(report?.profit || 0)}</p>
              </div>
              <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                📊
              </div>
            </div>
            <div className="mt-2 text-sm text-yellow-600">
              {formatPercentage(report?.margins.net || 0)} margin
            </div>
          </div>
        </div>

        {/* Revenue Model Configuration */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Current Pricing Model</h2>
            
            <div className="space-y-6">
              <div>
                <h3 className="font-medium text-gray-900 mb-3">Restaurant Reservations</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Commission per Cover:</span>
                    <span className="font-medium">{formatCurrency(PRICING_CONFIG.reservationCommission.value)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Minimum Fee:</span>
                    <span className="font-medium">{formatCurrency(PRICING_CONFIG.reservationCommission.minimumFee || 0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">No-Show Fee:</span>
                    <span className="font-medium">{formatCurrency(PRICING_CONFIG.noShowFee)}</span>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-medium text-gray-900 mb-3">Food Delivery</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Restaurant Commission:</span>
                    <span className="font-medium">{PRICING_CONFIG.deliveryCommission.percentage}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Delivery Fee:</span>
                    <span className="font-medium">{formatCurrency(PRICING_CONFIG.deliveryCommission.deliveryFee)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Service Fee:</span>
                    <span className="font-medium">{PRICING_CONFIG.deliveryCommission.serviceFee}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Small Order Fee:</span>
                    <span className="font-medium">{formatCurrency(PRICING_CONFIG.deliveryCommission.smallOrderFee || 0)}</span>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-medium text-gray-900 mb-3">Payment Processing</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Rate:</span>
                    <span className="font-medium">{PRICING_CONFIG.paymentProcessingFee.percentage}% + {formatCurrency(PRICING_CONFIG.paymentProcessingFee.fixedFee)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Driver Payment Structure</h2>
            
            <div className="space-y-4">
              <div>
                <h3 className="font-medium text-gray-900 mb-3">Base Payment Formula</h3>
                <div className="bg-gray-50 p-4 rounded-lg text-sm">
                  <div className="font-mono">
                    Earnings = Base + Distance + Time + Tips + Bonuses
                  </div>
                </div>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Base Pay per Delivery:</span>
                  <span className="font-medium">{formatCurrency(DRIVER_PAY_CONFIG.basePay)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Distance Pay:</span>
                  <span className="font-medium">{formatCurrency(DRIVER_PAY_CONFIG.distancePayPerMile)}/mile</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Time Pay:</span>
                  <span className="font-medium">{formatCurrency(DRIVER_PAY_CONFIG.timePayPerMinute)}/min</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Tips:</span>
                  <span className="font-medium">100% to driver</span>
                </div>
              </div>

              <div>
                <h3 className="font-medium text-gray-900 mb-3">Peak Multipliers</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Lunch Rush:</span>
                    <span className="font-medium">{DRIVER_PAY_CONFIG.peakMultipliers.lunch}x</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Dinner Rush:</span>
                    <span className="font-medium">{DRIVER_PAY_CONFIG.peakMultipliers.dinner}x</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Bad Weather:</span>
                    <span className="font-medium">{DRIVER_PAY_CONFIG.peakMultipliers.weather}x</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Holidays:</span>
                    <span className="font-medium">{DRIVER_PAY_CONFIG.peakMultipliers.holiday}x</span>
                  </div>
                </div>
              </div>

              {/* Example Calculation */}
              <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">Example: 3-mile, 25-min delivery</h4>
                <div className="text-sm space-y-1">
                  <div className="flex justify-between">
                    <span>Base Pay:</span>
                    <span>{formatCurrency(3.00)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Distance (3 mi):</span>
                    <span>{formatCurrency(1.80)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Time (25 min):</span>
                    <span>{formatCurrency(3.75)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Tip:</span>
                    <span>{formatCurrency(6.00)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Peak Bonus (1.5x):</span>
                    <span>{formatCurrency(1.50)}</span>
                  </div>
                  <div className="flex justify-between font-medium border-t pt-1">
                    <span>Total:</span>
                    <span>{formatCurrency(16.05)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Subscription Plans */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Restaurant Subscription Plans</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {SUBSCRIPTION_PLANS.map((plan) => (
              <div key={plan.id} className="border rounded-lg p-6">
                <div className="text-center mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">{plan.name}</h3>
                  <div className="text-3xl font-bold text-gray-900 mt-2">
                    {formatCurrency(plan.price)}
                    <span className="text-sm font-normal text-gray-600">/month</span>
                  </div>
                </div>
                
                <ul className="space-y-2 mb-6">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-center text-sm">
                      <span className="text-green-500 mr-2">✓</span>
                      {feature}
                    </li>
                  ))}
                  {plan.commissionDiscount && (
                    <li className="flex items-center text-sm">
                      <span className="text-green-500 mr-2">✓</span>
                      {plan.commissionDiscount}% commission discount
                    </li>
                  )}
                </ul>
                
                <div className="text-center">
                  <button className="w-full bg-red-600 text-white py-2 rounded-lg hover:bg-red-700 transition-colors">
                    Select Plan
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Financial Metrics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Key Metrics</h2>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Average Order Value</span>
                <span className="font-medium">{formatCurrency(report?.metrics.averageOrderValue || 0)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Customer Acquisition Cost</span>
                <span className="font-medium">{formatCurrency(report?.metrics.customerAcquisitionCost || 0)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Customer Lifetime Value</span>
                <span className="font-medium">{formatCurrency(report?.metrics.customerLifetimeValue || 0)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Driver Utilization</span>
                <span className="font-medium">{formatPercentage(report?.metrics.driverUtilization || 0)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Restaurant Retention</span>
                <span className="font-medium">{formatPercentage(report?.metrics.restaurantRetention || 0)}</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Expense Breakdown</h2>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Driver Payouts</span>
                <span className="font-medium">{formatCurrency(report?.expenses.driverPayouts || 0)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Restaurant Payouts</span>
                <span className="font-medium">{formatCurrency(report?.expenses.restaurantPayouts || 0)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Payment Processing</span>
                <span className="font-medium">{formatCurrency(report?.expenses.paymentProcessing || 0)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Operations</span>
                <span className="font-medium">{formatCurrency(report?.expenses.operations || 0)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Marketing</span>
                <span className="font-medium">{formatCurrency(report?.expenses.marketing || 0)}</span>
              </div>
              <div className="flex justify-between items-center border-t pt-4 font-semibold">
                <span>Total Expenses</span>
                <span>{formatCurrency(report?.expenses.total || 0)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-8 flex flex-wrap gap-4">
          <Link
            href="/admin/financial/transactions"
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
          >
            View All Transactions
          </Link>
          <Link
            href="/admin/financial/payouts"
            className="border border-gray-300 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Manage Payouts
          </Link>
          <Link
            href="/admin/financial/settings"
            className="border border-gray-300 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Financial Settings
          </Link>
        </div>
      </div>
    </div>
  );
}

// Mock data for demonstration
const mockEarningsReport: EarningsReport = {
  period: 'monthly',
  startDate: '2025-01-01',
  endDate: '2025-01-19',
  revenue: {
    reservations: 45200,
    delivery: 128400,
    subscriptions: 12600,
    other: 3800,
    total: 190000
  },
  expenses: {
    driverPayouts: 42300,
    restaurantPayouts: 95400,
    paymentProcessing: 5500,
    operations: 15000,
    marketing: 8200,
    total: 166400
  },
  profit: 23600,
  margins: {
    gross: 67.5,
    net: 12.4
  },
  metrics: {
    averageOrderValue: 42.50,
    customerAcquisitionCost: 8.75,
    customerLifetimeValue: 285.30,
    driverUtilization: 72.3,
    restaurantRetention: 91.2
  }
};