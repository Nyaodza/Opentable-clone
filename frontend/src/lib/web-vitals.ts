/**
 * Core Web Vitals Tracking
 * Monitors LCP, FID, CLS, TTFB, and INP for performance optimization
 */

import { onCLS, onFID, onLCP, onTTFB, onINP, Metric } from 'web-vitals';
import { isCookieAllowed } from '@/components/common/cookie-consent';

interface AnalyticsEvent {
  name: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  delta: number;
  id: string;
  navigationType: string;
}

// Send metrics to analytics service (Google Analytics 4 format)
function sendToAnalytics(metric: Metric) {
  // Only send if analytics cookies are allowed
  if (!isCookieAllowed('analytics')) {
    console.log('[Web Vitals] Analytics disabled by cookie preferences');
    return;
  }

  const body: AnalyticsEvent = {
    name: metric.name,
    value: metric.value,
    rating: metric.rating,
    delta: metric.delta,
    id: metric.id,
    navigationType: metric.navigationType,
  };

  // Send to Google Analytics if available
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', metric.name, {
      value: Math.round(metric.name === 'CLS' ? metric.value * 1000 : metric.value),
      metric_id: metric.id,
      metric_value: metric.value,
      metric_delta: metric.delta,
      metric_rating: metric.rating,
    });
  }

  // Also send to custom analytics endpoint
  if (process.env.NEXT_PUBLIC_ANALYTICS_ENDPOINT) {
    navigator.sendBeacon(
      process.env.NEXT_PUBLIC_ANALYTICS_ENDPOINT,
      JSON.stringify(body)
    );
  }

  // Log to console in development
  if (process.env.NODE_ENV === 'development') {
    console.log('[Web Vitals]', metric.name, {
      value: metric.value,
      rating: metric.rating,
      navigationType: metric.navigationType,
    });
  }
}

// Performance budget thresholds
export const PERFORMANCE_BUDGETS = {
  LCP: { good: 2500, needsImprovement: 4000 }, // Largest Contentful Paint
  FID: { good: 100, needsImprovement: 300 },   // First Input Delay
  CLS: { good: 0.1, needsImprovement: 0.25 },  // Cumulative Layout Shift
  TTFB: { good: 800, needsImprovement: 1800 }, // Time to First Byte
  INP: { good: 200, needsImprovement: 500 },   // Interaction to Next Paint
};

// Initialize Web Vitals tracking
export function initWebVitals() {
  if (typeof window === 'undefined') return;

  try {
    // Track Largest Contentful Paint
    onLCP((metric) => {
      sendToAnalytics(metric);
      
      // Alert if LCP exceeds budget
      if (metric.value > PERFORMANCE_BUDGETS.LCP.needsImprovement) {
        console.warn(
          `[Performance] LCP exceeds budget: ${metric.value}ms > ${PERFORMANCE_BUDGETS.LCP.needsImprovement}ms`
        );
      }
    });

    // Track First Input Delay
    onFID((metric) => {
      sendToAnalytics(metric);
      
      if (metric.value > PERFORMANCE_BUDGETS.FID.needsImprovement) {
        console.warn(
          `[Performance] FID exceeds budget: ${metric.value}ms > ${PERFORMANCE_BUDGETS.FID.needsImprovement}ms`
        );
      }
    });

    // Track Cumulative Layout Shift
    onCLS((metric) => {
      sendToAnalytics(metric);
      
      if (metric.value > PERFORMANCE_BUDGETS.CLS.needsImprovement) {
        console.warn(
          `[Performance] CLS exceeds budget: ${metric.value} > ${PERFORMANCE_BUDGETS.CLS.needsImprovement}`
        );
      }
    });

    // Track Time to First Byte
    onTTFB((metric) => {
      sendToAnalytics(metric);
      
      if (metric.value > PERFORMANCE_BUDGETS.TTFB.needsImprovement) {
        console.warn(
          `[Performance] TTFB exceeds budget: ${metric.value}ms > ${PERFORMANCE_BUDGETS.TTFB.needsImprovement}ms`
        );
      }
    });

    // Track Interaction to Next Paint (Chrome 96+)
    onINP((metric) => {
      sendToAnalytics(metric);
      
      if (metric.value > PERFORMANCE_BUDGETS.INP.needsImprovement) {
        console.warn(
          `[Performance] INP exceeds budget: ${metric.value}ms > ${PERFORMANCE_BUDGETS.INP.needsImprovement}ms`
        );
      }
    });

    console.log('[Web Vitals] Tracking initialized');
  } catch (error) {
    console.error('[Web Vitals] Initialization error:', error);
  }
}

// Get current page performance summary
export function getPerformanceSummary() {
  if (typeof window === 'undefined') return null;

  const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
  const paint = performance.getEntriesByType('paint');

  return {
    // Navigation timing
    dns: navigation?.domainLookupEnd - navigation?.domainLookupStart,
    tcp: navigation?.connectEnd - navigation?.connectStart,
    ttfb: navigation?.responseStart - navigation?.requestStart,
    download: navigation?.responseEnd - navigation?.responseStart,
    domInteractive: navigation?.domInteractive,
    domComplete: navigation?.domComplete,
    loadComplete: navigation?.loadEventEnd,
    
    // Paint timing
    firstPaint: paint.find(p => p.name === 'first-paint')?.startTime,
    firstContentfulPaint: paint.find(p => p.name === 'first-contentful-paint')?.startTime,
    
    // Resource timing summary
    resources: performance.getEntriesByType('resource').length,
  };
}

// Report page load performance
export function reportPageLoad(pageName: string) {
  if (typeof window === 'undefined') return;

  setTimeout(() => {
    const summary = getPerformanceSummary();
    
    if (summary && isCookieAllowed('analytics')) {
      // Send to analytics
      if (window.gtag) {
        window.gtag('event', 'page_performance', {
          page_name: pageName,
          ttfb: summary.ttfb,
          dom_interactive: summary.domInteractive,
          dom_complete: summary.domComplete,
          load_complete: summary.loadComplete,
          first_contentful_paint: summary.firstContentfulPaint,
        });
      }
    }

    // Log in development
    if (process.env.NODE_ENV === 'development') {
      console.log('[Performance Summary]', pageName, summary);
    }
  }, 0);
}

// TypeScript declarations
declare global {
  interface Window {
    gtag: (...args: any[]) => void;
  }
}

export {};
