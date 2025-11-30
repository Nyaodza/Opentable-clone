'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Guest Profiles
    await queryInterface.createTable('guest_profiles', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        unique: true,
        references: {
          model: 'users',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      vip_status: {
        type: Sequelize.ENUM('none', 'silver', 'gold', 'platinum', 'diamond'),
        defaultValue: 'none'
      },
      lifetime_value: {
        type: Sequelize.DECIMAL(10, 2),
        defaultValue: 0
      },
      total_visits: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      total_spent: {
        type: Sequelize.DECIMAL(10, 2),
        defaultValue: 0
      },
      average_party_size: {
        type: Sequelize.DECIMAL(3, 1),
        defaultValue: 0
      },
      average_spend_per_visit: {
        type: Sequelize.DECIMAL(10, 2),
        defaultValue: 0
      },
      favorite_cuisine_types: {
        type: Sequelize.JSONB,
        defaultValue: []
      },
      dietary_preferences: {
        type: Sequelize.JSONB,
        defaultValue: []
      },
      allergies: {
        type: Sequelize.JSONB,
        defaultValue: []
      },
      preferred_seating: {
        type: Sequelize.STRING
      },
      special_occasions: {
        type: Sequelize.JSONB,
        defaultValue: []
      },
      communication_preferences: {
        type: Sequelize.JSONB,
        defaultValue: {
          email: true,
          sms: true,
          push: true,
          marketing: true
        }
      },
      tags: {
        type: Sequelize.JSONB,
        defaultValue: []
      },
      first_visit_date: {
        type: Sequelize.DATE
      },
      last_visit_date: {
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

    // Guest Notes
    await queryInterface.createTable('guest_notes', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      guest_profile_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'guest_profiles',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      restaurant_id: {
        type: Sequelize.UUID,
        references: {
          model: 'restaurants',
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
      note_type: {
        type: Sequelize.ENUM('preference', 'complaint', 'compliment', 'allergy', 'special_request', 'internal'),
        allowNull: false
      },
      content: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      is_private: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
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
      }
    });

    // Guest Metrics
    await queryInterface.createTable('guest_metrics', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      guest_profile_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'guest_profiles',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      restaurant_id: {
        type: Sequelize.UUID,
        references: {
          model: 'restaurants',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      visit_count: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      cancellation_count: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      no_show_count: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      total_spent: {
        type: Sequelize.DECIMAL(10, 2),
        defaultValue: 0
      },
      average_rating: {
        type: Sequelize.DECIMAL(3, 2)
      },
      rfm_recency_score: {
        type: Sequelize.INTEGER
      },
      rfm_frequency_score: {
        type: Sequelize.INTEGER
      },
      rfm_monetary_score: {
        type: Sequelize.INTEGER
      },
      rfm_segment: {
        type: Sequelize.STRING
      },
      churn_risk_score: {
        type: Sequelize.DECIMAL(3, 2)
      },
      lifetime_value_prediction: {
        type: Sequelize.DECIMAL(10, 2)
      },
      last_calculated_at: {
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

    // Guest Segments
    await queryInterface.createTable('guest_segments', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false
      },
      description: {
        type: Sequelize.TEXT
      },
      criteria: {
        type: Sequelize.JSONB,
        allowNull: false
      },
      is_dynamic: {
        type: Sequelize.BOOLEAN,
        defaultValue: true
      },
      member_count: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      restaurant_id: {
        type: Sequelize.UUID,
        references: {
          model: 'restaurants',
          key: 'id'
        },
        onDelete: 'CASCADE'
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

    // Guest Segment Members
    await queryInterface.createTable('guest_segment_members', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      segment_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'guest_segments',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      guest_profile_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'guest_profiles',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      added_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      }
    });

    // Create indexes
    await queryInterface.addIndex('guest_profiles', ['user_id']);
    await queryInterface.addIndex('guest_profiles', ['vip_status']);
    await queryInterface.addIndex('guest_profiles', ['lifetime_value']);
    await queryInterface.addIndex('guest_notes', ['guest_profile_id']);
    await queryInterface.addIndex('guest_notes', ['restaurant_id']);
    await queryInterface.addIndex('guest_notes', ['booking_id']);
    await queryInterface.addIndex('guest_metrics', ['guest_profile_id']);
    await queryInterface.addIndex('guest_metrics', ['restaurant_id']);
    await queryInterface.addIndex('guest_metrics', ['rfm_segment']);
    await queryInterface.addIndex('guest_metrics', ['churn_risk_score']);
    await queryInterface.addIndex('guest_segments', ['restaurant_id']);
    await queryInterface.addIndex('guest_segment_members', ['segment_id']);
    await queryInterface.addIndex('guest_segment_members', ['guest_profile_id']);
    
    // Unique constraint for segment members
    await queryInterface.addConstraint('guest_segment_members', {
      fields: ['segment_id', 'guest_profile_id'],
      type: 'unique',
      name: 'unique_segment_member'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('guest_segment_members');
    await queryInterface.dropTable('guest_segments');
    await queryInterface.dropTable('guest_metrics');
    await queryInterface.dropTable('guest_notes');
    await queryInterface.dropTable('guest_profiles');
  }
};