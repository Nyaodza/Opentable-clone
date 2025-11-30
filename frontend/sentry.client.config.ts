/**
 * Sentry Client Configuration
 * Monitors errors and performance in the browser
 */

import * as Sentry from '@sentry/nextjs';

const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN;
const ENVIRONMENT = process.env.NEXT_PUBLIC_ENVIRONMENT || 'development';

Sentry.init({
  dsn: SENTRY_DSN,
  
  // Environment configuration
  environment: ENVIRONMENT,
  
  // Performance monitoring
  tracesSampleRate: ENVIRONMENT === 'production' ? 0.1 : 1.0,
  
  // Error sampling
  sampleRate: 1.0, // Capture 100% of errors
  
  // Release tracking
  release: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA || 'development',
  
  // Enable debug mode in development
  debug: ENVIRONMENT === 'development',
  
  // Integrations
  integrations: [
    // Web Vitals monitoring
    new Sentry.BrowserTracing({
      tracePropagationTargets: [
        'localhost',
        /^https:\/\/[^/]*\.yourdomain\.com/,
      ],
    }),
    
    // Replay for debugging
    new Sentry.Replay({
      maskAllText: true,
      blockAllMedia: true,
      sampleRate: 0.1, // 10% of sessions
      errorSampleRate: 1.0, // 100% of error sessions
    }),
  ],
  
  // Configure which errors to ignore
  ignoreErrors: [
    // Browser extensions
    'top.GLOBALS',
    // Random plugins/extensions
    'originalCreateNotification',
    'canvas.contentDocument',
    'MyApp_RemoveAllHighlights',
    'http://tt.epicplay.com',
    "Can't find variable: ZiteReader",
    'jigsaw is not defined',
    'ComboSearch is not defined',
    // Facebook blocking
    'fb_xd_fragment',
    // ISP optimizing injections
    'bmi_SafeAddOnload',
    'EBCallBackMessageReceived',
    // Network errors
    'NetworkError',
    'Non-Error promise rejection captured',
  ],
  
  // Before send hook for filtering/modifying events
  beforeSend(event, hint) {
    // Don't send events if user hasn't consented to analytics
    if (typeof window !== 'undefined') {
      const cookieConsent = localStorage.getItem('otc_cookie_preferences');
      if (cookieConsent) {
        const preferences = JSON.parse(cookieConsent);
        if (!preferences.analytics) {
          return null; // Don't send event
        }
      }
    }
    
    // Filter out common development errors
    if (ENVIRONMENT === 'development') {
      console.log('[Sentry] Error captured:', event);
    }
    
    return event;
  },
  
  // Breadcrumb filtering
  beforeBreadcrumb(breadcrumb, hint) {
    // Filter out noisy breadcrumbs
    if (breadcrumb.category === 'console') {
      return null;
    }
    
    return breadcrumb;
  },
});
