import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { logger } from '../utils/logger';

export const validateRefreshToken = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const schema = Joi.object({
    refreshToken: Joi.string().required(),
  });

  const { error } = schema.validate(req.body);
  if (error) {
    logger.warn('Refresh token validation error:', error.details[0].message);
    return res.status(400).json({
      error: 'Validation error',
      message: error.details[0].message,
    });
  }

  next();
};

export const validateRole = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const schema = Joi.object({
    role: Joi.string().valid('admin', 'viewer').required(),
  });

  const { error } = schema.validate(req.body);
  if (error) {
    logger.warn('Role validation error:', error.details[0].message);
    return res.status(400).json({
      error: 'Validation error',
      message: error.details[0].message,
    });
  }

  next();
};