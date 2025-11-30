import { Response } from 'express';
import { logger } from './logger';

export const handleControllerError = (error: unknown, res: Response, defaultMessage: string = 'An error occurred') => {
  if (error instanceof Error) {
    logger.error(`${defaultMessage}: ${error.message}`, { error });
    
    // Check for specific error types
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.message
      });
    }
    
    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({
        success: false,
        error: 'Database validation error',
        details: error.message
      });
    }
    
    // Default error response
    return res.status(500).json({
      success: false,
      error: error.message || defaultMessage
    });
  }
  
  // Handle non-Error objects
  logger.error(`${defaultMessage}: Unknown error type`, { error });
  return res.status(500).json({
    success: false,
    error: defaultMessage
  });
};

export const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }
  
  if (typeof error === 'string') {
    return error;
  }
  
  if (error && typeof error === 'object' && 'message' in error) {
    return String(error.message);
  }
  
  return 'An unknown error occurred';
};

export const isError = (error: unknown): error is Error => {
  return error instanceof Error;
};