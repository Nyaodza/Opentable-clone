import * as yup from 'yup';
import { Request, Response, NextFunction } from 'express';
import { BadRequestError } from '../middleware/errorHandler';

// Common validation schemas
export const uuidSchema = yup.string().uuid('Invalid ID format');

export const paginationSchema = yup.object({
  page: yup.number().min(1).default(1),
  limit: yup.number().min(1).max(100).default(20),
  sort: yup.string().optional(),
  order: yup.string().oneOf(['asc', 'desc']).default('asc')
});

export const dateRangeSchema = yup.object({
  startDate: yup.date().required('Start date is required'),
  endDate: yup.date()
    .required('End date is required')
    .min(yup.ref('startDate'), 'End date must be after start date')
});

export const phoneSchema = yup.string()
  .matches(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number format')
  .required('Phone number is required');

export const emailSchema = yup.string()
  .email('Invalid email format')
  .required('Email is required');

export const passwordSchema = yup.string()
  .min(8, 'Password must be at least 8 characters')
  .matches(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .matches(/[a-z]/, 'Password must contain at least one lowercase letter')
  .matches(/[0-9]/, 'Password must contain at least one number')
  .matches(/[!@#$%^&*]/, 'Password must contain at least one special character')
  .required('Password is required');

// Validation middleware factory
export const validate = (schema: yup.AnySchema) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = await schema.validate(req.body, {
        abortEarly: false,
        stripUnknown: true
      });
      req.body = validated;
      next();
    } catch (error) {
      if (error instanceof yup.ValidationError) {
        const errors = error.inner.reduce((acc, err) => {
          if (err.path) {
            acc[err.path] = err.message;
          }
          return acc;
        }, {} as Record<string, string>);
        
        next(new BadRequestError('Validation failed', errors));
      } else {
        next(error);
      }
    }
  };
};

// Validate query parameters
export const validateQuery = (schema: yup.AnySchema) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = await schema.validate(req.query, {
        abortEarly: false,
        stripUnknown: true
      });
      req.query = validated;
      next();
    } catch (error) {
      if (error instanceof yup.ValidationError) {
        const errors = error.inner.reduce((acc, err) => {
          if (err.path) {
            acc[err.path] = err.message;
          }
          return acc;
        }, {} as Record<string, string>);
        
        next(new BadRequestError('Query validation failed', errors));
      } else {
        next(error);
      }
    }
  };
};

// Validate params
export const validateParams = (schema: yup.AnySchema) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = await schema.validate(req.params, {
        abortEarly: false,
        stripUnknown: true
      });
      req.params = validated;
      next();
    } catch (error) {
      if (error instanceof yup.ValidationError) {
        const errors = error.inner.reduce((acc, err) => {
          if (err.path) {
            acc[err.path] = err.message;
          }
          return acc;
        }, {} as Record<string, string>);
        
        next(new BadRequestError('Parameter validation failed', errors));
      } else {
        next(error);
      }
    }
  };
};