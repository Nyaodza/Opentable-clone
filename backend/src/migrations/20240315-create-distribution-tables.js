'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Affiliate Partners
    await queryInterface.createTable('affiliate_partners', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false
      },
      partner_type: {
        type: Sequelize.ENUM('google', 'meta', 'tripadvisor', 'yelp', 'booking_com', 'expedia', 'custom'),
        allowNull: false
      },
      api_endpoint: {
        type: Sequelize.STRING
      },
      api_credentials: {
        type: Sequelize.JSONB
      },
      commission_rate: {
        type: Sequelize.DECIMAL(5, 2)
      },
      payment_terms: {
        type: Sequelize.JSONB
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        defaultValue: true
      },
      settings: {
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

    // Restaurant Partner Connections
    await queryInterface.createTable('restaurant_partners', {
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
      partner_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'affiliate_partners',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      external_restaurant_id: {
        type: Sequelize.STRING
      },
      sync_enabled: {
        type: Sequelize.BOOLEAN,
        defaultValue: true
      },
      sync_frequency: {
        type: Sequelize.ENUM('realtime', 'hourly', 'daily', 'manual'),
        defaultValue: 'realtime'
      },
      last_sync_at: {
        type: Sequelize.DATE
      },
      sync_status: {
        type: Sequelize.ENUM('active', 'paused', 'failed', 'disconnected'),
        defaultValue: 'active'
      },
      commission_override: {
        type: Sequelize.DECIMAL(5, 2)
      },
      settings: {
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

    // Partner Bookings
    await queryInterface.createTable('partner_bookings', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      partner_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'affiliate_partners',
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
      external_booking_id: {
        type: Sequelize.STRING,
        unique: true
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
      booking_date: {
        type: Sequelize.DATE,
        allowNull: false
      },
      party_size: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      guest_name: {
        type: Sequelize.STRING
      },
      guest_email: {
        type: Sequelize.STRING
      },
      guest_phone: {
        type: Sequelize.STRING
      },
      status: {
        type: Sequelize.ENUM('pending', 'confirmed', 'cancelled', 'completed', 'no_show'),
        allowNull: false
      },
      commission_amount: {
        type: Sequelize.DECIMAL(10, 2)
      },
      commission_status: {
        type: Sequelize.ENUM('pending', 'calculated', 'invoiced', 'paid'),
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

    // Widget Configurations
    await queryInterface.createTable('booking_widgets', {
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
      widget_type: {
        type: Sequelize.ENUM('iframe', 'button', 'calendar', 'popup', 'custom'),
        allowNull: false
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false
      },
      configuration: {
        type: Sequelize.JSONB,
        allowNull: false,
        defaultValue: {
          style: {},
          behavior: {},
          restrictions: {}
        }
      },
      embed_code: {
        type: Sequelize.TEXT
      },
      allowed_domains: {
        type: Sequelize.JSONB,
        defaultValue: []
      },
      analytics_enabled: {
        type: Sequelize.BOOLEAN,
        defaultValue: true
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        defaultValue: true
      },
      impressions: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      conversions: {
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

    // Partner Sync Logs
    await queryInterface.createTable('partner_sync_logs', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      restaurant_partner_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'restaurant_partners',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      sync_type: {
        type: Sequelize.ENUM('availability', 'bookings', 'menu', 'info', 'full'),
        allowNull: false
      },
      direction: {
        type: Sequelize.ENUM('push', 'pull', 'bidirectional'),
        allowNull: false
      },
      status: {
        type: Sequelize.ENUM('started', 'completed', 'failed', 'partial'),
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

    // Create indexes
    await queryInterface.addIndex('affiliate_partners', ['partner_type']);
    await queryInterface.addIndex('affiliate_partners', ['is_active']);
    await queryInterface.addIndex('restaurant_partners', ['restaurant_id']);
    await queryInterface.addIndex('restaurant_partners', ['partner_id']);
    await queryInterface.addIndex('restaurant_partners', ['sync_status']);
    await queryInterface.addIndex('partner_bookings', ['partner_id']);
    await queryInterface.addIndex('partner_bookings', ['booking_id']);
    await queryInterface.addIndex('partner_bookings', ['restaurant_id']);
    await queryInterface.addIndex('partner_bookings', ['external_booking_id']);
    await queryInterface.addIndex('partner_bookings', ['status']);
    await queryInterface.addIndex('partner_bookings', ['commission_status']);
    await queryInterface.addIndex('booking_widgets', ['restaurant_id']);
    await queryInterface.addIndex('booking_widgets', ['widget_type']);
    await queryInterface.addIndex('booking_widgets', ['is_active']);
    await queryInterface.addIndex('partner_sync_logs', ['restaurant_partner_id']);
    await queryInterface.addIndex('partner_sync_logs', ['sync_type']);
    
    // Unique constraint for restaurant-partner connection
    await queryInterface.addConstraint('restaurant_partners', {
      fields: ['restaurant_id', 'partner_id'],
      type: 'unique',
      name: 'unique_restaurant_partner'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('partner_sync_logs');
    await queryInterface.dropTable('booking_widgets');
    await queryInterface.dropTable('partner_bookings');
    await queryInterface.dropTable('restaurant_partners');
    await queryInterface.dropTable('affiliate_partners');
  }
};