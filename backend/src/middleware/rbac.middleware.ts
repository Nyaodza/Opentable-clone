/**
 * Role-Based Access Control (RBAC) Middleware
 * Provides fine-grained permission control for API endpoints
 */

import { Request, Response, NextFunction } from 'express';

/**
 * User roles in the system
 */
export enum UserRole {
  GUEST = 'guest',
  DINER = 'diner',
  RESTAURANT_STAFF = 'restaurant_staff',
  RESTAURANT_MANAGER = 'restaurant_manager',
  RESTAURANT_OWNER = 'restaurant_owner',
  ADMIN = 'admin',
  SUPER_ADMIN = 'super_admin',
}

/**
 * Permission types
 */
export enum Permission {
  // Restaurant permissions
  RESTAURANT_VIEW = 'restaurant:view',
  RESTAURANT_CREATE = 'restaurant:create',
  RESTAURANT_UPDATE = 'restaurant:update',
  RESTAURANT_DELETE = 'restaurant:delete',
  RESTAURANT_MANAGE_STAFF = 'restaurant:manage_staff',
  RESTAURANT_VIEW_ANALYTICS = 'restaurant:view_analytics',
  RESTAURANT_MANAGE_MENU = 'restaurant:manage_menu',
  RESTAURANT_MANAGE_TABLES = 'restaurant:manage_tables',
  RESTAURANT_MANAGE_HOURS = 'restaurant:manage_hours',
  RESTAURANT_RESPOND_REVIEWS = 'restaurant:respond_reviews',

  // Reservation permissions
  RESERVATION_VIEW_OWN = 'reservation:view_own',
  RESERVATION_CREATE = 'reservation:create',
  RESERVATION_UPDATE_OWN = 'reservation:update_own',
  RESERVATION_CANCEL_OWN = 'reservation:cancel_own',
  RESERVATION_VIEW_ALL = 'reservation:view_all',
  RESERVATION_UPDATE_ALL = 'reservation:update_all',
  RESERVATION_CANCEL_ALL = 'reservation:cancel_all',
  RESERVATION_CONFIRM = 'reservation:confirm',
  RESERVATION_CHECK_IN = 'reservation:check_in',

  // Review permissions
  REVIEW_CREATE = 'review:create',
  REVIEW_UPDATE_OWN = 'review:update_own',
  REVIEW_DELETE_OWN = 'review:delete_own',
  REVIEW_MODERATE = 'review:moderate',
  REVIEW_DELETE_ANY = 'review:delete_any',

  // User permissions
  USER_VIEW_PROFILE = 'user:view_profile',
  USER_UPDATE_PROFILE = 'user:update_profile',
  USER_VIEW_ALL = 'user:view_all',
  USER_UPDATE_ALL = 'user:update_all',
  USER_DELETE = 'user:delete',
  USER_MANAGE_ROLES = 'user:manage_roles',

  // Payment permissions
  PAYMENT_VIEW_OWN = 'payment:view_own',
  PAYMENT_PROCESS = 'payment:process',
  PAYMENT_REFUND = 'payment:refund',
  PAYMENT_VIEW_ALL = 'payment:view_all',

  // Loyalty permissions
  LOYALTY_VIEW_OWN = 'loyalty:view_own',
  LOYALTY_REDEEM = 'loyalty:redeem',
  LOYALTY_MANAGE = 'loyalty:manage',

  // Admin permissions
  ADMIN_ACCESS = 'admin:access',
  ADMIN_DASHBOARD = 'admin:dashboard',
  ADMIN_REPORTS = 'admin:reports',
  ADMIN_SETTINGS = 'admin:settings',
  ADMIN_AUDIT_LOGS = 'admin:audit_logs',

  // System permissions
  SYSTEM_MAINTENANCE = 'system:maintenance',
  SYSTEM_CONFIG = 'system:config',
  SYSTEM_BACKUP = 'system:backup',
}

/**
 * Role to permissions mapping
 */
