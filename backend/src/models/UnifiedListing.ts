import {
  Table,
  Column,
  Model,
  DataType,
  ForeignKey,
  BelongsTo,
  HasMany,
  Index,
  BeforeValidate,
  AfterCreate,
  AfterUpdate,
  AfterDestroy,
} from 'sequelize-typescript';
import { User } from './User';

export enum ServiceType {
  ACTIVITIES = 'activities',
  CAR_RENTALS = 'car_rentals',
  CRUISES = 'cruises',
  EVENTS = 'events',
  FLIGHTS = 'flights',
  HOTELS = 'hotels',
  NIGHTLIFE = 'nightlife',
  RESTAURANTS = 'restaurants',
  TOURS = 'tours',
  VACATION_RENTALS = 'vacation_rentals',
}

export enum ListingSource {
  LOCAL = 'local',
  VIATOR = 'viator',
  GETYOURGUIDE = 'getyourguide',
  TRAVELPAYOUTS = 'travelpayouts',
  DISCOVERCARS = 'discovercars',
  RENTALCARS = 'rentalcars',
  CRUISEDIRECT = 'cruisedirect',
  EXPEDIA = 'expedia',
  GOTOSEA = 'gotosea',
  EVENTBRITE = 'eventbrite',
  TICKETMASTER = 'ticketmaster',
  KIWI = 'kiwi',
  SKYSCANNER = 'skyscanner',
  BOOKING = 'booking',
  OPENTABLE = 'opentable',
  VRBO = 'vrbo',
}

export enum ListingStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  PENDING = 'pending',
  SUSPENDED = 'suspended',
}

@Table({
  tableName: 'unified_listings',
  timestamps: true,
})
export class UnifiedListing extends Model {
  @Column({
    type: DataType.UUID,
    defaultValue: DataType.UUIDV4,
    primaryKey: true,
  })
  id!: string;

  @Index
  @Column({
    type: DataType.ENUM(...Object.values(ServiceType)),
    allowNull: false,
  })
  serviceType!: ServiceType;

  @Index
  @Column({
    type: DataType.ENUM(...Object.values(ListingSource)),
    allowNull: false,
    defaultValue: ListingSource.LOCAL,
  })
  source!: ListingSource;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  externalId?: string;

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  title!: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  description?: string;

  @Column({
    type: DataType.JSONB,
    allowNull: false,
    defaultValue: {},
  })
  location!: {
    lat: number;
    lng: number;
    address?: string;
    city: string;
    state?: string;
    country: string;
    postalCode?: string;
  };

  @Column({
    type: DataType.DECIMAL(3, 2),
    allowNull: true,
    validate: {
      min: 0,
      max: 5,
    },
  })
  rating?: number;

  @Column({
    type: DataType.INTEGER,
    defaultValue: 0,
  })
  reviewCount!: number;

  @Column({
    type: DataType.DECIMAL(10, 2),
    allowNull: true,
  })
  price?: number;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  currency?: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  priceUnit?: string; // per night, per person, etc.

  @Column({
    type: DataType.ARRAY(DataType.STRING),
    defaultValue: [],
  })
  images!: string[];

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  thumbnailUrl?: string;

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  url!: string; // Booking URL or deep link

  @Column({
    type: DataType.JSONB,
    defaultValue: {},
  })
  amenities!: Record<string, boolean>;

  @Column({
    type: DataType.JSONB,
    defaultValue: {},
  })
  metadata!: {
    duration?: string;
    capacity?: number;
    category?: string;
    subcategory?: string;
    tags?: string[];
    highlights?: string[];
    cancellationPolicy?: string;
    instantConfirmation?: boolean;
    mobileTicket?: boolean;
    languages?: string[];
    openingHours?: Record<string, string>;
    checkIn?: string;
    checkOut?: string;
    departureTime?: string;
    arrivalTime?: string;
    vehicleType?: string;
    shipName?: string;
    eventDate?: Date;
    [key: string]: any;
  };

  @Column({
    type: DataType.FLOAT,
    defaultValue: 0,
  })
  score!: number; // Internal ranking score

  @Index
  @Column({
    type: DataType.ENUM(...Object.values(ListingStatus)),
    defaultValue: ListingStatus.ACTIVE,
  })
  status!: ListingStatus;

  @ForeignKey(() => User)
  @Column({
    type: DataType.UUID,
    allowNull: true,
  })
  userId?: string;

  @BelongsTo(() => User)
  user?: User;

  @Index
  @Column({
    type: DataType.DATE,
    allowNull: true,
  })
  availableFrom?: Date;

  @Index
  @Column({
    type: DataType.DATE,
    allowNull: true,
  })
  availableUntil?: Date;

  @Column({
    type: DataType.BOOLEAN,
    defaultValue: false,
  })
  isFeatured!: boolean;

  @Column({
    type: DataType.INTEGER,
    defaultValue: 0,
  })
  viewCount!: number;

  @Column({
    type: DataType.INTEGER,
    defaultValue: 0,
  })
  clickCount!: number;

  @Column({
    type: DataType.INTEGER,
    defaultValue: 0,
  })
  bookingCount!: number;

  @Column({
    type: DataType.DATE,
    allowNull: true,
  })
  lastSyncedAt?: Date;

  @Column({
    type: DataType.JSONB,
    defaultValue: {},
  })
  apiResponse?: any; // Store raw API response for debugging

  // Indexes for efficient searching
  @Index
  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  cityLower!: string;

  @Index
  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  countryLower!: string;

  @BeforeValidate
  static async normalizeLocation(instance: UnifiedListing) {
    if (instance.location) {
      instance.cityLower = instance.location.city.toLowerCase();
      instance.countryLower = instance.location.country.toLowerCase();
    }
  }

  // Helper methods
  incrementViewCount() {
    return this.increment('viewCount');
  }

  incrementClickCount() {
    return this.increment('clickCount');
  }

  incrementBookingCount() {
    return this.increment('bookingCount');
  }

  calculateScore() {
    // Base score calculation
    let score = 0;

    // Rating component (0-50 points)
    if (this.rating) {
      score += this.rating * 10;
    }

    // Review count component (0-20 points)
    if (this.reviewCount > 0) {
      score += Math.min(20, Math.log10(this.reviewCount) * 10);
    }

    // Engagement component (0-20 points)
    const engagementScore = 
      (this.viewCount * 0.1) + 
      (this.clickCount * 0.5) + 
      (this.bookingCount * 2);
    score += Math.min(20, engagementScore / 100);

    // Featured bonus (10 points)
    if (this.isFeatured) {
      score += 10;
    }

    // Local listing bonus (5 points)
    if (this.source === ListingSource.LOCAL) {
      score += 5;
    }

    this.score = Math.round(score * 100) / 100;
    return this.score;
  }
}