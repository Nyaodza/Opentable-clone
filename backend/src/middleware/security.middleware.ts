import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import helmet from 'helmet';
import { SecurityService } from '../services/security.service';
import { TwoFactorService } from '../services/two-factor.service';
import { AuditLog } from '../models/audit-log.model';
import { AppError } from '../utils/errors';
import { logger } from '../utils/logger';

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      nonce?: string;
      sessionId?: string;
      csrfToken?: string;
      clientIp?: string;
      securityContext?: {
        user?: any;
        tenant?: any;
        permissions?: string[];
        riskScore?: number;
      };
    }
  }
}

// Security headers middleware
export const securityHeaders = (req: Request, res: Response, next: NextFunction) => {
  // Generate nonce for CSP
  const nonce = crypto.randomBytes(16).toString('base64');
  req.nonce = nonce;
  res.locals.nonce = nonce;

  // Apply security headers
  const headers = SecurityService.getSecurityHeaders(nonce);
  Object.entries(headers).forEach(([key, value]) => {
    res.setHeader(key, value);
  });

  next();
};

// Rate limiting middleware
export const rateLimit = (
  key: string,
  options?: { 
    keyGenerator?: (req: Request) => string;
    skipSuccessfulRequests?: boolean;
    skipFailedRequests?: boolean;
  }
) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const identifier = options?.keyGenerator 
        ? options.keyGenerator(req)
        : req.clientIp || req.ip;

      const { allowed, retryAfter } = await SecurityService.checkRateLimit(key, identifier);

      if (!allowed) {
        res.setHeader('Retry-After', retryAfter!.toString());
        res.setHeader('X-RateLimit-Limit', '0');
        res.setHeader('X-RateLimit-Remaining', '0');
        res.setHeader('X-RateLimit-Reset', new Date(Date.now() + retryAfter! * 1000).toISOString());

        throw new AppError('Too many requests', 429);
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

// IP validation middleware
export const validateIP = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const clientIp = req.headers['x-forwarded-for'] as string || 
                     req.headers['x-real-ip'] as string || 
                     req.socket.remoteAddress || 
                     '';
    
    req.clientIp = clientIp.split(',')[0].trim();

    const { allowed, reason } = SecurityService.validateIP(req.clientIp);

    if (!allowed) {
      await AuditLog.logSecurity(null, 'ip_blocked', {
        ipAddress: req.clientIp,
        reason,
        userAgent: req.headers['user-agent'],
      });

      throw new AppError('Access denied', 403);
    }

    next();
  } catch (error) {
    next(error);
  }
};

// Geo-blocking middleware
export const geoBlock = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const clientIp = req.clientIp || req.ip;
    const { allowed, country } = await SecurityService.validateGeoLocation(clientIp);

    if (!allowed) {
      await AuditLog.logSecurity(null, 'geo_blocked', {
        ipAddress: clientIp,
        country,
        userAgent: req.headers['user-agent'],
      });

      throw new AppError('Access denied from your location', 403);
    }

    // Add country to request context
    if (req.securityContext) {
      req.securityContext.country = country;
    }

    next();
  } catch (error) {
    next(error);
  }
};

// CSRF protection middleware
export const csrfProtection = async (req: Request, res: Response, next: NextFunction) => {
  // Skip CSRF for read operations and API endpoints
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method) || req.path.startsWith('/api/')) {
    return next();
  }

  try {
    const token = req.headers['x-csrf-token'] as string || req.body._csrf;
    const sessionId = req.sessionId || req.session?.id;

    if (!sessionId || !token) {
      throw new AppError('CSRF token missing', 403);
    }

    const valid = await SecurityService.validateCSRFToken(sessionId, token);
    if (!valid) {
      throw new AppError('Invalid CSRF token', 403);
    }

    next();
  } catch (error) {
    next(error);
  }
};

// Two-factor authentication middleware
export const requireTwoFactor = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = req.user;
    if (!user || !user.twoFactorEnabled) {
      return next();
    }

    // Check if 2FA has already been verified in this session
    const twoFactorVerified = req.session?.twoFactorVerified;
    if (twoFactorVerified) {
      return next();
    }

    // Require 2FA verification
    const code = req.headers['x-2fa-code'] as string || req.body.twoFactorCode;
    if (!code) {
      res.status(428).json({
        error: 'Two-factor authentication required',
        methods: await getTwoFactorMethods(user),
      });
      return;
    }

    // Verify code based on user's 2FA method
    let verified = false;
    
    if (user.twoFactorMethods?.totp?.enabled) {
      verified = await TwoFactorService.verifyTOTP(user.id, code);
    } else if (user.twoFactorMethods?.sms?.enabled) {
      verified = await TwoFactorService.verifySMSCode(user.id, code);
    } else if (user.twoFactorMethods?.email?.enabled) {
      verified = await TwoFactorService.verifyEmailCode(user.id, code);
    }

    // Check backup codes as fallback
    if (!verified && code.includes('-')) {
      verified = await TwoFactorService.verifyBackupCode(user.id, code);
    }

    if (!verified) {
      throw new AppError('Invalid two-factor authentication code', 401);
    }

    // Mark 2FA as verified for this session
    if (req.session) {
      req.session.twoFactorVerified = true;
    }

    next();
  } catch (error) {
    next(error);
  }
};

