import { Table, Column, Model, DataType, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { Restaurant } from './Restaurant';
import { User } from './User';

@Table({
  tableName: 'restaurant_onboarding',
  timestamps: true,
})
export class RestaurantOnboarding extends Model {
  @Column({
    type: DataType.UUID,
    defaultValue: DataType.UUIDV4,
    primaryKey: true,
  })
  id!: string;

  @ForeignKey(() => Restaurant)
  @Column({
    type: DataType.UUID,
    allowNull: false,
  })
  restaurantId!: string;

  @ForeignKey(() => User)
  @Column({
    type: DataType.UUID,
    allowNull: false,
  })
  userId!: string;

  @Column({
    type: DataType.INTEGER,
    defaultValue: 1,
    validate: {
      min: 1,
      max: 7,
    },
  })
  currentStep!: number;

  @Column({
    type: DataType.BOOLEAN,
    defaultValue: false,
  })
  basicInfoComplete!: boolean;

  @Column({
    type: DataType.BOOLEAN,
    defaultValue: false,
  })
  hoursComplete!: boolean;

  @Column({
    type: DataType.BOOLEAN,
    defaultValue: false,
  })
  menuComplete!: boolean;

  @Column({
    type: DataType.BOOLEAN,
    defaultValue: false,
  })
  tablesComplete!: boolean;

  @Column({
    type: DataType.BOOLEAN,
    defaultValue: false,
  })
  photosComplete!: boolean;

  @Column({
    type: DataType.BOOLEAN,
    defaultValue: false,
  })
  policiesComplete!: boolean;

  @Column({
    type: DataType.BOOLEAN,
    defaultValue: false,
  })
  paymentComplete!: boolean;

  @Column({
    type: DataType.BOOLEAN,
    defaultValue: false,
  })
  isComplete!: boolean;

  @Column({
    type: DataType.JSONB,
    defaultValue: {},
  })
  draftData!: Record<string, any>;

  @Column({
    type: DataType.DATE,
    allowNull: true,
  })
  completedAt!: Date;

  @BelongsTo(() => Restaurant)
  restaurant!: Restaurant;

  @BelongsTo(() => User)
  user!: User;
}

export default RestaurantOnboarding;
