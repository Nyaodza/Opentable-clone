// Error monitoring and alerting system
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
  tags?: Record<string, string>;
  extra?: Record<string, any>;
}

interface APIError extends ErrorDetails {
  endpoint: string;
  method: string;
  statusCode?: number;
  responseTime?: number;
}

class ErrorMonitor {
  private apiEndpoint = '/api/errors';
  private maxRetries = 3;
  private queue: ErrorDetails[] = [];
  private isOnline = true;

  constructor() {
    if (typeof window !== 'undefined') {
      this.setupEventListeners();
      this.setupPeriodicFlush();
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
        component: this.extractComponentFromStack(event.error?.stack),
        extra: {
          lineno: event.lineno,
          colno: event.colno,
          type: 'javascript',
        },
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
        extra: {
          type: 'promise_rejection',
          reason: event.reason,
        },
      });
    });

    // Network status monitoring
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.flushQueue();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
    });

    // React error boundary integration
    window.addEventListener('react-error', ((event: CustomEvent) => {
      this.captureError({
        message: event.detail.message,
        stack: event.detail.stack,
        url: window.location.href,
        userAgent: navigator.userAgent,
        timestamp: Date.now(),
        severity: 'high',
        component: event.detail.component,
        extra: {
          type: 'react_error',
          props: event.detail.props,
          state: event.detail.state,
        },
      });
    }) as EventListener);
  }

  private setupPeriodicFlush() {
    // Flush errors every 30 seconds
    setInterval(() => {
      if (this.queue.length > 0) {
        this.flushQueue();
      }
    }, 30000);

    // Flush on page unload
    window.addEventListener('beforeunload', () => {
      this.flushQueue(true);
    });
  }

  private determineSeverity(error: Error): ErrorDetails['severity'] {
    if (!error) return 'low';
    
    const message = error.message?.toLowerCase() || '';
    const stack = error.stack?.toLowerCase() || '';

    // Critical errors
    if (
      message.includes('payment') ||
      message.includes('security') ||
      message.includes('auth') ||
      stack.includes('stripe') ||
      stack.includes('nextauth')
    ) {
      return 'critical';
    }

    // High severity errors
    if (
      message.includes('network') ||
      message.includes('fetch') ||
      message.includes('api') ||
      message.includes('database') ||
      stack.includes('reservation') ||
      stack.includes('restaurant')
    ) {
      return 'high';
    }

    // Medium severity errors
    if (
      message.includes('validation') ||
      message.includes('form') ||
      message.includes('ui') ||
      stack.includes('component')
    ) {
      return 'medium';
    }

    return 'low';
  }

  private extractComponentFromStack(stack?: string): string | undefined {
    if (!stack) return undefined;

    // Extract React component name from stack trace
    const componentMatch = stack.match(/at (\w+)\s+\(/);
    if (componentMatch && componentMatch[1]) {
      return componentMatch[1];
    }

    // Extract file name as fallback
    const fileMatch = stack.match(/\/([^\/]+)\.(tsx?|jsx?):/);
    if (fileMatch && fileMatch[1]) {
      return fileMatch[1];
    }

    return undefined;
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

    // Add user context if available
    const userId = this.getCurrentUserId();
    if (userId) {
      fullError.userId = userId;
    }

    // Add session ID
    fullError.sessionId = this.getSessionId();

    // Add to queue
    this.queue.push(fullError);

    // Send immediately for critical errors
    if (fullError.severity === 'critical') {
      this.flushQueue(true);
    }

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Error captured:', fullError);
    }
  }

  public captureAPIError(error: Partial<APIError>) {
    this.captureError({
      ...error,
      tags: {
        type: 'api_error',
        ...error.tags,
      },
    });
  }

  private async flushQueue(immediate = false) {
    if (this.queue.length === 0 || (!this.isOnline && !immediate)) {
      return;
    }

    const errors = [...this.queue];
    this.queue = [];

    try {
      if (immediate && navigator.sendBeacon) {
        // Use sendBeacon for immediate sending (e.g., on page unload)
        navigator.sendBeacon(
          this.apiEndpoint,
          JSON.stringify({ errors })
        );
      } else {
        // Use fetch for regular sending
        await this.sendErrors(errors);
      }
    } catch (error) {
      // Re-queue errors if sending failed
      this.queue.unshift(...errors);
      console.warn('Failed to send error data:', error);
    }
  }

  private async sendErrors(errors: ErrorDetails[], retryCount = 0): Promise<void> {
    try {
      const response = await fetch(this.apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ errors }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      if (retryCount < this.maxRetries) {
        // Exponential backoff
        const delay = Math.pow(2, retryCount) * 1000;
        setTimeout(() => {
          this.sendErrors(errors, retryCount + 1);
        }, delay);
      } else {
        throw error;
      }
    }
  }

  private getCurrentUserId(): string | undefined {
    // Try to get user ID from various sources
    try {
      // From session storage
      const sessionUser = sessionStorage.getItem('user');
      if (sessionUser) {
        const user = JSON.parse(sessionUser);
        return user.id;
      }

      // From local storage
      const localUser = localStorage.getItem('user');
      if (localUser) {
        const user = JSON.parse(localUser);
        return user.id;
      }

      // From cookie (NextAuth)
      const cookies = document.cookie.split(';');
      const sessionCookie = cookies.find(c => c.trim().startsWith('next-auth.session-token='));
      if (sessionCookie) {
        // In a real app, you'd decode the JWT to get user ID
        return 'authenticated_user';
      }
    } catch {
      // Ignore errors getting user ID
    }

    return undefined;
  }

  private getSessionId(): string {
    let sessionId = sessionStorage.getItem('error-monitor-session-id');
    if (!sessionId) {
      sessionId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem('error-monitor-session-id', sessionId);
    }
    return sessionId;
  }

  // Public methods for manual error reporting
  public captureMessage(message: string, severity: ErrorDetails['severity'] = 'medium', extra?: Record<string, any>) {
    this.captureError({
      message,
      severity,
      extra,
    });
  }

  public captureException(error: Error, extra?: Record<string, any>) {
    this.captureError({
      message: error.message,
      stack: error.stack,
      severity: this.determineSeverity(error),
      extra,
    });
  }

  public addBreadcrumb(message: string, data?: Record<string, any>) {
    // Store breadcrumbs for context in future errors
    const breadcrumbs = JSON.parse(sessionStorage.getItem('error-breadcrumbs') || '[]');
    breadcrumbs.push({
      message,
      timestamp: Date.now(),
      data,
    });

    // Keep only last 50 breadcrumbs
    if (breadcrumbs.length > 50) {
      breadcrumbs.shift();
    }

    sessionStorage.setItem('error-breadcrumbs', JSON.stringify(breadcrumbs));
  }

  public setUserContext(userId: string, email?: string, additionalData?: Record<string, any>) {
    sessionStorage.setItem('user-context', JSON.stringify({
      userId,
      email,
      ...additionalData,
      timestamp: Date.now(),
    }));
  }

  public setTag(key: string, value: string) {
    const tags = JSON.parse(sessionStorage.getItem('error-tags') || '{}');
    tags[key] = value;
    sessionStorage.setItem('error-tags', JSON.stringify(tags));
  }
}

