import {
  Table,
  Column,
  Model,
  DataType,
  PrimaryKey,
  DefaultScope,
  HasMany,
  BeforeCreate,
  BeforeUpdate,
  Unique,
  Default,
  CreatedAt,
  UpdatedAt
} from 'sequelize-typescript';
import bcrypt from 'bcryptjs';
import { Reservation } from './Reservation';
import { Review } from './Review';

export enum UserRole {
  DINER = 'diner',
  RESTAURANT_OWNER = 'restaurant_owner',
  RESTAURANT_STAFF = 'restaurant_staff',
  ADMIN = 'admin'
}

@DefaultScope(() => ({
  attributes: { exclude: ['password'] }
}))
@Table({
  tableName: 'users',
  timestamps: true,
  scopes: {
    withPassword: {
      attributes: { include: ['password'] }
    }
  }
})
export class User extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  id!: string;

  @Column({
    type: DataType.STRING,
    allowNull: false
  })
  firstName!: string;

  @Column({
    type: DataType.STRING,
    allowNull: false
  })
  lastName!: string;

  @Unique
  @Column({
    type: DataType.STRING,
    allowNull: false,
    validate: {
      isEmail: true
    }
  })
  email!: string;

  @Column({
    type: DataType.STRING,
    allowNull: false
  })
  password!: string;

  @Column({
    type: DataType.STRING,
    allowNull: true
  })
  phone?: string;

  @Column({
    type: DataType.ENUM(...Object.values(UserRole)),
    defaultValue: UserRole.DINER
  })
  role!: UserRole;

  @Column({
    type: DataType.INTEGER,
    defaultValue: 0
  })
  loyaltyPoints!: number;

  @Column({
    type: DataType.JSON,
    defaultValue: {}
  })
  preferences!: {
    cuisineTypes?: string[];
    dietaryRestrictions?: string[];
    favoriteRestaurants?: string[];
    devices?: Array<{
      deviceToken: string;
      platform: 'ios' | 'android';
      deviceModel?: string;
      appVersion?: string;
      osVersion?: string;
      language?: string;
      timezone?: string;
      registeredAt: Date;
      lastActive: Date;
    }>;
    notifications?: {
      reservationReminders: boolean;
      reservationUpdates: boolean;
      promotionalOffers: boolean;
      restaurantUpdates: boolean;
      waitlistAlerts: boolean;
      reviewReminders: boolean;
      quietHoursStart?: string;
      quietHoursEnd?: string;
      preferredLanguage?: string;
    };
  };

  @Column({
    type: DataType.BOOLEAN,
    defaultValue: true
  })
  isActive!: boolean;

  @Column({
    type: DataType.BOOLEAN,
    defaultValue: false
  })
  emailVerified!: boolean;

  @Column({
    type: DataType.DATE,
    allowNull: true
  })
  lastLogin?: Date;

  @Column({
    type: DataType.STRING,
    allowNull: true
  })
  stripeCustomerId?: string;

  @Column({
    type: DataType.DECIMAL(10, 8),
    allowNull: true
  })
  lastKnownLatitude?: number;

  @Column({
    type: DataType.DECIMAL(11, 8),
    allowNull: true
  })
  lastKnownLongitude?: number;

  @Column({
    type: DataType.DATE,
    allowNull: true
  })
  locationUpdatedAt?: Date;

  @Column({
    type: DataType.DATE,
    allowNull: true
  })
  lastActiveAt?: Date;

  @Column({
    type: DataType.DATEONLY,
    allowNull: true
  })
  dateOfBirth?: Date;

  @CreatedAt
  createdAt!: Date;

  @UpdatedAt
  updatedAt!: Date;

  @HasMany(() => Reservation)
  reservations!: Reservation[];

  @HasMany(() => Review)
  reviews!: Review[];

  @BeforeCreate
  @BeforeUpdate
  static async hashPassword(user: User) {
    if (user.changed('password')) {
      user.password = await bcrypt.hash(user.password, 10);
    }
  }

  async validatePassword(password: string): Promise<boolean> {
    return bcrypt.compare(password, this.password);
  }

  get fullName(): string {
    return `${this.firstName} ${this.lastName}`;
  }
}