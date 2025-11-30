import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './user.entity';
import { Restaurant } from './restaurant.entity';
import { Reservation } from './reservation.entity';

@Entity('reviews')
export class Review {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  userId: string;

  @Column('uuid')
  restaurantId: string;

  @Column('uuid', { nullable: true })
  reservationId?: string;

  @Column('int')
  overallRating: number;

  @Column('int')
  foodRating: number;

  @Column('int')
  serviceRating: number;

  @Column('int')
  ambianceRating: number;

  @Column('int')
  valueRating: number;

  @Column()
  title: string;

  @Column('text')
  content: string;

  @Column('date')
  visitDate: Date;

  @Column()
  visitType: string;

  @Column({ nullable: true })
  wouldRecommend?: boolean;

  @Column('int', { default: 0 })
  helpfulVotes: number;

  @Column({ type: 'simple-array', nullable: true })
  tags?: string[];

  @Column({
    type: 'enum',
    enum: ['pending_moderation', 'published', 'rejected'],
    default: 'pending_moderation',
  })
  status: 'pending_moderation' | 'published' | 'rejected';

  @Column({ type: 'simple-array', nullable: true })
  moderationFlags?: string[];

  @Column('decimal', { precision: 5, scale: 2, nullable: true })
  toxicityScore?: number;

  @Column('decimal', { precision: 5, scale: 2, nullable: true })
  sentimentScore?: number;

  @Column({ default: false })
  verifiedDiner: boolean;

  @Column('text', { nullable: true })
  responseFromRestaurant?: string;

  @Column({ nullable: true })
  responseDate?: Date;

  @Column({ nullable: true })
  respondedBy?: string;

  @Column({ default: false })
  isRead?: boolean;

  @Column({ nullable: true })
  readAt?: Date;

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