// Permission-based access control
export const requirePermission = (permission: string | string[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user;
      if (!user) {
        throw new AppError('Authentication required', 401);
      }

      const requiredPermissions = Array.isArray(permission) ? permission : [permission];
      const userPermissions = req.securityContext?.permissions || [];

      const hasPermission = requiredPermissions.some(p => userPermissions.includes(p));
      if (!hasPermission) {
        await AuditLog.logSecurity(user.id, 'permission_denied', {
          required: requiredPermissions,
          actual: userPermissions,
          path: req.path,
          method: req.method,
        });

        throw new AppError('Insufficient permissions', 403);
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

// Role-based access control
export const requireRole = (role: string | string[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user;
      if (!user) {
        throw new AppError('Authentication required', 401);
      }

      const requiredRoles = Array.isArray(role) ? role : [role];
      const hasRole = requiredRoles.includes(user.role);

      if (!hasRole) {
        await AuditLog.logSecurity(user.id, 'role_denied', {
          required: requiredRoles,
          actual: user.role,
          path: req.path,
          method: req.method,
        });

        throw new AppError('Insufficient role privileges', 403);
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

// Anomaly detection middleware
export const detectAnomalies = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = req.user;
    if (!user) {
      return next();
    }

    const isAnomalous = await SecurityService.detectAnomalousActivity(user.id, {
      type: 'api_request',
      ip: req.clientIp || req.ip,
      userAgent: req.headers['user-agent'] || '',
      location: req.securityContext?.country,
    });

    if (isAnomalous) {
      // Increase risk score
      if (req.securityContext) {
        req.securityContext.riskScore = (req.securityContext.riskScore || 0) + 50;
      }

      // Require additional verification for high-risk actions
      if (req.method !== 'GET' && req.securityContext?.riskScore! > 75) {
        res.status(428).json({
          error: 'Additional verification required',
          reason: 'Unusual activity detected',
        });
        return;
      }
    }

    next();
  } catch (error) {
    next(error);
  }
};

// Audit logging middleware
export const auditLog = (category: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const startTime = Date.now();
    const requestId = crypto.randomBytes(16).toString('hex');
    req.requestId = requestId;

    // Log request
    const logEntry = {
      userId: req.user?.id,
      action: `${req.method} ${req.path}`,
      category,
      entityType: req.params.entityType || req.path.split('/')[2],
      entityId: req.params.id,
      details: {
        method: req.method,
        path: req.path,
        query: req.query,
        body: req.method !== 'GET' ? req.body : undefined,
      },
      ipAddress: req.clientIp || req.ip,
      userAgent: req.headers['user-agent'],
      sessionId: req.sessionId,
      requestId,
    };

    // Capture response
    const originalSend = res.send;
    res.send = function(data) {
      res.send = originalSend;
      
      // Log response
      AuditLog.create({
        ...logEntry,
        status: res.statusCode >= 400 ? 'failure' : 'success',
        duration: Date.now() - startTime,
        metadata: {
          statusCode: res.statusCode,
          responseSize: Buffer.byteLength(data),
        },
      }).catch(err => logger.error('Audit log failed:', err));

      return res.send(data);
    };

    next();
  };
};

// Content type validation
export const validateContentType = (allowedTypes: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (['GET', 'HEAD', 'OPTIONS', 'DELETE'].includes(req.method)) {
      return next();
    }

    const contentType = req.headers['content-type'];
    if (!contentType) {
      throw new AppError('Content-Type header is required', 400);
    }

    const isAllowed = allowedTypes.some(type => contentType.includes(type));
    if (!isAllowed) {
      throw new AppError(`Invalid Content-Type. Allowed: ${allowedTypes.join(', ')}`, 415);
    }

    next();
  };
};

// Input sanitization middleware
export const sanitizeInput = (req: Request, res: Response, next: NextFunction) => {
  // Sanitize query parameters
  if (req.query) {
    req.query = sanitizeObject(req.query);
  }

  // Sanitize body
  if (req.body) {
    req.body = sanitizeObject(req.body);
  }

  // Sanitize params
  if (req.params) {
    req.params = sanitizeObject(req.params);
  }

  next();
};

// Helper functions
function sanitizeObject(obj: any): any {
  if (typeof obj !== 'object' || obj === null) {
    return sanitizeValue(obj);
  }

  if (Array.isArray(obj)) {
    return obj.map(sanitizeObject);
  }

  const sanitized: any = {};
  for (const [key, value] of Object.entries(obj)) {
    // Skip potentially dangerous keys
    if (key.startsWith('__') || key.includes('prototype')) {
      continue;
    }
    sanitized[key] = sanitizeObject(value);
  }

  return sanitized;
}

function sanitizeValue(value: any): any {
  if (typeof value !== 'string') {
    return value;
  }

  // Remove null bytes
  value = value.replace(/\0/g, '');

  // Encode HTML entities
  value = value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

  return value;
}

async function getTwoFactorMethods(user: any): Promise<string[]> {
  const methods = [];
  
  if (user.twoFactorMethods?.totp?.enabled) methods.push('totp');
  if (user.twoFactorMethods?.sms?.enabled) methods.push('sms');
  if (user.twoFactorMethods?.email?.enabled) methods.push('email');
  if (user.backupCodes?.some((c: any) => !c.used)) methods.push('backup');
  
  return methods;
}