import { Table, Column, Model, DataType, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { Restaurant } from './Restaurant';
import { User } from './User';

@Table({
  tableName: 'guest_reservations',
  timestamps: true,
})
export class GuestReservation extends Model {
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
    allowNull: true,
    comment: 'Links to user if they create account later',
  })
  userId!: string | null;

  @Column({
    type: DataType.STRING,
    allowNull: false,
    validate: {
      isEmail: true,
    },
  })
  guestEmail!: string;

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  guestName!: string;

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  guestPhone!: string;

  @Column({
    type: DataType.DATEONLY,
    allowNull: false,
  })
  date!: string;

  @Column({
    type: DataType.TIME,
    allowNull: false,
  })
  time!: string;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    validate: {
      min: 1,
      max: 20,
    },
  })
  partySize!: number;

  @Column({
    type: DataType.ENUM('pending', 'confirmed', 'seated', 'completed', 'cancelled', 'no_show'),
    defaultValue: 'pending',
  })
  status!: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  specialRequests!: string;

  @Column({
    type: DataType.ARRAY(DataType.STRING),
    defaultValue: [],
  })
  dietaryRestrictions!: string[];

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  occasionType!: string;

  @Column({
    type: DataType.STRING,
    unique: true,
    allowNull: false,
  })
  confirmationCode!: string;

  @Column({
    type: DataType.STRING,
    unique: true,
    allowNull: false,
    comment: 'Unique link for guest to manage reservation',
  })
  managementToken!: string;

  @Column({
    type: DataType.BOOLEAN,
    defaultValue: false,
  })
  smsReminderSent!: boolean;

  @Column({
    type: DataType.BOOLEAN,
    defaultValue: false,
  })
  emailReminderSent!: boolean;

  @Column({
    type: DataType.BOOLEAN,
    defaultValue: false,
  })
  accountCreatedLater!: boolean;

  @Column({
    type: DataType.JSONB,
    defaultValue: {},
  })
  metadata!: Record<string, any>;

  @BelongsTo(() => Restaurant)
  restaurant!: Restaurant;

  @BelongsTo(() => User)
  user!: User;
}

export default GuestReservation;
