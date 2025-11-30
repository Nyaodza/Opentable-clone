'use client';

import { useEffect } from 'react';
import { initWebVitals } from '@/lib/web-vitals';

/**
 * Client component for initializing Core Web Vitals tracking
 * Must be 'use client' directive for useEffect hook
 */
export function WebVitalsTracker() {
  useEffect(() => {
    // Initialize tracking on mount
    initWebVitals();
  }, []);

  // This component doesn't render anything
  return null;
}
