import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Restaurant } from './restaurant.entity';

@Entity('tables')
export class Table {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  restaurantId: string;

  @Column()
  number: string;

  @Column('int')
  capacity: number;

  @Column('int')
  minCapacity: number;

  @Column('int')
  maxCapacity: number;

  @Column()
  section: string;

  @Column('int', { nullable: true })
  floor?: number;

  @Column({ type: 'jsonb' })
  position: { x: number; y: number };

  @Column({
    type: 'enum',
    enum: ['square', 'rectangle', 'round', 'oval'],
    default: 'square',
  })
  shape: 'square' | 'rectangle' | 'round' | 'oval';

  @Column({ default: true })
  isActive: boolean;

  @Column({ default: false })
  isCombineable: boolean;

  @Column({ type: 'simple-array', nullable: true })
  combinesWith?: string[];

  @Column({ type: 'simple-array', nullable: true })
  features?: string[];

  @Column({
    type: 'enum',
    enum: ['available', 'occupied', 'reserved', 'cleaning', 'maintenance'],
    default: 'available',
  })
  status: 'available' | 'occupied' | 'reserved' | 'cleaning' | 'maintenance';

  @Column('uuid', { nullable: true })
  currentReservationId?: string;

  @Column({ nullable: true })
  nextReservationTime?: Date;

  @ManyToOne(() => Restaurant)
  @JoinColumn({ name: 'restaurantId' })
  restaurant: Restaurant;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}