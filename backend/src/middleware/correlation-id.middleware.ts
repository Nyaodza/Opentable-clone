/**
 * Correlation ID Middleware
 * Adds request tracing across all services
 */

import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { 
  runWithContext, 
  parseContextFromHeaders,
  getContext,
  RequestContext 
} from '../utils/async-context';
import { logInfo } from '../utils/logger';

/**
 * Correlation ID header names
 */
export const CORRELATION_HEADERS = {
  CORRELATION_ID: 'X-Correlation-ID',
  REQUEST_ID: 'X-Request-ID',
  TRACE_ID: 'X-Trace-ID',
  SPAN_ID: 'X-Span-ID',
  PARENT_SPAN_ID: 'X-Parent-Span-ID',
} as const;

/**
 * Extend Express Request to include context
 */
declare global {
  namespace Express {
    interface Request {
      correlationId: string;
      requestId: string;
      context: RequestContext;
    }
  }
}

/**
 * Options for correlation ID middleware
 */
export interface CorrelationIdOptions {
  // Header name to use for correlation ID
  headerName?: string;
  // Generate new ID if not present
  generateIfMissing?: boolean;
  // Log incoming requests
  logRequests?: boolean;
  // Paths to exclude from logging
  excludePaths?: string[];
  // Add timing information
  addTiming?: boolean;
}

const defaultOptions: CorrelationIdOptions = {
  headerName: CORRELATION_HEADERS.CORRELATION_ID,
  generateIfMissing: true,
  logRequests: true,
  excludePaths: ['/health', '/health/live', '/health/ready', '/metrics'],
  addTiming: true,
};

/**
 * Correlation ID middleware
 * Establishes request context with correlation ID for tracing
 */
export function correlationIdMiddleware(options: CorrelationIdOptions = {}) {
  const opts = { ...defaultOptions, ...options };

  return (req: Request, res: Response, next: NextFunction): void => {
    // Parse existing context from headers
    const incomingContext = parseContextFromHeaders(req.headers as Record<string, string>);
    
    // Generate or use existing IDs
    const correlationId = 
      (req.headers[opts.headerName!.toLowerCase()] as string) ||
      incomingContext.correlationId ||
      (opts.generateIfMissing ? uuidv4() : '');
    
    const requestId = uuidv4();
    const traceId = incomingContext.traceId || correlationId;
    const spanId = uuidv4();
    
    // Create request context
    const context: RequestContext = {
      correlationId,
      requestId,
      traceId,
      spanId,
      parentSpanId: incomingContext.spanId,
      startTime: Date.now(),
      path: req.path,
      method: req.method,
      ip: req.ip || req.socket.remoteAddress,
      userAgent: req.headers['user-agent'],
      metadata: {},
    };

    // Attach to request object for easy access
    req.correlationId = correlationId;
    req.requestId = requestId;
    req.context = context;

    // Set response headers
    res.setHeader(CORRELATION_HEADERS.CORRELATION_ID, correlationId);
    res.setHeader(CORRELATION_HEADERS.REQUEST_ID, requestId);
    res.setHeader(CORRELATION_HEADERS.TRACE_ID, traceId);
    res.setHeader(CORRELATION_HEADERS.SPAN_ID, spanId);

    // Add timing header on response
    if (opts.addTiming) {
      res.on('finish', () => {
        const duration = Date.now() - context.startTime;
        // Can't set headers after response is sent, but we can log
        if (opts.logRequests && !opts.excludePaths?.includes(req.path)) {
          logInfo(`[${correlationId}] ${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`);
        }
      });
    }

    // Run the rest of the middleware chain with context
    runWithContext(context, () => {
      next();
    });
  };
}

/**
 * Express error handler that preserves correlation ID
 */
export function correlationErrorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const correlationId = req.correlationId || 'unknown';
  const requestId = req.requestId || 'unknown';

  // Ensure headers are set even on error
  if (!res.headersSent) {
    res.setHeader(CORRELATION_HEADERS.CORRELATION_ID, correlationId);
    res.setHeader(CORRELATION_HEADERS.REQUEST_ID, requestId);
  }

  // Log error with correlation ID
  console.error(`[${correlationId}] Error:`, err);

  next(err);
}

/**
 * Get correlation ID from request or context
 */
export function getCorrelationIdFromRequest(req: Request): string {
  return req.correlationId || 
    (req.headers[CORRELATION_HEADERS.CORRELATION_ID.toLowerCase()] as string) ||
    getContext()?.correlationId ||
    'unknown';
}

/**
 * Add correlation ID to outgoing request config
 */
export function addCorrelationHeaders(
  existingHeaders: Record<string, string> = {}
): Record<string, string> {
  const context = getContext();
  
  if (!context) return existingHeaders;

  return {
    ...existingHeaders,
    [CORRELATION_HEADERS.CORRELATION_ID]: context.correlationId,
    [CORRELATION_HEADERS.REQUEST_ID]: context.requestId,
    [CORRELATION_HEADERS.TRACE_ID]: context.traceId || context.correlationId,
    [CORRELATION_HEADERS.SPAN_ID]: uuidv4(), // New span for outgoing request
    [CORRELATION_HEADERS.PARENT_SPAN_ID]: context.spanId || '',
  };
}

/**
 * Middleware to extract user info into context
 */
export function userContextMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const context = getContext();
  
  if (context && req.user) {
    context.userId = req.user.id;
    context.userRole = req.user.role;
  }

  next();
}

/**
 * Create axios interceptor for correlation headers
 */
export function createAxiosCorrelationInterceptor() {
  return {
    request: (config: any) => {
      config.headers = addCorrelationHeaders(config.headers || {});
      return config;
    },
  };
}

/**
 * Format log message with correlation ID
 */
export function formatLogWithCorrelation(message: string, data?: any): string {
  const context = getContext();
  const correlationId = context?.correlationId || 'no-context';
  const requestId = context?.requestId || '';
  
  const prefix = requestId 
    ? `[${correlationId}:${requestId.slice(0, 8)}]`
    : `[${correlationId}]`;
  
  if (data) {
    return `${prefix} ${message} ${JSON.stringify(data)}`;
  }
  
  return `${prefix} ${message}`;
}

export default correlationIdMiddleware;