const rolePermissions: Record<UserRole, Permission[]> = {
  [UserRole.GUEST]: [
    Permission.RESTAURANT_VIEW,
  ],

  [UserRole.DINER]: [
    Permission.RESTAURANT_VIEW,
    Permission.RESERVATION_VIEW_OWN,
    Permission.RESERVATION_CREATE,
    Permission.RESERVATION_UPDATE_OWN,
    Permission.RESERVATION_CANCEL_OWN,
    Permission.REVIEW_CREATE,
    Permission.REVIEW_UPDATE_OWN,
    Permission.REVIEW_DELETE_OWN,
    Permission.USER_VIEW_PROFILE,
    Permission.USER_UPDATE_PROFILE,
    Permission.PAYMENT_VIEW_OWN,
    Permission.PAYMENT_PROCESS,
    Permission.LOYALTY_VIEW_OWN,
    Permission.LOYALTY_REDEEM,
  ],

  [UserRole.RESTAURANT_STAFF]: [
    Permission.RESTAURANT_VIEW,
    Permission.RESERVATION_VIEW_ALL,
    Permission.RESERVATION_CONFIRM,
    Permission.RESERVATION_CHECK_IN,
    Permission.USER_VIEW_PROFILE,
  ],

  [UserRole.RESTAURANT_MANAGER]: [
    Permission.RESTAURANT_VIEW,
    Permission.RESTAURANT_UPDATE,
    Permission.RESTAURANT_MANAGE_MENU,
    Permission.RESTAURANT_MANAGE_TABLES,
    Permission.RESTAURANT_MANAGE_HOURS,
    Permission.RESTAURANT_VIEW_ANALYTICS,
    Permission.RESTAURANT_RESPOND_REVIEWS,
    Permission.RESERVATION_VIEW_ALL,
    Permission.RESERVATION_UPDATE_ALL,
    Permission.RESERVATION_CANCEL_ALL,
    Permission.RESERVATION_CONFIRM,
    Permission.RESERVATION_CHECK_IN,
    Permission.PAYMENT_REFUND,
    Permission.USER_VIEW_PROFILE,
    Permission.USER_UPDATE_PROFILE,
  ],

  [UserRole.RESTAURANT_OWNER]: [
    Permission.RESTAURANT_VIEW,
    Permission.RESTAURANT_CREATE,
    Permission.RESTAURANT_UPDATE,
    Permission.RESTAURANT_DELETE,
    Permission.RESTAURANT_MANAGE_STAFF,
    Permission.RESTAURANT_MANAGE_MENU,
    Permission.RESTAURANT_MANAGE_TABLES,
    Permission.RESTAURANT_MANAGE_HOURS,
    Permission.RESTAURANT_VIEW_ANALYTICS,
    Permission.RESTAURANT_RESPOND_REVIEWS,
    Permission.RESERVATION_VIEW_ALL,
    Permission.RESERVATION_UPDATE_ALL,
    Permission.RESERVATION_CANCEL_ALL,
    Permission.RESERVATION_CONFIRM,
    Permission.RESERVATION_CHECK_IN,
    Permission.REVIEW_MODERATE,
    Permission.PAYMENT_VIEW_ALL,
    Permission.PAYMENT_REFUND,
    Permission.USER_VIEW_PROFILE,
    Permission.USER_UPDATE_PROFILE,
    Permission.LOYALTY_MANAGE,
  ],

  [UserRole.ADMIN]: [
    Permission.RESTAURANT_VIEW,
    Permission.RESTAURANT_UPDATE,
    Permission.RESTAURANT_DELETE,
    Permission.RESTAURANT_VIEW_ANALYTICS,
    Permission.RESERVATION_VIEW_ALL,
    Permission.RESERVATION_UPDATE_ALL,
    Permission.RESERVATION_CANCEL_ALL,
    Permission.REVIEW_MODERATE,
    Permission.REVIEW_DELETE_ANY,
    Permission.USER_VIEW_ALL,
    Permission.USER_UPDATE_ALL,
    Permission.USER_DELETE,
    Permission.PAYMENT_VIEW_ALL,
    Permission.PAYMENT_REFUND,
    Permission.LOYALTY_MANAGE,
    Permission.ADMIN_ACCESS,
    Permission.ADMIN_DASHBOARD,
    Permission.ADMIN_REPORTS,
  ],

  [UserRole.SUPER_ADMIN]: [
    // Super admin has all permissions
    ...Object.values(Permission),
  ],
};

/**
 * Extend Express Request type to include user info
 */
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role: UserRole;
        permissions?: Permission[];
        restaurantId?: string;
      };
    }
  }
}

/**
 * Get permissions for a role
 */
export function getPermissionsForRole(role: UserRole): Permission[] {
  return rolePermissions[role] || [];
}

/**
 * Check if a role has a specific permission
 */
export function roleHasPermission(role: UserRole, permission: Permission): boolean {
  const permissions = getPermissionsForRole(role);
  return permissions.includes(permission);
}

/**
 * Check if user has required permission
 */
export function userHasPermission(user: Express.Request['user'], permission: Permission): boolean {
  if (!user) return false;
  
  // Check custom permissions first (if assigned)
  if (user.permissions?.includes(permission)) {
    return true;
  }
  
  // Fall back to role-based permissions
  return roleHasPermission(user.role, permission);
}

/**
 * Middleware to require specific permission(s)
 * Can check for single permission or multiple (ALL required)
 */
export function requirePermission(...requiredPermissions: Permission[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = req.user;

    if (!user) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required',
      });
      return;
    }

    const hasAllPermissions = requiredPermissions.every(
      (permission) => userHasPermission(user, permission)
    );

    if (!hasAllPermissions) {
      res.status(403).json({
        error: 'Forbidden',
        message: 'Insufficient permissions',
        required: requiredPermissions,
        userRole: user.role,
      });
      return;
    }

    next();
  };
}

