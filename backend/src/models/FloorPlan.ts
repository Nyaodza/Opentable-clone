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
import { Table as RestaurantTable } from './Table';

@Table({
  tableName: 'floor_plans',
  timestamps: true
})
export class FloorPlan extends Model {
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
  name!: string;

  @Column({
    type: DataType.TEXT
  })
  description?: string;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    defaultValue: 800
  })
  width!: number; // Canvas width in pixels

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    defaultValue: 600
  })
  height!: number; // Canvas height in pixels

  @Column({
    type: DataType.JSON,
    defaultValue: {}
  })
  layout!: {
    tables: Array<{
      id: string;
      x: number;
      y: number;
      width: number;
      height: number;
      rotation: number;
      shape: 'rectangle' | 'circle' | 'square';
    }>;
    walls: Array<{
      id: string;
      x1: number;
      y1: number;
      x2: number;
      y2: number;
      thickness: number;
    }>;
    fixtures: Array<{
      id: string;
      type: 'door' | 'window' | 'bar' | 'kitchen' | 'restroom' | 'stage';
      x: number;
      y: number;
      width: number;
      height: number;
      rotation: number;
    }>;
    zones: Array<{
      id: string;
      name: string;
      x: number;
      y: number;
      width: number;
      height: number;
      color: string;
    }>;
  };

  @Column({
    type: DataType.BOOLEAN,
    defaultValue: true
  })
  isActive!: boolean;

  @Column({
    type: DataType.BOOLEAN,
    defaultValue: false
  })
  isDefault!: boolean;

  @CreatedAt
  createdAt!: Date;

  @UpdatedAt
  updatedAt!: Date;

  @BelongsTo(() => Restaurant)
  restaurant!: Restaurant;

  @HasMany(() => RestaurantTable)
  tables!: RestaurantTable[];
}

@Table({
  tableName: 'table_assignments',
  timestamps: true
})
export class TableAssignment extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  id!: string;

  @ForeignKey(() => RestaurantTable)
  @Column({
    type: DataType.UUID,
    allowNull: false
  })
  tableId!: string;

  @Column({
    type: DataType.UUID,
    allowNull: false
  })
  reservationId!: string;

  @Column({
    type: DataType.DATE,
    allowNull: false
  })
  assignedAt!: Date;

  @Column({
    type: DataType.DATE
  })
  seatedAt?: Date;

  @Column({
    type: DataType.DATE
  })
  vacatedAt?: Date;

  @Column({
    type: DataType.INTEGER
  })
  estimatedDuration?: number; // in minutes

  @Column({
    type: DataType.TEXT
  })
  notes?: string;

  @CreatedAt
  createdAt!: Date;

  @UpdatedAt
  updatedAt!: Date;

  @BelongsTo(() => RestaurantTable)
  table!: RestaurantTable;
}