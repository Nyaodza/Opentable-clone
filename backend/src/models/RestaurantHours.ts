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
import { Restaurant } from './Restaurant';

export enum DayOfWeek {
  MONDAY = 'monday',
  TUESDAY = 'tuesday',
  WEDNESDAY = 'wednesday',
  THURSDAY = 'thursday',
  FRIDAY = 'friday',
  SATURDAY = 'saturday',
  SUNDAY = 'sunday'
}

@Table({
  tableName: 'restaurant_hours',
  timestamps: true
})
export class RestaurantHours extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  id!: string;

  @ForeignKey(() => Restaurant)
  @Column({
    type: DataType.UUID,
    allowNull: false
  })
  restaurantId!: string;

  @Column({
    type: DataType.ENUM(...Object.values(DayOfWeek)),
    allowNull: false
  })
  dayOfWeek!: DayOfWeek;

  @Column({
    type: DataType.TIME,
    allowNull: false
  })
  openTime!: string;

  @Column({
    type: DataType.TIME,
    allowNull: false
  })
  closeTime!: string;

  @Column({
    type: DataType.BOOLEAN,
    defaultValue: false
  })
  isClosed!: boolean;

  @Column({
    type: DataType.TIME
  })
  lastReservationTime?: string;

  @CreatedAt
  createdAt!: Date;

  @UpdatedAt
  updatedAt!: Date;

  @BelongsTo(() => Restaurant)
  restaurant!: Restaurant;
}