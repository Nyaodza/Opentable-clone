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

export enum PaymentStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  FAILED = 'failed',
  REFUNDED = 'refunded',
  PARTIALLY_REFUNDED = 'partially_refunded'
}

export enum PaymentType {
  DEPOSIT = 'deposit',
  CANCELLATION_FEE = 'cancellation_fee',
  NO_SHOW_FEE = 'no_show_fee'
}

@Table({
  tableName: 'payments',
  timestamps: true
})
export class Payment extends Model {
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
    type: DataType.UUID,
    allowNull: false
  })
  reservationId!: string;

  @ForeignKey(() => Restaurant)
  @Column({
    type: DataType.UUID,
    allowNull: false
  })
  restaurantId!: string;

  @Column({
    type: DataType.DECIMAL(10, 2),
    allowNull: false
  })
  amount!: number;

  @Column({
    type: DataType.STRING,
    defaultValue: 'usd'
  })
  currency!: string;

  @Column({
    type: DataType.ENUM(...Object.values(PaymentType)),
    allowNull: false
  })
  type!: PaymentType;

  @Column({
    type: DataType.ENUM(...Object.values(PaymentStatus)),
    defaultValue: PaymentStatus.PENDING
  })
  status!: PaymentStatus;

  @Column({
    type: DataType.STRING,
    unique: true
  })
  stripePaymentIntentId!: string;

  @Column({
    type: DataType.STRING
  })
  stripeCustomerId?: string;

  @Column({
    type: DataType.JSON,
    defaultValue: {}
  })
  metadata!: any;

  @Column({
    type: DataType.DECIMAL(10, 2),
    defaultValue: 0
  })
  refundedAmount!: number;

  @CreatedAt
  createdAt!: Date;

  @UpdatedAt
  updatedAt!: Date;

  @BelongsTo(() => User)
  user!: User;

  @BelongsTo(() => Reservation)
  reservation!: Reservation;

  @BelongsTo(() => Restaurant)
  restaurant!: Restaurant;
}