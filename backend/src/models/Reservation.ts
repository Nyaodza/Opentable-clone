import {
  Table,
  Column,
  Model,
  DataType,
  PrimaryKey,
  Default,
  ForeignKey,
  BelongsTo,
  HasOne,
  CreatedAt,
  UpdatedAt
} from 'sequelize-typescript';
import { User } from './User';
import { Restaurant } from './Restaurant';
import { Table as RestaurantTable } from './Table';
import { Review } from './Review';

export enum ReservationStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  SEATED = 'seated',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  NO_SHOW = 'no_show'
}

@Table({
  tableName: 'reservations',
  timestamps: true
})
export class Reservation extends Model {
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
    allowNull: false
  })
  restaurantId!: string;

  @ForeignKey(() => RestaurantTable)
  @Column({
    type: DataType.UUID,
    allowNull: true
  })
  tableId?: string;

  @Column({
    type: DataType.DATE,
    allowNull: false
  })
  dateTime!: Date;

  @Column({
    type: DataType.INTEGER,
    allowNull: false
  })
  partySize!: number;

  @Column({
    type: DataType.ENUM(...Object.values(ReservationStatus)),
    defaultValue: ReservationStatus.PENDING
  })
  status!: ReservationStatus;

  @Column({
    type: DataType.TEXT
  })
  specialRequests?: string;

  @Column({
    type: DataType.ARRAY(DataType.STRING),
    defaultValue: []
  })
  dietaryRestrictions!: string[];

  @Column({
    type: DataType.STRING
  })
  occasionType?: string;

  @Column({
    type: DataType.STRING,
    unique: true
  })
  confirmationCode!: string;

  @Column({
    type: DataType.JSON,
    defaultValue: {}
  })
  guestInfo!: {
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
  };

  @Column({
    type: DataType.DATE
  })
  confirmedAt?: Date;

  @Column({
    type: DataType.DATE
  })
  seatedAt?: Date;

  @Column({
    type: DataType.DATE
  })
  completedAt?: Date;

  @Column({
    type: DataType.DATE
  })
  cancelledAt?: Date;

  @Column({
    type: DataType.TEXT
  })
  cancellationReason?: string;

  @Column({
    type: DataType.INTEGER,
    defaultValue: 0,
    comment: 'Estimated bill amount in cents'
  })
  estimatedBillAmount?: number;

  @Column({
    type: DataType.INTEGER,
    defaultValue: 0,
    comment: 'Deposit amount in cents'
  })
  depositAmount?: number;

  @Column({
    type: DataType.STRING
  })
  paymentIntentId?: string;

  @Column({
    type: DataType.STRING,
    defaultValue: 'pending'
  })
  paymentStatus?: string;

  @Column({
    type: DataType.DATE
  })
  paidAt?: Date;

  @Column({
    type: DataType.INTEGER,
    defaultValue: 0,
    comment: 'Cancellation fee in cents'
  })
  cancellationFee?: number;

  @Column({
    type: DataType.BOOLEAN,
    defaultValue: false
  })
  cancellationFeeCharged?: boolean;

  @Column({
    type: DataType.DATE
  })
  cancellationFeeChargedAt?: Date;

  @Column({
    type: DataType.BOOLEAN,
    defaultValue: false
  })
  reminderSent!: boolean;

  @Column({
    type: DataType.BOOLEAN,
    defaultValue: false
  })
  reviewRequestSent!: boolean;

  @CreatedAt
  createdAt!: Date;

  @UpdatedAt
  updatedAt!: Date;

  @BelongsTo(() => User)
  user!: User;

  @BelongsTo(() => Restaurant)
  restaurant!: Restaurant;

  @BelongsTo(() => RestaurantTable)
  table?: RestaurantTable;

  @HasOne(() => Review)
  review?: Review;
}