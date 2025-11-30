import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

export interface TenantAttributes {
  id: number;
  tenantId: string;
  name: string;
  slug: string;
  domain?: string;
  type: 'region' | 'city' | 'country' | 'global';
  parentTenantId?: string;
  configuration: {
    defaultCurrency: string;
    defaultLanguage: string;
    supportedCurrencies: string[];
    supportedLanguages: string[];
    timezone: string;
    dateFormat: string;
    timeFormat: string;
    taxConfiguration: {
      enabled: boolean;
      rate: number;
      includedInPrice: boolean;
    };
    fees: {
      bookingFee: number;
      cancellationFee: number;
      noShowFee: number;
    };
    features: {
      vipProgram: boolean;
      loyaltyPoints: boolean;
      giftCards: boolean;
      waitlist: boolean;
      takeout: boolean;
      delivery: boolean;
      virtualDining: boolean;
      corporateAccounts: boolean;
    };
  };
  branding: {
    primaryColor: string;
    secondaryColor: string;
    logoUrl?: string;
    faviconUrl?: string;
    customCss?: string;
  };
  compliance: {
    gdprCompliant: boolean;
    ccpaCompliant: boolean;
    dataRetentionDays: number;
    privacyPolicyUrl?: string;
    termsOfServiceUrl?: string;
  };
  limits: {
    maxRestaurants: number;
    maxReservationsPerDay: number;
    maxUsersPerRestaurant: number;
    storageQuotaGB: number;
  };
  billing: {
    plan: 'free' | 'starter' | 'professional' | 'enterprise';
    stripeCustomerId?: string;
    billingCycle: 'monthly' | 'annual';
    nextBillingDate?: Date;
    paymentMethod?: string;
  };
  integrations: {
    posSystemId?: string;
    paymentGateway?: string;
    smsProvider?: string;
    emailProvider?: string;
    analyticsId?: string;
  };
  metadata: Record<string, any>;
  isActive: boolean;
  launchDate?: Date;
  expiryDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

interface TenantCreationAttributes extends Optional<TenantAttributes, 'id' | 'createdAt' | 'updatedAt'> {}

export class Tenant extends Model<TenantAttributes, TenantCreationAttributes> implements TenantAttributes {
  public id!: number;
  public tenantId!: string;
  public name!: string;
  public slug!: string;
  public domain?: string;
  public type!: 'region' | 'city' | 'country' | 'global';
  public parentTenantId?: string;
  public configuration!: TenantAttributes['configuration'];
  public branding!: TenantAttributes['branding'];
  public compliance!: TenantAttributes['compliance'];
  public limits!: TenantAttributes['limits'];
  public billing!: TenantAttributes['billing'];
  public integrations!: TenantAttributes['integrations'];
  public metadata!: Record<string, any>;
  public isActive!: boolean;
  public launchDate?: Date;
  public expiryDate?: Date;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  // Helper methods
  public isFeatureEnabled(feature: keyof TenantAttributes['configuration']['features']): boolean {
    return this.configuration.features[feature] || false;
  }

  public hasCapacity(): boolean {
    // Check if tenant has reached its limits
    return true; // Implement actual logic
  }

  public getHierarchy(): Promise<Tenant[]> {
    // Get tenant hierarchy (parent and children)
    return Tenant.findAll({
      where: {
        [sequelize.Op.or]: [
          { tenantId: this.parentTenantId },
          { parentTenantId: this.tenantId }
        ]
      }
    });
  }

  public async getSettings(): Promise<Record<string, any>> {
    const hierarchy = await this.getHierarchy();
    // Merge settings from parent tenants
    let settings = {};
    for (const tenant of hierarchy) {
      settings = { ...settings, ...tenant.configuration };
    }
    return { ...settings, ...this.configuration };
  }
}

Tenant.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    tenantId: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      allowNull: false,
      unique: true,
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    slug: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
      validate: {
        is: /^[a-z0-9-]+$/,
      },
    },
    domain: {
      type: DataTypes.STRING(255),
      allowNull: true,
      unique: true,
    },
    type: {
      type: DataTypes.ENUM('region', 'city', 'country', 'global'),
      allowNull: false,
      defaultValue: 'city',
    },
    parentTenantId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'tenants',
        key: 'tenantId',
      },
    },
    configuration: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {
        defaultCurrency: 'USD',
        defaultLanguage: 'en',
        supportedCurrencies: ['USD'],
        supportedLanguages: ['en'],
        timezone: 'America/New_York',
        dateFormat: 'MM/DD/YYYY',
        timeFormat: '12h',
        taxConfiguration: {
          enabled: true,
          rate: 0.08,
          includedInPrice: false,
        },
        fees: {
          bookingFee: 0,
          cancellationFee: 0,
          noShowFee: 25,
        },
        features: {
          vipProgram: true,
          loyaltyPoints: true,
          giftCards: true,
          waitlist: true,
          takeout: true,
          delivery: true,
          virtualDining: true,
          corporateAccounts: true,
        },
      },
    },
    branding: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {
        primaryColor: '#DA3743',
        secondaryColor: '#247F9E',
      },
    },
    compliance: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {
        gdprCompliant: false,
        ccpaCompliant: false,
        dataRetentionDays: 365,
      },
    },
    limits: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {
        maxRestaurants: 1000,
        maxReservationsPerDay: 10000,
        maxUsersPerRestaurant: 50,
        storageQuotaGB: 100,
      },
    },
    billing: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {
        plan: 'free',
        billingCycle: 'monthly',
      },
    },
    integrations: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {},
    },
    metadata: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {},
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    launchDate: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    expiryDate: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
  },
  {
    sequelize,
    modelName: 'Tenant',
    tableName: 'tenants',
    timestamps: true,
    indexes: [
      { fields: ['tenantId'], unique: true },
      { fields: ['slug'], unique: true },
      { fields: ['domain'], unique: true },
      { fields: ['parentTenantId'] },
      { fields: ['type'] },
      { fields: ['isActive'] },
    ],
  }
);

export default Tenant;