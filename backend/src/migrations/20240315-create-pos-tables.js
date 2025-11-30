'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // POS Integration Configurations
    await queryInterface.createTable('pos_integrations', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      restaurant_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'restaurants',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      provider: {
        type: Sequelize.ENUM('square', 'toast', 'clover', 'lightspeed', 'revel', 'upserve'),
        allowNull: false
      },
      config: {
        type: Sequelize.JSONB,
        allowNull: false
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        defaultValue: true
      },
      last_sync_at: {
        type: Sequelize.DATE
      },
      sync_status: {
        type: Sequelize.ENUM('pending', 'syncing', 'completed', 'failed'),
        defaultValue: 'pending'
      },
      metadata: {
        type: Sequelize.JSONB,
        defaultValue: {}
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      }
    });

    // POS Sync Logs
    await queryInterface.createTable('pos_sync_logs', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      integration_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'pos_integrations',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      sync_type: {
        type: Sequelize.ENUM('inventory', 'orders', 'tables', 'staff', 'full'),
        allowNull: false
      },
      status: {
        type: Sequelize.ENUM('started', 'completed', 'failed'),
        allowNull: false
      },
      records_synced: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      errors: {
        type: Sequelize.JSONB,
        defaultValue: []
      },
      duration_ms: {
        type: Sequelize.INTEGER
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      }
    });

    // POS Transactions
    await queryInterface.createTable('pos_transactions', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      integration_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'pos_integrations',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      booking_id: {
        type: Sequelize.UUID,
        references: {
          model: 'bookings',
          key: 'id'
        },
        onDelete: 'SET NULL'
      },
      transaction_type: {
        type: Sequelize.ENUM('payment', 'refund', 'adjustment', 'tip'),
        allowNull: false
      },
      amount: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false
      },
      currency: {
        type: Sequelize.STRING(3),
        defaultValue: 'USD'
      },
      external_id: {
        type: Sequelize.STRING,
        unique: true
      },
      status: {
        type: Sequelize.ENUM('pending', 'processing', 'completed', 'failed', 'cancelled'),
        allowNull: false
      },
      metadata: {
        type: Sequelize.JSONB,
        defaultValue: {}
      },
      processed_at: {
        type: Sequelize.DATE
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      }
    });

    // Create indexes
    await queryInterface.addIndex('pos_integrations', ['restaurant_id']);
    await queryInterface.addIndex('pos_integrations', ['provider']);
    await queryInterface.addIndex('pos_integrations', ['is_active']);
    await queryInterface.addIndex('pos_sync_logs', ['integration_id']);
    await queryInterface.addIndex('pos_sync_logs', ['sync_type']);
    await queryInterface.addIndex('pos_sync_logs', ['status']);
    await queryInterface.addIndex('pos_transactions', ['integration_id']);
    await queryInterface.addIndex('pos_transactions', ['booking_id']);
    await queryInterface.addIndex('pos_transactions', ['external_id']);
    await queryInterface.addIndex('pos_transactions', ['status']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('pos_transactions');
    await queryInterface.dropTable('pos_sync_logs');
    await queryInterface.dropTable('pos_integrations');
  }
};