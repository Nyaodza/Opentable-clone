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
import { Restaurant } from './Restaurant';

export enum PolicyType {
  FLEXIBLE = 'flexible',
  MODERATE = 'moderate',
  STRICT = 'strict',
  CUSTOM = 'custom'
}

@Table({
  tableName: 'cancellation_policies',
  timestamps: true
})
export class CancellationPolicy extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  id!: string;

  @ForeignKey(() => Restaurant)
  @Column({
    type: DataType.UUID,
    allowNull: false
  })
  restaurantId!: string;

  @Column({
    type: DataType.STRING,
    allowNull: false
  })
  name!: string;

  @Column({
    type: DataType.ENUM(...Object.values(PolicyType)),
    allowNull: false
  })
  policyType!: PolicyType;

  @Column({
    type: DataType.TEXT
  })
  description?: string;

  @Column({
    type: DataType.INTEGER,
    defaultValue: 24,
    comment: 'Hours before reservation for free cancellation'
  })
  freeHoursBefore!: number;

  @Column({
    type: DataType.JSON,
    defaultValue: [],
    comment: 'Array of fee tiers based on cancellation timing'
  })
  feeTiers!: Array<{
    hoursBeforeReservation: number;
    feePercentage: number;
    fixedFeeAmount?: number;
  }>;

  @Column({
    type: DataType.DECIMAL(10, 2),
    defaultValue: 0
  })
  minimumFee!: number;

  @Column({
    type: DataType.DECIMAL(10, 2)
  })
  maximumFee?: number;

  @Column({
    type: DataType.BOOLEAN,
    defaultValue: false
  })
  chargeNoShowFee!: boolean;

  @Column({
    type: DataType.DECIMAL(10, 2),
    defaultValue: 0
  })
  noShowFeeAmount!: number;

  @Column({
    type: DataType.JSON,
    defaultValue: {},
    comment: 'Conditions for fee waivers'
  })
  waiverConditions!: {
    emergencyWaiver?: boolean;
    firstTimeWaiver?: boolean;
    loyaltyTierWaiver?: string[];
  };

  @Column({
    type: DataType.BOOLEAN,
    defaultValue: true
  })
  isActive!: boolean;

  @Column({
    type: DataType.BOOLEAN,
    defaultValue: false
  })
  isDefault!: boolean;

  @CreatedAt
  createdAt!: Date;

  @UpdatedAt
  updatedAt!: Date;

  @BelongsTo(() => Restaurant)
  restaurant!: Restaurant;
}
