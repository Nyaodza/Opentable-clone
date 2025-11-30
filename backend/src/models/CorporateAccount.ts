import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

export enum AccountStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
  PENDING_APPROVAL = 'pending_approval'
}

export enum BillingCycle {
  MONTHLY = 'monthly',
  QUARTERLY = 'quarterly',
  ANNUALLY = 'annually'
}

export enum ExpensePolicy {
  PRE_APPROVAL = 'pre_approval',
  POST_APPROVAL = 'post_approval',
  NO_APPROVAL = 'no_approval'
}

interface CorporateAccountAttributes {
  id: number;
  companyName: string;
  companyCode: string;
  domain: string;
  
  // Contact Information
  primaryContactName: string;
  primaryContactEmail: string;
  primaryContactPhone?: string;
  billingContactName?: string;
  billingContactEmail?: string;
  
  // Address
  billingAddress: string;
  billingCity: string;
  billingState?: string;
  billingZip: string;
  billingCountry: string;
  
  // Account Details
  status: AccountStatus;
  accountManagerId?: number;
  salesRepId?: number;
  
  // Billing & Limits
  creditLimit: number;
  currentBalance: number;
  billingCycle: BillingCycle;
  paymentTerms: number; // days
  
  // Policies & Settings
  expensePolicy: ExpensePolicy;
  maxPerMealAmount?: number;
  maxMonthlyAmount?: number;
  allowedCuisines?: string[];
  allowedRestaurants?: number[];
  blockedRestaurants?: number[];
  allowedDays?: string[];
  allowedTimeSlots?: string[];
  
  // Employee Management
  maxEmployees?: number;
  currentEmployees: number;
  requireManagerApproval: boolean;
  autoApprovalLimit?: number;
  
  // Reporting & Analytics
  reportingEnabled: boolean;
  reportingFrequency?: string;
  customReports?: string[];
  
  // Contract Details
  contractStartDate?: Date;
  contractEndDate?: Date;
  contractValue?: number;
  discountRate?: number;
  
  // Features & Add-ons
  features: string[];
  addOns?: string[];
  
  // Metadata
  metadata?: Record<string, any>;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

interface CorporateAccountCreationAttributes extends Optional<CorporateAccountAttributes, 'id' | 'createdAt' | 'updatedAt'> {}

class CorporateAccount extends Model<CorporateAccountAttributes, CorporateAccountCreationAttributes> implements CorporateAccountAttributes {
  public id!: number;
  public companyName!: string;
  public companyCode!: string;
  public domain!: string;
  
  public primaryContactName!: string;
  public primaryContactEmail!: string;
  public primaryContactPhone?: string;
  public billingContactName?: string;
  public billingContactEmail?: string;
  
  public billingAddress!: string;
  public billingCity!: string;
  public billingState?: string;
  public billingZip!: string;
  public billingCountry!: string;
  
  public status!: AccountStatus;
  public accountManagerId?: number;
  public salesRepId?: number;
  
  public creditLimit!: number;
  public currentBalance!: number;
  public billingCycle!: BillingCycle;
  public paymentTerms!: number;
  
  public expensePolicy!: ExpensePolicy;
  public maxPerMealAmount?: number;
  public maxMonthlyAmount?: number;
  public allowedCuisines?: string[];
  public allowedRestaurants?: number[];
  public blockedRestaurants?: number[];
  public allowedDays?: string[];
  public allowedTimeSlots?: string[];
  
  public maxEmployees?: number;
  public currentEmployees!: number;
  public requireManagerApproval!: boolean;
  public autoApprovalLimit?: number;
  
  public reportingEnabled!: boolean;
  public reportingFrequency?: string;
  public customReports?: string[];
  
  public contractStartDate?: Date;
  public contractEndDate?: Date;
  public contractValue?: number;
  public discountRate?: number;
  
  public features!: string[];
  public addOns?: string[];
  
  public metadata?: Record<string, any>;
  public notes?: string;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  // Helper methods
  public isActive(): boolean {
    return this.status === AccountStatus.ACTIVE;
  }

  public isWithinCreditLimit(amount: number): boolean {
    return (this.currentBalance + amount) <= this.creditLimit;
  }

  public getCreditUtilization(): number {
    return this.creditLimit > 0 ? (this.currentBalance / this.creditLimit) * 100 : 0;
  }

  public isContractActive(): boolean {
    const now = new Date();
    return (!this.contractStartDate || this.contractStartDate <= now) &&
           (!this.contractEndDate || this.contractEndDate >= now);
  }

  public requiresApproval(amount: number): boolean {
    if (!this.requireManagerApproval) return false;
    if (this.expensePolicy === ExpensePolicy.NO_APPROVAL) return false;
    if (this.autoApprovalLimit && amount <= this.autoApprovalLimit) return false;
    return true;
  }

