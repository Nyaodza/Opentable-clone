import {
  Table as SequelizeTable,
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
import { Reservation } from './Reservation';

export enum TableLocation {
  INDOOR = 'indoor',
  OUTDOOR = 'outdoor',
  BAR = 'bar',
  PRIVATE = 'private'
}

@SequelizeTable({
  tableName: 'tables',
  timestamps: true
})
export class Table extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  id!: string;

  @ForeignKey(() => Restaurant)
  @Column({
    type: DataType.UUID,
    allowNull: false
  })
  restaurantId!: string;

  @Column({
    type: DataType.STRING,
    allowNull: false
  })
  tableNumber!: string;

  @Column({
    type: DataType.INTEGER,
    allowNull: false
  })
  capacity!: number;

  @Column({
    type: DataType.INTEGER,
    allowNull: false
  })
  minCapacity!: number;

  @Column({
    type: DataType.ENUM(...Object.values(TableLocation)),
    defaultValue: TableLocation.INDOOR
  })
  location!: TableLocation;

  @Column({
    type: DataType.BOOLEAN,
    defaultValue: true
  })
  isActive!: boolean;

  @Column({
    type: DataType.TEXT
  })
  notes?: string;

  @CreatedAt
  createdAt!: Date;

  @UpdatedAt
  updatedAt!: Date;

  @BelongsTo(() => Restaurant)
  restaurant!: Restaurant;

  @HasMany(() => Reservation)
  reservations!: Reservation[];
}