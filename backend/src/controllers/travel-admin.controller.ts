import { Request, Response } from 'express';

// Define types locally to avoid rootDir issues
export enum ServiceCategory {
  HOTELS = 'hotels',
  FLIGHTS = 'flights',
  VACATION_RENTALS = 'vacation_rentals',
  TOURS = 'tours',
  RESTAURANTS = 'restaurants',
  ACTIVITIES = 'activities',
  CAR_RENTALS = 'car_rentals',
  NIGHTLIFE = 'nightlife',
  CRUISES = 'cruises',
  EVENTS = 'events',
  GUIDES = 'guides',
  BLOGS = 'blogs'
}

interface UserMetrics {
  totalUsers: number;
  newUsers: number;
  activeUsers: {
    daily: number;
    monthly: number;
  };
  userGrowth: number;
  signupTrend: Array<{ date: string; count: number }>;
}

interface TrafficMetrics {
  visits: number;
  uniqueVisitors: number;
  pageViews: number;
  bounceRate: number;
  avgSessionDuration: number;
  pagesPerSession: number;
  trafficSources: Array<{
    source: string;
    count: number;
    percentage: number;
  }>;
  trafficTrend: Array<{
    date: string;
    visits: number;
    uniqueVisitors: number;
  }>;
}

interface BookingMetrics {
  totalBookings: number;
  bookingVolume: Array<{ date: string; count: number; value: number }>;
  conversionRate: number;
  averageBookingValue: number;
  grossBookingValue: number;
  cancellations: {
    count: number;
    rate: number;
    refundAmount: number;
  };
  bookingsByCategory: Array<{
    category: ServiceCategory;
    count: number;
    value: number;
  }>;
  bookingTrend: 'up' | 'down' | 'stable';
}

interface RevenueMetrics {
  totalRevenue: number;
  revenueGrowth: number;
  revenueBySource: {
    commission: number;
    bookingFees: number;
    subscriptions: number;
    advertising: number;
  };
  revenueByCategory: Array<{
    category: ServiceCategory;
    amount: number;
    percentage: number;
  }>;
  takeRate: number;
  revenueTrend: Array<{ date: string; amount: number }>;
  revenueTarget: {
    target: number;
    achieved: number;
    percentage: number;
  };
}

interface ListingMetrics {
  totalListings: number;
  listingsByCategory: Array<{
    category: ServiceCategory;
    count: number;
    apiCount: number;
    userCount: number;
  }>;
  newListings: number;
  updatedListings: number;
  pendingApproval: number;
  listingQuality: {
    active: number;
    pending: number;
    flagged: number;
  };
}

interface GeographicMetrics {
  topCountries: Array<{
    country: string;
    code: string;
    bookings: number;
    revenue: number;
    users: number;
  }>;
  topCities: Array<{
    city: string;
    country: string;
    bookings: number;
    revenue: number;
  }>;
  geoDistribution: any[];
  regionGrowth: Array<{
    region: string;
    growth: number;
  }>;
}

interface TopPerformers {
  listings: Array<{
    id: string;
    name: string;
    category: ServiceCategory;
    bookings: number;
    revenue: number;
    rating: number;
  }>;
  providers: Array<{
    id: string;
    name: string;
    listingsCount: number;
    totalBookings: number;
    totalRevenue: number;
    rating: number;
  }>;
  trending: Array<{
    id: string;
    name: string;
    growthRate: number;
    category: ServiceCategory;
  }>;
}

interface CategoryPerformance {
  category: ServiceCategory;
  bookings: number;
  revenue: number;
  listings: number;
  conversionRate: number;
  avgBookingValue: number;
  userEngagement: {
    views: number;
    inquiries: number;
    wishlistAdds: number;
  };
  performance: 'excellent' | 'good' | 'average' | 'poor';
}

interface DashboardData {
  dateRange: {
    startDate: string;
    endDate: string;
    preset: string;
  };
  userMetrics: UserMetrics;
  trafficMetrics: TrafficMetrics;
  listingMetrics: ListingMetrics;
  bookingMetrics: BookingMetrics;
  revenueMetrics: RevenueMetrics;
  geographicMetrics: GeographicMetrics;
  topPerformers: TopPerformers;
  categoryPerformance: CategoryPerformance[];
  alerts: Array<{
    id: string;
    type: 'info' | 'warning' | 'error' | 'success';
    title: string;
    message: string;
    timestamp: string;
    category?: ServiceCategory;
  }>;
}

