'use client';

interface AnalyticsEvent {
  name: string;
  properties?: Record<string, any>;
  userId?: string;
  timestamp?: Date;
}

interface AnalyticsConfig {
  apiEndpoint: string;
  apiKey?: string;
  debug: boolean;
  batchSize: number;
  flushInterval: number;
}

class AnalyticsClient {
  private config: AnalyticsConfig;
  private queue: AnalyticsEvent[] = [];
  private userId: string | null = null;
  private sessionId: string;
  private isInitialized = false;
  private flushTimer: NodeJS.Timeout | null = null;

  constructor(config: Partial<AnalyticsConfig> = {}) {
    this.config = {
      apiEndpoint: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
      debug: process.env.NODE_ENV === 'development',
      batchSize: 10,
      flushInterval: 5000, // 5 seconds
      ...config,
    };

    this.sessionId = this.generateSessionId();
    
    if (typeof window !== 'undefined') {
      this.initialize();
    }
  }

  private initialize() {
    if (this.isInitialized) return;

    // Start the flush timer
    this.flushTimer = setInterval(() => {
      this.flush();
    }, this.config.flushInterval);

    // Flush on page unload
    window.addEventListener('beforeunload', () => {
      this.flush(true);
    });

    // Flush on visibility change (when user switches tabs)
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        this.flush();
      }
    });

    this.isInitialized = true;
    this.log('Analytics client initialized');
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private log(message: string, ...args: any[]) {
    if (this.config.debug) {
      console.log(`[Analytics] ${message}`, ...args);
    }
  }

  setUserId(userId: string | null) {
    this.userId = userId;
    this.log('User ID set:', userId);
  }

  track(eventName: string, properties: Record<string, any> = {}) {
    const event: AnalyticsEvent = {
      name: eventName,
      properties: {
        ...properties,
        sessionId: this.sessionId,
        url: window.location.href,
        referrer: document.referrer,
        timestamp: new Date().toISOString(),
      },
      userId: this.userId || undefined,
      timestamp: new Date(),
    };

    this.queue.push(event);
    this.log('Event queued:', event);

    // Auto-flush if queue is full
    if (this.queue.length >= this.config.batchSize) {
      this.flush();
    }
  }

  page(pageName?: string, properties: Record<string, any> = {}) {
    this.track('page_view', {
      page: pageName || window.location.pathname,
      title: document.title,
      ...properties,
    });
  }

  identify(userId: string, properties: Record<string, any> = {}) {
    this.setUserId(userId);
    this.track('identify', {
      userId,
      ...properties,
    });
  }

  async flush(sync = false) {
    if (this.queue.length === 0) return;

    const events = this.queue.splice(0);
    this.log(`Flushing ${events.length} events`, events);

    try {
      const response = await fetch(`${this.config.apiEndpoint}/api/analytics/track/event`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.config.apiKey && { 'Authorization': `Bearer ${this.config.apiKey}` }),
        },
        body: JSON.stringify({
          events,
          batch: true,
        }),
        ...(sync && { keepalive: true }),
      });

      if (!response.ok) {
        throw new Error(`Analytics API error: ${response.status}`);
      }

      this.log('Events flushed successfully');
    } catch (error) {
      this.log('Failed to flush events:', error);
      // Re-add events to queue for retry (but limit retry queue size)
      if (this.queue.length < 100) {
        this.queue.unshift(...events);
      }
    }
  }

  // Convenience methods for common events
  trackClick(element: string, properties: Record<string, any> = {}) {
    this.track('click', {
      element,
      ...properties,
    });
  }

  trackForm(action: 'submit' | 'focus' | 'error', formName: string, properties: Record<string, any> = {}) {
    this.track('form', {
      action,
      form: formName,
      ...properties,
    });
  }

  trackSearch(query: string, results?: number, properties: Record<string, any> = {}) {
    this.track('search', {
      query,
      results,
      ...properties,
    });
  }

  trackReservation(action: 'start' | 'complete' | 'cancel', properties: Record<string, any> = {}) {
    this.track('reservation', {
      action,
      ...properties,
    });
  }

  trackError(error: Error | string, properties: Record<string, any> = {}) {
    this.track('error', {
      error: typeof error === 'string' ? error : error.message,
      stack: error instanceof Error ? error.stack : undefined,
      ...properties,
    });
  }

  trackPerformance(metric: string, value: number, properties: Record<string, any> = {}) {
    this.track('performance', {
      metric,
      value,
      ...properties,
    });
  }

  // A/B Testing
  trackExperiment(experimentId: string, variant: string, properties: Record<string, any> = {}) {
    this.track('experiment', {
      experimentId,
      variant,
      ...properties,
    });
  }

  // Business Events
  trackBusinessEvent(event: string, properties: Record<string, any> = {}) {
    this.track('business_event', {
      event,
      ...properties,
    });
  }

  destroy() {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
    this.flush(true);
    this.isInitialized = false;
  }
}

