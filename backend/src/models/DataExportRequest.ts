import { Table, Column, Model, DataType, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { User } from './User';

@Table({
  tableName: 'data_export_requests',
  timestamps: true,
})
export class DataExportRequest extends Model {
  @Column({
    type: DataType.UUID,
    defaultValue: DataType.UUIDV4,
    primaryKey: true,
  })
  id!: string;

  @ForeignKey(() => User)
  @Column({
    type: DataType.UUID,
    allowNull: false,
  })
  userId!: string;

  @Column({
    type: DataType.ENUM('pending', 'processing', 'completed', 'failed'),
    defaultValue: 'pending',
  })
  status!: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  fileUrl!: string;

  @Column({
    type: DataType.DATE,
    allowNull: true,
  })
  expiresAt!: Date;

  @Column({
    type: DataType.DATE,
    allowNull: true,
  })
  completedAt!: Date;

  @BelongsTo(() => User)
  user!: User;
}

@Table({
  tableName: 'data_deletion_requests',
  timestamps: true,
})
export class DataDeletionRequest extends Model {
  @Column({
    type: DataType.UUID,
    defaultValue: DataType.UUIDV4,
    primaryKey: true,
  })
  id!: string;

  @ForeignKey(() => User)
  @Column({
    type: DataType.UUID,
    allowNull: false,
  })
  userId!: string;

  @Column({
    type: DataType.ENUM('pending', 'approved', 'processing', 'completed', 'cancelled'),
    defaultValue: 'pending',
  })
  status!: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  reason!: string;

  @Column({
    type: DataType.DATE,
    allowNull: true,
  })
  scheduledFor!: Date;

  @Column({
    type: DataType.DATE,
    allowNull: true,
  })
  completedAt!: Date;

  @BelongsTo(() => User)
  user!: User;
}

export { DataExportRequest, DataDeletionRequest };
