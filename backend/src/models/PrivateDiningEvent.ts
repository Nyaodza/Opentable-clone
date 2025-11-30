import { Table, Column, Model, DataType, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { Restaurant } from './Restaurant';
import { User } from './User';

@Table({
  tableName: 'private_dining_events',
  timestamps: true,
})
export class PrivateDiningEvent extends Model {
  @Column({
    type: DataType.UUID,
    defaultValue: DataType.UUIDV4,
    primaryKey: true,
  })
  id!: string;

  @ForeignKey(() => Restaurant)
  @Column({
    type: DataType.UUID,
    allowNull: false,
  })
  restaurantId!: string;

  @ForeignKey(() => User)
  @Column({
    type: DataType.UUID,
    allowNull: false,
  })
  userId!: string;

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  eventName!: string;

  @Column({
    type: DataType.ENUM('wedding', 'corporate', 'birthday', 'anniversary', 'holiday', 'meeting', 'other'),
    allowNull: false,
  })
  eventType!: string;

  @Column({
    type: DataType.DATEONLY,
    allowNull: false,
  })
  date!: string;

  @Column({
    type: DataType.TIME,
    allowNull: false,
  })
  startTime!: string;

  @Column({
    type: DataType.TIME,
    allowNull: false,
  })
  endTime!: string;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    validate: {
      min: 10,
      max: 500,
    },
  })
  guestCount!: number;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  privateRoomName!: string;

  @Column({
    type: DataType.ENUM('pending', 'confirmed', 'contract_sent', 'deposit_paid', 'completed', 'cancelled'),
    defaultValue: 'pending',
  })
  status!: string;

  @Column({
    type: DataType.DECIMAL(10, 2),
    allowNull: true,
  })
  minimumSpend!: number;

  @Column({
    type: DataType.DECIMAL(10, 2),
    allowNull: true,
  })
  depositAmount!: number;

  @Column({
    type: DataType.DECIMAL(10, 2),
    allowNull: true,
  })
  depositPaid!: number;

  @Column({
    type: DataType.DECIMAL(10, 2),
    allowNull: true,
  })
  estimatedTotal!: number;

  @Column({
    type: DataType.DECIMAL(10, 2),
    allowNull: true,
  })
  actualTotal!: number;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  menuPreferences!: string;

  @Column({
    type: DataType.JSONB,
    defaultValue: [],
  })
  selectedMenuItems!: string[];

  @Column({
    type: DataType.ARRAY(DataType.STRING),
    defaultValue: [],
  })
  dietaryRestrictions!: string[];

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  specialRequests!: string;

  @Column({
    type: DataType.JSONB,
    defaultValue: {},
  })
  audioVisualNeeds!: {
    projector?: boolean;
    microphone?: boolean;
    speakers?: boolean;
    wifi?: boolean;
    other?: string;
  };

  @Column({
    type: DataType.JSONB,
    defaultValue: {},
  })
  decorationRequests!: {
    flowers?: boolean;
    balloons?: boolean;
    customBanner?: boolean;
    other?: string;
  };

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  contactName!: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  contactEmail!: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  contactPhone!: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  companyName!: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  contractDocumentUrl!: string;

  @Column({
    type: DataType.DATE,
    allowNull: true,
  })
  contractSignedDate!: Date;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  stripePaymentIntentId!: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  staffNotes!: string;

  @Column({
    type: DataType.JSONB,
    defaultValue: [],
  })
  eventTimeline!: Array<{
    time: string;
    activity: string;
  }>;

  @BelongsTo(() => Restaurant)
  restaurant!: Restaurant;

  @BelongsTo(() => User)
  user!: User;
}

export default PrivateDiningEvent;
