'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // SMS Templates
    await queryInterface.createTable('sms_templates', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      restaurant_id: {
        type: Sequelize.UUID,
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
      template_type: {
        type: Sequelize.ENUM('confirmation', 'reminder', 'waitlist', 'marketing', 'custom'),
        allowNull: false
      },
      content: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      variables: {
        type: Sequelize.JSONB,
        defaultValue: []
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        defaultValue: true
      },
      usage_count: {
        type: Sequelize.INTEGER,
        defaultValue: 0
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

    // SMS Messages
    await queryInterface.createTable('sms_messages', {
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
      template_id: {
        type: Sequelize.UUID,
        references: {
          model: 'sms_templates',
          key: 'id'
        },
        onDelete: 'SET NULL'
      },
      booking_id: {
        type: Sequelize.UUID,
        references: {
          model: 'bookings',
          key: 'id'
        },
        onDelete: 'SET NULL'
      },
      user_id: {
        type: Sequelize.UUID,
        references: {
          model: 'users',
          key: 'id'
        },
        onDelete: 'SET NULL'
      },
      phone_number: {
        type: Sequelize.STRING,
        allowNull: false
      },
      direction: {
        type: Sequelize.ENUM('inbound', 'outbound'),
        allowNull: false
      },
      message_type: {
        type: Sequelize.ENUM('transactional', 'marketing', 'automated', 'manual'),
        allowNull: false
      },
      content: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      status: {
        type: Sequelize.ENUM('pending', 'sent', 'delivered', 'failed', 'received'),
        allowNull: false
      },
      provider: {
        type: Sequelize.ENUM('twilio', 'aws_sns', 'messagebird'),
        defaultValue: 'twilio'
      },
      provider_message_id: {
        type: Sequelize.STRING
      },
      error_message: {
        type: Sequelize.TEXT
      },
      metadata: {
        type: Sequelize.JSONB,
        defaultValue: {}
      },
      sent_at: {
        type: Sequelize.DATE
      },
      delivered_at: {
        type: Sequelize.DATE
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      }
    });

    // SMS Campaigns
    await queryInterface.createTable('sms_campaigns', {
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
      template_id: {
        type: Sequelize.UUID,
        references: {
          model: 'sms_templates',
          key: 'id'
        },
        onDelete: 'SET NULL'
      },
      audience_filter: {
        type: Sequelize.JSONB,
        allowNull: false
      },
      scheduled_at: {
        type: Sequelize.DATE
      },
      status: {
        type: Sequelize.ENUM('draft', 'scheduled', 'sending', 'completed', 'cancelled'),
        defaultValue: 'draft'
      },
      recipients_count: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      sent_count: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      delivered_count: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      failed_count: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      opt_out_count: {
        type: Sequelize.INTEGER,
        defaultValue: 0
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

    // SMS Opt-outs
    await queryInterface.createTable('sms_opt_outs', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      phone_number: {
        type: Sequelize.STRING,
        allowNull: false
      },
      restaurant_id: {
        type: Sequelize.UUID,
        references: {
          model: 'restaurants',
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
      opt_out_type: {
        type: Sequelize.ENUM('all', 'marketing', 'transactional'),
        defaultValue: 'all'
      },
      reason: {
        type: Sequelize.STRING
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      }
    });

    // Create indexes
    await queryInterface.addIndex('sms_templates', ['restaurant_id']);
    await queryInterface.addIndex('sms_templates', ['template_type']);
    await queryInterface.addIndex('sms_templates', ['is_active']);
    await queryInterface.addIndex('sms_messages', ['restaurant_id']);
    await queryInterface.addIndex('sms_messages', ['booking_id']);
    await queryInterface.addIndex('sms_messages', ['user_id']);
    await queryInterface.addIndex('sms_messages', ['phone_number']);
    await queryInterface.addIndex('sms_messages', ['status']);
    await queryInterface.addIndex('sms_messages', ['direction']);
    await queryInterface.addIndex('sms_campaigns', ['restaurant_id']);
    await queryInterface.addIndex('sms_campaigns', ['status']);
    await queryInterface.addIndex('sms_opt_outs', ['phone_number']);
    await queryInterface.addIndex('sms_opt_outs', ['restaurant_id']);
    await queryInterface.addIndex('sms_opt_outs', ['user_id']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('sms_opt_outs');
    await queryInterface.dropTable('sms_campaigns');
    await queryInterface.dropTable('sms_messages');
    await queryInterface.dropTable('sms_templates');
  }
};