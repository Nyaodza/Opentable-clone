import { Table, Column, Model, DataType, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { Reservation } from './Reservation';
import { User } from './User';
import { Restaurant } from './Restaurant';

@Table({
  tableName: 'reservation_deposits',
  timestamps: true,
})
export class ReservationDeposit extends Model {
  @Column({
    type: DataType.UUID,
    defaultValue: DataType.UUIDV4,
    primaryKey: true,
  })
  id!: string;

  @ForeignKey(() => Reservation)
  @Column({
    type: DataType.UUID,
    allowNull: false,
  })
  reservationId!: string;

  @ForeignKey(() => User)
  @Column({
    type: DataType.UUID,
    allowNull: false,
  })
  userId!: string;

  @ForeignKey(() => Restaurant)
  @Column({
    type: DataType.UUID,
    allowNull: false,
  })
  restaurantId!: string;

  @Column({
    type: DataType.DECIMAL(10, 2),
    allowNull: false,
  })
  amount!: number;

  @Column({
    type: DataType.STRING,
    defaultValue: 'USD',
  })
  currency!: string;

  @Column({
    type: DataType.ENUM('pending', 'authorized', 'captured', 'refunded', 'failed'),
    defaultValue: 'pending',
  })
  status!: string;

  @Column({
    type: DataType.ENUM('deposit', 'prepayment', 'no_show_fee'),
    allowNull: false,
  })
  type!: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  stripePaymentIntentId!: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  stripeChargeId!: string;

  @Column({
    type: DataType.DATE,
    allowNull: true,
  })
  authorizedAt!: Date;

  @Column({
    type: DataType.DATE,
    allowNull: true,
  })
  capturedAt!: Date;

  @Column({
    type: DataType.DATE,
    allowNull: true,
  })
  refundedAt!: Date;

  @Column({
    type: DataType.DECIMAL(10, 2),
    defaultValue: 0,
  })
  refundAmount!: number;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  refundReason!: string;

  @Column({
    type: DataType.BOOLEAN,
    defaultValue: true,
  })
  isRefundable!: boolean;

  @Column({
    type: DataType.DATE,
    allowNull: true,
  })
  refundableUntil!: Date;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  notes!: string;

  @BelongsTo(() => Reservation)
  reservation!: Reservation;

  @BelongsTo(() => User)
  user!: User;

  @BelongsTo(() => Restaurant)
  restaurant!: Restaurant;
}

export default ReservationDeposit;
