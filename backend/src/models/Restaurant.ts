import {
  Table,
  Column,
  Model,
  DataType,
  PrimaryKey,
  Default,
  HasMany,
  BelongsTo,
  ForeignKey,
  CreatedAt,
  UpdatedAt
} from 'sequelize-typescript';
import { User } from './User';
import { Table as RestaurantTable } from './Table';
import { Reservation } from './Reservation';
import { Review } from './Review';
import { RestaurantHours } from './RestaurantHours';

export enum CuisineType {
  ITALIAN = 'Italian',
  FRENCH = 'French',
  JAPANESE = 'Japanese',
  CHINESE = 'Chinese',
  INDIAN = 'Indian',
  MEXICAN = 'Mexican',
  AMERICAN = 'American',
  THAI = 'Thai',
  MEDITERRANEAN = 'Mediterranean',
  OTHER = 'Other'
}

export enum PriceRange {
  BUDGET = '$',
  MODERATE = '$$',
  EXPENSIVE = '$$$',
  LUXURY = '$$$$'
}

@Table({
  tableName: 'restaurants',
  timestamps: true
})
export class Restaurant extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  id!: string;

  @Column({
    type: DataType.STRING,
    allowNull: false
  })
  name!: string;

  @Column({
    type: DataType.TEXT,
    allowNull: false
  })
  description!: string;

  @Column({
    type: DataType.ENUM(...Object.values(CuisineType)),
    allowNull: false
  })
  cuisineType!: CuisineType;

  @Column({
    type: DataType.STRING,
    allowNull: false
  })
  address!: string;

  @Column({
    type: DataType.STRING,
    allowNull: false
  })
  city!: string;

  @Column({
    type: DataType.STRING,
    allowNull: false
  })
  state!: string;

  @Column({
    type: DataType.STRING,
    allowNull: false
  })
  zipCode!: string;

  @Column({
    type: DataType.STRING,
    allowNull: false
  })
  country!: string;

  @Column({
    type: DataType.FLOAT
  })
  latitude!: number;

  @Column({
    type: DataType.FLOAT
  })
  longitude!: number;

  @Column({
    type: DataType.STRING,
    allowNull: false
  })
  phone!: string;

  @Column({
    type: DataType.STRING
  })
  email!: string;

  @Column({
    type: DataType.STRING
  })
  website?: string;

  @Column({
    type: DataType.ENUM(...Object.values(PriceRange)),
    allowNull: false
  })
  priceRange!: PriceRange;

  @Column({
    type: DataType.INTEGER,
    defaultValue: 0
  })
  totalCapacity!: number;

  @Column({
    type: DataType.ARRAY(DataType.STRING),
    defaultValue: []
  })
  images!: string[];

  @Column({
    type: DataType.ARRAY(DataType.STRING),
    defaultValue: []
  })
  amenities!: string[];

  @Column({
    type: DataType.JSON,
    defaultValue: {}
  })
  settings!: {
    reservationDuration?: number; // in minutes
    advanceBookingDays?: number;
    minPartySize?: number;
    maxPartySize?: number;
    cancellationWindow?: number; // in hours
  };

  @Column({
    type: DataType.FLOAT,
    defaultValue: 0
  })
  averageRating!: number;

  @Column({
    type: DataType.INTEGER,
    defaultValue: 0
  })
  totalReviews!: number;

  @Column({
    type: DataType.BOOLEAN,
    defaultValue: true
  })
  isActive!: boolean;

  @ForeignKey(() => User)
  @Column(DataType.UUID)
  ownerId!: string;

  @CreatedAt
  createdAt!: Date;

  @UpdatedAt
  updatedAt!: Date;

  @BelongsTo(() => User)
  owner!: User;

  @HasMany(() => RestaurantTable)
  tables!: RestaurantTable[];

  @HasMany(() => Reservation)
  reservations!: Reservation[];

  @HasMany(() => Review)
  reviews!: Review[];

  @HasMany(() => RestaurantHours)
  hours!: RestaurantHours[];
}