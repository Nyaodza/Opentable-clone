const { DataTypes } = require('sequelize');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Create monitoring_alerts table
    await queryInterface.createTable('monitoring_alerts', {
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4,
        allowNull: false
      },
      type: {
        type: DataTypes.STRING,
        allowNull: false,
        index: true
      },
      severity: {
        type: DataTypes.ENUM('info', 'warning', 'error', 'critical'),
        allowNull: false,
        defaultValue: 'info',
        index: true
      },
      message: {
        type: DataTypes.TEXT,
        allowNull: false
      },
      data: {
        type: DataTypes.JSONB,
        allowNull: true
      },
      acknowledged: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        index: true
      },
      acknowledgedBy: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
          model: 'users',
          key: 'userId'
        }
      },
      acknowledgedAt: {
        type: DataTypes.DATE,
        allowNull: true
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('NOW')
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('NOW')
      }
    });

    // Create monitoring_metrics table
    await queryInterface.createTable('monitoring_metrics', {
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4,
        allowNull: false
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false,
        index: true
      },
      type: {
        type: DataTypes.ENUM('counter', 'gauge', 'histogram', 'summary'),
        allowNull: false
      },
      value: {
        type: DataTypes.DECIMAL(20, 6),
        allowNull: false
      },
      labels: {
        type: DataTypes.JSONB,
        allowNull: true
      },
      timestamp: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('NOW'),
        index: true
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('NOW')
      }
    });

    // Create monitoring_health_checks table
    await queryInterface.createTable('monitoring_health_checks', {
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4,
        allowNull: false
      },
      serviceName: {
        type: DataTypes.STRING,
        allowNull: false,
        index: true
      },
      status: {
        type: DataTypes.ENUM('healthy', 'unhealthy', 'degraded', 'unknown'),
        allowNull: false,
        index: true
      },
      responseTime: {
        type: DataTypes.INTEGER,
        allowNull: true
      },
      details: {
        type: DataTypes.JSONB,
        allowNull: true
      },
      consecutiveFailures: {
        type: DataTypes.INTEGER,
        defaultValue: 0
      },
      lastCheck: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('NOW'),
        index: true
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('NOW')
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('NOW')
      }
    });

    // Create monitoring_performance table
    await queryInterface.createTable('monitoring_performance', {
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4,
        allowNull: false
      },
      correlationId: {
        type: DataTypes.UUID,
        allowNull: true,
        index: true
      },
      method: {
        type: DataTypes.STRING,
        allowNull: false,
        index: true
      },
      url: {
        type: DataTypes.STRING,
        allowNull: false
      },
      statusCode: {
        type: DataTypes.INTEGER,
        allowNull: false,
        index: true
      },
      duration: {
        type: DataTypes.INTEGER,
        allowNull: false,
        index: true
      },
      memoryUsage: {
        type: DataTypes.JSONB,
        allowNull: true
      },
      userId: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
          model: 'users',
          key: 'userId'
        }
      },
      userAgent: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      ipAddress: {
        type: DataTypes.INET,
        allowNull: true
      },
      timestamp: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('NOW'),
        index: true
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('NOW')
      }
    });

    // Create monitoring_logs table
    await queryInterface.createTable('monitoring_logs', {
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4,
        allowNull: false
      },
      level: {
        type: DataTypes.ENUM('error', 'warn', 'info', 'http', 'verbose', 'debug', 'silly'),
        allowNull: false,
        index: true
      },
      message: {
        type: DataTypes.TEXT,
        allowNull: false
      },
      meta: {
        type: DataTypes.JSONB,
        allowNull: true
      },
      service: {
        type: DataTypes.STRING,
        allowNull: true,
        index: true
      },
      correlationId: {
        type: DataTypes.UUID,
        allowNull: true,
        index: true
      },
      userId: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
          model: 'users',
          key: 'userId'
        }
      },
      timestamp: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('NOW'),
        index: true
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('NOW')
      }
    });

    // Create indexes for performance
    await queryInterface.addIndex('monitoring_alerts', ['type', 'severity']);
    await queryInterface.addIndex('monitoring_alerts', ['acknowledged', 'createdAt']);
    await queryInterface.addIndex('monitoring_metrics', ['name', 'timestamp']);
    await queryInterface.addIndex('monitoring_health_checks', ['serviceName', 'lastCheck']);
    await queryInterface.addIndex('monitoring_performance', ['method', 'statusCode', 'timestamp']);
    await queryInterface.addIndex('monitoring_performance', ['duration', 'timestamp']);
    await queryInterface.addIndex('monitoring_logs', ['level', 'timestamp']);
    await queryInterface.addIndex('monitoring_logs', ['service', 'timestamp']);

    // Create triggers for automatic cleanup (PostgreSQL specific)
    if (queryInterface.sequelize.getDialect() === 'postgres') {
      // Auto-delete old metrics (older than 30 days)
      await queryInterface.sequelize.query(`
        CREATE OR REPLACE FUNCTION cleanup_old_metrics() RETURNS trigger AS $$
        BEGIN
          DELETE FROM monitoring_metrics WHERE timestamp < NOW() - INTERVAL '30 days';
          RETURN NULL;
        END;
        $$ LANGUAGE plpgsql;
      `);

      await queryInterface.sequelize.query(`
        CREATE TRIGGER trigger_cleanup_metrics
          AFTER INSERT ON monitoring_metrics
          FOR EACH STATEMENT EXECUTE FUNCTION cleanup_old_metrics();
      `);

      // Auto-delete old performance records (older than 7 days)
      await queryInterface.sequelize.query(`
        CREATE OR REPLACE FUNCTION cleanup_old_performance() RETURNS trigger AS $$
        BEGIN
          DELETE FROM monitoring_performance WHERE timestamp < NOW() - INTERVAL '7 days';
          RETURN NULL;
        END;
        $$ LANGUAGE plpgsql;
      `);

      await queryInterface.sequelize.query(`
        CREATE TRIGGER trigger_cleanup_performance
          AFTER INSERT ON monitoring_performance
          FOR EACH STATEMENT EXECUTE FUNCTION cleanup_old_performance();
      `);

      // Auto-delete old logs (older than 14 days, except errors which keep for 30 days)
      await queryInterface.sequelize.query(`
        CREATE OR REPLACE FUNCTION cleanup_old_logs() RETURNS trigger AS $$
        BEGIN
          DELETE FROM monitoring_logs 
          WHERE (level != 'error' AND timestamp < NOW() - INTERVAL '14 days')
             OR (level = 'error' AND timestamp < NOW() - INTERVAL '30 days');
          RETURN NULL;
        END;
        $$ LANGUAGE plpgsql;
      `);

      await queryInterface.sequelize.query(`
        CREATE TRIGGER trigger_cleanup_logs
          AFTER INSERT ON monitoring_logs
          FOR EACH STATEMENT EXECUTE FUNCTION cleanup_old_logs();
      `);
    }
  },

  down: async (queryInterface, Sequelize) => {
    // Drop triggers first (PostgreSQL specific)
    if (queryInterface.sequelize.getDialect() === 'postgres') {
      await queryInterface.sequelize.query('DROP TRIGGER IF EXISTS trigger_cleanup_metrics ON monitoring_metrics;');
      await queryInterface.sequelize.query('DROP TRIGGER IF EXISTS trigger_cleanup_performance ON monitoring_performance;');
      await queryInterface.sequelize.query('DROP TRIGGER IF EXISTS trigger_cleanup_logs ON monitoring_logs;');
      await queryInterface.sequelize.query('DROP FUNCTION IF EXISTS cleanup_old_metrics();');
      await queryInterface.sequelize.query('DROP FUNCTION IF EXISTS cleanup_old_performance();');
      await queryInterface.sequelize.query('DROP FUNCTION IF EXISTS cleanup_old_logs();');
    }

    // Drop tables
    await queryInterface.dropTable('monitoring_logs');
    await queryInterface.dropTable('monitoring_performance');
    await queryInterface.dropTable('monitoring_health_checks');
    await queryInterface.dropTable('monitoring_metrics');
    await queryInterface.dropTable('monitoring_alerts');
  }
};
