'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Dining Experiences
    await queryInterface.createTable('dining_experiences', {
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
      description: {
        type: Sequelize.TEXT
      },
      type: {
        type: Sequelize.ENUM('chef_table', 'wine_pairing', 'tasting_menu', 'cooking_class', 'custom'),
        allowNull: false
      },
      date: {
        type: Sequelize.DATE,
        allowNull: false
      },
      time: {
        type: Sequelize.TIME,
        allowNull: false
      },
      duration_minutes: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      max_guests: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      available_seats: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      price_per_person: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false
      },
      deposit_amount: {
        type: Sequelize.DECIMAL(10, 2),
        defaultValue: 0
      },
      included_items: {
        type: Sequelize.JSONB,
        defaultValue: []
      },
      restrictions: {
        type: Sequelize.JSONB,
        defaultValue: []
      },
      images: {
        type: Sequelize.JSONB,
        defaultValue: []
      },
      status: {
        type: Sequelize.ENUM('draft', 'published', 'sold_out', 'cancelled'),
        defaultValue: 'draft'
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

    // Experience Bookings
    await queryInterface.createTable('experience_bookings', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      experience_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'dining_experiences',
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
      guest_name: {
        type: Sequelize.STRING,
        allowNull: false
      },
      guest_email: {
        type: Sequelize.STRING,
        allowNull: false
      },
      guest_phone: {
        type: Sequelize.STRING,
        allowNull: false
      },
      party_size: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      dietary_restrictions: {
        type: Sequelize.JSONB,
        defaultValue: []
      },
      special_requests: {
        type: Sequelize.TEXT
      },
      total_amount: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false
      },
      deposit_paid: {
        type: Sequelize.DECIMAL(10, 2),
        defaultValue: 0
      },
      payment_intent_id: {
        type: Sequelize.STRING
      },
      payment_status: {
        type: Sequelize.ENUM('pending', 'deposit_paid', 'paid_full', 'refunded'),
        defaultValue: 'pending'
      },
      status: {
        type: Sequelize.ENUM('pending', 'confirmed', 'cancelled', 'completed', 'no_show'),
        defaultValue: 'pending'
      },
      cancelled_at: {
        type: Sequelize.DATE
      },
      cancellation_reason: {
        type: Sequelize.TEXT
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

    // Group Bookings
    await queryInterface.createTable('group_bookings', {
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
      organizer_name: {
        type: Sequelize.STRING,
        allowNull: false
      },
      organizer_email: {
        type: Sequelize.STRING,
        allowNull: false
      },
      organizer_phone: {
        type: Sequelize.STRING,
        allowNull: false
      },
      company_name: {
        type: Sequelize.STRING
      },
      date: {
        type: Sequelize.DATE,
        allowNull: false
      },
      time: {
        type: Sequelize.TIME,
        allowNull: false
      },
      total_guests: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      event_type: {
        type: Sequelize.ENUM('corporate', 'wedding', 'birthday', 'reunion', 'other'),
        allowNull: false
      },
      menu_selection: {
        type: Sequelize.JSONB
      },
      special_requests: {
        type: Sequelize.TEXT
      },
      table_assignments: {
        type: Sequelize.JSONB,
        defaultValue: []
      },
      total_amount: {
        type: Sequelize.DECIMAL(10, 2)
      },
      deposit_required: {
        type: Sequelize.DECIMAL(10, 2)
      },
      deposit_paid: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      payment_details: {
        type: Sequelize.JSONB
      },
      status: {
        type: Sequelize.ENUM('pending', 'confirmed', 'cancelled', 'completed'),
        defaultValue: 'pending'
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

    // Private Event Requests
    await queryInterface.createTable('private_event_requests', {
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
      requester_name: {
        type: Sequelize.STRING,
        allowNull: false
      },
      requester_email: {
        type: Sequelize.STRING,
        allowNull: false
      },
      requester_phone: {
        type: Sequelize.STRING,
        allowNull: false
      },
      company_name: {
        type: Sequelize.STRING
      },
      event_type: {
        type: Sequelize.STRING,
        allowNull: false
      },
      date: {
        type: Sequelize.DATE,
        allowNull: false
      },
      start_time: {
        type: Sequelize.TIME,
        allowNull: false
      },
      end_time: {
        type: Sequelize.TIME,
        allowNull: false
      },
      guest_count: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      spaces_requested: {
        type: Sequelize.JSONB,
        defaultValue: []
      },
      catering_requirements: {
        type: Sequelize.JSONB
      },
      audio_visual_needs: {
        type: Sequelize.JSONB
      },
      decoration_requests: {
        type: Sequelize.JSONB
      },
      budget_range: {
        type: Sequelize.JSONB
      },
      quote: {
        type: Sequelize.JSONB
      },
      status: {
        type: Sequelize.ENUM('pending_review', 'quote_sent', 'negotiating', 'approved', 'rejected', 'cancelled'),
        defaultValue: 'pending_review'
      },
      reviewed_by: {
        type: Sequelize.UUID,
        references: {
          model: 'users',
          key: 'id'
        },
        onDelete: 'SET NULL'
      },
      reviewed_at: {
        type: Sequelize.DATE
      },
      notes: {
        type: Sequelize.TEXT
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

    // Event Contracts
    await queryInterface.createTable('event_contracts', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      request_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'private_event_requests',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      contract_number: {
        type: Sequelize.STRING,
        unique: true,
        allowNull: false
      },
      total_amount: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false
      },
      deposit_amount: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false
      },
      deposit_due_date: {
        type: Sequelize.DATE,
        allowNull: false
      },
      deposit_paid: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      deposit_paid_at: {
        type: Sequelize.DATE
      },
      final_payment_due_date: {
        type: Sequelize.DATE,
        allowNull: false
      },
      final_payment_paid: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      final_payment_paid_at: {
        type: Sequelize.DATE
      },
      cancellation_policy: {
        type: Sequelize.JSONB,
        allowNull: false
      },
      terms_and_conditions: {
        type: Sequelize.JSONB,
        allowNull: false
      },
      signed_by: {
        type: Sequelize.STRING
      },
      signature: {
        type: Sequelize.TEXT
      },
      signed_at: {
        type: Sequelize.DATE
      },
      status: {
        type: Sequelize.ENUM('draft', 'sent', 'signed', 'cancelled', 'expired'),
        defaultValue: 'draft'
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

    // Ticketed Events
    await queryInterface.createTable('ticketed_events', {
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
      description: {
        type: Sequelize.TEXT
      },
      date: {
        type: Sequelize.DATE,
        allowNull: false
      },
      time: {
        type: Sequelize.TIME,
        allowNull: false
      },
      duration_minutes: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      venue_capacity: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      tickets_sold: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      total_revenue: {
        type: Sequelize.DECIMAL(10, 2),
        defaultValue: 0
      },
      images: {
        type: Sequelize.JSONB,
        defaultValue: []
      },
      featured_performers: {
        type: Sequelize.JSONB,
        defaultValue: []
      },
      status: {
        type: Sequelize.ENUM('draft', 'on_sale', 'sold_out', 'completed', 'cancelled'),
        defaultValue: 'draft'
      },
      sale_start_date: {
        type: Sequelize.DATE
      },
      sale_end_date: {
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

    // Ticket Tiers
    await queryInterface.createTable('ticket_tiers', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      event_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'ticketed_events',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false
      },
      description: {
        type: Sequelize.TEXT
      },
      price: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false
      },
      quantity: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      available: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      sold: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      benefits: {
        type: Sequelize.JSONB,
        defaultValue: []
      },
      max_per_customer: {
        type: Sequelize.INTEGER,
        defaultValue: 10
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      }
    });

    // Ticket Purchases
    await queryInterface.createTable('ticket_purchases', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      event_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'ticketed_events',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      tier_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'ticket_tiers',
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
      purchaser_name: {
        type: Sequelize.STRING,
        allowNull: false
      },
      purchaser_email: {
        type: Sequelize.STRING,
        allowNull: false
      },
      purchaser_phone: {
        type: Sequelize.STRING
      },
      quantity: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      unit_price: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false
      },
      total_amount: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false
      },
      payment_intent_id: {
        type: Sequelize.STRING
      },
      status: {
        type: Sequelize.ENUM('pending', 'completed', 'refunded', 'cancelled'),
        defaultValue: 'pending'
      },
      refund_amount: {
        type: Sequelize.DECIMAL(10, 2)
      },
      refund_reason: {
        type: Sequelize.TEXT
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

    // Event Tickets
    await queryInterface.createTable('event_tickets', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      purchase_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'ticket_purchases',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      event_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'ticketed_events',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      tier_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'ticket_tiers',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      ticket_number: {
        type: Sequelize.STRING,
        unique: true,
        allowNull: false
      },
      qr_code: {
        type: Sequelize.TEXT,
        unique: true
      },
      holder_name: {
        type: Sequelize.STRING
      },
      holder_email: {
        type: Sequelize.STRING
      },
      status: {
        type: Sequelize.ENUM('valid', 'used', 'cancelled', 'transferred'),
        defaultValue: 'valid'
      },
      checked_in_at: {
        type: Sequelize.DATE
      },
      checked_in_by: {
        type: Sequelize.UUID,
        references: {
          model: 'users',
          key: 'id'
        },
        onDelete: 'SET NULL'
      },
      transferred_to: {
        type: Sequelize.STRING
      },
      transferred_at: {
        type: Sequelize.DATE
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      }
    });

    // Create indexes
    await queryInterface.addIndex('dining_experiences', ['restaurant_id']);
    await queryInterface.addIndex('dining_experiences', ['date']);
    await queryInterface.addIndex('dining_experiences', ['status']);
    await queryInterface.addIndex('experience_bookings', ['experience_id']);
    await queryInterface.addIndex('experience_bookings', ['user_id']);
    await queryInterface.addIndex('experience_bookings', ['status']);
    await queryInterface.addIndex('group_bookings', ['restaurant_id']);
    await queryInterface.addIndex('group_bookings', ['date']);
    await queryInterface.addIndex('group_bookings', ['status']);
    await queryInterface.addIndex('private_event_requests', ['restaurant_id']);
    await queryInterface.addIndex('private_event_requests', ['date']);
    await queryInterface.addIndex('private_event_requests', ['status']);
    await queryInterface.addIndex('event_contracts', ['request_id']);
    await queryInterface.addIndex('event_contracts', ['status']);
    await queryInterface.addIndex('ticketed_events', ['restaurant_id']);
    await queryInterface.addIndex('ticketed_events', ['date']);
    await queryInterface.addIndex('ticketed_events', ['status']);
    await queryInterface.addIndex('ticket_tiers', ['event_id']);
    await queryInterface.addIndex('ticket_purchases', ['event_id']);
    await queryInterface.addIndex('ticket_purchases', ['user_id']);
    await queryInterface.addIndex('ticket_purchases', ['status']);
    await queryInterface.addIndex('event_tickets', ['purchase_id']);
    await queryInterface.addIndex('event_tickets', ['ticket_number']);
    await queryInterface.addIndex('event_tickets', ['status']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('event_tickets');
    await queryInterface.dropTable('ticket_purchases');
    await queryInterface.dropTable('ticket_tiers');
    await queryInterface.dropTable('ticketed_events');
    await queryInterface.dropTable('event_contracts');
    await queryInterface.dropTable('private_event_requests');
    await queryInterface.dropTable('group_bookings');
    await queryInterface.dropTable('experience_bookings');
    await queryInterface.dropTable('dining_experiences');
  }
};