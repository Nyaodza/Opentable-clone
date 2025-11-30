import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { Reservation } from './reservation.entity';
import { Review } from './review.entity';
import { Payment } from './payment.entity';
import { Favorite } from './favorite.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column()
  password: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  phone?: string;

  @Column({ default: false })
  phoneVerified?: boolean;

  @Column({ nullable: true })
  avatar?: string;

  @Column({
    type: 'enum',
    enum: ['user', 'restaurant_owner', 'restaurant_staff', 'admin'],
    default: 'user',
  })
  role: 'user' | 'restaurant_owner' | 'restaurant_staff' | 'admin';

  @Column({ nullable: true })
  twoFactorSecret?: string;

  @Column({ default: false })
  twoFactorEnabled?: boolean;

  @Column({ default: false })
  emailVerified?: boolean;

  @Column({ nullable: true })
  lastLogin?: Date;

  @Column({ default: 0 })
  loyaltyPoints?: number;

  @Column({
    type: 'enum',
    enum: ['bronze', 'silver', 'gold', 'platinum'],
    default: 'bronze',
  })
  loyaltyTier?: 'bronze' | 'silver' | 'gold' | 'platinum';

  @Column({ default: false })
  isElite?: boolean;

  @Column({ nullable: true })
  eliteSince?: Date;

  @Column({ type: 'jsonb', nullable: true })
  preferences?: any;

  @Column({ type: 'simple-array', nullable: true })
  dietaryRestrictions?: string[];

  @Column({ type: 'jsonb', nullable: true })
  pushTokens?: any[];

  @Column({ nullable: true })
  unsubscribeToken?: string;

  @OneToMany(() => Reservation, (reservation) => reservation.user)
  reservations: Reservation[];

  @OneToMany(() => Review, (review) => review.user)
  reviews: Review[];

  @OneToMany(() => Payment, (payment) => payment.user)
  payments: Payment[];

  @OneToMany(() => Favorite, (favorite) => favorite.user)
  favorites: Favorite[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}