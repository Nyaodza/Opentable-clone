import { Table, Column, Model, DataType, PrimaryKey, Default, AllowNull, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { Optional } from 'sequelize';
import { User } from './User';
import { VirtualExperience } from './VirtualExperience';

// Virtual Booking attributes
export interface VirtualBookingAttributes {
  id: string;
  userId: string;
  virtualExperienceId: string;
  bookingDate: Date;
  startTime: string;
  endTime: string;
  participants: any[];
  totalPrice: number;
  currency: string;
  status: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'refunded';
  paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded';
  paymentId?: string;
  sessionId?: string;
  joinUrl?: string;
  vrRoomId?: string;
  specialRequests?: string;
  deviceInfo: any;
  feedback?: any;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface VirtualBookingCreationAttributes extends Optional<VirtualBookingAttributes, 'id' | 'createdAt' | 'updatedAt'> {}

@Table({
  tableName: 'virtual_bookings',
  timestamps: true,
})
export class VirtualBooking extends Model<VirtualBookingAttributes, VirtualBookingCreationAttributes> implements VirtualBookingAttributes {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  id!: string;

  @ForeignKey(() => User)
  @AllowNull(false)
  @Column(DataType.UUID)
  userId!: string;

  @ForeignKey(() => VirtualExperience)
  @AllowNull(false)
  @Column(DataType.UUID)
  virtualExperienceId!: string;

  @AllowNull(false)
  @Column(DataType.DATEONLY)
  bookingDate!: Date;

  @AllowNull(false)
  @Column(DataType.TIME)
  startTime!: string;

  @AllowNull(false)
  @Column(DataType.TIME)
  endTime!: string;

  @Default([])
  @Column(DataType.JSONB)
  participants!: any[];

  @AllowNull(false)
  @Column(DataType.DECIMAL(10, 2))
  totalPrice!: number;

  @Default('USD')
  @Column(DataType.STRING(3))
  currency!: string;

  @Default('pending')
  @Column(DataType.ENUM('pending', 'confirmed', 'in_progress', 'completed', 'cancelled', 'refunded'))
  status!: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'refunded';

  @Default('pending')
  @Column(DataType.ENUM('pending', 'paid', 'failed', 'refunded'))
  paymentStatus!: 'pending' | 'paid' | 'failed' | 'refunded';

  @Column(DataType.STRING(100))
  paymentId?: string;

  @Column(DataType.STRING(100))
  sessionId?: string;

  @Column(DataType.STRING(500))
  joinUrl?: string;

  @Column(DataType.STRING(100))
  vrRoomId?: string;

  @Column(DataType.TEXT)
  specialRequests?: string;

  @Default({})
  @Column(DataType.JSONB)
  deviceInfo!: any;

  @Column(DataType.JSONB)
  feedback?: any;

  @Column(DataType.DATE)
  completedAt?: Date;

  @Column(DataType.DATE)
  createdAt!: Date;

  @Column(DataType.DATE)
  updatedAt!: Date;

  // Associations
  @BelongsTo(() => User)
  user!: User;

  @BelongsTo(() => VirtualExperience)
  virtualExperience!: VirtualExperience;

  // Helper methods
  public isUpcoming(): boolean {
    const now = new Date();
    const bookingDateTime = new Date(`${this.bookingDate.toDateString()} ${this.startTime}`);
    return bookingDateTime > now && this.status === 'confirmed';
  }

  public isActive(): boolean {
    return this.status === 'in_progress';
  }

  public canCancel(): boolean {
    const now = new Date();
    const bookingDateTime = new Date(`${this.bookingDate.toDateString()} ${this.startTime}`);
    const hoursUntilBooking = (bookingDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);
    
    return this.status === 'confirmed' && hoursUntilBooking >= 2; // 2 hours cancellation policy
  }

  public canJoin(): boolean {
    const now = new Date();
    const bookingDateTime = new Date(`${this.bookingDate.toDateString()} ${this.startTime}`);
    const minutesUntilBooking = (bookingDateTime.getTime() - now.getTime()) / (1000 * 60);
    
    return this.status === 'confirmed' && minutesUntilBooking <= 15 && minutesUntilBooking >= -30;
  }

  public getParticipantCount(): number {
    return this.participants.length;
  }

  public getFormattedPrice(): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: this.currency
    }).format(this.totalPrice);
  }
}

