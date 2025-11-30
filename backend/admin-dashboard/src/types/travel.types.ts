// Travel Platform Types

export interface DateRange {
  startDate: string;
  endDate: string;
  preset?: 'today' | 'yesterday' | 'last7days' | 'last30days' | 'last90days' | 'custom';
}

// User & Traffic Metrics
export interface UserMetrics {
  totalUsers: number;
  newUsers: number;
  activeUsers: {
    daily: number;
    monthly: number;
  };
  userGrowth: number; // percentage
  signupTrend: Array<{
    date: string;
    count: number;
  }>;
}

export interface TrafficMetrics {
  visits: number;
  uniqueVisitors: number;
  pageViews: number;
  bounceRate: number;
  avgSessionDuration: number; // in seconds
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

// Listings & Content Metrics
export interface ListingMetrics {
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

export enum ServiceCategory {
  TOURS = 'tours',
  VACATION_RENTALS = 'vacation_rentals',
  HOTELS = 'hotels',
  FLIGHTS = 'flights',
  RESTAURANTS = 'restaurants',
  NIGHTLIFE = 'nightlife',
  CAR_RENTALS = 'car_rentals',
  CRUISES = 'cruises',
  ACTIVITIES = 'activities',
  EVENTS = 'events',
  GUIDES = 'guides',
  BLOGS = 'blogs'
}

// Booking & Transaction Metrics
export interface BookingMetrics {
  totalBookings: number;
  bookingVolume: Array<{
    date: string;
    count: number;
    value: number;
  }>;
  conversionRate: number;
  averageBookingValue: number;
  grossBookingValue: number; // GMV
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

// Revenue & Financial Metrics
export interface RevenueMetrics {
  totalRevenue: number;
  revenueGrowth: number; // percentage
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
  takeRate: number; // commission percentage
  revenueTrend: Array<{
    date: string;
    amount: number;
  }>;
  revenueTarget: {
    target: number;
    achieved: number;
    percentage: number;
  };
}

// Geographic Insights
export interface GeographicMetrics {
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
  geoDistribution: Array<{
    location: string;
    latitude: number;
    longitude: number;
    value: number;
  }>;
  regionGrowth: Array<{
    region: string;
    growth: number;
  }>;
}

// Top Performers
export interface TopPerformers {
  listings: Array<{
    id: string;
    name: string;
    category: ServiceCategory;
    bookings: number;
    revenue: number;
    rating: number;
    thumbnail?: string;
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

// Category Performance
export interface CategoryPerformance {
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

// Dashboard Overview
export interface DashboardData {
  dateRange: DateRange;
  userMetrics: UserMetrics;
  trafficMetrics: TrafficMetrics;
  listingMetrics: ListingMetrics;
  bookingMetrics: BookingMetrics;
  revenueMetrics: RevenueMetrics;
  geographicMetrics: GeographicMetrics;
  topPerformers: TopPerformers;
  categoryPerformance: CategoryPerformance[];
  alerts: Alert[];
}

export interface Alert {
  id: string;
  type: 'warning' | 'error' | 'info' | 'success';
  title: string;
  message: string;
  timestamp: string;
  category?: ServiceCategory;
  action?: {
    label: string;
    url: string;
  };
}

// Filter Options
export interface DashboardFilters {
  dateRange: DateRange;
  categories?: ServiceCategory[];
  countries?: string[];
  cities?: string[];
  providers?: string[];
  sortBy?: 'revenue' | 'bookings' | 'growth' | 'rating';
  sortOrder?: 'asc' | 'desc';
}

// Chart Data Types
export interface ChartData {
  labels: string[];
  datasets: Array<{
    label: string;
    data: number[];
    backgroundColor?: string | string[];
    borderColor?: string;
    borderWidth?: number;
    fill?: boolean;
    tension?: number;
  }>;
}

export interface MapData {
  center: [number, number]; // [lat, lng]
  zoom: number;
  markers: Array<{
    position: [number, number];
    popup: string;
    value: number;
  }>;
}