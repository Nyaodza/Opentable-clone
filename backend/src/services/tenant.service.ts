import { Op } from 'sequelize';
import { Tenant } from '../models/tenant.model';
import { User } from '../models/User';
import { Restaurant } from '../models/Restaurant';
import { AppError } from '../utils/errors';
import { PaymentService } from './payment.service';
import { EmailService } from './email.service';
import stripe from '../config/stripe';

export interface CreateTenantDto {
  name: string;
  domain: string;
  adminEmail: string;
  adminFirstName: string;
  adminLastName: string;
  adminPassword: string;
  plan?: 'starter' | 'professional' | 'enterprise';
  customDomains?: string[];
}

export interface UpdateTenantSettingsDto {
  branding?: {
    primaryColor?: string;
    secondaryColor?: string;
    logo?: string;
    favicon?: string;
    customCSS?: string;
  };
  features?: {
    loyaltyProgram?: boolean;
    multipleLocations?: boolean;
    advancedAnalytics?: boolean;
    customReports?: boolean;
    apiAccess?: boolean;
    whiteLabel?: boolean;
    customDomain?: boolean;
    ssoEnabled?: boolean;
  };
  integrations?: {
    slack?: { webhookUrl: string; enabled: boolean };
    salesforce?: { instanceUrl: string; accessToken: string };
    zapier?: { apiKey: string; enabled: boolean };
    googleCalendar?: { enabled: boolean };
    microsoftTeams?: { enabled: boolean };
  };
}

export class TenantService {
  private static readonly PLAN_LIMITS = {
    starter: {
      maxRestaurants: 1,
      maxUsers: 5,
      maxReservationsPerMonth: 500,
      dataRetentionDays: 30,
    },
    professional: {
      maxRestaurants: 5,
      maxUsers: 25,
      maxReservationsPerMonth: 5000,
      dataRetentionDays: 90,
    },
    enterprise: {
      maxRestaurants: -1, // unlimited
      maxUsers: -1, // unlimited
      maxReservationsPerMonth: -1, // unlimited
      dataRetentionDays: 365,
    },
    custom: {
      maxRestaurants: -1,
      maxUsers: -1,
      maxReservationsPerMonth: -1,
      dataRetentionDays: -1,
    },
  };

  private static readonly PLAN_FEATURES = {
    starter: {
      loyaltyProgram: false,
      multipleLocations: false,
      advancedAnalytics: false,
      customReports: false,
      apiAccess: false,
      whiteLabel: false,
      customDomain: false,
      ssoEnabled: false,
    },
    professional: {
      loyaltyProgram: true,
      multipleLocations: true,
      advancedAnalytics: true,
      customReports: false,
      apiAccess: true,
      whiteLabel: false,
      customDomain: true,
      ssoEnabled: false,
    },
    enterprise: {
      loyaltyProgram: true,
      multipleLocations: true,
      advancedAnalytics: true,
      customReports: true,
      apiAccess: true,
      whiteLabel: true,
      customDomain: true,
      ssoEnabled: true,
    },
  };