// Create singleton instance
export const analytics = new AnalyticsClient();

// React hook for analytics
import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';

export function useAnalytics(userId?: string) {
  const pathname = usePathname();
  const previousPathname = useRef<string>();

  useEffect(() => {
    if (userId) {
      analytics.setUserId(userId);
    }
  }, [userId]);

  useEffect(() => {
    // Track page view when pathname changes
    if (pathname && previousPathname.current !== pathname) {
      analytics.page(pathname);
      previousPathname.current = pathname;
    }
  }, [pathname]);

  return {
    track: analytics.track.bind(analytics),
    page: analytics.page.bind(analytics),
    identify: analytics.identify.bind(analytics),
    trackClick: analytics.trackClick.bind(analytics),
    trackForm: analytics.trackForm.bind(analytics),
    trackSearch: analytics.trackSearch.bind(analytics),
    trackReservation: analytics.trackReservation.bind(analytics),
    trackError: analytics.trackError.bind(analytics),
    trackPerformance: analytics.trackPerformance.bind(analytics),
    trackExperiment: analytics.trackExperiment.bind(analytics),
    trackBusinessEvent: analytics.trackBusinessEvent.bind(analytics),
  };
}

// Auto-track common events
if (typeof window !== 'undefined') {
  // Track clicks on important elements
  document.addEventListener('click', (event) => {
    const target = event.target as HTMLElement;
    
    // Track button clicks
    if (target.tagName === 'BUTTON' || target.role === 'button') {
      analytics.trackClick('button', {
        text: target.textContent?.trim(),
        className: target.className,
      });
    }
    
    // Track link clicks
    if (target.tagName === 'A' || target.closest('a')) {
      const link = target.tagName === 'A' ? target : target.closest('a');
      analytics.trackClick('link', {
        href: link?.getAttribute('href'),
        text: link?.textContent?.trim(),
      });
    }
  });

  // Track form submissions
  document.addEventListener('submit', (event) => {
    const form = event.target as HTMLFormElement;
    analytics.trackForm('submit', form.name || form.id || 'unnamed', {
      action: form.action,
      method: form.method,
    });
  });

  // Track JavaScript errors
  window.addEventListener('error', (event) => {
    analytics.trackError(event.error || event.message, {
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
    });
  });

  // Track unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    analytics.trackError(`Unhandled Promise Rejection: ${event.reason}`, {
      type: 'unhandledrejection',
    });
  });

  // Track performance metrics
  window.addEventListener('load', () => {
    if ('performance' in window) {
      const perfData = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      
      analytics.trackPerformance('page_load_time', perfData.loadEventEnd - perfData.fetchStart, {
        dns: perfData.domainLookupEnd - perfData.domainLookupStart,
        tcp: perfData.connectEnd - perfData.connectStart,
        request: perfData.responseStart - perfData.requestStart,
        response: perfData.responseEnd - perfData.responseStart,
        dom: perfData.domContentLoadedEventEnd - perfData.domContentLoadedEventStart,
      });
    }
  });
}

export default analytics;