// Simplified Error monitoring system
interface ErrorDetails {
  message: string;
  stack?: string;
  url: string;
  userAgent: string;
  timestamp: number;
  userId?: string;
  sessionId?: string;
  component?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

class SimpleErrorMonitor {
  private apiEndpoint = '/api/errors';
  private queue: ErrorDetails[] = [];

  constructor() {
    if (typeof window !== 'undefined') {
      this.setupEventListeners();
    }
  }

  private setupEventListeners() {
    // Global error handler
    window.addEventListener('error', (event) => {
      this.captureError({
        message: event.message,
        stack: event.error?.stack,
        url: event.filename || window.location.href,
        userAgent: navigator.userAgent,
        timestamp: Date.now(),
        severity: this.determineSeverity(event.error),
      });
    });

    // Unhandled promise rejection handler
    window.addEventListener('unhandledrejection', (event) => {
      this.captureError({
        message: `Unhandled Promise Rejection: ${event.reason}`,
        stack: event.reason?.stack,
        url: window.location.href,
        userAgent: navigator.userAgent,
        timestamp: Date.now(),
        severity: 'high',
      });
    });
  }

  private determineSeverity(error: Error): ErrorDetails['severity'] {
    if (!error) return 'low';
    
    const message = error.message?.toLowerCase() || '';
    
    // Critical errors
    if (message.includes('payment') || message.includes('security') || message.includes('auth')) {
      return 'critical';
    }

    // High severity errors
    if (message.includes('network') || message.includes('fetch') || message.includes('api')) {
      return 'high';
    }

    // Medium severity errors
    if (message.includes('validation') || message.includes('form')) {
      return 'medium';
    }

    return 'low';
  }

  public captureError(error: Partial<ErrorDetails>) {
    const fullError: ErrorDetails = {
      message: 'Unknown error',
      url: typeof window !== 'undefined' ? window.location.href : '',
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
      timestamp: Date.now(),
      severity: 'medium',
      ...error,
    };

    this.queue.push(fullError);

    // Send immediately for critical errors
    if (fullError.severity === 'critical') {
      this.sendErrors();
    }

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Error captured:', fullError);
    }
  }

  private async sendErrors() {
    if (this.queue.length === 0) return;

    const errors = [...this.queue];
    this.queue = [];

    try {
      await fetch(this.apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ errors }),
      });
    } catch (error) {
      // Re-queue errors if sending failed
      this.queue.unshift(...errors);
      console.warn('Failed to send error data:', error);
    }
  }

  public captureMessage(message: string, severity: ErrorDetails['severity'] = 'medium') {
    this.captureError({ message, severity });
  }

  public captureException(error: Error) {
    this.captureError({
      message: error.message,
      stack: error.stack,
      severity: this.determineSeverity(error),
    });
  }
}

// Global instance
export const errorMonitor = new SimpleErrorMonitor();

// Utility hooks
export function useErrorHandler() {
  return {
    captureError: errorMonitor.captureError.bind(errorMonitor),
    captureException: errorMonitor.captureException.bind(errorMonitor),
    captureMessage: errorMonitor.captureMessage.bind(errorMonitor),
  };
}

// Initialize error monitoring
export function initErrorMonitoring() {
  if (typeof window !== 'undefined') {
    console.log('Error monitoring initialized');
  }
}
