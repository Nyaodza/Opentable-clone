import { Request, Response, NextFunction } from 'express';
import { Tenant } from '../models/tenant.model';
import { AppError } from '../utils/errors';
import { redisClient } from '../config/redis';

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      tenant?: Tenant;
      tenantId?: string;
    }
  }
}

export const tenantIdentification = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    let tenantId: string | null = null;
    let tenant: Tenant | null = null;

    // 1. Check subdomain
    const host = req.get('host');
    if (host) {
      const subdomain = host.split('.')[0];
      
      // Check if it's not www or api
      if (subdomain && !['www', 'api', 'app'].includes(subdomain)) {
        // Try cache first
        const cachedTenant = await redisClient.get(`tenant:subdomain:${subdomain}`);
        if (cachedTenant) {
          tenant = JSON.parse(cachedTenant);
        } else {
          tenant = await Tenant.findOne({ where: { slug: subdomain } });
          if (tenant) {
            await redisClient.setex(
              `tenant:subdomain:${subdomain}`,
              3600,
              JSON.stringify(tenant)
            );
          }
        }
      }
    }

    // 2. Check custom domain
    if (!tenant && host) {
      const cachedTenant = await redisClient.get(`tenant:domain:${host}`);
      if (cachedTenant) {
        tenant = JSON.parse(cachedTenant);
      } else {
        tenant = await Tenant.findOne({
          where: {
            customDomains: {
              contains: [host],
            },
          },
        });
        if (tenant) {
          await redisClient.setex(
            `tenant:domain:${host}`,
            3600,
            JSON.stringify(tenant)
          );
        }
      }
    }

    // 3. Check X-Tenant-ID header (for API access)
    const headerTenantId = req.headers['x-tenant-id'] as string;
    if (!tenant && headerTenantId) {
      const cachedTenant = await redisClient.get(`tenant:id:${headerTenantId}`);
      if (cachedTenant) {
        tenant = JSON.parse(cachedTenant);
      } else {
        tenant = await Tenant.findByPk(headerTenantId);
        if (tenant) {
          await redisClient.setex(
            `tenant:id:${headerTenantId}`,
            3600,
            JSON.stringify(tenant)
          );
        }
      }
    }

    // 4. Check JWT token for tenant ID
    if (!tenant && req.user && (req.user as any).tenantId) {
      tenantId = (req.user as any).tenantId;
      const cachedTenant = await redisClient.get(`tenant:id:${tenantId}`);
      if (cachedTenant) {
        tenant = JSON.parse(cachedTenant);
      } else {
        tenant = await Tenant.findByPk(tenantId);
        if (tenant) {
          await redisClient.setex(
            `tenant:id:${tenantId}`,
            3600,
            JSON.stringify(tenant)
          );
        }
      }
    }

    // If no tenant found and it's required, throw error
    if (!tenant && process.env.REQUIRE_TENANT === 'true') {
      throw new AppError('Tenant not found', 404);
    }

    // Attach tenant to request
    if (tenant) {
      req.tenant = tenant;
      req.tenantId = tenant.id;

      // Check tenant status
      if (tenant.status === 'suspended') {
        throw new AppError('This account has been suspended', 403);
      }

      if (tenant.status === 'cancelled') {
        throw new AppError('This account has been cancelled', 403);
      }

      if (tenant.isTrialExpired()) {
        throw new AppError('Trial period has expired. Please upgrade your plan', 403);
      }
    }

    next();
  } catch (error) {
    next(error);
  }
};

export const requireTenant = (req: Request, res: Response, next: NextFunction) => {
  if (!req.tenant || !req.tenantId) {
    return next(new AppError('Tenant context required', 400));
  }
  next();
};

export const tenantAuthorization = (requiredPlan?: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.tenant) {
      return next(new AppError('Tenant context required', 400));
    }

    if (requiredPlan && !requiredPlan.includes(req.tenant.settings.billing.plan)) {
      return next(
        new AppError(
          `This feature requires ${requiredPlan.join(' or ')} plan`,
          403
        )
      );
    }

    next();
  };
};

export const checkTenantLimits = (resource: 'restaurant' | 'user' | 'reservation') => {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.tenant) {
      return next(new AppError('Tenant context required', 400));
    }

    try {
      switch (resource) {
        case 'restaurant':
          if (!req.tenant.canAddRestaurant()) {
            throw new AppError(
              `Restaurant limit reached. Maximum allowed: ${req.tenant.settings.limits.maxRestaurants}`,
              403
            );
          }
          break;

        case 'user':
          if (!req.tenant.canAddUser()) {
            throw new AppError(
              `User limit reached. Maximum allowed: ${req.tenant.settings.limits.maxUsers}`,
              403
            );
          }
          break;

        case 'reservation':
          // Check monthly reservation limit
          const currentMonth = new Date().getMonth();
          const currentYear = new Date().getFullYear();
          const reservationCount = await redisClient.get(
            `tenant:${req.tenantId}:reservations:${currentYear}:${currentMonth}`
          );

          if (
            reservationCount &&
            parseInt(reservationCount) >= req.tenant.settings.limits.maxReservationsPerMonth
          ) {
            throw new AppError(
              `Monthly reservation limit reached. Maximum allowed: ${req.tenant.settings.limits.maxReservationsPerMonth}`,
              403
            );
          }
          break;
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

// Middleware to filter queries by tenant
export const tenantScope = (req: Request, res: Response, next: NextFunction) => {
  if (req.tenant) {
    // Add tenant filter to all database queries
    const originalFind = req.app.locals.sequelize.models;
    
    Object.keys(originalFind).forEach(modelName => {
      const model = originalFind[modelName];
      if (model.rawAttributes.tenantId) {
        model.addScope('tenant', {
          where: { tenantId: req.tenantId }
        });
      }
    });
  }
  next();
};