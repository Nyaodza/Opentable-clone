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
import { Reservation } from './Reservation';
import { Restaurant } from './Restaurant';

export enum PointsTransactionType {
  EARN = 'earn',
  REDEEM = 'redeem',
  BONUS = 'bonus',
  REFUND = 'refund',
  EXPIRE = 'expire',
  ADJUSTMENT = 'adjustment'
}

export enum PointsTransactionStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  FAILED = 'failed'
}

@Table({
  tableName: 'points_transactions',
  timestamps: true
})
export class PointsTransaction extends Model {
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

  @ForeignKey(() => Reservation)
  @Column({
    type: DataType.UUID
  })
  reservationId?: string;

  @ForeignKey(() => Restaurant)
  @Column({
    type: DataType.UUID
  })
  restaurantId?: string;

  @Column({
    type: DataType.ENUM(...Object.values(PointsTransactionType)),
    allowNull: false
  })
  type!: PointsTransactionType;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    comment: 'Points amount (positive for earn, negative for redeem)'
  })
  points!: number;

  @Column({
    type: DataType.INTEGER,
    allowNull: false
  })
  balanceBefore!: number;

  @Column({
    type: DataType.INTEGER,
    allowNull: false
  })
  balanceAfter!: number;

  @Column({
    type: DataType.ENUM(...Object.values(PointsTransactionStatus)),
    defaultValue: PointsTransactionStatus.COMPLETED
  })
  status!: PointsTransactionStatus;

  @Column({
    type: DataType.TEXT
  })
  description?: string;

  @Column({
    type: DataType.JSON,
    defaultValue: {}
  })
  metadata!: any;

  @Column({
    type: DataType.DATE
  })
  expiresAt?: Date;

  @CreatedAt
  createdAt!: Date;

  @UpdatedAt
  updatedAt!: Date;

  @BelongsTo(() => User)
  user!: User;

  @BelongsTo(() => Reservation)
  reservation?: Reservation;

  @BelongsTo(() => Restaurant)
  restaurant?: Restaurant;
}
