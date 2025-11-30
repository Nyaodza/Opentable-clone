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
  UpdatedAt,
  BeforeCreate,
  BeforeUpdate
} from 'sequelize-typescript';
import { User } from './User';
import { Restaurant } from './Restaurant';

export enum WaitlistStatus {
  ACTIVE = 'active',
  NOTIFIED = 'notified',
  CONFIRMED = 'confirmed',
  EXPIRED = 'expired',
  CANCELLED = 'cancelled',
  CONVERTED = 'converted' // converted to reservation
}

export enum WaitlistPriority {
  LOW = 1,
  NORMAL = 2,
  HIGH = 3,
  VIP = 4,
  URGENT = 5
}

export enum NotificationMethod {
  SMS = 'sms',
  EMAIL = 'email',
  PUSH = 'push',
  CALL = 'call',
  IN_APP = 'in_app'
}

@Table({
  tableName: 'waitlists',
  timestamps: true,
  indexes: [
    {
      fields: ['restaurant_id', 'desired_date', 'status'],
      name: 'waitlist_restaurant_date_status_idx'
    },
    {
      fields: ['user_id', 'status'],
      name: 'waitlist_user_status_idx'
    },
    {
      fields: ['position', 'restaurant_id', 'desired_date'],
      name: 'waitlist_position_restaurant_date_idx'
    },
    {
      fields: ['expires_at'],
      name: 'waitlist_expires_at_idx'
    }
  ]
})
export class Waitlist extends Model {
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

  // Desired reservation details
  @Column({
    type: DataType.DATEONLY,
    allowNull: false
  })
  desiredDate!: Date;

