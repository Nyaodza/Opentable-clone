import { unifiedApiClient } from '../api/unified-client';

export interface AnalyticsEvent {
  id?: string;
  type: string;
  category: string;
  action: string;
  label?: string;
  value?: number;
  userId?: string;
  sessionId: string;
  timestamp: string;
  properties: Record<string, any>;
  context: {
    page: string;
    referrer?: string;
    userAgent: string;
    ip?: string;
    location?: {
      latitude: number;
      longitude: number;
    };
  };
}

export interface MetricData {
  metric: string;
  value: number;
  change: number;
  changeType: 'increase' | 'decrease' | 'neutral';
  period: string;
  previousValue?: number;
}

export interface ChartData {
  labels: string[];
  datasets: Array<{
    label: string;
    data: number[];
    backgroundColor?: string;
    borderColor?: string;
    fill?: boolean;
  }>;
}

export interface AnalyticsDashboard {
  overview: {
    totalUsers: MetricData;
    activeUsers: MetricData;
    totalReservations: MetricData;
    revenue: MetricData;
    averageOrderValue: MetricData;
    conversionRate: MetricData;
  };
  charts: {
    userActivity: ChartData;
    reservationTrends: ChartData;
    revenueByDay: ChartData;
    topRestaurants: ChartData;
    deviceTypes: ChartData;
    trafficSources: ChartData;
  };
  realTime: {
    activeUsers: number;
    currentReservations: number;
    liveOrders: number;
    averageSessionDuration: number;
  };
  insights: Array<{
    id: string;
    type: 'alert' | 'insight' | 'opportunity';
    title: string;
    description: string;
    impact: 'high' | 'medium' | 'low';
    actionable: boolean;
    recommendations?: string[];
    timestamp: string;
  }>;
}

export interface UserBehaviorAnalytics {
  userId: string;
  sessions: Array<{
    id: string;
    startTime: string;
    endTime?: string;
    duration?: number;
    pageViews: number;
    events: number;
    source: string;
    device: string;
    location?: string;
  }>;
  journeyMap: Array<{
    step: string;
    page: string;
    timestamp: string;
    duration: number;
    actions: string[];
    exitPoint?: boolean;
  }>;
  preferences: {
    cuisineTypes: string[];
    priceRanges: string[];
    favoriteRestaurants: string[];
    averagePartySize: number;
    preferredTimeSlots: string[];
  };
  lifetime: {
    totalReservations: number;
    totalSpent: number;
    averageOrderValue: number;
    loyaltyTier: string;
    churnRisk: number;
  };
}

export interface RestaurantAnalytics {
  restaurantId: string;
  performance: {
    totalReservations: MetricData;
    revenue: MetricData;
    averageRating: MetricData;
    cancellationRate: MetricData;
    noShowRate: MetricData;
    tableUtilization: MetricData;
  };
  trends: {
    reservationsByHour: ChartData;
    revenueByMonth: ChartData;
    ratingTrends: ChartData;
    popularDishes: ChartData;
  };
  customerInsights: {
    repeatCustomers: number;
    averagePartySize: number;
    peakHours: string[];
    demographicBreakdown: Record<string, number>;
  };
  recommendations: Array<{
    type: 'pricing' | 'inventory' | 'marketing' | 'operations';
    title: string;
    description: string;
    expectedImpact: string;
    priority: 'high' | 'medium' | 'low';
  }>;
}

class AnalyticsService {
  private sessionId: string;
  private queue: AnalyticsEvent[] = [];
  private isOnline = true;
  private batchTimer: NodeJS.Timeout | null = null;
  private readonly BATCH_SIZE = 10;
  private readonly BATCH_INTERVAL = 5000; // 5 seconds

  constructor() {
    this.sessionId = this.generateSessionId();
    
    if (typeof window !== 'undefined') {
      this.initializeTracking();
      this.setupNetworkHandling();
      this.startBatchProcessing();
    }
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private initializeTracking(): void {
    // Track page views
    this.trackPageView();
    
    // Track user interactions
    this.setupInteractionTracking();
    
    // Track performance metrics
    this.trackPerformanceMetrics();
  }

  private setupNetworkHandling(): void {
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.flushQueue();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
    });