  public canEmployeeDine(userId: number, restaurantId: number, amount: number, date: Date): boolean {
    // Check if restaurant is allowed
    if (this.allowedRestaurants && !this.allowedRestaurants.includes(restaurantId)) {
      return false;
    }
    
    // Check if restaurant is blocked
    if (this.blockedRestaurants && this.blockedRestaurants.includes(restaurantId)) {
      return false;
    }
    
    // Check amount limits
    if (this.maxPerMealAmount && amount > this.maxPerMealAmount) {
      return false;
    }
    
    // Check day restrictions
    if (this.allowedDays && this.allowedDays.length > 0) {
      const dayOfWeek = date.toLocaleDateString('en-US', { weekday: 'lowercase' });
      if (!this.allowedDays.includes(dayOfWeek)) {
        return false;
      }
    }
    
    return true;
  }

  public getAvailableCredit(): number {
    return Math.max(0, this.creditLimit - this.currentBalance);
  }
}

CorporateAccount.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    companyName: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: {
        notEmpty: true,
      },
    },
    companyCode: {
      type: DataTypes.STRING(20),
      allowNull: false,
      unique: true,
      validate: {
        notEmpty: true,
        isUppercase: true,
      },
    },
    domain: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: {
        notEmpty: true,
        isUrl: true,
      },
    },
    primaryContactName: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: {
        notEmpty: true,
      },
    },
    primaryContactEmail: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: {
        isEmail: true,
      },
    },
    primaryContactPhone: {
      type: DataTypes.STRING(20),
      allowNull: true,
    },
    billingContactName: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    billingContactEmail: {
      type: DataTypes.STRING(255),
      allowNull: true,
      validate: {
        isEmail: true,
      },
    },
    billingAddress: {
      type: DataTypes.TEXT,
      allowNull: false,
      validate: {
        notEmpty: true,
      },
    },
    billingCity: {
      type: DataTypes.STRING(100),
      allowNull: false,
      validate: {
        notEmpty: true,
      },
    },
    billingState: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    billingZip: {
      type: DataTypes.STRING(20),
      allowNull: false,
      validate: {
        notEmpty: true,
      },
    },
    billingCountry: {
      type: DataTypes.STRING(100),
      allowNull: false,
      validate: {
        notEmpty: true,
      },
    },
    status: {
      type: DataTypes.ENUM(...Object.values(AccountStatus)),
      allowNull: false,
      defaultValue: AccountStatus.PENDING_APPROVAL,
    },
    accountManagerId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id',
      },
    },
    salesRepId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id',
      },
    },
    creditLimit: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0,
      },
    },
    currentBalance: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0,
      },
    },
    billingCycle: {
      type: DataTypes.ENUM(...Object.values(BillingCycle)),
      allowNull: false,
      defaultValue: BillingCycle.MONTHLY,
    },
    paymentTerms: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 30,
      validate: {
        min: 0,
        max: 365,
      },
    },
    expensePolicy: {
      type: DataTypes.ENUM(...Object.values(ExpensePolicy)),
      allowNull: false,
      defaultValue: ExpensePolicy.POST_APPROVAL,
    },
    maxPerMealAmount: {
      type: DataTypes.DECIMAL(8, 2),
      allowNull: true,
      validate: {
        min: 0,
      },
    },
    maxMonthlyAmount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      validate: {
        min: 0,
      },
    },
    allowedCuisines: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      allowNull: true,
    },
    allowedRestaurants: {
      type: DataTypes.ARRAY(DataTypes.INTEGER),
      allowNull: true,
    },
    blockedRestaurants: {
      type: DataTypes.ARRAY(DataTypes.INTEGER),
      allowNull: true,
    },
    allowedDays: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      allowNull: true,
    },
    allowedTimeSlots: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      allowNull: true,
    },
    maxEmployees: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        min: 1,
      },
    },
    currentEmployees: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0,
      },
    },
    requireManagerApproval: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    autoApprovalLimit: {
      type: DataTypes.DECIMAL(8, 2),
      allowNull: true,
      validate: {
        min: 0,
      },
    },
    reportingEnabled: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    reportingFrequency: {
      type: DataTypes.STRING(20),
      allowNull: true,
    },
    customReports: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      allowNull: true,
    },
    contractStartDate: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    contractEndDate: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    contractValue: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: true,
      validate: {
        min: 0,
      },
    },
    discountRate: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true,
      validate: {
        min: 0,
        max: 100,
      },
    },
    features: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      allowNull: false,
      defaultValue: [],
    },
    addOns: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      allowNull: true,
    },
    metadata: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: {},
    },
    notes: {
      type: DataTypes.TEXT,
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
    modelName: 'CorporateAccount',
    tableName: 'corporate_accounts',
    timestamps: true,
    indexes: [
      {
        fields: ['companyCode'],
        unique: true,
      },
      {
        fields: ['status'],
      },
      {
        fields: ['domain'],
      },
      {
        fields: ['accountManagerId'],
      },
      {
        fields: ['contractStartDate', 'contractEndDate'],
      },
    ],
  }
);

export { CorporateAccount, CorporateAccountAttributes, CorporateAccountCreationAttributes };
export default CorporateAccount;
