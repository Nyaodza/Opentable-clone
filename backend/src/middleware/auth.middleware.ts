import { Request, Response, NextFunction } from 'express';
import { JWTUtils } from '../utils/jwt.utils';
import { User, UserRole } from '../models/User';
import { RedisService } from '../services/redis.service';

// Extend Express Request interface
declare global {
  namespace Express {
    interface Request {
      user?: User;
      userId?: string;
      token?: string;
    }
  }
}

/**
 * Authenticate user from JWT token
 */
export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'No token provided' });
      return;
    }

    const token = authHeader.substring(7);

    // Check if token is blacklisted (optional)
    const redis = RedisService.getInstance();
    const isBlacklisted = await redis.get(`blacklist:${token}`);
    if (isBlacklisted) {
      res.status(401).json({ error: 'Token has been revoked' });
      return;
    }

    // Verify token
    const decoded = JWTUtils.verifyAccessToken(token);

    // Find user
    const user = await User.findByPk(decoded.userId);
    if (!user || !user.isActive) {
      res.status(401).json({ error: 'User not found or inactive' });
      return;
    }

    // Attach user to request
    req.user = user;
    req.userId = user.id;
    req.token = token;

    next();
  } catch (error: any) {
    res.status(401).json({ error: error.message || 'Invalid token' });
  }
};

/**
 * Optional authentication - doesn't fail if no token
 */
export const optionalAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.substring(7);
    const decoded = JWTUtils.verifyAccessToken(token);
    const user = await User.findByPk(decoded.userId);

    if (user && user.isActive) {
      req.user = user;
      req.userId = user.id;
      req.token = token;
    }
  } catch (error) {
    // Ignore errors for optional auth
  }

  next();
};

/**
 * Require specific roles
 */
export const requireRoles = (...roles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }

    next();
  };
};

/**
 * Require admin role
 */
export const requireAdmin = requireRoles(UserRole.ADMIN, UserRole.SUPER_ADMIN);

/**
 * Alias for requireRoles for backward compatibility
 */
export const authorize = (...roles: UserRole[]) => requireRoles(...roles);

/**
 * Require restaurant owner or staff
 */
export const requireRestaurantUser = requireRoles(
  UserRole.RESTAURANT_OWNER,
  UserRole.RESTAURANT_STAFF,
  UserRole.ADMIN,
  UserRole.SUPER_ADMIN
);

/**
 * Require email verification
 */
export const requireEmailVerified = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (!req.user) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  if (!req.user.emailVerified) {
    res.status(403).json({ error: 'Email verification required' });
    return;
  }

  next();
};

/**
 * Rate limiting for auth endpoints
 */
import rateLimit from 'express-rate-limit';

export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per window
  message: 'Too many authentication attempts, please try again later',
  standardHeaders: true,
  legacyHeaders: false
});

export const generalRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  message: 'Too many requests, please try again later',
  standardHeaders: true,
  legacyHeaders: false
});