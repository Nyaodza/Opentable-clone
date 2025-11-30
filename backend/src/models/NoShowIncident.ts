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

export enum SeverityLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export enum IncidentStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  DISPUTED = 'disputed',
  RESOLVED = 'resolved',
  WAIVED = 'waived'
}

@Table({
  tableName: 'no_show_incidents',
  timestamps: true
})
export class NoShowIncident extends Model {
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

  @Column({
    type: DataType.DATE,
    allowNull: false
  })
  reservationDateTime!: Date;

  @Column({
    type: DataType.DATE,
    allowNull: false,
    defaultValue: DataType.NOW
  })
  recordedAt!: Date;

  @Column({
    type: DataType.ENUM(...Object.values(SeverityLevel)),
    defaultValue: SeverityLevel.LOW
  })
  severityLevel!: SeverityLevel;

  @Column({
    type: DataType.ENUM(...Object.values(IncidentStatus)),
    defaultValue: IncidentStatus.PENDING
  })
  status!: IncidentStatus;

  @Column({
    type: DataType.DECIMAL(10, 2),
    defaultValue: 0
  })
  penaltyAmount!: number;

  @Column({
    type: DataType.STRING,
    defaultValue: 'usd'
  })
  currency!: string;

  @Column({
    type: DataType.BOOLEAN,
    defaultValue: false
  })
  penaltyCharged!: boolean;

  @Column({
    type: DataType.DATE
  })
  penaltyChargedAt?: Date;

  @Column({
    type: DataType.STRING
  })
  stripeChargeId?: string;

  @Column({
    type: DataType.INTEGER,
    defaultValue: 0,
    comment: 'Restriction days added to user account'
  })
  restrictionDays!: number;

  @Column({
    type: DataType.INTEGER,
    defaultValue: 0,
    comment: 'Impact on reliability score'
  })
  reliabilityImpact!: number;

  @Column({
    type: DataType.TEXT
  })
  notes?: string;

  @Column({
    type: DataType.TEXT
  })
  disputeReason?: string;

  @Column({
    type: DataType.DATE
  })
  disputedAt?: Date;

  @Column({
    type: DataType.TEXT
  })
  resolutionNotes?: string;

  @Column({
    type: DataType.DATE
  })
  resolvedAt?: Date;

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
    type: DataType.DATE
  })
  waivedAt?: Date;

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
}
