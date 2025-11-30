'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Restaurant Groups
    await queryInterface.createTable('restaurant_groups', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false
      },
      type: {
        type: Sequelize.ENUM('chain', 'franchise', 'collection', 'partnership'),
        allowNull: false
      },
      parent_company: {
        type: Sequelize.STRING
      },
      headquarters_location: {
        type: Sequelize.JSONB
      },
      primary_contact: {
        type: Sequelize.JSONB
      },
      billing_info: {
        type: Sequelize.JSONB
      },
      subscription_tier: {
        type: Sequelize.ENUM('basic', 'professional', 'enterprise', 'custom'),
        defaultValue: 'professional'
      },
      settings: {
        type: Sequelize.JSONB,
        defaultValue: {}
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

    // Update restaurants table to add group_id
    await queryInterface.addColumn('restaurants', 'group_id', {
      type: Sequelize.UUID,
      references: {
        model: 'restaurant_groups',
        key: 'id'
      },
      onDelete: 'SET NULL'
    });

    // Group Managers
    await queryInterface.createTable('group_managers', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      group_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'restaurant_groups',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      role: {
        type: Sequelize.ENUM('owner', 'admin', 'manager', 'analyst', 'viewer'),
        allowNull: false
      },
      permissions: {
        type: Sequelize.JSONB,
        defaultValue: {}
      },
      restaurants: {
        type: Sequelize.JSONB,
        defaultValue: []
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

    // Franchise Agreements
    await queryInterface.createTable('franchise_agreements', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      group_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'restaurant_groups',
          key: 'id'
        },
        onDelete: 'CASCADE'
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
      franchisee_name: {
        type: Sequelize.STRING,
        allowNull: false
      },
      agreement_number: {
        type: Sequelize.STRING,
        unique: true
      },
      start_date: {
        type: Sequelize.DATE,
        allowNull: false
      },
      end_date: {
        type: Sequelize.DATE
      },
      renewal_date: {
        type: Sequelize.DATE
      },
      territory: {
        type: Sequelize.JSONB
      },
      fees: {
        type: Sequelize.JSONB,
        defaultValue: {
          initial: 0,
          royalty_percentage: 0,
          marketing_percentage: 0
        }
      },
      compliance_status: {
        type: Sequelize.ENUM('compliant', 'warning', 'breach', 'terminated'),
        defaultValue: 'compliant'
      },
      performance_metrics: {
        type: Sequelize.JSONB,
        defaultValue: {}
      },
      documents: {
        type: Sequelize.JSONB,
        defaultValue: []
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

    // Group Analytics Aggregations
    await queryInterface.createTable('group_analytics', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      group_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'restaurant_groups',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      period_start: {
        type: Sequelize.DATE,
        allowNull: false
      },
      period_end: {
        type: Sequelize.DATE,
        allowNull: false
      },
      metrics: {
        type: Sequelize.JSONB,
        allowNull: false,
        defaultValue: {
          total_bookings: 0,
          total_revenue: 0,
          total_covers: 0,
          average_party_size: 0,
          average_spend: 0,
          occupancy_rate: 0,
          cancellation_rate: 0,
          no_show_rate: 0
        }
      },
      location_breakdown: {
        type: Sequelize.JSONB,
        defaultValue: {}
      },
      comparisons: {
        type: Sequelize.JSONB,
        defaultValue: {
          vs_previous_period: {},
          vs_same_period_last_year: {},
          vs_group_average: {}
        }
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      }
    });

    // Centralized Policies
    await queryInterface.createTable('group_policies', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      group_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'restaurant_groups',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      policy_type: {
        type: Sequelize.ENUM('booking', 'cancellation', 'pricing', 'menu', 'operations', 'marketing'),
        allowNull: false
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false
      },
      description: {
        type: Sequelize.TEXT
      },
      rules: {
        type: Sequelize.JSONB,
        allowNull: false
      },
      is_mandatory: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      applicable_restaurants: {
        type: Sequelize.JSONB,
        defaultValue: []
      },
      effective_date: {
        type: Sequelize.DATE
      },
      expiry_date: {
        type: Sequelize.DATE
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

    // Create indexes
    await queryInterface.addIndex('restaurants', ['group_id']);
    await queryInterface.addIndex('group_managers', ['group_id']);
    await queryInterface.addIndex('group_managers', ['user_id']);
    await queryInterface.addIndex('franchise_agreements', ['group_id']);
    await queryInterface.addIndex('franchise_agreements', ['restaurant_id']);
    await queryInterface.addIndex('franchise_agreements', ['compliance_status']);
    await queryInterface.addIndex('group_analytics', ['group_id']);
    await queryInterface.addIndex('group_analytics', ['period_start', 'period_end']);
    await queryInterface.addIndex('group_policies', ['group_id']);
    await queryInterface.addIndex('group_policies', ['policy_type']);
    await queryInterface.addIndex('group_policies', ['is_mandatory']);
    
    // Unique constraint for group managers
    await queryInterface.addConstraint('group_managers', {
      fields: ['group_id', 'user_id'],
      type: 'unique',
      name: 'unique_group_manager'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('restaurants', 'group_id');
    await queryInterface.dropTable('group_policies');
    await queryInterface.dropTable('group_analytics');
    await queryInterface.dropTable('franchise_agreements');
    await queryInterface.dropTable('group_managers');
    await queryInterface.dropTable('restaurant_groups');
  }
};