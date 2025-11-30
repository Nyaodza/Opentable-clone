/**
 * Sentry Server Configuration  
 * Monitors errors and performance on the server/API routes
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
  sampleRate: 1.0,
  
  // Release tracking
  release: process.env.VERCEL_GIT_COMMIT_SHA || 'development',
  
  // Enable debug mode in development
  debug: ENVIRONMENT === 'development',
  
  // Server-specific configuration
  integrations: [
    new Sentry.Integrations.Http({ tracing: true }),
  ],
  
  // Before send hook
  beforeSend(event) {
    // Add server-specific context
    if (event.request) {
      // Remove sensitive headers
      if (event.request.headers) {
        delete event.request.headers['authorization'];
        delete event.request.headers['cookie'];
        delete event.request.headers['x-api-key'];
      }
    }
    
    // Log in development
    if (ENVIRONMENT === 'development') {
      console.log('[Sentry Server] Error captured:', event.exception);
    }
    
    return event;
  },
});
