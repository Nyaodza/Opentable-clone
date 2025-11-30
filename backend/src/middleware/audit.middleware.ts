import { Request, Response, NextFunction } from 'express';
import { AuditLog } from '../models/AuditLog';

export interface AuditLogEntry {
  userId?: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  details: string;
  ipAddress: string;
  userAgent: string;
  success: boolean;
  timestamp: Date;
}

// Audit logging middleware
export const auditLogger = (action: string, resourceType: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const originalSend = res.send;
    const originalJson = res.json;
    
    let responseBody: any;
    let statusCode: number;

    // Intercept response to capture success/failure
    res.send = function(body: any) {
      responseBody = body;
      statusCode = res.statusCode;
      return originalSend.call(this, body);
    };

    res.json = function(body: any) {
      responseBody = body;
      statusCode = res.statusCode;
      return originalJson.call(this, body);
    };

    // Continue with the request
    next();

    // Log after response is sent
    res.on('finish', async () => {
      try {
        const auditEntry: AuditLogEntry = {
          userId: req.user?.id,
          action,
          resourceType,
          resourceId: req.params.id || extractResourceId(req, responseBody),
          details: createAuditDetails(req, responseBody, action),
          ipAddress: req.ip || (req as any).connection?.remoteAddress || 'unknown',
          userAgent: req.get('User-Agent') || 'unknown',
          success: statusCode >= 200 && statusCode < 400,
          timestamp: new Date(),
        };

        await AuditLog.create(auditEntry as any);
      } catch (error) {
        console.error('Failed to create audit log:', error);
      }
    });
  };
};

// Extract resource ID from request or response
const extractResourceId = (req: Request, responseBody: any): string | undefined => {
  // Try to get ID from request params
  if (req.params.id) return req.params.id;
  
  // Try to get ID from request body
  if (req.body?.id) return req.body.id;
  
  // Try to get ID from response body
  if (responseBody?.data?.id) return responseBody.data.id;
  if (responseBody?.id) return responseBody.id;
  
  return undefined;
};

// Create detailed audit information
const createAuditDetails = (req: Request, responseBody: any, action: string): string => {
  const details: any = {
    action,
    method: req.method,
    path: req.path,
  };

  // Add relevant request data based on action type
  switch (action) {
    case 'CREATE':
    case 'UPDATE':
      details.data = sanitizeAuditData(req.body);
      break;
    case 'DELETE':
      details.deletedId = req.params.id;
      break;
    case 'LOGIN':
      details.email = req.body.email;
      details.success = responseBody?.success || false;
      break;
    case 'LOGOUT':
      details.userId = req.user?.id;
      break;
    case 'SEARCH':
      details.query = req.query;
      details.resultsCount = responseBody?.data?.length || 0;
      break;
    case 'EXPORT':
      details.exportType = req.body.type || req.query.type;
      details.dateRange = {
        startDate: req.body.startDate || req.query.startDate,
        endDate: req.body.endDate || req.query.endDate,
      };
      break;
    case 'APPROVE':
    case 'REJECT':
      details.targetId = req.params.id;
      details.reason = req.body.reason;
      break;
    case 'STATUS_CHANGE':
      details.targetId = req.params.id;
      details.newStatus = req.body.isActive !== undefined ? 
        (req.body.isActive ? 'active' : 'inactive') : 
        req.body.status;
      break;
  }

  return JSON.stringify(details);
};

// Remove sensitive data from audit logs
const sanitizeAuditData = (data: any): any => {
  if (!data || typeof data !== 'object') return data;

  const sensitiveFields = [
    'password',
    'confirmPassword',
    'token',
    'refreshToken',
    'cardNumber',
    'cvv',
    'ssn',
    'socialSecurityNumber',
  ];

  const sanitized = { ...data };

  sensitiveFields.forEach(field => {
    if (sanitized[field]) {
      sanitized[field] = '[REDACTED]';
    }
  });

  return sanitized;
};

