'use client';

import React, { useState, useEffect } from 'react';
import { 
  BarChart, 
  Bar, 
  LineChart, 
  Line, 
  PieChart, 
  Pie, 
  Cell, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts';
import { 
  Users, 
  TrendingUp, 
  Activity, 
  Calendar,
  Filter,
  Download,
  RefreshCw,
  Eye,
  MousePointer,
  Clock,
  Target
} from 'lucide-react';

interface MetricCard {
  title: string;
  value: string | number;
  change: number;
  changeType: 'increase' | 'decrease';
  icon: React.ReactNode;
}

interface ChartData {
  name: string;
  value: number;
  [key: string]: any;
}

interface DashboardData {
  realTime: {
    activeUsers: number;
    currentPageViews: number;
    topPages: Array<{ name: string; count: number }>;
    topEvents: Array<{ name: string; count: number }>;
    conversions: number;
  };
  timeRange: {
    startDate: string;
    endDate: string;
  };
}

export const AnalyticsDashboard: React.FC = () => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('7d');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadDashboardData();
  }, [timeRange]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/analytics/dashboard?timeRange=${timeRange}`);
      const result = await response.json();
      
      if (result.success) {
        setData(result.data);
      }
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  };

  const metrics: MetricCard[] = data ? [
    {
      title: 'Active Users',
      value: data.realTime.activeUsers,
      change: 12.5,
      changeType: 'increase',
      icon: <Users className="w-6 h-6" />,
    },
    {
      title: 'Page Views',
      value: data.realTime.currentPageViews,
      change: 8.2,
      changeType: 'increase',
      icon: <Eye className="w-6 h-6" />,
    },
    {
      title: 'Conversions',
      value: data.realTime.conversions,
      change: 15.3,
      changeType: 'increase',
      icon: <Target className="w-6 h-6" />,
    },
    {
      title: 'Avg. Session',
      value: '4m 32s',
      change: -2.1,
      changeType: 'decrease',
      icon: <Clock className="w-6 h-6" />,
    },
  ] : [];

  // Mock data for charts
  const trafficData: ChartData[] = [
    { name: 'Mon', value: 120, users: 120, pageViews: 450, conversions: 23 },
    { name: 'Tue', value: 98, users: 98, pageViews: 380, conversions: 19 },
    { name: 'Wed', value: 135, users: 135, pageViews: 520, conversions: 27 },
    { name: 'Thu', value: 156, users: 156, pageViews: 600, conversions: 31 },
    { name: 'Fri', value: 189, users: 189, pageViews: 720, conversions: 38 },
    { name: 'Sat', value: 210, users: 210, pageViews: 850, conversions: 42 },
    { name: 'Sun', value: 178, users: 178, pageViews: 680, conversions: 35 },
  ];

  const deviceData: ChartData[] = [
    { name: 'Desktop', value: 45, color: '#8884d8' },
    { name: 'Mobile', value: 40, color: '#82ca9d' },
    { name: 'Tablet', value: 15, color: '#ffc658' },
  ];

  const topPagesData = data?.realTime.topPages.map(page => ({
    name: page.name,
    value: page.count,
  })) || [];

  const conversionFunnelData: ChartData[] = [
    { name: 'Page View', value: 1000, percentage: 100 },
    { name: 'Restaurant View', value: 650, percentage: 65 },
    { name: 'Booking Started', value: 280, percentage: 28 },
    { name: 'Booking Completed', value: 120, percentage: 12 },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-muted rounded-lg w-1/4"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-32 bg-muted rounded-lg"></div>
              ))}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="h-80 bg-muted rounded-lg"></div>
              <div className="h-80 bg-muted rounded-lg"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
            <p className="text-muted-foreground">Monitor your restaurant platform performance</p>
          </div>
          
          <div className="flex items-center gap-4">
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="px-4 py-2 border border-input rounded-lg bg-background text-foreground"
            >
              <option value="1d">Last 24 hours</option>
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
            </select>
            
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            
            <button className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 flex items-center gap-2">
              <Download className="w-4 h-4" />
              Export
            </button>
          </div>
        </div>

        {/* Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {metrics.map((metric, index) => (
            <div key={index} className="bg-card border border-border rounded-lg p-6">
              <div className="flex items-center justify-between">
                <div className="text-muted-foreground">{metric.icon}</div>
                <div className={`flex items-center text-sm ${
                  metric.changeType === 'increase' ? 'text-green-600' : 'text-red-600'
                }`}>
                  <TrendingUp className="w-4 h-4 mr-1" />
                  {metric.change > 0 ? '+' : ''}{metric.change}%
                </div>
              </div>
              <div className="mt-4">
                <div className="text-2xl font-bold">{metric.value}</div>
                <div className="text-sm text-muted-foreground">{metric.title}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Charts Row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Traffic Overview */}
          <div className="bg-card border border-border rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4">Traffic Overview</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={trafficData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="users" stroke="#8884d8" strokeWidth={2} />
                <Line type="monotone" dataKey="pageViews" stroke="#82ca9d" strokeWidth={2} />
                <Line type="monotone" dataKey="conversions" stroke="#ffc658" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Device Breakdown */}
          <div className="bg-card border border-border rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4">Device Breakdown</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={deviceData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {deviceData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Charts Row 2 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Pages */}
          <div className="bg-card border border-border rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4">Top Pages</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={topPagesData} layout="horizontal">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" />
                <Tooltip />
                <Bar dataKey="value" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Conversion Funnel */}
          <div className="bg-card border border-border rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4">Conversion Funnel</h3>
            <div className="space-y-4">
              {conversionFunnelData.map((step, index) => (
                <div key={index} className="relative">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium">{step.name}</span>
                    <span className="text-sm text-muted-foreground">
                      {step.value} ({step.percentage}%)
                    </span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div
                      className="bg-primary h-2 rounded-full transition-all duration-300"
                      style={{ width: `${step.percentage}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Real-time Activity */}
        <div className="bg-card border border-border rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Real-time Activity</h3>
            <div className="flex items-center text-green-600">
              <Activity className="w-4 h-4 mr-2" />
              Live
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-primary">{data?.realTime.activeUsers || 0}</div>
              <div className="text-sm text-muted-foreground">Active Users</div>
            </div>
            
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600">{data?.realTime.currentPageViews || 0}</div>
              <div className="text-sm text-muted-foreground">Page Views (5min)</div>
            </div>
            
            <div className="text-center">
              <div className="text-3xl font-bold text-orange-600">{data?.realTime.conversions || 0}</div>
              <div className="text-sm text-muted-foreground">Conversions Today</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};