// Global instance
export const errorMonitor = new ErrorMonitor();

// Utility hooks
export function useErrorHandler() {
  return {
    captureError: errorMonitor.captureError.bind(errorMonitor),
    captureException: errorMonitor.captureException.bind(errorMonitor),
    captureMessage: errorMonitor.captureMessage.bind(errorMonitor),
    addBreadcrumb: errorMonitor.addBreadcrumb.bind(errorMonitor),
  };
}

// React Error Boundary component
interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<
  { 
    children: React.ReactNode;
    fallback?: React.ComponentType<{ error: Error; resetError: () => void }>;
  },
  ErrorBoundaryState
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Send error to monitoring system
    if (typeof window !== 'undefined') {
      const event = new CustomEvent('react-error', {
        detail: {
          message: error.message,
          stack: error.stack,
          component: errorInfo.componentStack,
          errorBoundary: this.constructor.name,
        },
      });
      window.dispatchEvent(event);
    }
  }

  render() {
    if (this.state.hasError && this.state.error) {
      if (this.props.fallback) {
        const FallbackComponent = this.props.fallback;
        return (
          <FallbackComponent 
            error={this.state.error} 
            resetError={() => this.setState({ hasError: false, error: null })}
          />
        );
      }

      // Default fallback
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-6">
            <div className="flex items-center mb-4">
              <div className="flex-shrink-0">
                <svg className="h-8 w-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-gray-800">
                  Something went wrong
                </h3>
              </div>
            </div>
            <div className="text-sm text-gray-600 mb-4">
              We've encountered an unexpected error. Our team has been notified and is working on a fix.
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => window.location.reload()}
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                Reload Page
              </button>
              <button
                onClick={() => this.setState({ hasError: false, error: null })}
                className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Utility hooks
export function useErrorHandler() {
  return {
    captureError: errorMonitor.captureError.bind(errorMonitor),
    captureException: errorMonitor.captureException.bind(errorMonitor),
    captureMessage: errorMonitor.captureMessage.bind(errorMonitor),
    addBreadcrumb: errorMonitor.addBreadcrumb.bind(errorMonitor),
  };
}
