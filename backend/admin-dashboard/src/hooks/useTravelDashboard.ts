import { useQuery } from 'react-query';
import axios from 'axios';
import { DashboardData, DashboardFilters } from '../types/travel.types';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

export const useTravelDashboard = (filters: DashboardFilters) => {
  return useQuery<DashboardData>(
    ['travelDashboard', filters],
    async () => {
      const response = await axios.get(`${API_URL}/admin/travel/dashboard`, {
        params: filters,
      });
      return response.data;
    },
    {
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
      refetchOnWindowFocus: false,
      refetchInterval: 60 * 1000, // Refresh every minute
      // Mock data for development
      placeholderData: getMockDashboardData(),
    }
  );
};

// Mock data generator for development
function getMockDashboardData(): DashboardData {
  const generateTrend = (days: number, baseValue: number, variance: number) => {
    return Array.from({ length: days }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - days + i);
      return {
        date: date.toISOString().split('T')[0],
        count: Math.floor(baseValue + (Math.random() - 0.5) * variance),
        value: Math.floor((baseValue + (Math.random() - 0.5) * variance) * 100),
      };
    });
  };

  return {
    dateRange: {
      startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      endDate: new Date().toISOString().split('T')[0],
      preset: 'last30days',
    },
    userMetrics: {
      totalUsers: 125000,
      newUsers: 3500,
      activeUsers: {
        daily: 15000,
        monthly: 75000,
      },
      userGrowth: 12.5,
      signupTrend: generateTrend(30, 100, 50).map(t => ({ date: t.date, count: t.count })),
    },
    trafficMetrics: {
      visits: 450000,
      uniqueVisitors: 320000,
      pageViews: 1250000,
      bounceRate: 42.3,
      avgSessionDuration: 245,
      pagesPerSession: 3.8,
      trafficSources: [
        { source: 'Organic Search', count: 180000, percentage: 40 },
        { source: 'Direct', count: 135000, percentage: 30 },
        { source: 'Social Media', count: 67500, percentage: 15 },
        { source: 'Referral', count: 45000, percentage: 10 },
        { source: 'Paid Ads', count: 22500, percentage: 5 },
      ],
      trafficTrend: generateTrend(30, 15000, 5000).map(t => ({
        date: t.date,
        visits: t.count,
        uniqueVisitors: Math.floor(t.count * 0.7),
      })),
    },
    listingMetrics: {
      totalListings: 45000,
      listingsByCategory: [
        { category: 'hotels' as any, count: 12000, apiCount: 8000, userCount: 4000 },
        { category: 'vacation_rentals' as any, count: 8500, apiCount: 5000, userCount: 3500 },
        { category: 'tours' as any, count: 6500, apiCount: 2000, userCount: 4500 },
        { category: 'flights' as any, count: 5000, apiCount: 4500, userCount: 500 },
        { category: 'restaurants' as any, count: 4500, apiCount: 1000, userCount: 3500 },
        { category: 'activities' as any, count: 3500, apiCount: 1500, userCount: 2000 },
        { category: 'car_rentals' as any, count: 2500, apiCount: 2000, userCount: 500 },
        { category: 'nightlife' as any, count: 1500, apiCount: 500, userCount: 1000 },
        { category: 'cruises' as any, count: 500, apiCount: 400, userCount: 100 },
        { category: 'events' as any, count: 300, apiCount: 100, userCount: 200 },
        { category: 'guides' as any, count: 150, apiCount: 0, userCount: 150 },
        { category: 'blogs' as any, count: 50, apiCount: 0, userCount: 50 },
      ],
      newListings: 850,
      updatedListings: 1200,
      pendingApproval: 125,
      listingQuality: {
        active: 42000,
        pending: 2500,
        flagged: 500,
      },
    },
    bookingMetrics: {
      totalBookings: 12500,
      bookingVolume: generateTrend(30, 400, 100),
      conversionRate: 2.78,
      averageBookingValue: 485,
      grossBookingValue: 6062500,
      cancellations: {
        count: 625,
        rate: 5.0,
        refundAmount: 156250,
      },
      bookingsByCategory: [
        { category: 'hotels' as any, count: 5000, value: 2500000 },
        { category: 'flights' as any, count: 3500, value: 1750000 },
        { category: 'vacation_rentals' as any, count: 2000, value: 1200000 },
        { category: 'tours' as any, count: 1200, value: 360000 },
        { category: 'car_rentals' as any, count: 500, value: 150000 },
        { category: 'activities' as any, count: 300, value: 102500 },
      ],
      bookingTrend: 'up',
    },
    revenueMetrics: {
      totalRevenue: 850000,
      revenueGrowth: 18.5,
      revenueBySource: {
        commission: 600000,
        bookingFees: 150000,
        subscriptions: 75000,
        advertising: 25000,
      },
      revenueByCategory: [
        { category: 'hotels' as any, amount: 350000, percentage: 41.2 },
        { category: 'flights' as any, amount: 245000, percentage: 28.8 },
        { category: 'vacation_rentals' as any, amount: 168000, percentage: 19.8 },
        { category: 'tours' as any, amount: 50400, percentage: 5.9 },
        { category: 'car_rentals' as any, amount: 21000, percentage: 2.5 },
        { category: 'activities' as any, amount: 15600, percentage: 1.8 },
      ],
      takeRate: 14.0,
      revenueTrend: generateTrend(30, 28000, 5000).map(t => ({
        date: t.date,
        amount: t.value,
      })),
      revenueTarget: {
        target: 1000000,
        achieved: 850000,
        percentage: 85,
      },
    },
    geographicMetrics: {
      topCountries: [
        { country: 'United States', code: 'US', bookings: 4500, revenue: 306000, users: 45000 },
        { country: 'United Kingdom', code: 'GB', bookings: 2000, revenue: 136000, users: 20000 },
        { country: 'Canada', code: 'CA', bookings: 1500, revenue: 102000, users: 15000 },
        { country: 'Germany', code: 'DE', bookings: 1200, revenue: 81600, users: 12000 },
        { country: 'France', code: 'FR', bookings: 1000, revenue: 68000, users: 10000 },
        { country: 'Australia', code: 'AU', bookings: 800, revenue: 54400, users: 8000 },
        { country: 'Japan', code: 'JP', bookings: 600, revenue: 40800, users: 6000 },
        { country: 'Spain', code: 'ES', bookings: 500, revenue: 34000, users: 5000 },
        { country: 'Italy', code: 'IT', bookings: 400, revenue: 27200, users: 4000 },
      ],
      topCities: [
        { city: 'New York', country: 'USA', bookings: 1200, revenue: 81600 },
        { city: 'London', country: 'UK', bookings: 1000, revenue: 68000 },
        { city: 'Los Angeles', country: 'USA', bookings: 800, revenue: 54400 },
        { city: 'Paris', country: 'France', bookings: 600, revenue: 40800 },
        { city: 'Tokyo', country: 'Japan', bookings: 500, revenue: 34000 },
        { city: 'Toronto', country: 'Canada', bookings: 450, revenue: 30600 },
        { city: 'Sydney', country: 'Australia', bookings: 400, revenue: 27200 },
        { city: 'Berlin', country: 'Germany', bookings: 350, revenue: 23800 },
        { city: 'Chicago', country: 'USA', bookings: 300, revenue: 20400 },
        { city: 'Barcelona', country: 'Spain', bookings: 250, revenue: 17000 },
      ],
      geoDistribution: [],
      regionGrowth: [
        { region: 'North America', growth: 22.5 },
        { region: 'Europe', growth: 18.3 },
        { region: 'Asia Pacific', growth: 35.2 },
        { region: 'Latin America', growth: 28.7 },
        { region: 'Middle East', growth: 15.8 },
      ],
    },
    topPerformers: {
      listings: [
        { id: '1', name: 'Luxury Beach Resort - Maldives', category: 'hotels' as any, bookings: 250, revenue: 125000, rating: 4.8 },
        { id: '2', name: 'Paris City Tour with Eiffel Tower', category: 'tours' as any, bookings: 200, revenue: 20000, rating: 4.9 },
        { id: '3', name: 'Oceanview Villa - Santorini', category: 'vacation_rentals' as any, bookings: 180, revenue: 90000, rating: 4.7 },
        { id: '4', name: 'NYC to LA Direct Flight', category: 'flights' as any, bookings: 150, revenue: 45000, rating: 4.5 },
        { id: '5', name: 'Tokyo Food & Culture Tour', category: 'activities' as any, bookings: 120, revenue: 12000, rating: 4.9 },
      ],
      providers: [
        { id: '1', name: 'Premium Travel Co.', listingsCount: 45, totalBookings: 850, totalRevenue: 255000, rating: 4.8 },
        { id: '2', name: 'Global Hotels Group', listingsCount: 120, totalBookings: 750, totalRevenue: 225000, rating: 4.6 },
        { id: '3', name: 'Adventure Tours Ltd.', listingsCount: 35, totalBookings: 600, totalRevenue: 60000, rating: 4.9 },
        { id: '4', name: 'Vacation Homes Plus', listingsCount: 80, totalBookings: 400, totalRevenue: 200000, rating: 4.7 },
        { id: '5', name: 'City Experience Tours', listingsCount: 25, totalBookings: 350, totalRevenue: 35000, rating: 4.8 },
      ],
      trending: [
        { id: '1', name: 'Bali Wellness Retreat', growthRate: 125, category: 'activities' as any },
        { id: '2', name: 'Iceland Northern Lights Tour', growthRate: 98, category: 'tours' as any },
        { id: '3', name: 'Dubai Desert Safari', growthRate: 87, category: 'activities' as any },
        { id: '4', name: 'Tuscany Wine Villa', growthRate: 76, category: 'vacation_rentals' as any },
        { id: '5', name: 'Japan Cherry Blossom Package', growthRate: 65, category: 'tours' as any },
      ],
    },
    categoryPerformance: [
      {
        category: 'hotels' as any,
        bookings: 5000,
        revenue: 350000,
        listings: 12000,
        conversionRate: 3.2,
        avgBookingValue: 500,
        userEngagement: { views: 150000, inquiries: 15000, wishlistAdds: 8000 },
        performance: 'excellent',
      },
      {
        category: 'flights' as any,
        bookings: 3500,
        revenue: 245000,
        listings: 5000,
        conversionRate: 2.8,
        avgBookingValue: 500,
        userEngagement: { views: 125000, inquiries: 10000, wishlistAdds: 5000 },
        performance: 'good',
      },
      {
        category: 'vacation_rentals' as any,
        bookings: 2000,
        revenue: 168000,
        listings: 8500,
        conversionRate: 2.5,
        avgBookingValue: 600,
        userEngagement: { views: 80000, inquiries: 8000, wishlistAdds: 6000 },
        performance: 'good',
      },
      {
        category: 'tours' as any,
        bookings: 1200,
        revenue: 50400,
        listings: 6500,
        conversionRate: 2.2,
        avgBookingValue: 300,
        userEngagement: { views: 55000, inquiries: 5000, wishlistAdds: 3000 },
        performance: 'average',
      },
    ],
    alerts: [
      {
        id: '1',
        type: 'warning',
        title: 'High Cancellation Rate',
        message: 'Cancellation rate for hotels has increased to 8% this week',
        timestamp: new Date().toISOString(),
        category: 'hotels' as any,
      },
      {
        id: '2',
        type: 'info',
        title: 'New Market Opportunity',
        message: 'Search volume for "eco-friendly tours" has increased by 150%',
        timestamp: new Date().toISOString(),
        category: 'tours' as any,
      },
      {
        id: '3',
        type: 'success',
        title: 'Revenue Target Achieved',
        message: 'Q3 revenue target achieved 2 weeks ahead of schedule',
        timestamp: new Date().toISOString(),
      },
    ],
  };
}