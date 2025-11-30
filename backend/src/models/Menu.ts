import {
  Table,
  Column,
  Model,
  DataType,
  PrimaryKey,
  Default,
  ForeignKey,
  BelongsTo,
  HasMany,
  CreatedAt,
  UpdatedAt
} from 'sequelize-typescript';
import { Restaurant } from './Restaurant';

export enum MenuType {
  BREAKFAST = 'BREAKFAST',
  LUNCH = 'LUNCH',
  DINNER = 'DINNER',
  BRUNCH = 'BRUNCH',
  DRINKS = 'DRINKS',
  DESSERT = 'DESSERT',
  SPECIAL = 'SPECIAL'
}

export enum MenuItemCategory {
  APPETIZER = 'APPETIZER',
  MAIN_COURSE = 'MAIN_COURSE',
  SIDE_DISH = 'SIDE_DISH',
  DESSERT = 'DESSERT',
  BEVERAGE = 'BEVERAGE',
  WINE = 'WINE',
  COCKTAIL = 'COCKTAIL',
  SALAD = 'SALAD',
  SOUP = 'SOUP'
}

@Table({
  tableName: 'menus',
  timestamps: true,
  indexes: [
    { fields: ['restaurantId'] },
    { fields: ['type'] },
    { fields: ['isActive'] }
  ]
})
export class Menu extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  id!: string;

  @ForeignKey(() => Restaurant)
  @Column(DataType.UUID)
  restaurantId!: string;

  @Column(DataType.STRING)
  name!: string;

  @Column(DataType.TEXT)
  description?: string;

  @Column(DataType.ENUM(...Object.values(MenuType)))
  type!: MenuType;

  @Default(true)
  @Column(DataType.BOOLEAN)
  isActive!: boolean;

  @Column(DataType.DATE)
  availableFrom?: Date;

  @Column(DataType.DATE)
  availableUntil?: Date;

  @CreatedAt
  @Column(DataType.DATE)
  createdAt!: Date;

  @UpdatedAt
  @Column(DataType.DATE)
  updatedAt!: Date;

  // Associations
  @BelongsTo(() => Restaurant)
  restaurant!: Restaurant;

  @HasMany(() => MenuItem)
  items!: MenuItem[];
}

@Table({
  tableName: 'menu_items',
  timestamps: true,
  indexes: [
    { fields: ['menuId'] },
    { fields: ['category'] },
    { fields: ['isAvailable'] }
  ]
})
export class MenuItem extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  id!: string;

  @ForeignKey(() => Menu)
  @Column(DataType.UUID)
  menuId!: string;

  @Column(DataType.STRING)
  name!: string;

  @Column(DataType.TEXT)
  description?: string;

  @Column(DataType.ENUM(...Object.values(MenuItemCategory)))
  category!: MenuItemCategory;

  @Column(DataType.DECIMAL(10, 2))
  price!: number;

  @Column(DataType.STRING)
  image?: string;

  @Default(true)
  @Column(DataType.BOOLEAN)
  isAvailable!: boolean;

  @Column(DataType.ARRAY(DataType.STRING))
  allergens?: string[];

  @Column(DataType.ARRAY(DataType.STRING))
  dietaryInfo?: string[]; // vegetarian, vegan, gluten-free, etc.

  @Column(DataType.INTEGER)
  calories?: number;

  @Column(DataType.INTEGER)
  preparationTime?: number; // in minutes

  @Default(0)
  @Column(DataType.INTEGER)
  sortOrder!: number;

  @CreatedAt
  @Column(DataType.DATE)
  createdAt!: Date;

  @UpdatedAt
  @Column(DataType.DATE)
  updatedAt!: Date;

  // Associations
  @BelongsTo(() => Menu)
  menu!: Menu;
}

export default Menu;
