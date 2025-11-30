/**
 * Async Context Management
 * Uses AsyncLocalStorage to maintain context across async operations
 */

import { AsyncLocalStorage } from 'async_hooks';
import { v4 as uuidv4 } from 'uuid';

/**
 * Request context interface
 */
export interface RequestContext {
  correlationId: string;
  requestId: string;
  userId?: string;
  userRole?: string;
  sessionId?: string;
  traceId?: string;
  spanId?: string;
  parentSpanId?: string;
  startTime: number;
  path?: string;
  method?: string;
  ip?: string;
  userAgent?: string;
  metadata: Record<string, any>;
}

/**
 * AsyncLocalStorage instance for request context
 */
const asyncLocalStorage = new AsyncLocalStorage<RequestContext>();

/**
 * Get the current request context
 */
export function getContext(): RequestContext | undefined {
  return asyncLocalStorage.getStore();
}

/**
 * Get correlation ID from current context
 */
export function getCorrelationId(): string | undefined {
  return getContext()?.correlationId;
}

/**
 * Get request ID from current context
 */
export function getRequestId(): string | undefined {
  return getContext()?.requestId;
}

/**
 * Get user ID from current context
 */
export function getUserId(): string | undefined {
  return getContext()?.userId;
}

/**
 * Set a value in the current context metadata
 */
export function setContextValue(key: string, value: any): void {
  const context = getContext();
  if (context) {
    context.metadata[key] = value;
  }
}

/**
 * Get a value from current context metadata
 */
export function getContextValue<T = any>(key: string): T | undefined {
  return getContext()?.metadata[key] as T | undefined;
}

/**
 * Run a function with a new context
 */
export function runWithContext<T>(
  context: Partial<RequestContext>,
  fn: () => T
): T {
  const fullContext: RequestContext = {
    correlationId: context.correlationId || uuidv4(),
    requestId: context.requestId || uuidv4(),
    startTime: context.startTime || Date.now(),
    metadata: context.metadata || {},
    ...context,
  };

  return asyncLocalStorage.run(fullContext, fn);
}

/**
 * Run an async function with a new context
 */
export async function runWithContextAsync<T>(
  context: Partial<RequestContext>,
  fn: () => Promise<T>
): Promise<T> {
  const fullContext: RequestContext = {
    correlationId: context.correlationId || uuidv4(),
    requestId: context.requestId || uuidv4(),
    startTime: context.startTime || Date.now(),
    metadata: context.metadata || {},
    ...context,
  };

  return asyncLocalStorage.run(fullContext, fn);
}

/**
 * Create a child context for tracing
 */
export function createChildContext(parentContext?: RequestContext): RequestContext {
  const parent = parentContext || getContext();
  
  return {
    correlationId: parent?.correlationId || uuidv4(),
    requestId: uuidv4(),
    userId: parent?.userId,
    userRole: parent?.userRole,
    sessionId: parent?.sessionId,
    traceId: parent?.traceId || parent?.correlationId || uuidv4(),
    spanId: uuidv4(),
    parentSpanId: parent?.spanId,
    startTime: Date.now(),
    path: parent?.path,
    method: parent?.method,
    metadata: { ...parent?.metadata },
  };
}

/**
 * Wrap a function to preserve context
 */
export function preserveContext<T extends (...args: any[]) => any>(fn: T): T {
  const context = getContext();
  
  return ((...args: Parameters<T>): ReturnType<T> => {
    if (context) {
      return asyncLocalStorage.run(context, () => fn(...args));
    }
    return fn(...args);
  }) as T;
}

/**
 * Wrap a callback to preserve context
 */
export function wrapCallback<T extends (...args: any[]) => any>(
  callback: T
): T {
  return preserveContext(callback);
}

/**
 * Get context as headers for outgoing requests
 */
export function getContextHeaders(): Record<string, string> {
  const context = getContext();
  if (!context) return {};

  return {
    'X-Correlation-ID': context.correlationId,
    'X-Request-ID': context.requestId,
    ...(context.traceId && { 'X-Trace-ID': context.traceId }),
    ...(context.spanId && { 'X-Span-ID': context.spanId }),
    ...(context.parentSpanId && { 'X-Parent-Span-ID': context.parentSpanId }),
    ...(context.userId && { 'X-User-ID': context.userId }),
  };
}

/**
 * Parse context from incoming request headers
 */
export function parseContextFromHeaders(headers: Record<string, string | string[] | undefined>): Partial<RequestContext> {
  const getHeader = (name: string): string | undefined => {
    const value = headers[name.toLowerCase()] || headers[name];
    return Array.isArray(value) ? value[0] : value;
  };

  return {
    correlationId: getHeader('X-Correlation-ID') || getHeader('X-Request-ID'),
    traceId: getHeader('X-Trace-ID'),
    spanId: getHeader('X-Span-ID'),
    parentSpanId: getHeader('X-Parent-Span-ID'),
  };
}

/**
 * Context-aware setTimeout
 */
export function contextAwareTimeout(
  callback: () => void,
  ms: number
): NodeJS.Timeout {
  const wrappedCallback = preserveContext(callback);
  return setTimeout(wrappedCallback, ms);
}

/**
 * Context-aware setInterval
 */
export function contextAwareInterval(
  callback: () => void,
  ms: number
): NodeJS.Timeout {
  const wrappedCallback = preserveContext(callback);
  return setInterval(wrappedCallback, ms);
}

/**
 * Context-aware Promise.all
 */
export async function contextAwarePromiseAll<T>(
  promises: Promise<T>[]
): Promise<T[]> {
  const context = getContext();
  if (!context) return Promise.all(promises);

  return asyncLocalStorage.run(context, () => Promise.all(promises));
}

/**
 * Measure execution time with context
 */
export function measureTime<T>(
  name: string,
  fn: () => T
): T {
  const start = Date.now();
  try {
    const result = fn();
    
    // Handle promises
    if (result instanceof Promise) {
      return result.finally(() => {
        const duration = Date.now() - start;
        setContextValue(`timing.${name}`, duration);
      }) as unknown as T;
    }
    
    const duration = Date.now() - start;
    setContextValue(`timing.${name}`, duration);
    return result;
  } catch (error) {
    const duration = Date.now() - start;
    setContextValue(`timing.${name}`, duration);
    throw error;
  }
}

/**
 * Get all timing measurements from context
 */
export function getTimings(): Record<string, number> {
  const context = getContext();
  if (!context) return {};

  const timings: Record<string, number> = {};
  
  for (const [key, value] of Object.entries(context.metadata)) {
    if (key.startsWith('timing.') && typeof value === 'number') {
      timings[key.replace('timing.', '')] = value;
    }
  }

  return timings;
}

export default {
  getContext,
  getCorrelationId,
  getRequestId,
  getUserId,
  setContextValue,
  getContextValue,
  runWithContext,
  runWithContextAsync,
  createChildContext,
  preserveContext,
  wrapCallback,
  getContextHeaders,
  parseContextFromHeaders,
  contextAwareTimeout,
  contextAwareInterval,
  measureTime,
  getTimings,
};