export class TravelAdminController {
  // Main dashboard endpoint
  static async getDashboard(req: Request, res: Response) {
    try {
      const { startDate, endDate, categories, countries } = req.query;
      
      // In a real implementation, these would query from database
      const dashboardData: DashboardData = {
        dateRange: {
          startDate: startDate as string || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          endDate: endDate as string || new Date().toISOString().split('T')[0],
          preset: 'custom',
        },
        userMetrics: await TravelAdminController.getUserMetrics(startDate as string, endDate as string),
        trafficMetrics: await TravelAdminController.getTrafficMetrics(startDate as string, endDate as string),
        listingMetrics: await TravelAdminController.getListingMetrics(),
        bookingMetrics: await TravelAdminController.getBookingMetrics(startDate as string, endDate as string),
        revenueMetrics: await TravelAdminController.getRevenueMetrics(startDate as string, endDate as string),
        geographicMetrics: await TravelAdminController.getGeographicMetrics(startDate as string, endDate as string),
        topPerformers: await TravelAdminController.getTopPerformers(startDate as string, endDate as string),
        categoryPerformance: await TravelAdminController.getCategoryPerformance(startDate as string, endDate as string),
        alerts: await TravelAdminController.getAlerts(),
      };

      res.json(dashboardData);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      res.status(500).json({ error: 'Failed to fetch dashboard data' });
    }
  }

  // Individual metric endpoints
  static async getUserMetrics(startDate?: string, endDate?: string): Promise<UserMetrics> {
    // This would query from User model
    const totalUsers = 125000;
    const previousPeriodUsers = 111111;
    const newUsers = 3500;
    
    return {
      totalUsers,
      newUsers,
      activeUsers: {
        daily: 15000,
        monthly: 75000,
      },
      userGrowth: ((totalUsers - previousPeriodUsers) / previousPeriodUsers) * 100,
      signupTrend: TravelAdminController.generateTrend(30, 100, 50),
    };
  }

  static async getTrafficMetrics(startDate?: string, endDate?: string): Promise<TrafficMetrics> {
    // This would query from analytics/logs
    return {
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
      trafficTrend: TravelAdminController.generateTrend(30, 15000, 5000).map(t => ({
        date: t.date,
        visits: t.count,
        uniqueVisitors: Math.floor(t.count * 0.7),
      })),
    };
  }

  static async getListingMetrics(): Promise<ListingMetrics> {
    // This would query from various listing models
    return {
      totalListings: 45000,
      listingsByCategory: Object.values(ServiceCategory).map(category => ({
        category: category as ServiceCategory,
        count: Math.floor(Math.random() * 10000) + 1000,
        apiCount: Math.floor(Math.random() * 5000),
        userCount: Math.floor(Math.random() * 5000),
      })),
      newListings: 850,
      updatedListings: 1200,
      pendingApproval: 125,
      listingQuality: {
        active: 42000,
        pending: 2500,
        flagged: 500,
      },
    };
  }

  static async getBookingMetrics(startDate?: string, endDate?: string): Promise<BookingMetrics> {
    // This would query from booking models
    const totalBookings = 12500;
    const visits = 450000;
    
    return {
      totalBookings,
      bookingVolume: TravelAdminController.generateTrend(30, 400, 100).map(t => ({
        date: t.date,
        count: t.count,
        value: t.count * 485,
      })),
      conversionRate: (totalBookings / visits) * 100,
      averageBookingValue: 485,
      grossBookingValue: totalBookings * 485,
      cancellations: {
        count: 625,
        rate: 5.0,
        refundAmount: 156250,
      },
      bookingsByCategory: [
        { category: ServiceCategory.HOTELS, count: 5000, value: 2500000 },
        { category: ServiceCategory.FLIGHTS, count: 3500, value: 1750000 },
        { category: ServiceCategory.VACATION_RENTALS, count: 2000, value: 1200000 },
        { category: ServiceCategory.TOURS, count: 1200, value: 360000 },
        { category: ServiceCategory.CAR_RENTALS, count: 500, value: 150000 },
        { category: ServiceCategory.ACTIVITIES, count: 300, value: 102500 },
      ],
      bookingTrend: 'up',
    };
  }

