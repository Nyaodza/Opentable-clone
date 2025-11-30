import {
  Table,
  Column,
  Model,
  DataType,
  PrimaryKey,
  Default,
  ForeignKey,
  BelongsTo,
  CreatedAt,
  UpdatedAt
} from 'sequelize-typescript';
import { User } from './User';
import { Restaurant } from './Restaurant';

export enum TransactionType {
  EARN = 'earn',
  REDEEM = 'redeem',
  BONUS = 'bonus',
  EXPIRE = 'expire',
  ADJUSTMENT = 'adjustment'
}

export enum TierLevel {
  BRONZE = 'bronze',
  SILVER = 'silver',
  GOLD = 'gold',
  PLATINUM = 'platinum'
}

@Table({
  tableName: 'loyalty_transactions',
  timestamps: true
})
export class LoyaltyTransaction extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  id!: string;

  @ForeignKey(() => User)
  @Column({
    type: DataType.UUID,
    allowNull: false
  })
  userId!: string;

  @ForeignKey(() => Restaurant)
  @Column({
    type: DataType.UUID,
    allowNull: true
  })
  restaurantId?: string;

  @Column({
    type: DataType.ENUM(...Object.values(TransactionType)),
    allowNull: false
  })
  type!: TransactionType;

  @Column({
    type: DataType.INTEGER,
    allowNull: false
  })
  points!: number;

  @Column({
    type: DataType.INTEGER,
    allowNull: false
  })
  balanceAfter!: number;

  @Column({
    type: DataType.STRING,
    allowNull: false
  })
  description!: string;

  @Column({
    type: DataType.STRING
  })
  referenceId?: string; // reservation ID, review ID, etc.

  @Column({
    type: DataType.DATE
  })
  expiresAt?: Date;

  @Column({
    type: DataType.BOOLEAN,
    defaultValue: false
  })
  expiryProcessed!: boolean;

  @Column({
    type: DataType.JSON,
    defaultValue: {}
  })
  metadata!: Record<string, any>;

  @CreatedAt
  createdAt!: Date;

  @UpdatedAt
  updatedAt!: Date;

  @BelongsTo(() => User)
  user!: User;

  @BelongsTo(() => Restaurant)
  restaurant?: Restaurant;
}

@Table({
  tableName: 'loyalty_rewards',
  timestamps: true
})
export class LoyaltyReward extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  id!: string;

  @Column({
    type: DataType.STRING,
    allowNull: false
  })
  name!: string;

  @Column({
    type: DataType.TEXT,
    allowNull: false
  })
  description!: string;

  @Column({
    type: DataType.INTEGER,
    allowNull: false
  })
  pointsCost!: number;

  @Column({
    type: DataType.ENUM(...Object.values(TierLevel)),
    allowNull: false
  })
  minimumTier!: TierLevel;

  @Column({
    type: DataType.STRING
  })
  category!: string; // dining, experience, merchandise

  @Column({
    type: DataType.DECIMAL(10, 2)
  })
  value?: number; // monetary value

  @Column({
    type: DataType.INTEGER,
    defaultValue: 0
  })
  maxRedemptions!: number; // 0 = unlimited

  @Column({
    type: DataType.INTEGER,
    defaultValue: 0
  })
  currentRedemptions!: number;

  @Column({
    type: DataType.DATE
  })
  validFrom?: Date;

  @Column({
    type: DataType.DATE
  })
  validUntil?: Date;

  @Column({
    type: DataType.BOOLEAN,
    defaultValue: true
  })
  isActive!: boolean;

  @Column({
    type: DataType.JSON,
    defaultValue: {}
  })
  restrictions!: {
    restaurantIds?: string[];
    daysOfWeek?: string[];
    timeSlots?: string[];
    minimumPartySize?: number;
  };

  @CreatedAt
  createdAt!: Date;

  @UpdatedAt
  updatedAt!: Date;
}

@Table({
  tableName: 'user_rewards',
  timestamps: true
})
export class UserReward extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  id!: string;

  @ForeignKey(() => User)
  @Column({
    type: DataType.UUID,
    allowNull: false
  })
  userId!: string;

  @ForeignKey(() => LoyaltyReward)
  @Column({
    type: DataType.UUID,
    allowNull: false
  })
  rewardId!: string;

  @Column({
    type: DataType.STRING,
    unique: true
  })
  redemptionCode!: string;

  @Column({
    type: DataType.BOOLEAN,
    defaultValue: false
  })
  isUsed!: boolean;

  @Column({
    type: DataType.DATE
  })
  usedAt?: Date;

  @Column({
    type: DataType.DATE,
    allowNull: false
  })
  expiresAt!: Date;

  @CreatedAt
  createdAt!: Date;

  @UpdatedAt
  updatedAt!: Date;

  @BelongsTo(() => User)
  user!: User;

  @BelongsTo(() => LoyaltyReward)
  reward!: LoyaltyReward;
}