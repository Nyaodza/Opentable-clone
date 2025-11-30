import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './user.entity';
import { Restaurant } from './restaurant.entity';
import { Reservation } from './reservation.entity';

@Entity('payments')
export class Payment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid', { nullable: true })
  reservationId?: string;

  @Column('uuid')
  userId: string;

  @Column('uuid')
  restaurantId: string;

  @Column('decimal', { precision: 10, scale: 2 })
  amount: number;

  @Column({ default: 'USD' })
  currency: string;

  @Column({
    type: 'enum',
    enum: ['deposit', 'full', 'refund', 'cancellation_fee'],
    default: 'deposit',
  })
  type: 'deposit' | 'full' | 'refund' | 'cancellation_fee';

  @Column({
    type: 'enum',
    enum: ['card', 'paypal', 'apple_pay', 'google_pay', 'crypto'],
    default: 'card',
  })
  method: 'card' | 'paypal' | 'apple_pay' | 'google_pay' | 'crypto';

  @Column({
    type: 'enum',
    enum: ['pending', 'completed', 'failed', 'refunded'],
    default: 'pending',
  })
  status: 'pending' | 'completed' | 'failed' | 'refunded';

  @Column({ nullable: true })
  stripePaymentIntentId?: string;

  @Column({ nullable: true })
  stripeChargeId?: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: any;

  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  refundAmount?: number;

  @Column({ nullable: true })
  refundReason?: string;

  @Column({ nullable: true })
  refundedAt?: Date;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @ManyToOne(() => Restaurant)
  @JoinColumn({ name: 'restaurantId' })
  restaurant: Restaurant;

  @ManyToOne(() => Reservation, { nullable: true })
  @JoinColumn({ name: 'reservationId' })
  reservation?: Reservation;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}