    // Track beforeunload to flush remaining events
    window.addEventListener('beforeunload', () => {
      this.flushQueue(true);
    });
  }

  private setupInteractionTracking(): void {
    // Track clicks on important elements
    document.addEventListener('click', (event) => {
      const target = event.target as HTMLElement;
      
      // Track button clicks
      if (target.tagName === 'BUTTON' || target.closest('button')) {
        const button = target.tagName === 'BUTTON' ? target : target.closest('button')!;
        this.track('click', 'interaction', 'button_click', {
          buttonText: button.textContent?.trim(),
          buttonId: button.id,
          buttonClass: button.className,
        });
      }
      
      // Track link clicks
      if (target.tagName === 'A' || target.closest('a')) {
        const link = target.tagName === 'A' ? target : target.closest('a')!;
        this.track('click', 'navigation', 'link_click', {
          href: (link as HTMLAnchorElement).href,
          text: link.textContent?.trim(),
        });
      }
      
      // Track form submissions
      if (target.tagName === 'FORM' || target.closest('form')) {
        this.track('submit', 'interaction', 'form_submit', {
          formId: target.id || target.closest('form')?.id,
        });
      }
    });

    // Track scroll depth
    let maxScrollDepth = 0;
    window.addEventListener('scroll', () => {
      const scrollDepth = Math.round(
        (window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100
      );
      
      if (scrollDepth > maxScrollDepth && scrollDepth % 25 === 0) {
        maxScrollDepth = scrollDepth;
        this.track('scroll', 'engagement', 'scroll_depth', {
          depth: scrollDepth,
        });
      }
    });
  }

  private trackPerformanceMetrics(): void {
    // Track page load time
    window.addEventListener('load', () => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      
      this.track('performance', 'page_load', 'load_time', {
        domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
        loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
        firstPaint: this.getFirstPaint(),
        firstContentfulPaint: this.getFirstContentfulPaint(),
      });
    });
  }

  private getFirstPaint(): number | null {
    const paintEntries = performance.getEntriesByType('paint');
    const firstPaint = paintEntries.find(entry => entry.name === 'first-paint');
    return firstPaint ? firstPaint.startTime : null;
  }

  private getFirstContentfulPaint(): number | null {
    const paintEntries = performance.getEntriesByType('paint');
    const firstContentfulPaint = paintEntries.find(entry => entry.name === 'first-contentful-paint');
    return firstContentfulPaint ? firstContentfulPaint.startTime : null;
  }

  private startBatchProcessing(): void {
    this.batchTimer = setInterval(() => {
      if (this.queue.length > 0 && this.isOnline) {
        this.flushQueue();
      }
    }, this.BATCH_INTERVAL);
  }

  // Public API
  public track(
    type: string,
    category: string,
    action: string,
    properties: Record<string, any> = {},
    label?: string,
    value?: number
  ): void {
    const event: AnalyticsEvent = {
      type,
      category,
      action,
      label,
      value,
      sessionId: this.sessionId,
      timestamp: new Date().toISOString(),
      properties,
      context: {
        page: window.location.pathname,
        referrer: document.referrer,
        userAgent: navigator.userAgent,
      },
    };

    this.queue.push(event);

    // Flush immediately for critical events
    if (this.isCriticalEvent(event)) {
      this.flushQueue();
    } else if (this.queue.length >= this.BATCH_SIZE) {
      this.flushQueue();
    }
  }

  public trackPageView(page?: string): void {
    this.track('pageview', 'navigation', 'page_view', {
      page: page || window.location.pathname,
      title: document.title,
      url: window.location.href,
      timestamp: Date.now(),
    });
  }

  public trackEvent(
    category: string,
    action: string,
    label?: string,
    value?: number,
    properties: Record<string, any> = {}
  ): void {
    this.track('event', category, action, properties, label, value);
  }

  public trackReservation(reservationData: {
    restaurantId: string;
    partySize: number;
    date: string;
    time: string;
    totalAmount?: number;
  }): void {
    this.track('conversion', 'reservation', 'reservation_completed', {
      ...reservationData,
      conversionValue: reservationData.totalAmount || 0,
    });
  }

  public trackSearch(query: string, results: number, filters?: Record<string, any>): void {
    this.track('search', 'discovery', 'search_performed', {
      query,
      resultsCount: results,
      filters,
    });
  }

  public trackUserAction(action: string, target: string, properties: Record<string, any> = {}): void {
    this.track('action', 'user_interaction', action, {
      target,
      ...properties,
    });
  }

  // Analytics Dashboard APIs
  public async getDashboardData(
    dateRange: { start: string; end: string },
    filters?: Record<string, any>
  ): Promise<AnalyticsDashboard> {
    return await unifiedApiClient.get('/analytics/dashboard', {
      ...dateRange,
      filters,
    });
  }

  public async getUserBehavior(
    userId: string,
    dateRange?: { start: string; end: string }
  ): Promise<UserBehaviorAnalytics> {
    return await unifiedApiClient.get(`/analytics/users/${userId}`, dateRange);
  }

  public async getRestaurantAnalytics(
    restaurantId: string,
    dateRange: { start: string; end: string }
  ): Promise<RestaurantAnalytics> {
    return await unifiedApiClient.get(`/analytics/restaurants/${restaurantId}`, dateRange);
  }

  public async getCustomReport(
    metrics: string[],
    dimensions: string[],
    dateRange: { start: string; end: string },
    filters?: Record<string, any>
  ): Promise<any> {
    return await unifiedApiClient.post('/analytics/custom-report', {
      metrics,
      dimensions,
      dateRange,
      filters,
    });
  }

  public async exportData(
    type: 'csv' | 'xlsx' | 'json',
    reportType: string,
    dateRange: { start: string; end: string },
    filters?: Record<string, any>
  ): Promise<Blob> {
    const response = await fetch('/api/analytics/export', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type,
        reportType,
        dateRange,
        filters,
      }),
    });

    if (!response.ok) {
      throw new Error('Export failed');
    }

    return await response.blob();
  }

  // Real-time Analytics
  public async getRealTimeMetrics(): Promise<{
    activeUsers: number;
    pageViews: number;
    events: number;
    conversions: number;
    topPages: Array<{ page: string; views: number }>;
    userSources: Array<{ source: string; users: number }>;
  }> {
    return await unifiedApiClient.get('/analytics/realtime');
  }

  public subscribeToRealTimeUpdates(
    callback: (data: any) => void
  ): () => void {
    // This would integrate with WebSocket service
    const eventSource = new EventSource('/api/analytics/realtime/stream');
    
    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        callback(data);
      } catch (error) {
        console.error('Failed to parse real-time analytics data:', error);
      }
    };

    return () => {
      eventSource.close();
    };
  }

  // Funnel Analysis
  public async getFunnelAnalysis(
    steps: string[],
    dateRange: { start: string; end: string }
  ): Promise<{
    steps: Array<{
      name: string;
      users: number;
      dropoffRate: number;
      conversionRate: number;
    }>;
    totalConversions: number;
    overallConversionRate: number;
  }> {
    return await unifiedApiClient.post('/analytics/funnel', {
      steps,
      dateRange,
    });
  }

  // Cohort Analysis
  public async getCohortAnalysis(
    metric: 'retention' | 'revenue',
    period: 'day' | 'week' | 'month',
    dateRange: { start: string; end: string }
  ): Promise<{
    cohorts: Array<{
      period: string;
      users: number;
      data: number[];
    }>;
    averageRetention: number[];
  }> {
    return await unifiedApiClient.get('/analytics/cohort', {
      metric,
      period,
      ...dateRange,
    });
  }

  // A/B Testing Analytics
  public async getExperimentResults(experimentId: string): Promise<{
    experiment: {
      id: string;
      name: string;
      status: string;
      variants: Array<{
        id: string;
        name: string;
        traffic: number;
      }>;
    };
    results: Array<{
      variant: string;
      participants: number;
      conversions: number;
      conversionRate: number;
      significance: number;
      improvement: number;
    }>;
    winner?: string;
    confidence: number;
  }> {
    return await unifiedApiClient.get(`/analytics/experiments/${experimentId}`);
  }

  // Private methods
  private isCriticalEvent(event: AnalyticsEvent): boolean {
    const criticalEvents = [
      'reservation_completed',
      'payment_completed',
      'error_occurred',
      'crash_detected',
    ];
    
    return criticalEvents.includes(event.action);
  }

  private async flushQueue(immediate = false): Promise<void> {
    if (this.queue.length === 0) return;

    const events = [...this.queue];
    this.queue = [];

    try {
      if (immediate && navigator.sendBeacon) {
        // Use sendBeacon for immediate sends (like beforeunload)
        navigator.sendBeacon(
          '/api/analytics/events',
          JSON.stringify({ events })
        );
      } else {
        await unifiedApiClient.post('/analytics/events', { events });
      }
    } catch (error) {
      console.error('Failed to send analytics events:', error);
      // Re-queue events if offline
      if (!this.isOnline) {
        this.queue.unshift(...events);
      }
    }
  }

  // Cleanup
  public destroy(): void {
    if (this.batchTimer) {
      clearInterval(this.batchTimer);
      this.batchTimer = null;
    }
    
    this.flushQueue(true);
  }
}