// Predefined audit actions
export const AUDIT_ACTIONS = {
  // Authentication
  LOGIN: 'LOGIN',
  LOGOUT: 'LOGOUT',
  REGISTER: 'REGISTER',
  PASSWORD_RESET: 'PASSWORD_RESET',
  
  // CRUD operations
  CREATE: 'CREATE',
  READ: 'READ',
  UPDATE: 'UPDATE',
  DELETE: 'DELETE',
  
  // Specific actions
  APPROVE: 'APPROVE',
  REJECT: 'REJECT',
  ACTIVATE: 'ACTIVATE',
  DEACTIVATE: 'DEACTIVATE',
  STATUS_CHANGE: 'STATUS_CHANGE',
  
  // Business operations
  RESERVATION_CREATE: 'RESERVATION_CREATE',
  RESERVATION_CANCEL: 'RESERVATION_CANCEL',
  RESERVATION_MODIFY: 'RESERVATION_MODIFY',
  PAYMENT_PROCESS: 'PAYMENT_PROCESS',
  PAYMENT_REFUND: 'PAYMENT_REFUND',
  
  // Admin operations
  USER_ROLE_CHANGE: 'USER_ROLE_CHANGE',
  RESTAURANT_APPROVE: 'RESTAURANT_APPROVE',
  RESTAURANT_REJECT: 'RESTAURANT_REJECT',
  SYSTEM_SETTINGS_UPDATE: 'SYSTEM_SETTINGS_UPDATE',
  BULK_OPERATION: 'BULK_OPERATION',
  
  // Data operations
  EXPORT: 'EXPORT',
  IMPORT: 'IMPORT',
  BACKUP: 'BACKUP',
  RESTORE: 'RESTORE',
  
  // Security events
  FAILED_LOGIN: 'FAILED_LOGIN',
  ACCOUNT_LOCKED: 'ACCOUNT_LOCKED',
  SUSPICIOUS_ACTIVITY: 'SUSPICIOUS_ACTIVITY',
  PERMISSION_DENIED: 'PERMISSION_DENIED',
};

export const RESOURCE_TYPES = {
  USER: 'USER',
  RESTAURANT: 'RESTAURANT',
  RESERVATION: 'RESERVATION',
  REVIEW: 'REVIEW',
  PAYMENT: 'PAYMENT',
  WAITLIST: 'WAITLIST',
  LOYALTY: 'LOYALTY',
  TABLE: 'TABLE',
  FLOOR_PLAN: 'FLOOR_PLAN',
  SYSTEM: 'SYSTEM',
  AUDIT_LOG: 'AUDIT_LOG',
};

// Helper functions for common audit scenarios
export const auditAuth = auditLogger(AUDIT_ACTIONS.LOGIN, RESOURCE_TYPES.USER);
export const auditUserCreate = auditLogger(AUDIT_ACTIONS.CREATE, RESOURCE_TYPES.USER);
export const auditUserUpdate = auditLogger(AUDIT_ACTIONS.UPDATE, RESOURCE_TYPES.USER);
export const auditUserDelete = auditLogger(AUDIT_ACTIONS.DELETE, RESOURCE_TYPES.USER);

export const auditRestaurantCreate = auditLogger(AUDIT_ACTIONS.CREATE, RESOURCE_TYPES.RESTAURANT);
export const auditRestaurantUpdate = auditLogger(AUDIT_ACTIONS.UPDATE, RESOURCE_TYPES.RESTAURANT);
export const auditRestaurantApprove = auditLogger(AUDIT_ACTIONS.APPROVE, RESOURCE_TYPES.RESTAURANT);
export const auditRestaurantReject = auditLogger(AUDIT_ACTIONS.REJECT, RESOURCE_TYPES.RESTAURANT);

export const auditReservationCreate = auditLogger(AUDIT_ACTIONS.RESERVATION_CREATE, RESOURCE_TYPES.RESERVATION);
export const auditReservationCancel = auditLogger(AUDIT_ACTIONS.RESERVATION_CANCEL, RESOURCE_TYPES.RESERVATION);

export const auditPayment = auditLogger(AUDIT_ACTIONS.PAYMENT_PROCESS, RESOURCE_TYPES.PAYMENT);

export const auditSystemSettings = auditLogger(AUDIT_ACTIONS.SYSTEM_SETTINGS_UPDATE, RESOURCE_TYPES.SYSTEM);

// Manual audit logging function
export const logAuditEvent = async (
  action: string,
  resourceType: string,
  details: any,
  req: Request,
  success: boolean = true,
  resourceId?: string
) => {
  try {
    const auditEntry: AuditLogEntry = {
      userId: req.user?.id,
      action,
      resourceType,
      resourceId,
      details: JSON.stringify(sanitizeAuditData(details)),
      ipAddress: req.ip || (req as any).connection?.remoteAddress || 'unknown',
      userAgent: req.get('User-Agent') || 'unknown',
      success,
      timestamp: new Date(),
    };

    await AuditLog.create(auditEntry as any);
  } catch (error) {
    console.error('Failed to create manual audit log:', error);
  }
};

export default {
  auditLogger,
  AUDIT_ACTIONS,
  RESOURCE_TYPES,
  logAuditEvent,
};