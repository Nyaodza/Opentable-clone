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

export enum ModificationType {
  DATETIME = 'datetime',
  PARTY_SIZE = 'party_size',
  TABLE = 'table',
  SPECIAL_REQUESTS = 'special_requests',
  DIETARY = 'dietary',
  OCCASION = 'occasion',
  CANCELLATION = 'cancellation'
}

export enum ModificationStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  EXPIRED = 'expired'
}

@Table({
  tableName: 'reservation_modifications',
  timestamps: true
})
export class ReservationModification extends Model {
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
  requestedBy!: string;

  @ForeignKey(() => Restaurant)
  @Column({
    type: DataType.UUID,
    allowNull: false
  })
  restaurantId!: string;

  @Column({
    type: DataType.ENUM(...Object.values(ModificationType)),
    allowNull: false
  })
  modificationType!: ModificationType;

  @Column({
    type: DataType.JSON,
    allowNull: false
  })
  originalValues!: any;

  @Column({
    type: DataType.JSON,
    allowNull: false
  })
  requestedValues!: any;

  @Column({
    type: DataType.ENUM(...Object.values(ModificationStatus)),
    defaultValue: ModificationStatus.PENDING
  })
  status!: ModificationStatus;

  @Column({
    type: DataType.TEXT
  })
  reason?: string;

  @Column({
    type: DataType.TEXT
  })
  rejectionReason?: string;

  @Column({
    type: DataType.DECIMAL(10, 2),
    defaultValue: 0
  })
  feeAmount!: number;

  @Column({
    type: DataType.BOOLEAN,
    defaultValue: false
  })
  feeCharged!: boolean;

  @Column({
    type: DataType.DATE
  })
  processedAt?: Date;

  @ForeignKey(() => User)
  @Column({
    type: DataType.UUID
  })
  processedBy?: string;

  @Column({
    type: DataType.DATE
  })
  expiresAt?: Date;

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

  @BelongsTo(() => User, 'requestedBy')
  requester!: User;

  @BelongsTo(() => Restaurant)
  restaurant!: Restaurant;

  @BelongsTo(() => User, 'processedBy')
  processor?: User;
}
