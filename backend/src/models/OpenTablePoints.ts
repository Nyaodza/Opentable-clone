import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

interface OpenTablePointsAttributes {
  id: string;
  userId: string;
  totalPoints: number;
  availablePoints: number;
  tier: 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM' | 'DIAMOND';
  tierProgress: number;
  expiringPoints: number;
  nextExpirationDate?: string;
  lastTierUpdate: string;
  lifetimeEarned: number;
  lifetimeRedeemed: number;
  createdAt: string;
  updatedAt: string;
}

interface OpenTablePointsCreationAttributes extends Optional<OpenTablePointsAttributes, 'id' | 'createdAt' | 'updatedAt'> {}

class OpenTablePoints extends Model<OpenTablePointsAttributes, OpenTablePointsCreationAttributes> implements OpenTablePointsAttributes {
  public id!: string;
  public userId!: string;
  public totalPoints!: number;
  public availablePoints!: number;
  public tier!: 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM' | 'DIAMOND';
  public tierProgress!: number;
  public expiringPoints!: number;
  public nextExpirationDate?: string;
  public lastTierUpdate!: string;
  public lifetimeEarned!: number;
  public lifetimeRedeemed!: number;
  public readonly createdAt!: string;
  public readonly updatedAt!: string;

  // Association placeholders
  public user?: any;
}

OpenTablePoints.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      unique: true,
      references: {
        model: 'users',
        key: 'id',
      },
    },
    totalPoints: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    availablePoints: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    tier: {
      type: DataTypes.ENUM('BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'DIAMOND'),
      allowNull: false,
      defaultValue: 'BRONZE',
    },
    tierProgress: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
      defaultValue: 0,
    },
    expiringPoints: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    nextExpirationDate: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    lastTierUpdate: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    lifetimeEarned: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    lifetimeRedeemed: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    tableName: 'opentable_points',
    timestamps: true,
    indexes: [
      {
        fields: ['userId'],
        unique: true,
      },
      {
        fields: ['tier'],
      },
      {
        fields: ['lifetimeEarned'],
      },
      {
        fields: ['nextExpirationDate'],
      },
    ],
  }
);

export { OpenTablePoints };
