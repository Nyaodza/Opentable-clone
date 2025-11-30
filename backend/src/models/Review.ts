import {
  Table,
  Column,
  Model,
  DataType,
  PrimaryKey,
  Default,
  ForeignKey,
  BelongsTo,
  CreatedAt,
  UpdatedAt
} from 'sequelize-typescript';
import { User } from './User';
import { Restaurant } from './Restaurant';

@Table({
  tableName: 'reviews',
  timestamps: true
})
export class Review extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  id!: string;

  @ForeignKey(() => User)
  @Column({
    type: DataType.UUID,
    allowNull: false
  })
  userId!: string;

  @ForeignKey(() => Restaurant)
  @Column({
    type: DataType.UUID,
    allowNull: false
  })
  restaurantId!: string;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    validate: {
      min: 1,
      max: 5
    }
  })
  overallRating!: number;

  @Column({
    type: DataType.INTEGER,
    validate: {
      min: 1,
      max: 5
    }
  })
  foodRating?: number;

  @Column({
    type: DataType.INTEGER,
    validate: {
      min: 1,
      max: 5
    }
  })
  serviceRating?: number;

  @Column({
    type: DataType.INTEGER,
    validate: {
      min: 1,
      max: 5
    }
  })
  ambianceRating?: number;

  @Column({
    type: DataType.INTEGER,
    validate: {
      min: 1,
      max: 5
    }
  })
  valueRating?: number;

  @Column({
    type: DataType.TEXT,
    allowNull: false
  })
  comment!: string;

  @Column({
    type: DataType.DATE,
    allowNull: false
  })
  visitDate!: Date;

  @Column({
    type: DataType.ARRAY(DataType.STRING),
    defaultValue: []
  })
  photos!: string[];

  @Column({
    type: DataType.BOOLEAN,
    defaultValue: false
  })
  isVerified!: boolean;

  @Column({
    type: DataType.INTEGER,
    defaultValue: 0
  })
  helpfulCount!: number;

  @CreatedAt
  createdAt!: Date;

  @UpdatedAt
  updatedAt!: Date;

  @BelongsTo(() => User)
  user!: User;

  @BelongsTo(() => Restaurant)
  restaurant!: Restaurant;
}