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
import { CancellationPolicy } from './CancellationPolicy';

export enum FeeStatus {
  CALCULATED = 'calculated',
  CHARGED = 'charged',
  WAIVED = 'waived',
  REFUNDED = 'refunded',
  FAILED = 'failed'
}

@Table({
  tableName: 'cancellation_fees',
  timestamps: true
})
export class CancellationFee extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  id!: string;

  @ForeignKey(() => Reservation)
  @Column({
    type: DataType.UUID,
    allowNull: false
  })
  reservationId!: string;

  @ForeignKey(() => User)
  @Column({
    type: DataType.UUID,
    allowNull: false
  })
  userId!: string;

  @ForeignKey(() => Restaurant)
  @Column({
    type: DataType.UUID,
    allowNull: false
  })
  restaurantId!: string;

  @ForeignKey(() => CancellationPolicy)
  @Column({
    type: DataType.UUID
  })
  policyId?: string;

  @Column({
    type: DataType.DECIMAL(10, 2),
    allowNull: false
  })
  feeAmount!: number;

  @Column({
    type: DataType.STRING,
    defaultValue: 'usd'
  })
  currency!: string;

  @Column({
    type: DataType.ENUM(...Object.values(FeeStatus)),
    defaultValue: FeeStatus.CALCULATED
  })
  status!: FeeStatus;

  @Column({
    type: DataType.DATE,
    allowNull: false
  })
  cancellationTime!: Date;

  @Column({
    type: DataType.INTEGER,
    comment: 'Hours between cancellation and reservation time'
  })
  hoursBeforeReservation!: number;

  @Column({
    type: DataType.TEXT
  })
  calculationDetails?: string;

  @Column({
    type: DataType.BOOLEAN,
    defaultValue: false
  })
  isWaived!: boolean;

  @Column({
    type: DataType.TEXT
  })
  waiverReason?: string;

  @Column({
    type: DataType.STRING
  })
  stripeChargeId?: string;

  @Column({
    type: DataType.STRING
  })
  stripeRefundId?: string;

  @Column({
    type: DataType.DATE
  })
  chargedAt?: Date;

  @Column({
    type: DataType.DATE
  })
  waivedAt?: Date;

  @Column({
    type: DataType.DATE
  })
  refundedAt?: Date;

  @Column({
    type: DataType.JSON,
    defaultValue: {}
  })
  metadata!: any;

  @CreatedAt
  createdAt!: Date;

  @UpdatedAt
  updatedAt!: Date;

  @BelongsTo(() => Reservation)
  reservation!: Reservation;

  @BelongsTo(() => User)
  user!: User;

  @BelongsTo(() => Restaurant)
  restaurant!: Restaurant;

  @BelongsTo(() => CancellationPolicy)
  policy?: CancellationPolicy;
}
