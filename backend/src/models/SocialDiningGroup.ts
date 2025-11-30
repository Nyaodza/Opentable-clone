import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

interface SocialDiningGroupAttributes {
  id: string;
  name: string;
  description?: string;
  creatorId: string;
  isPrivate: boolean;
  maxMembers: number;
  groupImage?: string;
  preferences: {
    cuisineTypes: string[];
    priceRanges: string[];
    dietaryRestrictions: string[];
    preferredTimes: string[];
    maxDistance: number;
  };
  settings: {
    allowMemberInvites: boolean;
    requireApproval: boolean;
    autoSplitBills: boolean;
    shareReservations: boolean;
  };
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface SocialDiningGroupCreationAttributes 
  extends Optional<SocialDiningGroupAttributes, 'id' | 'createdAt' | 'updatedAt'> {}

class SocialDiningGroup extends Model<SocialDiningGroupAttributes, SocialDiningGroupCreationAttributes>
  implements SocialDiningGroupAttributes {
  public id!: string;
  public name!: string;
  public description?: string;
  public creatorId!: string;
  public isPrivate!: boolean;
  public maxMembers!: number;
  public groupImage?: string;
  public preferences!: {
    cuisineTypes: string[];
    priceRanges: string[];
    dietaryRestrictions: string[];
    preferredTimes: string[];
    maxDistance: number;
  };
  public settings!: {
    allowMemberInvites: boolean;
    requireApproval: boolean;
    autoSplitBills: boolean;
    shareReservations: boolean;
  };
  public isActive!: boolean;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  // Associations
  public creator?: any;
  public members?: any[];
  public reservations?: any[];
  public invitations?: any[];
}

SocialDiningGroup.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        len: [2, 100],
      },
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
      validate: {
        len: [0, 500],
      },
    },
    creatorId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
    },
    isPrivate: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    maxMembers: {
      type: DataTypes.INTEGER,
      defaultValue: 20,
      validate: {
        min: 2,
        max: 100,
      },
    },
    groupImage: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    preferences: {
      type: DataTypes.JSONB,
      defaultValue: {
        cuisineTypes: [],
        priceRanges: [],
        dietaryRestrictions: [],
        preferredTimes: [],
        maxDistance: 25,
      },
    },
    settings: {
      type: DataTypes.JSONB,
      defaultValue: {
        allowMemberInvites: true,
        requireApproval: false,
        autoSplitBills: true,
        shareReservations: true,
      },
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
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
    modelName: 'SocialDiningGroup',
    tableName: 'social_dining_groups',
    timestamps: true,
    indexes: [
      {
        fields: ['creatorId'],
      },
      {
        fields: ['isPrivate', 'isActive'],
      },
      {
        fields: ['createdAt'],
      },
    ],
  }
);

export { SocialDiningGroup, SocialDiningGroupAttributes, SocialDiningGroupCreationAttributes };
