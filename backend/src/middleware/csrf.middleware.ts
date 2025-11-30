import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { logger } from '../config/logger';

// CSRF Token Management
interface CsrfTokenStore {
  [sessionId: string]: {
    token: string;
    createdAt: Date;
    expiresAt: Date;
  };
}

class CsrfProtection {
  private tokenStore: CsrfTokenStore = {};
  private readonly TOKEN_EXPIRY = 3600000; // 1 hour in milliseconds
  private readonly SECRET = process.env.CSRF_SECRET || crypto.randomBytes(32).toString('hex');

  /**
   * Generate a new CSRF token
   */
  generateToken(sessionId: string): string {
    const token = crypto.randomBytes(32).toString('hex');
    const now = new Date();
    
    this.tokenStore[sessionId] = {
      token,
      createdAt: now,
      expiresAt: new Date(now.getTime() + this.TOKEN_EXPIRY),
    };

    // Clean up expired tokens
    this.cleanExpiredTokens();

    return token;
  }

  /**
   * Verify CSRF token
   */
  verifyToken(sessionId: string, token: string): boolean {
    const storedToken = this.tokenStore[sessionId];

    if (!storedToken) {
      logger.warn('CSRF validation failed: No token found for session', { sessionId });
      return false;
    }

    // Check if token has expired
    if (new Date() > storedToken.expiresAt) {
      logger.warn('CSRF validation failed: Token expired', { sessionId });
      delete this.tokenStore[sessionId];
      return false;
    }

    // Constant-time comparison to prevent timing attacks
    const isValid = crypto.timingSafeEqual(
      Buffer.from(token),
      Buffer.from(storedToken.token)
    );

    if (!isValid) {
      logger.warn('CSRF validation failed: Invalid token', { sessionId });
    }

    return isValid;
  }

  /**
   * Clean up expired tokens to prevent memory leaks
   */
  private cleanExpiredTokens(): void {
    const now = new Date();
    Object.keys(this.tokenStore).forEach(sessionId => {
      if (this.tokenStore[sessionId].expiresAt < now) {
        delete this.tokenStore[sessionId];
      }
    });
  }

  /**
   * Delete token for session
   */
  deleteToken(sessionId: string): void {
    delete this.tokenStore[sessionId];
  }
}

// Singleton instance
const csrfProtection = new CsrfProtection();

/**
 * Middleware to generate and attach CSRF token to response
 */
export const generateCsrfToken = (req: Request, res: Response, next: NextFunction): void => {
  try {
    // Use session ID or user ID as identifier
    const sessionId = (req as any).session?.id || req.user?.id || req.ip;
    
    if (!sessionId) {
      logger.error('Cannot generate CSRF token: No session identifier');
      return next();
    }

    const token = csrfProtection.generateToken(sessionId);
    
    // Attach token to response locals for use in templates
    res.locals.csrfToken = token;
    
    // Also send as header for SPA applications
    res.setHeader('X-CSRF-Token', token);
    
    next();
  } catch (error) {
    logger.error('Error generating CSRF token:', error);
    next(error);
  }
};

/**
 * Middleware to verify CSRF token on state-changing requests
 */
export const verifyCsrfToken = (req: Request, res: Response, next: NextFunction): void => {
  try {
    // Skip CSRF for safe methods
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
      return next();
    }

    // Skip CSRF for API endpoints that use Bearer token authentication
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return next();
    }

    const sessionId = (req as any).session?.id || req.user?.id || req.ip;
    
    if (!sessionId) {
      logger.warn('CSRF validation failed: No session identifier');
      res.status(403).json({
        success: false,
        error: 'CSRF validation failed',
        message: 'Session not found',
      });
      return;
    }

    // Get token from multiple possible locations
    const token = 
      req.headers['x-csrf-token'] as string ||
      req.headers['csrf-token'] as string ||
      req.body?._csrf ||
      req.query?._csrf as string;

    if (!token) {
      logger.warn('CSRF validation failed: No token provided', { 
        sessionId,
        method: req.method,
        path: req.path 
      });
      res.status(403).json({
        success: false,
        error: 'CSRF validation failed',
        message: 'CSRF token is missing',
      });
      return;
    }

    const isValid = csrfProtection.verifyToken(sessionId, token);

    if (!isValid) {
      res.status(403).json({
        success: false,
        error: 'CSRF validation failed',
        message: 'Invalid or expired CSRF token',
      });
      return;
    }

    next();
  } catch (error) {
    logger.error('Error verifying CSRF token:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'CSRF validation error',
    });
  }
};

/**
 * Endpoint to get a CSRF token
 */
export const getCsrfToken = (req: Request, res: Response): void => {
  try {
    const sessionId = (req as any).session?.id || req.user?.id || req.ip;
    
    if (!sessionId) {
      res.status(400).json({
        success: false,
        error: 'Cannot generate CSRF token',
        message: 'Session not found',
      });
      return;
    }

    const token = csrfProtection.generateToken(sessionId);
    
    res.json({
      success: true,
      csrfToken: token,
    });
  } catch (error) {
    logger.error('Error in getCsrfToken:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
};

export default {
  generateCsrfToken,
  verifyCsrfToken,
  getCsrfToken,
};
