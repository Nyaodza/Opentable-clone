// Web Vitals and Performance Monitoring
import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals';

export interface PerformanceMetric {
  name: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  delta: number;
  id: string;
  navigationType: string;
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private initialized = false;

  init() {
    if (this.initialized || typeof window === 'undefined') return;
    
    this.initialized = true;
    
    // Collect Core Web Vitals
    getCLS(this.onPerfEntry);
    getFID(this.onPerfEntry);
    getFCP(this.onPerfEntry);
    getLCP(this.onPerfEntry);
    getTTFB(this.onPerfEntry);

    // Monitor resource loading
    this.monitorResourceTiming();
    
    // Monitor long tasks
    this.monitorLongTasks();

    // Monitor navigation timing
    this.monitorNavigationTiming();
  }

  private onPerfEntry = (metric: any) => {
    const perfMetric: PerformanceMetric = {
      name: metric.name,
      value: Math.round(metric.value),
      rating: metric.rating,
      delta: Math.round(metric.delta),
      id: metric.id,
      navigationType: metric.navigationType || 'unknown',
    };

    this.metrics.push(perfMetric);
    
    // Send to analytics
    this.sendMetric(perfMetric);
    
    // Log critical metrics
    if (perfMetric.rating === 'poor') {
      console.warn(`Poor ${perfMetric.name} performance:`, perfMetric.value);
    }
  };

  private monitorResourceTiming() {
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          if (entry.entryType === 'resource') {
            const resourceEntry = entry as PerformanceResourceTiming;
            
            // Monitor slow resources
            if (resourceEntry.duration > 1000) {
              console.warn(`Slow resource detected: ${resourceEntry.name} took ${resourceEntry.duration}ms`);
              
              this.sendEvent('slow_resource', {
                resource_name: resourceEntry.name,
                duration: resourceEntry.duration,
                size: resourceEntry.transferSize,
              });
            }
          }
        });
      });

      observer.observe({ entryTypes: ['resource'] });
    }
  }

  private monitorLongTasks() {
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          if (entry.entryType === 'longtask') {
            console.warn(`Long task detected: ${entry.duration}ms`);
            
            this.sendEvent('long_task', {
              duration: entry.duration,
              start_time: entry.startTime,
            });
          }
        });
      });

      try {
        observer.observe({ entryTypes: ['longtask'] });
      } catch (e) {
        // Long task API not supported
        console.info('Long task monitoring not supported');
      }
    }
  }

  private monitorNavigationTiming() {
    if ('performance' in window && 'navigation' in performance) {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      
      if (navigation) {
        const metrics = {
          dns_lookup: navigation.domainLookupEnd - navigation.domainLookupStart,
          tcp_connection: navigation.connectEnd - navigation.connectStart,
          ssl_negotiation: navigation.secureConnectionStart > 0 ? 
            navigation.connectEnd - navigation.secureConnectionStart : 0,
          server_response: navigation.responseEnd - navigation.requestStart,
          dom_processing: navigation.domContentLoadedEventStart - navigation.responseEnd,
          resource_loading: navigation.loadEventStart - navigation.domContentLoadedEventStart,
        };

        Object.entries(metrics).forEach(([name, value]) => {
          if (value > 0) {
            this.sendEvent('navigation_timing', {
              metric_name: name,
              value: Math.round(value),
            });
          }
        });
      }
    }
  }

  private sendMetric(metric: PerformanceMetric) {
    // Send to Google Analytics 4
    if (typeof gtag !== 'undefined') {
      gtag('event', 'web_vitals', {
        event_category: 'Performance',
        event_label: metric.name,
        value: metric.value,
        custom_parameter_rating: metric.rating,
      });
    }

    // Send to custom analytics endpoint
    this.sendToAnalytics('web_vital', metric);
  }

  private sendEvent(eventName: string, eventData: object) {
    // Send to Google Analytics 4
    if (typeof gtag !== 'undefined') {
      gtag('event', eventName, {
        event_category: 'Performance',
        ...eventData,
      });
    }

    // Send to custom analytics endpoint
    this.sendToAnalytics(eventName, eventData);
  }

  private async sendToAnalytics(eventName: string, data: object) {
    try {
      if (navigator.sendBeacon) {
        const payload = JSON.stringify({
          event: eventName,
          data,
          timestamp: Date.now(),
          url: window.location.href,
          userAgent: navigator.userAgent,
        });

        navigator.sendBeacon('/api/analytics/performance', payload);
      } else {
        // Fallback to fetch
        fetch('/api/analytics/performance', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            event: eventName,
            data,
            timestamp: Date.now(),
            url: window.location.href,
            userAgent: navigator.userAgent,
          }),
        }).catch(() => {
          // Fail silently for analytics
        });
      }
    } catch (error) {
      // Fail silently for analytics
    }
  }

  getMetrics(): PerformanceMetric[] {
    return [...this.metrics];
  }

  getMetricsByName(name: string): PerformanceMetric[] {
    return this.metrics.filter(metric => metric.name === name);
  }

  getAverageMetric(name: string): number | null {
    const metrics = this.getMetricsByName(name);
    if (metrics.length === 0) return null;
    
    const sum = metrics.reduce((acc, metric) => acc + metric.value, 0);
    return sum / metrics.length;
  }

  getPerformanceScore(): number {
    const lcpMetric = this.getMetricsByName('LCP')[0];
    const fidMetric = this.getMetricsByName('FID')[0];
    const clsMetric = this.getMetricsByName('CLS')[0];

    if (!lcpMetric && !fidMetric && !clsMetric) return 0;

    let score = 0;
    let count = 0;

    // LCP scoring (0-100)
    if (lcpMetric) {
      if (lcpMetric.value <= 2500) score += 100;
      else if (lcpMetric.value <= 4000) score += 50;
      else score += 0;
      count++;
    }

    // FID scoring (0-100)  
    if (fidMetric) {
      if (fidMetric.value <= 100) score += 100;
      else if (fidMetric.value <= 300) score += 50;
      else score += 0;
      count++;
    }

    // CLS scoring (0-100)
    if (clsMetric) {
      if (clsMetric.value <= 0.1) score += 100;
      else if (clsMetric.value <= 0.25) score += 50;
      else score += 0;
      count++;
    }

    return count > 0 ? Math.round(score / count) : 0;
  }
}

// Global performance monitor instance
export const performanceMonitor = new PerformanceMonitor();

// Initialize performance monitoring
export function initPerformanceMonitoring() {
  if (typeof window !== 'undefined') {
    performanceMonitor.init();
  }
}

// Export utility functions
export function trackCustomMetric(name: string, value: number, unit?: string) {
  performanceMonitor.sendEvent('custom_metric', {
    metric_name: name,
    value,
    unit: unit || 'ms',
  });
}

export function trackUserTiming(name: string, startMark?: string, endMark?: string) {
  if (typeof performance !== 'undefined' && performance.mark && performance.measure) {
    try {
      if (startMark && endMark) {
        performance.measure(name, startMark, endMark);
      }
      
      const measures = performance.getEntriesByName(name, 'measure');
      if (measures.length > 0) {
        const measure = measures[measures.length - 1];
        trackCustomMetric(name, measure.duration);
      }
    } catch (error) {
      console.warn('User timing measurement failed:', error);
    }
  }
}

// Declare gtag for TypeScript
declare global {
  function gtag(...args: any[]): void;
}