  static async getRevenueMetrics(startDate?: string, endDate?: string): Promise<RevenueMetrics> {
    // This would query from financial/payment models
    const totalRevenue = 850000;
    const previousRevenue = 717500;
    
    return {
      totalRevenue,
      revenueGrowth: ((totalRevenue - previousRevenue) / previousRevenue) * 100,
      revenueBySource: {
        commission: 600000,
        bookingFees: 150000,
        subscriptions: 75000,
        advertising: 25000,
      },
      revenueByCategory: [
        { category: ServiceCategory.HOTELS, amount: 350000, percentage: 41.2 },
        { category: ServiceCategory.FLIGHTS, amount: 245000, percentage: 28.8 },
        { category: ServiceCategory.VACATION_RENTALS, amount: 168000, percentage: 19.8 },
        { category: ServiceCategory.TOURS, amount: 50400, percentage: 5.9 },
        { category: ServiceCategory.CAR_RENTALS, amount: 21000, percentage: 2.5 },
        { category: ServiceCategory.ACTIVITIES, amount: 15600, percentage: 1.8 },
      ],
      takeRate: 14.0,
      revenueTrend: TravelAdminController.generateTrend(30, 28000, 5000).map(t => ({
        date: t.date,
        amount: t.count * 100,
      })),
      revenueTarget: {
        target: 1000000,
        achieved: totalRevenue,
        percentage: (totalRevenue / 1000000) * 100,
      },
    };
  }

  static async getGeographicMetrics(startDate?: string, endDate?: string): Promise<GeographicMetrics> {
    // This would query from booking/user models with location data
    return {
      topCountries: [
        { country: 'United States', code: 'US', bookings: 4500, revenue: 306000, users: 45000 },
        { country: 'United Kingdom', code: 'GB', bookings: 2000, revenue: 136000, users: 20000 },
        { country: 'Canada', code: 'CA', bookings: 1500, revenue: 102000, users: 15000 },
        { country: 'Germany', code: 'DE', bookings: 1200, revenue: 81600, users: 12000 },
        { country: 'France', code: 'FR', bookings: 1000, revenue: 68000, users: 10000 },
      ],
      topCities: [
        { city: 'New York', country: 'USA', bookings: 1200, revenue: 81600 },
        { city: 'London', country: 'UK', bookings: 1000, revenue: 68000 },
        { city: 'Los Angeles', country: 'USA', bookings: 800, revenue: 54400 },
        { city: 'Paris', country: 'France', bookings: 600, revenue: 40800 },
        { city: 'Tokyo', country: 'Japan', bookings: 500, revenue: 34000 },
      ],
      geoDistribution: [],
      regionGrowth: [
        { region: 'North America', growth: 22.5 },
        { region: 'Europe', growth: 18.3 },
        { region: 'Asia Pacific', growth: 35.2 },
        { region: 'Latin America', growth: 28.7 },
      ],
    };
  }

  static async getTopPerformers(startDate?: string, endDate?: string): Promise<TopPerformers> {
    // This would query from listing/booking models
    return {
      listings: [
        { 
          id: '1', 
          name: 'Luxury Beach Resort - Maldives', 
          category: ServiceCategory.HOTELS, 
          bookings: 250, 
          revenue: 125000, 
          rating: 4.8 
        },
        { 
          id: '2', 
          name: 'Paris City Tour with Eiffel Tower', 
          category: ServiceCategory.TOURS, 
          bookings: 200, 
          revenue: 20000, 
          rating: 4.9 
        },
      ],
      providers: [
        { 
          id: '1', 
          name: 'Premium Travel Co.', 
          listingsCount: 45, 
          totalBookings: 850, 
          totalRevenue: 255000, 
          rating: 4.8 
        },
      ],
      trending: [
        { 
          id: '1', 
          name: 'Bali Wellness Retreat', 
          growthRate: 125, 
          category: ServiceCategory.ACTIVITIES 
        },
      ],
    };
  }

  static async getCategoryPerformance(startDate?: string, endDate?: string): Promise<CategoryPerformance[]> {
    // This would query and aggregate from multiple models
    return [
      {
        category: ServiceCategory.HOTELS,
        bookings: 5000,
        revenue: 350000,
        listings: 12000,
        conversionRate: 3.2,
        avgBookingValue: 500,
        userEngagement: { views: 150000, inquiries: 15000, wishlistAdds: 8000 },
        performance: 'excellent',
      },
      {
        category: ServiceCategory.FLIGHTS,
        bookings: 3500,
        revenue: 245000,
        listings: 5000,
        conversionRate: 2.8,
        avgBookingValue: 500,
        userEngagement: { views: 125000, inquiries: 10000, wishlistAdds: 5000 },
        performance: 'good',
      },
    ];
  }

  static async getAlerts() {
    // This would check various thresholds and conditions
    return [
      {
        id: '1',
        type: 'warning' as const,
        title: 'High Cancellation Rate',
        message: 'Cancellation rate for hotels has increased to 8% this week',
        timestamp: new Date().toISOString(),
        category: ServiceCategory.HOTELS,
      },
    ];
  }

