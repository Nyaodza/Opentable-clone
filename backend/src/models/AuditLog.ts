import { Table, Column, Model, DataType, PrimaryKey, Default, BelongsTo, ForeignKey } from 'sequelize-typescript';
import { User } from './User';

@Table({
  tableName: 'audit_logs',
  timestamps: true,
  indexes: [
    { fields: ['userId'] },
    { fields: ['action'] },
    { fields: ['resourceType'] },
    { fields: ['resourceId'] },
    { fields: ['timestamp'] },
    { fields: ['ipAddress'] },
    { fields: ['success'] },
    // Composite indexes for common queries
    { fields: ['userId', 'timestamp'] },
    { fields: ['resourceType', 'resourceId'] },
    { fields: ['action', 'timestamp'] },
  ],
})
export class AuditLog extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  id!: string;

  @ForeignKey(() => User)
  @Column(DataType.UUID)
  userId?: string;

  @Column({
    type: DataType.STRING(100),
    allowNull: false,
    comment: 'Action performed (e.g., CREATE, UPDATE, DELETE, LOGIN)',
  })
  action!: string;

  @Column({
    type: DataType.STRING(50),
    allowNull: false,
    comment: 'Type of resource affected (e.g., USER, RESTAURANT, RESERVATION)',
  })
  resourceType!: string;

  @Column({
    type: DataType.STRING(255),
    allowNull: true,
    comment: 'ID of the specific resource affected',
  })
  resourceId?: string;

  @Column({
    type: DataType.TEXT,
    allowNull: false,
    comment: 'Detailed information about the action in JSON format',
  })
  details!: string;

  @Column({
    type: DataType.STRING(45),
    allowNull: false,
    comment: 'IP address of the client',
  })
  ipAddress!: string;

  @Column({
    type: DataType.TEXT,
    allowNull: false,
    comment: 'User agent string from the client',
  })
  userAgent!: string;

  @Column({
    type: DataType.BOOLEAN,
    allowNull: false,
    defaultValue: true,
    comment: 'Whether the action was successful',
  })
  success!: boolean;

  @Column({
    type: DataType.DATE,
    allowNull: false,
    defaultValue: DataType.NOW,
    comment: 'When the action occurred',
  })
  timestamp!: Date;

  // Associations
  @BelongsTo(() => User)
  user?: User;

  // Instance methods
  getDetailsAsObject() {
    try {
      return JSON.parse(this.details);
    } catch (error) {
      return {};
    }
  }

  // Static methods for common queries
  static async getByUser(userId: string, limit: number = 50, offset: number = 0) {
    return this.findAll({
      where: { userId },
      order: [['timestamp', 'DESC']],
      limit,
      offset,
      include: [{ model: User, attributes: ['firstName', 'lastName', 'email'] }],
    });
  }

  static async getByResource(resourceType: string, resourceId: string, limit: number = 50) {
    return this.findAll({
      where: { resourceType, resourceId },
      order: [['timestamp', 'DESC']],
      limit,
      include: [{ model: User, attributes: ['firstName', 'lastName', 'email'] }],
    });
  }

  static async getByAction(action: string, limit: number = 50, offset: number = 0) {
    return this.findAll({
      where: { action },
      order: [['timestamp', 'DESC']],
      limit,
      offset,
      include: [{ model: User, attributes: ['firstName', 'lastName', 'email'] }],
    });
  }

  static async getFailedActions(limit: number = 50, offset: number = 0) {
    return this.findAll({
      where: { success: false },
      order: [['timestamp', 'DESC']],
      limit,
      offset,
      include: [{ model: User, attributes: ['firstName', 'lastName', 'email'] }],
    });
  }

  static async getSecurityEvents(limit: number = 50, offset: number = 0) {
    const securityActions = [
      'FAILED_LOGIN',
      'ACCOUNT_LOCKED',
      'SUSPICIOUS_ACTIVITY',
      'PERMISSION_DENIED',
      'INVALID_TOKEN',
      'EXPIRED_TOKEN',
    ];

    return this.findAll({
      where: {
        action: securityActions,
      },
      order: [['timestamp', 'DESC']],
      limit,
      offset,
      include: [{ model: User, attributes: ['firstName', 'lastName', 'email'] }],
    });
  }

  static async getRecentActivity(hours: number = 24, limit: number = 100) {
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);
    
    return this.findAll({
      where: {
        timestamp: {
          [require('sequelize').Op.gte]: since,
        },
      },
      order: [['timestamp', 'DESC']],
      limit,
      include: [{ model: User, attributes: ['firstName', 'lastName', 'email'] }],
    });
  }

  static async getActivityStats(startDate: Date, endDate: Date) {
    const { Op, fn, col, literal } = require('sequelize');
    
    return this.findAll({
      attributes: [
        'action',
        'resourceType',
        [fn('COUNT', col('id')), 'count'],
        [fn('COUNT', literal('CASE WHEN success = true THEN 1 END')), 'successCount'],
        [fn('COUNT', literal('CASE WHEN success = false THEN 1 END')), 'failureCount'],
      ],
      where: {
        timestamp: {
          [Op.between]: [startDate, endDate],
        },
      },
      group: ['action', 'resourceType'],
      order: [[fn('COUNT', col('id')), 'DESC']],
    });
  }
}