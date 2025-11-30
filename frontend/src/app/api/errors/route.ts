import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/route';

interface ErrorLogData {
  message: string;
  stack?: string;
  componentStack?: string;
  timestamp: string;
  userAgent: string;
  url: string;
  userId?: string;
  sessionId?: string;
  level?: 'error' | 'warn' | 'info';
  context?: Record<string, any>;
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const errorData: ErrorLogData = await request.json();

    // Basic validation
    if (!errorData.message || !errorData.timestamp) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Sanitize data
    const sanitizedError = {
      message: String(errorData.message).slice(0, 1000),
      stack: errorData.stack ? String(errorData.stack).slice(0, 5000) : undefined,
      componentStack: errorData.componentStack ? String(errorData.componentStack).slice(0, 5000) : undefined,
      timestamp: errorData.timestamp,
      userAgent: String(errorData.userAgent).slice(0, 500),
      url: String(errorData.url).slice(0, 500),
      userId: session?.user?.id || 'anonymous',
      sessionId: session?.user?.id ? `session_${Date.now()}` : undefined,
      level: errorData.level || 'error',
      context: errorData.context || {},
    };

    // In production, you would send this to your logging service
    // Examples: Sentry, LogRocket, DataDog, Elasticsearch, etc.
    if (process.env.NODE_ENV === 'production') {
      await logToExternalService(sanitizedError);
    } else {
      // In development, just log to console with formatting
      console.group(`🚨 Frontend Error Report [${sanitizedError.level.toUpperCase()}]`);
      console.log('Message:', sanitizedError.message);
      console.log('URL:', sanitizedError.url);
      console.log('User:', sanitizedError.userId);
      console.log('Timestamp:', sanitizedError.timestamp);
      if (sanitizedError.stack) {
        console.log('Stack Trace:', sanitizedError.stack);
      }
      if (sanitizedError.componentStack) {
        console.log('Component Stack:', sanitizedError.componentStack);
      }
      if (Object.keys(sanitizedError.context).length > 0) {
        console.log('Context:', sanitizedError.context);
      }
      console.groupEnd();
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    // Fail silently to prevent error logging loops
    if (process.env.NODE_ENV === 'development') {
      console.error('Error logging failed:', error);
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function logToExternalService(errorData: ErrorLogData) {
  // Example integrations - uncomment and configure as needed
  
  // Sentry integration
  // if (process.env.SENTRY_DSN) {
  //   // Import and use @sentry/node
  //   console.log('Would log to Sentry:', errorData);
  // }

  // Custom logging endpoint
  // if (process.env.LOGGING_ENDPOINT) {
  //   await fetch(process.env.LOGGING_ENDPOINT, {
  //     method: 'POST',
  //     headers: {
  //       'Content-Type': 'application/json',
  //       'Authorization': `Bearer ${process.env.LOGGING_API_KEY}`,
  //     },
  //     body: JSON.stringify(errorData),
  //   });
  // }

  // Database logging
  // if (process.env.DATABASE_URL) {
  //   // Store in database table
  //   console.log('Would log to database:', errorData);
  // }

  // Email alerts for critical errors
  // if (errorData.level === 'error' && process.env.ALERT_EMAIL) {
  //   // Send email alert
  //   console.log('Would send email alert for critical error');
  // }
  
  // For now, just log to console in production too
  console.error('Production Error:', errorData);
}

// Health check endpoint
export async function GET() {
  return NextResponse.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'error-logging',
  });
}