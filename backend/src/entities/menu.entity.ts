import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { Restaurant } from './restaurant.entity';
import { MenuItem } from './menu-item.entity';

@Entity('menus')
export class Menu {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  restaurantId: string;

  @Column()
  name: string;

  @Column('text', { nullable: true })
  description?: string;

  @Column({
    type: 'enum',
    enum: ['breakfast', 'lunch', 'dinner', 'brunch', 'drinks', 'dessert'],
    default: 'dinner',
  })
  type: 'breakfast' | 'lunch' | 'dinner' | 'brunch' | 'drinks' | 'dessert';

  @Column({ default: true })
  isActive: boolean;

  @Column({ nullable: true })
  availableFrom?: string;

  @Column({ nullable: true })
  availableUntil?: string;

  @ManyToOne(() => Restaurant)
  @JoinColumn({ name: 'restaurantId' })
  restaurant: Restaurant;

  @OneToMany(() => MenuItem, (menuItem) => menuItem.menu)
  items: MenuItem[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}