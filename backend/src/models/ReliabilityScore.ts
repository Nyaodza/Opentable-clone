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

export enum ReliabilityTier {
  EXCELLENT = 'excellent',
  GOOD = 'good',
  FAIR = 'fair',
  POOR = 'poor',
  UNRELIABLE = 'unreliable'
}

@Table({
  tableName: 'reliability_scores',
  timestamps: true
})
export class ReliabilityScore extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  id!: string;

  @ForeignKey(() => User)
  @Column({
    type: DataType.UUID,
    allowNull: false,
    unique: true
  })
  userId!: string;

  @Column({
    type: DataType.INTEGER,
    defaultValue: 100,
    comment: 'Reliability score (0-100)'
  })
  score!: number;

  @Column({
    type: DataType.ENUM(...Object.values(ReliabilityTier)),
    defaultValue: ReliabilityTier.EXCELLENT
  })
  tier!: ReliabilityTier;

  @Column({
    type: DataType.INTEGER,
    defaultValue: 0
  })
  totalReservations!: number;

  @Column({
    type: DataType.INTEGER,
    defaultValue: 0
  })
  completedReservations!: number;

  @Column({
    type: DataType.INTEGER,
    defaultValue: 0
  })
  cancelledReservations!: number;

  @Column({
    type: DataType.INTEGER,
    defaultValue: 0
  })
  noShowCount!: number;

  @Column({
    type: DataType.INTEGER,
    defaultValue: 0
  })
  lateModificationCount!: number;

  @Column({
    type: DataType.DECIMAL(5, 2),
    defaultValue: 0,
    comment: 'Percentage of completed reservations'
  })
  completionRate!: number;

  @Column({
    type: DataType.DECIMAL(5, 2),
    defaultValue: 0,
    comment: 'Percentage of no-shows'
  })
  noShowRate!: number;

  @Column({
    type: DataType.INTEGER,
    defaultValue: 0,
    comment: 'Current consecutive no-shows'
  })
  consecutiveNoShows!: number;

  @Column({
    type: DataType.DATE
  })
  lastNoShowAt?: Date;

  @Column({
    type: DataType.DATE
  })
  lastCompletedAt?: Date;

  @Column({
    type: DataType.INTEGER,
    defaultValue: 0,
    comment: 'Days of booking restrictions'
  })
  restrictionDays!: number;

  @Column({
    type: DataType.DATE
  })
  restrictionEndsAt?: Date;

  @Column({
    type: DataType.BOOLEAN,
    defaultValue: false
  })
  requiresDeposit!: boolean;

  @Column({
    type: DataType.BOOLEAN,
    defaultValue: false
  })
  requiresApproval!: boolean;

  @Column({
    type: DataType.JSON,
    defaultValue: [],
    comment: 'Array of score change history'
  })
  scoreHistory!: Array<{
    previousScore: number;
    newScore: number;
    reason: string;
    timestamp: Date;
  }>;

  @Column({
    type: DataType.JSON,
    defaultValue: {},
    comment: 'Benefits and restrictions based on tier'
  })
  tierBenefits!: {
    benefits?: string[];
    restrictions?: string[];
  };

  @Column({
    type: DataType.DATE
  })
  lastCalculatedAt?: Date;

  @Column({
    type: DataType.JSON,
    defaultValue: {}
  })
  metadata!: any;

  @CreatedAt
  createdAt!: Date;

  @UpdatedAt
  updatedAt!: Date;

  @BelongsTo(() => User)
  user!: User;
}
