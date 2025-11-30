import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

// POS Provider Types
export enum POSProvider {
  TOAST = 'toast',
  SQUARE = 'square',
  RESY = 'resy',
  TOUCHBISTRO = 'touchbistro',
  LIGHTSPEED = 'lightspeed',
  CLOVER = 'clover',
  NCRMICROS = 'ncrmicros',
  ALOHA = 'aloha',
  UPSERVE = 'upserve',
  CUSTOM = 'custom'
}

export enum IntegrationStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  PENDING = 'pending',
  ERROR = 'error',
  SYNCING = 'syncing'
}

export enum SyncDirection {
  BIDIRECTIONAL = 'bidirectional',
  TO_POS = 'to_pos',
  FROM_POS = 'from_pos'
}

interface POSIntegrationAttributes {
  id: number;
  restaurantId: number;
  provider: POSProvider;
  providerLocationId?: string;
  status: IntegrationStatus;
  syncDirection: SyncDirection;
  
  // Connection Details
  apiEndpoint?: string;
  apiKey?: string;
  accessToken?: string;
  refreshToken?: string;
  webhookUrl?: string;
  webhookSecret?: string;
  
  // Configuration
  syncReservations: boolean;
  syncTables: boolean;
  syncMenus: boolean;
  syncAvailability: boolean;
  syncWaitlist: boolean;
  syncCustomers: boolean;
  
  // Sync Settings
  syncInterval: number; // minutes
  lastSyncAt?: Date;
  nextSyncAt?: Date;
  
  // Feature Mapping
  featureMapping: Record<string, any>;
  fieldMapping: Record<string, any>;
  
  // Status & Monitoring
  syncErrors: any[];
  lastError?: string;
  lastErrorAt?: Date;
  successfulSyncs: number;
  failedSyncs: number;
  
  // Metadata
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

interface POSIntegrationCreationAttributes extends Optional<POSIntegrationAttributes, 'id' | 'createdAt' | 'updatedAt'> {}

class POSIntegration extends Model<POSIntegrationAttributes, POSIntegrationCreationAttributes> implements POSIntegrationAttributes {
  public id!: number;
  public restaurantId!: number;
  public provider!: POSProvider;
  public providerLocationId?: string;
  public status!: IntegrationStatus;
  public syncDirection!: SyncDirection;
  
  public apiEndpoint?: string;
  public apiKey?: string;
  public accessToken?: string;
  public refreshToken?: string;
  public webhookUrl?: string;
  public webhookSecret?: string;
  
  public syncReservations!: boolean;
  public syncTables!: boolean;
  public syncMenus!: boolean;
  public syncAvailability!: boolean;
  public syncWaitlist!: boolean;
  public syncCustomers!: boolean;
  
  public syncInterval!: number;
  public lastSyncAt?: Date;
  public nextSyncAt?: Date;
  
  public featureMapping!: Record<string, any>;
  public fieldMapping!: Record<string, any>;
  
  public syncErrors!: any[];
  public lastError?: string;
  public lastErrorAt?: Date;
  public successfulSyncs!: number;
  public failedSyncs!: number;
  
  public metadata?: Record<string, any>;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  // Helper methods
  public isHealthy(): boolean {
    return this.status === IntegrationStatus.ACTIVE && !this.lastError;
  }

  public getSuccessRate(): number {
    const total = this.successfulSyncs + this.failedSyncs;
    return total > 0 ? (this.successfulSyncs / total) * 100 : 0;
  }

  public requiresReauth(): boolean {
    return this.status === IntegrationStatus.ERROR && 
           this.lastError?.includes('authentication');
  }

  public getProviderDisplayName(): string {
    const names: Record<POSProvider, string> = {
      [POSProvider.TOAST]: 'Toast POS',
      [POSProvider.SQUARE]: 'Square',
      [POSProvider.RESY]: 'Resy',
      [POSProvider.TOUCHBISTRO]: 'TouchBistro',
      [POSProvider.LIGHTSPEED]: 'Lightspeed Restaurant',
      [POSProvider.CLOVER]: 'Clover',
      [POSProvider.NCRMICROS]: 'NCR Micros',
      [POSProvider.ALOHA]: 'Aloha POS',
      [POSProvider.UPSERVE]: 'Upserve',
      [POSProvider.CUSTOM]: 'Custom Integration'
    };
    return names[this.provider] || this.provider;
  }

  public updateSyncStatus(success: boolean, error?: string): void {
    if (success) {
      this.successfulSyncs += 1;
      this.lastError = undefined;
      this.lastErrorAt = undefined;
    } else {
      this.failedSyncs += 1;
      this.lastError = error || 'Unknown error';
      this.lastErrorAt = new Date();
    }
    this.lastSyncAt = new Date();
    this.nextSyncAt = new Date(Date.now() + this.syncInterval * 60 * 1000);
  }
}

POSIntegration.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    restaurantId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'restaurants',
        key: 'id',
      },
    },
    provider: {
      type: DataTypes.ENUM(...Object.values(POSProvider)),
      allowNull: false,
    },
    providerLocationId: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM(...Object.values(IntegrationStatus)),
      allowNull: false,
      defaultValue: IntegrationStatus.PENDING,
    },
    syncDirection: {
      type: DataTypes.ENUM(...Object.values(SyncDirection)),
      allowNull: false,
      defaultValue: SyncDirection.BIDIRECTIONAL,
    },
    apiEndpoint: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    apiKey: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    accessToken: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    refreshToken: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    webhookUrl: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    webhookSecret: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    syncReservations: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    syncTables: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    syncMenus: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    syncAvailability: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    syncWaitlist: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    syncCustomers: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    syncInterval: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 15, // 15 minutes
      validate: {
        min: 1,
        max: 1440, // 24 hours
      },
    },
    lastSyncAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    nextSyncAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    featureMapping: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {},
    },
    fieldMapping: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {},
    },
    syncErrors: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: [],
    },
    lastError: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    lastErrorAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    successfulSyncs: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    failedSyncs: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    metadata: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: {},
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
    modelName: 'POSIntegration',
    tableName: 'pos_integrations',
    timestamps: true,
    indexes: [
      {
        fields: ['restaurantId'],
      },
      {
        fields: ['provider'],
      },
      {
        fields: ['status'],
      },
      {
        fields: ['nextSyncAt'],
      },
      {
        unique: true,
        fields: ['restaurantId', 'provider'],
      },
    ],
  }
);

export { POSIntegration, POSIntegrationAttributes, POSIntegrationCreationAttributes };
export default POSIntegration;