  @Column({
    type: DataType.TIME,
    allowNull: false
  })
  desiredTime!: string;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    validate: {
      min: 1,
      max: 20
    }
  })
  partySize!: number;

  // Waitlist management
  @Column({
    type: DataType.ENUM(...Object.values(WaitlistStatus)),
    allowNull: false,
    defaultValue: WaitlistStatus.ACTIVE
  })
  status!: WaitlistStatus;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    defaultValue: 0
  })
  position!: number; // Position in waitlist (1 = first)

  @Column({
    type: DataType.ENUM(...Object.values(WaitlistPriority)),
    allowNull: false,
    defaultValue: WaitlistPriority.NORMAL
  })
  priority!: WaitlistPriority;

  // Time preferences
  @Column({
    type: DataType.TIME
  })
  earliestTime?: string; // Flexible time window start

  @Column({
    type: DataType.TIME
  })
  latestTime?: string; // Flexible time window end

  @Column({
    type: DataType.ARRAY(DataType.DATEONLY),
    defaultValue: []
  })
  alternativeDates!: Date[]; // Alternative dates user would accept

  // Notification preferences
  @Column({
    type: DataType.ARRAY(DataType.ENUM(...Object.values(NotificationMethod))),
    defaultValue: [NotificationMethod.SMS, NotificationMethod.EMAIL]
  })
  notificationMethods!: NotificationMethod[];

  @Column({
    type: DataType.STRING
  })
  phoneNumber?: string; // For SMS notifications

  @Column({
    type: DataType.INTEGER,
    defaultValue: 15,
    validate: {
      min: 5,
      max: 60
    }
  })
  advanceNoticeMinutes!: number; // How many minutes before available slot to notify

  // Special requirements
  @Column({
    type: DataType.TEXT
  })
  specialRequests?: string;

  @Column({
    type: DataType.ARRAY(DataType.STRING),
    defaultValue: []
  })
  seatingPreferences!: string[]; // ['window', 'booth', 'outdoor']

  @Column({
    type: DataType.ARRAY(DataType.STRING),
    defaultValue: []
  })
  accessibilityRequirements!: string[];

  // Expiration and timing
  @Column({
    type: DataType.DATE,
    allowNull: false
  })
  expiresAt!: Date; // When waitlist entry expires

  @Column({
    type: DataType.DATE
  })
  notifiedAt?: Date; // When user was notified of availability

  @Column({
    type: DataType.DATE
  })
  respondBy?: Date; // Deadline for user response to notification

  @Column({
    type: DataType.INTEGER,
    defaultValue: 0
  })
  notificationAttempts!: number; // Number of times we've tried to notify

  // Flexibility settings
  @Column({
    type: DataType.BOOLEAN,
    defaultValue: false
  })
  acceptsEarlierTime!: boolean;

  @Column({
    type: DataType.BOOLEAN,
    defaultValue: false
  })
  acceptsLaterTime!: boolean;

  @Column({
    type: DataType.BOOLEAN,
    defaultValue: false
  })
  acceptsAlternativeDates!: boolean;

  @Column({
    type: DataType.BOOLEAN,
    defaultValue: false
  })
  acceptsSmallerParty!: boolean; // Accept table for fewer people

  // Conversion tracking
  @Column({
    type: DataType.UUID
  })
  convertedReservationId?: string; // If converted to actual reservation

  @Column({
    type: DataType.DATE
  })
  convertedAt?: Date;

  // Analytics and metadata
  @Column({
    type: DataType.JSONB,
    defaultValue: {}
  })
  metadata!: {
    source?: string; // 'web', 'mobile', 'call'
    campaign?: string;
    referrer?: string;
    deviceType?: string;
    estimatedWaitTime?: number; // minutes
    likelihood?: number; // 0-100 likelihood of conversion
  };

  @Column({
    type: DataType.JSONB,
    defaultValue: {}
  })
  analytics!: {
    positionChanges?: Array<{
      previousPosition: number;
      newPosition: number;
      timestamp: Date;
      reason: string;
    }>;
    notificationHistory?: Array<{
      method: NotificationMethod;
      timestamp: Date;
      success: boolean;
      response?: string;
    }>;
  };

  @CreatedAt
  createdAt!: Date;

  @UpdatedAt
  updatedAt!: Date;

  @BelongsTo(() => User)
  user!: User;

  @BelongsTo(() => Restaurant)
  restaurant!: Restaurant;

  // Hooks
  @BeforeCreate
  @BeforeUpdate
  static async setExpirationDate(instance: Waitlist) {
    if (!instance.expiresAt) {
      const expirationDate = new Date(instance.desiredDate);
      expirationDate.setDate(expirationDate.getDate() + 1); // Expire day after desired date
      instance.expiresAt = expirationDate;
    }
  }

  // Instance Methods
  public isActive(): boolean {
    return this.status === WaitlistStatus.ACTIVE && new Date() < this.expiresAt;
  }

  public isExpired(): boolean {
    return new Date() > this.expiresAt;
  }

  public canBeNotified(): boolean {
    return this.isActive() && this.notificationAttempts < 3;
  }

  public getEstimatedWaitTime(): number {
    // Simple estimation based on position and average table turnover
    const avgTurnoverMinutes = 90; // Average table turnover time
    const tablesAvailable = 10; // Estimate based on restaurant size
    
    return Math.max(0, Math.ceil((this.position / tablesAvailable) * avgTurnoverMinutes));
  }

  public moveToPosition(newPosition: number, reason: string = 'manual'): void {
    const previousPosition = this.position;
    this.position = newPosition;
    
    // Track position change
    if (!this.analytics.positionChanges) {
      this.analytics.positionChanges = [];
    }
    
    this.analytics.positionChanges.push({
      previousPosition,
      newPosition,
      timestamp: new Date(),
      reason
    });
    
    this.changed('analytics', true);
  }

  public recordNotification(method: NotificationMethod, success: boolean, response?: string): void {
    this.notificationAttempts += 1;
    
    if (!this.analytics.notificationHistory) {
      this.analytics.notificationHistory = [];
    }
    
    this.analytics.notificationHistory.push({
      method,
      timestamp: new Date(),
      success,
      response
    });
    
    if (success) {
      this.notifiedAt = new Date();
      this.respondBy = new Date(Date.now() + (this.advanceNoticeMinutes * 60 * 1000));
      this.status = WaitlistStatus.NOTIFIED;
    }
    
    this.changed('analytics', true);
  }

  public markAsConverted(reservationId: string): void {
    this.status = WaitlistStatus.CONVERTED;
    this.convertedReservationId = reservationId;
    this.convertedAt = new Date();
  }

  public cancel(reason: string = 'user_request'): void {
    this.status = WaitlistStatus.CANCELLED;
    this.metadata.cancellationReason = reason;
    this.changed('metadata', true);
  }

  public getTimeFlexibilityText(): string {
    if (this.earliestTime && this.latestTime) {
      return `Flexible between ${this.earliestTime} - ${this.latestTime}`;
    } else if (this.acceptsEarlierTime && this.acceptsLaterTime) {
      return `Flexible around ${this.desiredTime}`;
    } else if (this.acceptsEarlierTime) {
      return `${this.desiredTime} or earlier`;
    } else if (this.acceptsLaterTime) {
      return `${this.desiredTime} or later`;
    }
    return `Exactly ${this.desiredTime}`;
  }

  public static async getPositionInQueue(restaurantId: string, desiredDate: Date, currentWaitlistId?: string): Promise<number> {
    const count = await Waitlist.count({
      where: {
        restaurantId,
        desiredDate,
        status: WaitlistStatus.ACTIVE,
        ...(currentWaitlistId && { id: { [require('sequelize').Op.ne]: currentWaitlistId } })
      }
    });
    return count + 1;
  }

  public static async updatePositions(restaurantId: string, desiredDate: Date): Promise<void> {
    const waitlistEntries = await Waitlist.findAll({
      where: {
        restaurantId,
        desiredDate,
        status: WaitlistStatus.ACTIVE
      },
      order: [
        ['priority', 'DESC'],
        ['createdAt', 'ASC']
      ]
    });

    for (let i = 0; i < waitlistEntries.length; i++) {
      const entry = waitlistEntries[i];
      const newPosition = i + 1;
      
      if (entry.position !== newPosition) {
        entry.moveToPosition(newPosition, 'auto_reorder');
        await entry.save();
      }
    }
  }

  // Static helper methods
  public static getPriorityOptions() {
    return Object.entries(WaitlistPriority)
      .filter(([key]) => isNaN(Number(key)))
      .map(([key, value]) => ({
        value: value as number,
        label: key.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())
      }));
  }

  public static getNotificationMethodOptions() {
    return Object.values(NotificationMethod).map(value => ({
      value,
      label: value.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
    }));
  }
}

export { Waitlist };