  static async createTenant(data: CreateTenantDto): Promise<Tenant> {
    // Check if domain already exists
    const existingTenant = await Tenant.findOne({
      where: {
        [Op.or]: [
          { domain: data.domain },
          { slug: data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') },
        ],
      },
    });

    if (existingTenant) {
      throw new AppError('Domain or slug already exists', 409);
    }

    // Start transaction
    const transaction = await Tenant.sequelize!.transaction();

    try {
      const plan = data.plan || 'starter';
      
      // Create Stripe customer
      const stripeCustomer = await stripe.customers.create({
        name: data.name,
        email: data.adminEmail,
        metadata: {
          tenantName: data.name,
        },
      });

      // Create tenant
      const tenant = await Tenant.create(
        {
          name: data.name,
          domain: data.domain,
          customDomains: data.customDomains || [],
          status: 'trial',
          trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days trial
          stripeCustomerId: stripeCustomer.id,
          settings: {
            branding: {
              primaryColor: '#FF5A5F',
              secondaryColor: '#00A699',
              logo: '/default-logo.png',
              favicon: '/favicon.ico',
            },
            features: this.PLAN_FEATURES[plan],
            limits: this.PLAN_LIMITS[plan],
            billing: {
              plan,
              billingCycle: 'monthly',
              nextBillingDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
            },
            integrations: {},
          },
        },
        { transaction }
      );

      // Create admin user
      const adminUser = await User.create(
        {
          tenantId: tenant.id,
          firstName: data.adminFirstName,
          lastName: data.adminLastName,
          email: data.adminEmail,
          password: data.adminPassword,
          role: 'admin',
          emailVerified: true,
          isActive: true,
        },
        { transaction }
      );

      await transaction.commit();

      // Send welcome email
      await EmailService.sendTenantWelcomeEmail(tenant, adminUser);

      return tenant;
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  static async updateTenantSettings(
    tenantId: string,
    updates: UpdateTenantSettingsDto
  ): Promise<Tenant> {
    const tenant = await Tenant.findByPk(tenantId);
    if (!tenant) {
      throw new AppError('Tenant not found', 404);
    }

    // Merge settings
    const updatedSettings = {
      ...tenant.settings,
      branding: { ...tenant.settings.branding, ...updates.branding },
      features: { ...tenant.settings.features, ...updates.features },
      integrations: { ...tenant.settings.integrations, ...updates.integrations },
    };

    tenant.settings = updatedSettings;
    await tenant.save();

    return tenant;
  }

  static async upgradePlan(
    tenantId: string,
    newPlan: 'starter' | 'professional' | 'enterprise'
  ): Promise<Tenant> {
    const tenant = await Tenant.findByPk(tenantId);
    if (!tenant) {
      throw new AppError('Tenant not found', 404);
    }

    if (tenant.settings.billing.plan === newPlan) {
      throw new AppError('Already on this plan', 400);
    }

    // Create or update Stripe subscription
    const subscription = await PaymentService.createOrUpdateSubscription(
      tenant.stripeCustomerId,
      newPlan
    );

    // Update tenant settings
    tenant.settings = {
      ...tenant.settings,
      features: this.PLAN_FEATURES[newPlan],
      limits: this.PLAN_LIMITS[newPlan],
      billing: {
        ...tenant.settings.billing,
        plan: newPlan,
      },
    };
    tenant.stripeSubscriptionId = subscription.id;
    tenant.status = 'active';
    await tenant.save();

    // Send upgrade confirmation email
    await EmailService.sendPlanUpgradeEmail(tenant, newPlan);

    return tenant;
  }

  static async suspendTenant(tenantId: string, reason: string): Promise<void> {
    const tenant = await Tenant.findByPk(tenantId);
    if (!tenant) {
      throw new AppError('Tenant not found', 404);
    }

    tenant.status = 'suspended';
    tenant.metadata = { ...tenant.metadata, suspensionReason: reason };
    await tenant.save();

    // Cancel Stripe subscription
    if (tenant.stripeSubscriptionId) {
      await stripe.subscriptions.update(tenant.stripeSubscriptionId, {
        cancel_at_period_end: true,
      });
    }

    // Notify tenant
    await EmailService.sendTenantSuspensionEmail(tenant, reason);
  }

  static async getTenantUsageStats(tenantId: string): Promise<any> {
    const tenant = await Tenant.findByPk(tenantId, {
      include: [
        { model: User, attributes: ['id'] },
        { model: Restaurant, attributes: ['id'] },
      ],
    });

    if (!tenant) {
      throw new AppError('Tenant not found', 404);
    }

    // Get current month reservation count
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    
    const reservationCount = await tenant.sequelize!.query(
      `SELECT COUNT(*) as count 
       FROM reservations r
       JOIN restaurants rest ON r.restaurant_id = rest.id
       WHERE rest.tenant_id = :tenantId
       AND EXTRACT(MONTH FROM r.created_at) = :month
       AND EXTRACT(YEAR FROM r.created_at) = :year`,
      {
        replacements: { tenantId, month: currentMonth + 1, year: currentYear },
        type: 'SELECT',
      }
    );

    return {
      users: {
        current: tenant.users.length,
        limit: tenant.settings.limits.maxUsers,
        percentage:
          tenant.settings.limits.maxUsers === -1
            ? 0
            : (tenant.users.length / tenant.settings.limits.maxUsers) * 100,
      },
      restaurants: {
        current: tenant.restaurants.length,
        limit: tenant.settings.limits.maxRestaurants,
        percentage:
          tenant.settings.limits.maxRestaurants === -1
            ? 0
            : (tenant.restaurants.length / tenant.settings.limits.maxRestaurants) * 100,
      },
      reservations: {
        current: (reservationCount[0] as any).count,
        limit: tenant.settings.limits.maxReservationsPerMonth,
        percentage:
          tenant.settings.limits.maxReservationsPerMonth === -1
            ? 0
            : ((reservationCount[0] as any).count /
                tenant.settings.limits.maxReservationsPerMonth) *
              100,
      },
    };
  }

  static async addCustomDomain(tenantId: string, domain: string): Promise<Tenant> {
    const tenant = await Tenant.findByPk(tenantId);
    if (!tenant) {
      throw new AppError('Tenant not found', 404);
    }

    if (!tenant.settings.features.customDomain) {
      throw new AppError('Custom domains not available in your plan', 403);
    }

    // Check if domain is already used
    const existingTenant = await Tenant.findOne({
      where: {
        customDomains: {
          contains: [domain],
        },
      },
    });

    if (existingTenant) {
      throw new AppError('Domain already in use', 409);
    }

    tenant.customDomains = [...tenant.customDomains, domain];
    await tenant.save();

    return tenant;
  }

  static async generateApiKey(tenantId: string): Promise<string> {
    const tenant = await Tenant.findByPk(tenantId);
    if (!tenant) {
      throw new AppError('Tenant not found', 404);
    }

    if (!tenant.settings.features.apiAccess) {
      throw new AppError('API access not available in your plan', 403);
    }

    // Generate API key
    const apiKey = `tk_${Buffer.from(
      `${tenantId}:${Date.now()}:${Math.random()}`
    ).toString('base64')}`;

    tenant.metadata = {
      ...tenant.metadata,
      apiKeys: [...(tenant.metadata.apiKeys || []), { key: apiKey, createdAt: new Date() }],
    };
    await tenant.save();

    return apiKey;
  }

  static async getTenantByApiKey(apiKey: string): Promise<Tenant | null> {
    const tenant = await Tenant.findOne({
      where: {
        'metadata.apiKeys': {
          contains: [{ key: apiKey }],
        },
      },
    });

    return tenant;
  }
}