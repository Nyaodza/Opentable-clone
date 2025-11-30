import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { User } from './user.entity';
import { Reservation } from './reservation.entity';
import { Review } from './review.entity';
import { Table } from './table.entity';
import { Menu } from './menu.entity';

@Entity('restaurants')
export class Restaurant {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ unique: true })
  slug: string;

  @Column('text')
  description: string;

  @Column()
  cuisineType: string;

  @Column({ type: 'int', default: 2 })
  priceRange: number; // 1-4

  @Column()
  phone: string;

  @Column()
  email: string;

  @Column({ nullable: true })
  website?: string;

  @Column()
  address: string;

  @Column()
  city: string;

  @Column()
  state: string;

  @Column()
  zipCode: string;

  @Column({ default: 'US' })
  country: string;

  @Column('decimal', { precision: 10, scale: 8 })
  latitude: number;

  @Column('decimal', { precision: 11, scale: 8 })
  longitude: number;

  @Column({ default: 'America/New_York' })
  timezone: string;

  @Column({ type: 'jsonb' })
  operatingHours: any;

  @Column({ type: 'int', default: 50 })
  capacity: number;

  @Column('decimal', { precision: 3, scale: 2, default: 0 })
  averageRating: number;

  @Column({ type: 'int', default: 0 })
  reviewCount: number;

  @Column('decimal', { precision: 3, scale: 2, nullable: true })
  foodRating?: number;

  @Column('decimal', { precision: 3, scale: 2, nullable: true })
  serviceRating?: number;

  @Column('decimal', { precision: 3, scale: 2, nullable: true })
  ambianceRating?: number;

  @Column('decimal', { precision: 3, scale: 2, nullable: true })
  valueRating?: number;

  @Column({ type: 'simple-array', nullable: true })
  photos?: string[];

  @Column({ type: 'simple-array', nullable: true })
  amenities?: string[];

  @Column({ type: 'simple-array', nullable: true })
  tags?: string[];

  @Column({ default: true })
  isActive: boolean;

  @Column('uuid')
  ownerId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'ownerId' })
  owner: User;

  @OneToMany(() => Reservation, (reservation) => reservation.restaurant)
  reservations: Reservation[];

  @OneToMany(() => Review, (review) => review.restaurant)
  reviews: Review[];

  @OneToMany(() => Table, (table) => table.restaurant)
  tables: Table[];

  @OneToMany(() => Menu, (menu) => menu.restaurant)
  menus: Menu[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}