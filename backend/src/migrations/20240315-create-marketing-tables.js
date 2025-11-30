'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Marketing Campaigns
    await queryInterface.createTable('marketing_campaigns', {
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
      name: {
        type: Sequelize.STRING,
        allowNull: false
      },
      campaign_type: {
        type: Sequelize.ENUM('email', 'sms', 'push', 'multi_channel'),
        allowNull: false
      },
      objective: {
        type: Sequelize.ENUM('acquisition', 'retention', 'reactivation', 'loyalty', 'awareness'),
        allowNull: false
      },
      target_audience: {
        type: Sequelize.JSONB,
        allowNull: false
      },
      content: {
        type: Sequelize.JSONB,
        allowNull: false
      },
      schedule: {
        type: Sequelize.JSONB,
        defaultValue: {}
      },
      budget: {
        type: Sequelize.DECIMAL(10, 2)
      },
      status: {
        type: Sequelize.ENUM('draft', 'scheduled', 'active', 'paused', 'completed', 'cancelled'),
        defaultValue: 'draft'
      },
      start_date: {
        type: Sequelize.DATE
      },
      end_date: {
        type: Sequelize.DATE
      },
      metrics: {
        type: Sequelize.JSONB,
        defaultValue: {
          sent: 0,
          delivered: 0,
          opened: 0,
          clicked: 0,
          converted: 0,
          revenue: 0
        }
      },
      ab_test_config: {
        type: Sequelize.JSONB
      },
      created_by: {
        type: Sequelize.UUID,
        references: {
          model: 'users',
          key: 'id'
        },
        onDelete: 'SET NULL'
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

    // Marketing Workflows
    await queryInterface.createTable('marketing_workflows', {
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
      name: {
        type: Sequelize.STRING,
        allowNull: false
      },
      trigger_type: {
        type: Sequelize.ENUM('event', 'time', 'manual', 'api'),
        allowNull: false
      },
      trigger_config: {
        type: Sequelize.JSONB,
        allowNull: false
      },
      steps: {
        type: Sequelize.JSONB,
        allowNull: false
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      execution_count: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      last_executed_at: {
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

    // Marketing Workflow Executions
    await queryInterface.createTable('workflow_executions', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      workflow_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'marketing_workflows',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      user_id: {
        type: Sequelize.UUID,
        references: {
          model: 'users',
          key: 'id'
        },
        onDelete: 'SET NULL'
      },
      status: {
        type: Sequelize.ENUM('running', 'completed', 'failed', 'cancelled'),
        allowNull: false
      },
      current_step: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      execution_data: {
        type: Sequelize.JSONB,
        defaultValue: {}
      },
      error_message: {
        type: Sequelize.TEXT
      },
      started_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      },
      completed_at: {
        type: Sequelize.DATE
      }
    });

    // Marketing Automation Rules
    await queryInterface.createTable('automation_rules', {
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
      name: {
        type: Sequelize.STRING,
        allowNull: false
      },
      rule_type: {
        type: Sequelize.ENUM('welcome', 'birthday', 'anniversary', 'win_back', 'vip', 'custom'),
        allowNull: false
      },
      conditions: {
        type: Sequelize.JSONB,
        allowNull: false
      },
      actions: {
        type: Sequelize.JSONB,
        allowNull: false
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        defaultValue: true
      },
      priority: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      execution_count: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      last_executed_at: {
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

    // Campaign Recipients
    await queryInterface.createTable('campaign_recipients', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      campaign_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'marketing_campaigns',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      user_id: {
        type: Sequelize.UUID,
        references: {
          model: 'users',
          key: 'id'
        },
        onDelete: 'SET NULL'
      },
      email: {
        type: Sequelize.STRING
      },
      phone: {
        type: Sequelize.STRING
      },
      status: {
        type: Sequelize.ENUM('pending', 'sent', 'delivered', 'opened', 'clicked', 'converted', 'failed', 'opted_out'),
        defaultValue: 'pending'
      },
      variant: {
        type: Sequelize.STRING
      },
      sent_at: {
        type: Sequelize.DATE
      },
      opened_at: {
        type: Sequelize.DATE
      },
      clicked_at: {
        type: Sequelize.DATE
      },
      converted_at: {
        type: Sequelize.DATE
      },
      conversion_value: {
        type: Sequelize.DECIMAL(10, 2)
      },
      metadata: {
        type: Sequelize.JSONB,
        defaultValue: {}
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      }
    });

    // Create indexes
    await queryInterface.addIndex('marketing_campaigns', ['restaurant_id']);
    await queryInterface.addIndex('marketing_campaigns', ['status']);
    await queryInterface.addIndex('marketing_campaigns', ['campaign_type']);
    await queryInterface.addIndex('marketing_campaigns', ['start_date', 'end_date']);
    await queryInterface.addIndex('marketing_workflows', ['restaurant_id']);
    await queryInterface.addIndex('marketing_workflows', ['is_active']);
    await queryInterface.addIndex('marketing_workflows', ['trigger_type']);
    await queryInterface.addIndex('workflow_executions', ['workflow_id']);
    await queryInterface.addIndex('workflow_executions', ['user_id']);
    await queryInterface.addIndex('workflow_executions', ['status']);
    await queryInterface.addIndex('automation_rules', ['restaurant_id']);
    await queryInterface.addIndex('automation_rules', ['is_active']);
    await queryInterface.addIndex('automation_rules', ['rule_type']);
    await queryInterface.addIndex('campaign_recipients', ['campaign_id']);
    await queryInterface.addIndex('campaign_recipients', ['user_id']);
    await queryInterface.addIndex('campaign_recipients', ['status']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('campaign_recipients');
    await queryInterface.dropTable('automation_rules');
    await queryInterface.dropTable('workflow_executions');
    await queryInterface.dropTable('marketing_workflows');
    await queryInterface.dropTable('marketing_campaigns');
  }
};