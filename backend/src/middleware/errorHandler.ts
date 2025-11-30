import { Request, Response, NextFunction } from 'express';
import { ValidationError } from 'sequelize';
import { logError } from '../utils/logger';

export interface ApiError extends Error {
  statusCode?: number;
  isOperational?: boolean;
  details?: any;
}

export class AppError extends Error implements ApiError {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly details?: any;

  constructor(message: string, statusCode: number, isOperational: boolean = true, details?: any) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
    
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.details = details;
    
    Error.captureStackTrace(this);
  }
}

// Common error classes
export class BadRequestError extends AppError {
  constructor(message: string = 'Bad Request', details?: any) {
    super(message, 400, true, details);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized') {
    super(message, 401, true);
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Forbidden') {
    super(message, 403, true);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = 'Resource not found') {
    super(message, 404, true);
  }
}

export class ConflictError extends AppError {
  constructor(message: string = 'Conflict') {
    super(message, 409, true);
  }
}

export class ValidationErrorClass extends AppError {
  constructor(message: string = 'Validation Error', details?: any) {
    super(message, 422, true, details);
  }
}

export class InternalServerError extends AppError {
  constructor(message: string = 'Internal Server Error') {
    super(message, 500, false);
  }
}

// Error handler middleware
export const errorHandler = (
  error: Error | ApiError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Log error
  logError('Error occurred', error, {
    method: req.method,
    url: req.url,
    ip: req.ip,
    userId: (req as any).user?.id,
  });

  // Handle Sequelize validation errors
  if (error instanceof ValidationError) {
    const errors = error.errors.map(e => ({
      field: e.path,
      message: e.message,
      value: e.value
    }));
    
    res.status(422).json({
      success: false,
      error: 'Validation Error',
      details: errors
    });
    return;
  }

  // Handle JWT errors
  if (error.name === 'JsonWebTokenError') {
    res.status(401).json({
      success: false,
      error: 'Invalid token'
    });
    return;
  }

  if (error.name === 'TokenExpiredError') {
    res.status(401).json({
      success: false,
      error: 'Token expired'
    });
    return;
  }

  // Handle Multer errors
  if (error.name === 'MulterError') {
    res.status(400).json({
      success: false,
      error: 'File upload error',
      details: error.message
    });
    return;
  }

  // Handle our custom errors
  if (error instanceof AppError) {
    res.status(error.statusCode).json({
      success: false,
      error: error.message,
      ...(error.details && { details: error.details })
    });
    return;
  }

  // Handle MongoDB errors
  if (error.name === 'MongoError' || error.name === 'MongoServerError') {
    if ((error as any).code === 11000) {
      res.status(409).json({
        success: false,
        error: 'Duplicate key error'
      });
      return;
    }
  }

  // Default error
  const isDevelopment = process.env.NODE_ENV === 'development';
  res.status(500).json({
    success: false,
    error: isDevelopment ? error.message : 'Something went wrong',
    ...(isDevelopment && { stack: error.stack })
  });
};

// Not found handler
export const notFoundHandler = (req: Request, res: Response, next: NextFunction): void => {
  const error = new NotFoundError(`Route ${req.originalUrl} not found`);
  next(error);
};

// Async handler wrapper to catch promise rejections
export const asyncHandler = (fn: Function) => (req: Request, res: Response, next: NextFunction) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};