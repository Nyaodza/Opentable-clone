import { Request, Response, NextFunction } from 'express';
import { ValidationError, UniqueConstraintError, ForeignKeyConstraintError } from 'sequelize';
import fs from 'fs';
import path from 'path';

export class AppError extends Error {
  statusCode: number;
  isOperational: boolean;
  code?: string;

  constructor(message: string, statusCode: number, code?: string) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    this.code = code;

    Error.captureStackTrace(this, this.constructor);
  }
}

// Error logging utility
class ErrorLogger {
  private logDir: string;

  constructor() {
    this.logDir = path.join(process.cwd(), 'logs');
    this.ensureLogDirectory();
  }

  private ensureLogDirectory() {
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }

  log(error: Error, req: Request) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level: 'ERROR',
      message: error.message,
      stack: error.stack,
      request: {
        method: req.method,
        url: req.originalUrl,
        headers: req.headers,
        body: req.body,
        query: req.query,
        params: req.params,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        userId: req.user?.id,
      },
    };

    // Log to console for development
    if (process.env.NODE_ENV === 'development') {
      console.error('ERROR DETAILS:', JSON.stringify(logEntry, null, 2));
    } else {
      console.error(error);
    }

    // Write to file
    const logFile = path.join(this.logDir, `error-${new Date().toISOString().split('T')[0]}.log`);
    const logLine = JSON.stringify(logEntry) + '\n';
    
    fs.appendFile(logFile, logLine, (err) => {
      if (err) console.error('Failed to write error log:', err);
    });

    // Send to external monitoring service if configured
    this.sendToMonitoring(logEntry);
  }

  private sendToMonitoring(logEntry: any) {
    // Integration with external monitoring services like Sentry, DataDog, etc.
    if (process.env.SENTRY_DSN) {
      // Sentry integration would go here
    }
  }
}

const errorLogger = new ErrorLogger();

// Error type handlers
const handleSequelizeError = (err: any): AppError => {
  if (err instanceof ValidationError) {
    const messages = err.errors.map(e => `${e.path}: ${e.message}`);
    return new AppError(`Validation failed: ${messages.join(', ')}`, 400, 'VALIDATION_ERROR');
  }

  if (err instanceof UniqueConstraintError) {
    const field = err.errors[0]?.path || 'field';
    return new AppError(`${field} already exists`, 409, 'DUPLICATE_ERROR');
  }

  if (err instanceof ForeignKeyConstraintError) {
    return new AppError('Referenced resource not found', 400, 'REFERENCE_ERROR');
  }

  return new AppError('Database error', 500, 'DATABASE_ERROR');
};

const handleJWTError = (err: any): AppError => {
  if (err.name === 'JsonWebTokenError') {
    return new AppError('Invalid authentication token', 401, 'INVALID_TOKEN');
  }

  if (err.name === 'TokenExpiredError') {
    return new AppError('Authentication token has expired', 401, 'EXPIRED_TOKEN');
  }

  if (err.name === 'NotBeforeError') {
    return new AppError('Token not active yet', 401, 'TOKEN_NOT_ACTIVE');
  }

  return new AppError('Authentication error', 401, 'AUTH_ERROR');
};

const handleCastError = (err: any): AppError => {
  return new AppError('Invalid data format', 400, 'CAST_ERROR');
};

const handleMulterError = (err: any): AppError => {
  switch (err.code) {
    case 'LIMIT_FILE_SIZE':
      return new AppError('File too large', 413, 'FILE_TOO_LARGE');
    case 'LIMIT_FILE_COUNT':
      return new AppError('Too many files', 413, 'TOO_MANY_FILES');
    case 'LIMIT_UNEXPECTED_FILE':
      return new AppError('Unexpected file field', 400, 'UNEXPECTED_FILE');
    default:
      return new AppError('File upload error', 400, 'UPLOAD_ERROR');
  }
};

const handleStripeError = (err: any): AppError => {
  switch (err.type) {
    case 'StripeCardError':
      return new AppError(err.message, 400, 'PAYMENT_CARD_ERROR');
    case 'StripeRateLimitError':
      return new AppError('Payment service temporarily unavailable', 429, 'PAYMENT_RATE_LIMIT');
    case 'StripeInvalidRequestError':
      return new AppError('Invalid payment request', 400, 'PAYMENT_INVALID_REQUEST');
    case 'StripeAPIError':
      return new AppError('Payment service error', 500, 'PAYMENT_SERVICE_ERROR');
    case 'StripeConnectionError':
      return new AppError('Payment service unavailable', 503, 'PAYMENT_SERVICE_UNAVAILABLE');
    case 'StripeAuthenticationError':
      return new AppError('Payment authentication error', 500, 'PAYMENT_AUTH_ERROR');
    default:
      return new AppError('Payment processing error', 500, 'PAYMENT_ERROR');
  }
};

// Not found handler
export const notFound = (req: Request, res: Response, next: NextFunction) => {
  const error = new AppError(`Route ${req.originalUrl} not found`, 404, 'NOT_FOUND');
  next(error);
};

// Async error wrapper
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// Main error handler
export const errorHandler = (
  err: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  let error: AppError;

  // Handle different error types
  if (err.name?.includes('Sequelize') || err instanceof ValidationError) {
    error = handleSequelizeError(err);
  } else if (err.name?.includes('JsonWebToken') || err.name?.includes('Token')) {
    error = handleJWTError(err);
  } else if (err.name === 'CastError') {
    error = handleCastError(err);
  } else if (err.name === 'MulterError') {
    error = handleMulterError(err);
  } else if (err.name?.includes('Stripe')) {
    error = handleStripeError(err);
  } else if (err instanceof AppError) {
    error = err;
  } else {
    // Generic server error
    error = new AppError(
      process.env.NODE_ENV === 'production' ? 'Something went wrong' : err.message,
      500,
      'INTERNAL_SERVER_ERROR'
    );
  }

  // Log error
  errorLogger.log(err, req);

  // Send error response
  const response: any = {
    success: false,
    error: error.message,
    code: error.code,
  };

  // Add additional info in development
  if (process.env.NODE_ENV === 'development') {
    response.stack = err.stack;
    response.originalError = err.message;
  }

  // Add request ID if available
  if (req.headers['x-request-id']) {
    response.requestId = req.headers['x-request-id'];
  }

  res.status(error.statusCode).json(response);
};

// Graceful shutdown handler
export const gracefulShutdown = (server: any) => {
  process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully...');
    server.close(() => {
      console.log('Process terminated');
      process.exit(0);
    });
  });

  process.on('SIGINT', () => {
    console.log('SIGINT received, shutting down gracefully...');
    server.close(() => {
      console.log('Process terminated');
      process.exit(0);
    });
  });

  process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    server.close(() => {
      process.exit(1);
    });
  });

  process.on('uncaughtException', (error: Error) => {
    console.error('Uncaught Exception:', error);
    server.close(() => {
      process.exit(1);
    });
  });
};