  // Helper function to generate trend data
  private static generateTrend(days: number, baseValue: number, variance: number) {
    return Array.from({ length: days }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - days + i);
      return {
        date: date.toISOString().split('T')[0],
        count: Math.floor(baseValue + (Math.random() - 0.5) * variance),
      };
    });
  }

  // Analytics endpoint for deeper insights
  static async getAnalytics(req: Request, res: Response) {
    try {
      const { metric, groupBy, startDate, endDate, category } = req.query;
      
      // Implementation would vary based on metric type
      const analyticsData = {
        metric,
        groupBy,
        dateRange: { startDate, endDate },
        data: [], // Would contain actual analytics data
      };

      res.json(analyticsData);
    } catch (error) {
      console.error('Error fetching analytics:', error);
      res.status(500).json({ error: 'Failed to fetch analytics data' });
    }
  }

  // Search console endpoint
  static async getSearchConsole(req: Request, res: Response) {
    try {
      const { startDate, endDate } = req.query;
      
      const searchData = {
        topSearchQueries: [
          { query: 'cheap flights to paris', clicks: 1250, impressions: 25000, ctr: 5.0, position: 2.3 },
          { query: 'luxury hotels maldives', clicks: 890, impressions: 15000, ctr: 5.9, position: 1.8 },
          { query: 'best tours rome', clicks: 670, impressions: 12000, ctr: 5.6, position: 3.1 },
        ],
        searchVolumeTrend: TravelAdminController.generateTrend(30, 5000, 1000),
        avgCTR: 4.8,
        avgPosition: 3.2,
      };

      res.json(searchData);
    } catch (error) {
      console.error('Error fetching search console data:', error);
      res.status(500).json({ error: 'Failed to fetch search console data' });
    }
  }

  // Listings endpoint
  static async getListings(req: Request, res: Response) {
    try {
      const { category, status, search, sort } = req.query;
      
      // This would query from listing models with filters
      const listings = TravelAdminController.generateMockListings();
      
      res.json(listings);
    } catch (error) {
      console.error('Error fetching listings:', error);
      res.status(500).json({ error: 'Failed to fetch listings' });
    }
  }

  // Reports endpoint
  static async getReports(req: Request, res: Response) {
    try {
      const { type } = req.query;
      
      const reports = [
        {
          id: '1',
          name: 'Q4 2023 Performance Report',
          type: 'performance',
          format: 'pdf',
          status: 'completed',
          size: '2.4 MB',
          createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          downloadUrl: '#',
        },
        {
          id: '2',
          name: 'Monthly Revenue Analysis',
          type: 'revenue',
          format: 'excel',
          status: 'completed',
          size: '1.8 MB',
          createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
          downloadUrl: '#',
        },
      ];
      
      res.json(reports);
    } catch (error) {
      console.error('Error fetching reports:', error);
      res.status(500).json({ error: 'Failed to fetch reports' });
    }
  }

  // Generate report endpoint
  static async generateReport(req: Request, res: Response) {
    try {
      const reportConfig = req.body;
      
      // This would trigger report generation
      const newReport = {
        id: Date.now().toString(),
        status: 'processing',
        message: 'Report generation started',
      };
      
      res.json(newReport);
    } catch (error) {
      console.error('Error generating report:', error);
      res.status(500).json({ error: 'Failed to generate report' });
    }
  }

  // Helper to generate mock listings
  private static generateMockListings() {
    const categories = Object.values(ServiceCategory);
    const locations = ['New York', 'London', 'Paris', 'Tokyo', 'Sydney'];
    const statuses = ['active', 'pending', 'flagged', 'inactive'];
    const providers = ['Premium Travel Co.', 'Global Hotels Group', 'Adventure Tours Ltd.'];

    return Array.from({ length: 20 }, (_, i) => ({
      id: `listing-${i + 1}`,
      name: `Amazing ${categories[i % categories.length]} Experience ${i + 1}`,
      category: categories[i % categories.length],
      location: locations[i % locations.length],
      price: Math.floor(Math.random() * 1000) + 50,
      rating: Number((3.5 + Math.random() * 1.5).toFixed(1)),
      reviews: Math.floor(Math.random() * 500) + 10,
      status: statuses[i % statuses.length],
      views: Math.floor(Math.random() * 10000) + 100,
      bookings: Math.floor(Math.random() * 100) + 5,
      revenue: Math.floor(Math.random() * 50000) + 1000,
      lastUpdated: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
      provider: {
        id: `provider-${i % providers.length}`,
        name: providers[i % providers.length],
      },
    }));
  }
}