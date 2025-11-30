import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Menu } from './menu.entity';

@Entity('menu_items')
export class MenuItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  menuId: string;

  @Column()
  name: string;

  @Column('text')
  description: string;

  @Column('decimal', { precision: 10, scale: 2 })
  price: number;

  @Column()
  category: string;

  @Column({ type: 'simple-array', nullable: true })
  tags?: string[];

  @Column({ type: 'simple-array', nullable: true })
  allergens?: string[];

  @Column('int', { nullable: true })
  calories?: number;

  @Column('int', { nullable: true })
  spiceLevel?: number;

  @Column({ default: false })
  isVegetarian?: boolean;

  @Column({ default: false })
  isVegan?: boolean;

  @Column({ default: false })
  isGlutenFree?: boolean;

  @Column({ nullable: true })
  photo?: string;

  @Column({ default: true })
  isAvailable: boolean;

  @Column('int', { nullable: true })
  preparationTime?: number;

  @ManyToOne(() => Menu)
  @JoinColumn({ name: 'menuId' })
  menu: Menu;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}