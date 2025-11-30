import {
  Table,
  Column,
  Model,
  DataType,
  ForeignKey,
  BelongsTo,
  Index,
  CreatedAt,
} from 'sequelize-typescript';
import { User } from './User';
import { Restaurant } from './Restaurant';

@Table({
  tableName: 'audit_logs',
  timestamps: false,
  indexes: [
    {
      fields: ['userId'],
    },
    {
      fields: ['entityType', 'entityId'],
    },
    {
      fields: ['category'],
    },
    {
      fields: ['action'],
    },
    {
      fields: ['createdAt'],
    },
  ],
})
class AuditLog extends Model {
  @Column({
    type: DataType.UUID,
    defaultValue: DataType.UUIDV4,
    primaryKey: true,
  })
  id!: string;

  @ForeignKey(() => User)
  @Column({
    type: DataType.UUID,
    allowNull: true,
  })
  userId?: string;

  @BelongsTo(() => User)
  user?: User;

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  action!: string;

  @Column({
    type: DataType.ENUM(
      'authentication',
      'authorization',
      'user_management',
      'restaurant_management',
      'reservation',
      'payment',
      'security',
      'system',
      'data_access',
      'configuration'
    ),
    allowNull: false,
  })
  category!: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  entityType?: string;

  @Column({
    type: DataType.UUID,
    allowNull: true,
  })
  entityId?: string;

  @Column({
    type: DataType.JSONB,
    allowNull: true,
  })
  details?: any;

  @Column({
    type: DataType.JSONB,
    allowNull: true,
  })
  previousValue?: any;

  @Column({
    type: DataType.JSONB,
    allowNull: true,
  })
  newValue?: any;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  ipAddress?: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  userAgent?: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  sessionId?: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  requestId?: string;

  @Column({
    type: DataType.ENUM('success', 'failure', 'partial'),
    defaultValue: 'success',
  })
  status!: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  errorMessage?: string;

  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  duration?: number; // in milliseconds

  @Column({
    type: DataType.JSONB,
    allowNull: true,
  })
  metadata?: any;

  @CreatedAt
  createdAt!: Date;

  // Static methods for common audit operations
  static async logAuthentication(
    userId: string | null,
    action: string,
    success: boolean,
    details: any = {}
  ): Promise<AuditLog> {
    return this.create({
      userId,
      action,
      category: 'authentication',
      status: success ? 'success' : 'failure',
      details,
      ipAddress: details.ipAddress,
      userAgent: details.userAgent,
    });
  }

  static async logDataAccess(
    userId: string,
    entityType: string,
    entityId: string,
    action: string,
    details: any = {}
  ): Promise<AuditLog> {
    return this.create({
      userId,
      action,
      category: 'data_access',
      entityType,
      entityId,
      details,
      status: 'success',
    });
  }

  static async logChange(
    userId: string,
    entityType: string,
    entityId: string,
    action: string,
    previousValue: any,
    newValue: any,
    details: any = {}
  ): Promise<AuditLog> {
    return this.create({
      userId,
      action,
      category: 'data_access',
      entityType,
      entityId,
      previousValue,
      newValue,
      details,
      status: 'success',
    });
  }

  static async logSecurity(
    userId: string | null,
    action: string,
    details: any = {},
    success: boolean = true
  ): Promise<AuditLog> {
    return this.create({
      userId,
      action,
      category: 'security',
      status: success ? 'success' : 'failure',
      details,
      ipAddress: details.ipAddress,
      userAgent: details.userAgent,
    });
  }

  static async logPayment(
    userId: string,
    action: string,
    entityId: string,
    amount: number,
    details: any = {},
    success: boolean = true
  ): Promise<AuditLog> {
    return this.create({
      userId,
      action,
      category: 'payment',
      entityType: 'payment',
      entityId,
      status: success ? 'success' : 'failure',
      details: {
        ...details,
        amount,
      },
    });
  }

  // Query methods
  static async getUserActivity(
    userId: string,
    options: {
      category?: string;
      startDate?: Date;
      endDate?: Date;
      limit?: number;
    } = {}
  ): Promise<AuditLog[]> {
    const where: any = { userId };

    if (options.category) {
      where.category = options.category;
    }

    if (options.startDate || options.endDate) {
      where.createdAt = {};
      if (options.startDate) {
        where.createdAt[Op.gte] = options.startDate;
      }
      if (options.endDate) {
        where.createdAt[Op.lte] = options.endDate;
      }
    }

    return this.findAll({
      where,
      order: [['createdAt', 'DESC']],
      limit: options.limit || 100,
    });
  }

  static async getEntityHistory(
    entityType: string,
    entityId: string,
    options: {
      limit?: number;
    } = {}
  ): Promise<AuditLog[]> {
    return this.findAll({
      where: {
        entityType,
        entityId,
      },
      order: [['createdAt', 'DESC']],
      limit: options.limit || 50,
      include: [
        {
          model: User,
          attributes: ['id', 'email', 'firstName', 'lastName'],
        },
      ],
    });
  }

  static async getSecurityEvents(
    options: {
      userId?: string;
      action?: string;
      status?: string;
      startDate?: Date;
      endDate?: Date;
      limit?: number;
    } = {}
  ): Promise<AuditLog[]> {
    const where: any = { category: 'security' };

    if (options.userId) where.userId = options.userId;
    if (options.action) where.action = options.action;
    if (options.status) where.status = options.status;

    if (options.startDate || options.endDate) {
      where.createdAt = {};
      if (options.startDate) {
        where.createdAt[Op.gte] = options.startDate;
      }
      if (options.endDate) {
        where.createdAt[Op.lte] = options.endDate;
      }
    }

    return this.findAll({
      where,
      order: [['createdAt', 'DESC']],
      limit: options.limit || 100,
      include: [
        {
          model: User,
          attributes: ['id', 'email', 'firstName', 'lastName'],
        },
      ],
    });
  }

  // Compliance and reporting
  static async generateComplianceReport(
    startDate: Date,
    endDate: Date,
    categories?: string[]
  ): Promise<any> {
    const where: any = {
      createdAt: {
        [Op.between]: [startDate, endDate],
      },
    };

    if (categories?.length) {
      where.category = { [Op.in]: categories };
    }

    const logs = await this.findAll({
      where,
      attributes: [
        'category',
        'action',
        'status',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
      ],
      group: ['category', 'action', 'status'],
    });

    return {
      period: { startDate, endDate },
      summary: logs,
      totalEvents: logs.reduce((sum, log) => sum + parseInt(log.getDataValue('count')), 0),
    };
  }

  // Data retention
  static async archiveOldLogs(retentionDays: number): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    // Move to archive table or external storage
    const logsToArchive = await this.findAll({
      where: {
        createdAt: {
          [Op.lt]: cutoffDate,
        },
      },
    });

    // Archive logic here (e.g., move to S3, archive table, etc.)
    
    // Delete archived logs
    const deleted = await this.destroy({
      where: {
        createdAt: {
          [Op.lt]: cutoffDate,
        },
      },
    });

    return deleted;
  }
}

export default AuditLog;