/**
 * Middleware to require any of the specified permissions
 */
export function requireAnyPermission(...requiredPermissions: Permission[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = req.user;

    if (!user) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required',
      });
      return;
    }

    const hasAnyPermission = requiredPermissions.some(
      (permission) => userHasPermission(user, permission)
    );

    if (!hasAnyPermission) {
      res.status(403).json({
        error: 'Forbidden',
        message: 'Insufficient permissions',
        requiredAny: requiredPermissions,
        userRole: user.role,
      });
      return;
    }

    next();
  };
}

/**
 * Middleware to require specific role(s)
 */
export function requireRole(...allowedRoles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = req.user;

    if (!user) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required',
      });
      return;
    }

    if (!allowedRoles.includes(user.role)) {
      res.status(403).json({
        error: 'Forbidden',
        message: 'Role not authorized for this resource',
        allowedRoles,
        userRole: user.role,
      });
      return;
    }

    next();
  };
}

/**
 * Middleware to check resource ownership
 * Requires custom check function
 */
export function requireOwnership(
  getResourceOwnerId: (req: Request) => Promise<string | null>
) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const user = req.user;

    if (!user) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required',
      });
      return;
    }

    // Admins bypass ownership check
    if ([UserRole.ADMIN, UserRole.SUPER_ADMIN].includes(user.role)) {
      return next();
    }

    try {
      const ownerId = await getResourceOwnerId(req);

      if (!ownerId) {
        res.status(404).json({
          error: 'Not Found',
          message: 'Resource not found',
        });
        return;
      }

      if (ownerId !== user.id) {
        res.status(403).json({
          error: 'Forbidden',
          message: 'You do not have permission to access this resource',
        });
        return;
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Middleware to check restaurant access
 * For restaurant-specific resources
 */
export function requireRestaurantAccess(
  getResourceRestaurantId: (req: Request) => Promise<string | null>
) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const user = req.user;

    if (!user) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required',
      });
      return;
    }

    // Admins bypass restaurant access check
    if ([UserRole.ADMIN, UserRole.SUPER_ADMIN].includes(user.role)) {
      return next();
    }

    // Check if user has a restaurant ID associated
    if (!user.restaurantId) {
      res.status(403).json({
        error: 'Forbidden',
        message: 'No restaurant access',
      });
      return;
    }

    try {
      const resourceRestaurantId = await getResourceRestaurantId(req);

      if (!resourceRestaurantId) {
        res.status(404).json({
          error: 'Not Found',
          message: 'Resource not found',
        });
        return;
      }

      if (resourceRestaurantId !== user.restaurantId) {
        res.status(403).json({
          error: 'Forbidden',
          message: 'You do not have access to this restaurant resource',
        });
        return;
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Middleware to log permission checks (for auditing)
 */
export function auditPermissionCheck(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const originalJson = res.json.bind(res);

  res.json = function(body: any) {
    // Log permission denials
    if (res.statusCode === 403 || res.statusCode === 401) {
      console.log('[RBAC Audit]', {
        timestamp: new Date().toISOString(),
        userId: req.user?.id,
        userRole: req.user?.role,
        path: req.path,
        method: req.method,
        statusCode: res.statusCode,
        error: body?.error,
      });
    }
    return originalJson(body);
  };

  next();
}

/**
 * Helper to create role hierarchy check
 */
export function isRoleHigherOrEqual(userRole: UserRole, requiredRole: UserRole): boolean {
  const roleHierarchy: UserRole[] = [
    UserRole.GUEST,
    UserRole.DINER,
    UserRole.RESTAURANT_STAFF,
    UserRole.RESTAURANT_MANAGER,
    UserRole.RESTAURANT_OWNER,
    UserRole.ADMIN,
    UserRole.SUPER_ADMIN,
  ];

  const userRoleIndex = roleHierarchy.indexOf(userRole);
  const requiredRoleIndex = roleHierarchy.indexOf(requiredRole);

  return userRoleIndex >= requiredRoleIndex;
}

/**
 * Middleware factory for minimum role requirement
 */
export function requireMinimumRole(minimumRole: UserRole) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = req.user;

    if (!user) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required',
      });
      return;
    }

    if (!isRoleHigherOrEqual(user.role, minimumRole)) {
      res.status(403).json({
        error: 'Forbidden',
        message: `Minimum role required: ${minimumRole}`,
        userRole: user.role,
        minimumRequired: minimumRole,
      });
      return;
    }

    next();
  };
}

export default {
  requirePermission,
  requireAnyPermission,
  requireRole,
  requireOwnership,
  requireRestaurantAccess,
  requireMinimumRole,
  auditPermissionCheck,
  getPermissionsForRole,
  roleHasPermission,
  userHasPermission,
  isRoleHigherOrEqual,
  UserRole,
  Permission,
};

