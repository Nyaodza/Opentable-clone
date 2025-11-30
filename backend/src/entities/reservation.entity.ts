import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './user.entity';
import { Restaurant } from './restaurant.entity';
import { Table } from './table.entity';

@Entity('reservations')
export class Reservation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  userId: string;

  @Column('uuid')
  restaurantId: string;

  @Column('date')
  date: Date;

  @Column()
  time: string;

  @Column('int')
  partySize: number;

  @Column('uuid', { nullable: true })
  tableId?: string;

  @Column({
    type: 'enum',
    enum: ['pending', 'confirmed', 'seated', 'completed', 'cancelled', 'no_show'],
    default: 'pending',
  })
  status: 'pending' | 'confirmed' | 'seated' | 'completed' | 'cancelled' | 'no_show';

  @Column('text', { nullable: true })
  specialRequests?: string;

  @Column({ nullable: true })
  occasion?: string;

  @Column('text', { nullable: true })
  guestNotes?: string;

  @Column('text', { nullable: true })
  internalNotes?: string;

  @Column({ unique: true })
  confirmationCode: string;

  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  depositAmount?: number;

  @Column({ default: false })
  depositPaid?: boolean;

  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  totalAmount?: number;

  @Column({ nullable: true })
  cancellationReason?: string;

  @Column({ nullable: true })
  cancelledBy?: string;

  @Column({ nullable: true })
  cancelledAt?: Date;

  @Column({ nullable: true })
  seatedAt?: Date;

  @Column({ nullable: true })
  completedAt?: Date;

  @Column('int', { nullable: true })
  rating?: number;

  @Column({ type: 'simple-array', nullable: true })
  tags?: string[];

  @Column({ default: false })
  isVip?: boolean;

  @Column({
    type: 'enum',
    enum: ['website', 'mobile', 'phone', 'walk_in', 'third_party'],
    default: 'website',
  })
  source: 'website' | 'mobile' | 'phone' | 'walk_in' | 'third_party';

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @ManyToOne(() => Restaurant)
  @JoinColumn({ name: 'restaurantId' })
  restaurant: Restaurant;

  @ManyToOne(() => Table, { nullable: true })
  @JoinColumn({ name: 'tableId' })
  table?: Table;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}