import {
  Model,
  Table,
  Column,
  DataType,
  PrimaryKey,
  Default,
  CreatedAt,
  UpdatedAt,
  HasMany,
  BeforeCreate,
} from 'sequelize-typescript';
import { v4 as uuidv4 } from 'uuid';
import { User } from './user.model';
import { Restaurant } from './restaurant.model';

export interface TenantSettings {
  branding: {
    primaryColor: string;
    secondaryColor: string;
    logo: string;
    favicon: string;
    customCSS?: string;
  };
  features: {
    loyaltyProgram: boolean;
    multipleLocations: boolean;
    advancedAnalytics: boolean;
    customReports: boolean;
    apiAccess: boolean;
    whiteLabel: boolean;
    customDomain: boolean;
    ssoEnabled: boolean;
  };
  limits: {
    maxRestaurants: number;
    maxUsers: number;
    maxReservationsPerMonth: number;
    dataRetentionDays: number;
  };
  billing: {
    plan: 'starter' | 'professional' | 'enterprise' | 'custom';
    billingCycle: 'monthly' | 'annual';
    nextBillingDate: Date;
    paymentMethod?: string;
  };
  integrations: {
    slack?: { webhookUrl: string; enabled: boolean };
    salesforce?: { instanceUrl: string; accessToken: string };
    zapier?: { apiKey: string; enabled: boolean };
    googleCalendar?: { enabled: boolean };
    microsoftTeams?: { enabled: boolean };
  };
}

@Table({
  tableName: 'tenants',
  timestamps: true,
})
export default class Tenant extends Model {
  @PrimaryKey
  @Default(uuidv4)
  @Column(DataType.UUID)
  id!: string;

  @Column({
    type: DataType.STRING,
    allowNull: false,
    unique: true,
  })
  slug!: string;

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  name!: string;

  @Column({
    type: DataType.STRING,
    allowNull: false,
    unique: true,
  })
  domain!: string;

  @Column({
    type: DataType.ARRAY(DataType.STRING),
    defaultValue: [],
  })
  customDomains!: string[];

  @Column({
    type: DataType.JSON,
    defaultValue: {},
  })
  settings!: TenantSettings;

  @Column({
    type: DataType.ENUM('active', 'suspended', 'trial', 'cancelled'),
    defaultValue: 'trial',
  })
  status!: 'active' | 'suspended' | 'trial' | 'cancelled';

  @Column({
    type: DataType.DATE,
    allowNull: true,
  })
  trialEndsAt!: Date;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  stripeCustomerId!: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  stripeSubscriptionId!: string;

  @Column({
    type: DataType.JSON,
    defaultValue: {},
  })
  metadata!: Record<string, any>;

  @CreatedAt
  createdAt!: Date;

  @UpdatedAt
  updatedAt!: Date;

  // Associations
  @HasMany(() => User)
  users!: User[];

  @HasMany(() => Restaurant)
  restaurants!: Restaurant[];

  @BeforeCreate
  static generateSlug(instance: Tenant) {
    if (!instance.slug) {
      instance.slug = instance.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
    }
  }

  // Instance methods
  isTrialExpired(): boolean {
    return this.status === 'trial' && this.trialEndsAt < new Date();
  }

  canAddRestaurant(): boolean {
    return this.restaurants.length < this.settings.limits.maxRestaurants;
  }

  canAddUser(): boolean {
    return this.users.length < this.settings.limits.maxUsers;
  }

  getCustomDomain(): string | null {
    return this.customDomains.length > 0 ? this.customDomains[0] : null;
  }
}