// Singleton instance
export const analyticsService = new AnalyticsService();

// React hooks
export function useAnalytics() {
  return {
    track: analyticsService.track.bind(analyticsService),
    trackEvent: analyticsService.trackEvent.bind(analyticsService),
    trackPageView: analyticsService.trackPageView.bind(analyticsService),
    trackReservation: analyticsService.trackReservation.bind(analyticsService),
    trackSearch: analyticsService.trackSearch.bind(analyticsService),
    trackUserAction: analyticsService.trackUserAction.bind(analyticsService),
  };
}

export function useDashboardData(
  dateRange: { start: string; end: string },
  filters?: Record<string, any>
) {
  const [data, setData] = React.useState<AnalyticsDashboard | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    setLoading(true);
    analyticsService
      .getDashboardData(dateRange, filters)
      .then(setData)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [dateRange.start, dateRange.end, JSON.stringify(filters)]);

  return { data, loading, error };
}

export function useRealTimeMetrics() {
  const [metrics, setMetrics] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    analyticsService
      .getRealTimeMetrics()
      .then(setMetrics)
      .finally(() => setLoading(false));

    const unsubscribe = analyticsService.subscribeToRealTimeUpdates(setMetrics);

    return unsubscribe;
  }, []);

  return { metrics, loading };
}

export default analyticsService;