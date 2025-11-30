import { QueryInterface, DataTypes } from 'sequelize';

export default {
  up: async (queryInterface: QueryInterface) => {
    // Create dynamic pricing tables
    await queryInterface.createTable('pricing_rules', {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
      },
      restaurant_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'restaurants',
          key: 'id'
        }
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false
      },
      type: {
        type: DataTypes.ENUM('surge', 'time_based', 'demand_based', 'seasonal', 'event'),
        allowNull: false
      },
      conditions: {
        type: DataTypes.JSONB,
        allowNull: false
      },
      adjustment: {
        type: DataTypes.JSONB,
        allowNull: false
      },
      priority: {
        type: DataTypes.INTEGER,
        defaultValue: 0
      },
      enabled: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
      },
      valid_from: {
        type: DataTypes.DATE,
        allowNull: false
      },
      valid_until: {
        type: DataTypes.DATE
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      }
    });

    // Create accessibility profiles table
    await queryInterface.createTable('accessibility_profiles', {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
      },
      user_id: {
        type: DataTypes.UUID,
        allowNull: false,
        unique: true,
        references: {
          model: 'users',
          key: 'id'
        }
      },
      visual_impairment: {
        type: DataTypes.ENUM('none', 'low_vision', 'color_blind', 'blind'),
        defaultValue: 'none'
      },
      hearing_impairment: {
        type: DataTypes.ENUM('none', 'mild', 'moderate', 'severe', 'profound'),
        defaultValue: 'none'
      },
      motor_impairment: {
        type: DataTypes.ENUM('none', 'mild', 'moderate', 'severe'),
        defaultValue: 'none'
      },
      cognitive_support: {
        type: DataTypes.ENUM('none', 'mild', 'moderate', 'significant'),
        defaultValue: 'none'
      },
      preferences: {
        type: DataTypes.JSONB,
        allowNull: false
      },
      assistive_technology: {
        type: DataTypes.JSONB
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      }
    });

    // Create restaurant accessibility features table
    await queryInterface.createTable('restaurant_accessibility', {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
      },
      restaurant_id: {
        type: DataTypes.UUID,
        allowNull: false,
        unique: true,
        references: {
          model: 'restaurants',
          key: 'id'
        }
      },
      wheelchair_accessible: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
      },
      wheelchair_accessible_restroom: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
      },
      wheelchair_accessible_parking: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
      },
      braille_menu: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
      },
      large_print_menu: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
      },
      digital_menu_tts: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
      },
      sign_language_staff: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
      },
      assistance_animals_welcome: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
      },
      quiet_areas: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
      },
      sensory_friendly_hours: {
        type: DataTypes.ARRAY(DataTypes.STRING)
      },
      additional_features: {
        type: DataTypes.JSONB
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      }
    });

    // Create loyalty programs table
    await queryInterface.createTable('loyalty_programs', {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false
      },
      type: {
        type: DataTypes.ENUM('points', 'tiered', 'subscription', 'hybrid'),
        allowNull: false
      },
      status: {
        type: DataTypes.ENUM('active', 'paused', 'discontinued'),
        defaultValue: 'active'
      },
      tiers: {
        type: DataTypes.JSONB,
        allowNull: false
      },
      point_system: {
        type: DataTypes.JSONB,
        allowNull: false
      },
      benefits: {
        type: DataTypes.JSONB
      },
      partnerships: {
        type: DataTypes.JSONB
      },
      gamification: {
        type: DataTypes.JSONB
      },
      analytics: {
        type: DataTypes.JSONB
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      }
    });

    // Create loyalty members table
    await queryInterface.createTable('loyalty_members', {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
      },
      user_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        }
      },
      program_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'loyalty_programs',
          key: 'id'
        }
      },
      tier: {
        type: DataTypes.STRING,
        allowNull: false
      },
      status: {
        type: DataTypes.ENUM('active', 'suspended', 'expired', 'cancelled'),
        defaultValue: 'active'
      },
      current_points: {
        type: DataTypes.INTEGER,
        defaultValue: 0
      },
      lifetime_points: {
        type: DataTypes.INTEGER,
        defaultValue: 0
      },
      tier_progress: {
        type: DataTypes.JSONB
      },
      achievements: {
        type: DataTypes.JSONB
      },
      preferences: {
        type: DataTypes.JSONB
      },
      joined_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      },
      last_activity: {
        type: DataTypes.DATE
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      }
    });

    // Create integrations table
    await queryInterface.createTable('marketplace_integrations', {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false
      },
      category: {
        type: DataTypes.ENUM('pos', 'payment', 'marketing', 'analytics', 'crm', 'accounting', 'delivery', 'social'),
        allowNull: false
      },
      developer: {
        type: DataTypes.JSONB,
        allowNull: false
      },
      description: {
        type: DataTypes.JSONB,
        allowNull: false
      },
      pricing: {
        type: DataTypes.JSONB,
        allowNull: false
      },
      technical: {
        type: DataTypes.JSONB,
        allowNull: false
      },
      compliance: {
        type: DataTypes.JSONB
      },
      media: {
        type: DataTypes.JSONB
      },
      status: {
        type: DataTypes.ENUM('draft', 'pending_review', 'approved', 'active', 'suspended', 'deprecated'),
        defaultValue: 'draft'
      },
      analytics: {
        type: DataTypes.JSONB
      },
      version: {
        type: DataTypes.JSONB
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      }
    });

    // Create installations table
    await queryInterface.createTable('integration_installations', {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
      },
      integration_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'marketplace_integrations',
          key: 'id'
        }
      },
      restaurant_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'restaurants',
          key: 'id'
        }
      },
      user_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        }
      },
      config: {
        type: DataTypes.JSONB,
        allowNull: false
      },
      permissions: {
        type: DataTypes.JSONB
      },
      status: {
        type: DataTypes.ENUM('active', 'paused', 'error', 'uninstalled'),
        defaultValue: 'active'
      },
      health: {
        type: DataTypes.JSONB
      },
      usage: {
        type: DataTypes.JSONB
      },
      billing: {
        type: DataTypes.JSONB
      },
      installed_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      }
    });

    // Create last-minute slots table
    await queryInterface.createTable('last_minute_slots', {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
      },
      restaurant_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'restaurants',
          key: 'id'
        }
      },
      date_time: {
        type: DataTypes.DATE,
        allowNull: false
      },
      party_size: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      table_id: {
        type: DataTypes.UUID,
        references: {
          model: 'tables',
          key: 'id'
        }
      },
      type: {
        type: DataTypes.ENUM('cancellation', 'no_show', 'new_release', 'walk_in', 'bar_seating'),
        allowNull: false
      },
      discount: {
        type: DataTypes.DECIMAL(5, 2)
      },
      minimum_spend: {
        type: DataTypes.DECIMAL(10, 2)
      },
      status: {
        type: DataTypes.ENUM('available', 'hold', 'reserved', 'expired'),
        defaultValue: 'available'
      },
      visibility: {
        type: DataTypes.ENUM('public', 'members_only', 'vip_only', 'app_only'),
        defaultValue: 'public'
      },
      priority: {
        type: DataTypes.INTEGER,
        defaultValue: 5
      },
      incentives: {
        type: DataTypes.JSONB
      },
      restrictions: {
        type: DataTypes.JSONB
      },
      location: {
        type: DataTypes.JSONB,
        allowNull: false
      },
      released_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      },
      expires_at: {
        type: DataTypes.DATE,
        allowNull: false
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      }
    });

    // Create mobile devices table
    await queryInterface.createTable('mobile_devices', {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
      },
      device_id: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
      },
      user_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        }
      },
      platform: {
        type: DataTypes.ENUM('ios', 'android'),
        allowNull: false
      },
      device_info: {
        type: DataTypes.JSONB,
        allowNull: false
      },
      push_tokens: {
        type: DataTypes.JSONB
      },
      biometrics: {
        type: DataTypes.JSONB
      },
      location: {
        type: DataTypes.JSONB
      },
      settings: {
        type: DataTypes.JSONB
      },
      security: {
        type: DataTypes.JSONB
      },
      last_active: {
        type: DataTypes.DATE
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      }
    });

    // Create special occasions table
    await queryInterface.createTable('special_occasions', {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
      },
      user_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        }
      },
      type: {
        type: DataTypes.ENUM('birthday', 'anniversary', 'proposal', 'graduation', 'promotion', 'custom'),
        allowNull: false
      },
      date: {
        type: DataTypes.DATE,
        allowNull: false
      },
      recurring: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
      },
      preferences: {
        type: DataTypes.JSONB
      },
      reminders_enabled: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
      },
      reminder_days: {
        type: DataTypes.ARRAY(DataTypes.INTEGER),
        defaultValue: [7, 1]
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      }
    });

    // Create restaurant chains table
    await queryInterface.createTable('restaurant_chains', {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
      },
      headquarters: {
        type: DataTypes.JSONB
      },
      brand_guidelines: {
        type: DataTypes.JSONB
      },
      shared_config: {
        type: DataTypes.JSONB
      },
      compliance: {
        type: DataTypes.JSONB
      },
      analytics: {
        type: DataTypes.JSONB
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      }
    });

    // Add chain_id to restaurants table
    await queryInterface.addColumn('restaurants', 'chain_id', {
      type: DataTypes.UUID,
      references: {
        model: 'restaurant_chains',
        key: 'id'
      }
    });

    // Create corporate accounts table
    await queryInterface.createTable('corporate_accounts', {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
      },
      company_name: {
        type: DataTypes.STRING,
        allowNull: false
      },
      billing_address: {
        type: DataTypes.JSONB
      },
      spending_limits: {
        type: DataTypes.JSONB
      },
      approval_workflow: {
        type: DataTypes.JSONB
      },
      policies: {
        type: DataTypes.JSONB
      },
      analytics: {
        type: DataTypes.JSONB
      },
      status: {
        type: DataTypes.ENUM('active', 'suspended', 'cancelled'),
        defaultValue: 'active'
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      }
    });

    // Create indexes
    await queryInterface.addIndex('pricing_rules', ['restaurant_id', 'enabled']);
    await queryInterface.addIndex('accessibility_profiles', ['user_id']);
    await queryInterface.addIndex('restaurant_accessibility', ['restaurant_id']);
    await queryInterface.addIndex('loyalty_members', ['user_id', 'program_id']);
    await queryInterface.addIndex('loyalty_members', ['program_id', 'status']);
    await queryInterface.addIndex('integration_installations', ['restaurant_id', 'status']);
    await queryInterface.addIndex('integration_installations', ['integration_id', 'status']);
    await queryInterface.addIndex('last_minute_slots', ['restaurant_id', 'status', 'date_time']);
    await queryInterface.addIndex('last_minute_slots', ['expires_at', 'status']);
    await queryInterface.addIndex('mobile_devices', ['user_id', 'platform']);
    await queryInterface.addIndex('special_occasions', ['user_id', 'date']);
    await queryInterface.addIndex('restaurants', ['chain_id']);
    await queryInterface.addIndex('corporate_accounts', ['status']);
  },

  down: async (queryInterface: QueryInterface) => {
    // Drop indexes
    await queryInterface.removeIndex('corporate_accounts', ['status']);
    await queryInterface.removeIndex('restaurants', ['chain_id']);
    await queryInterface.removeIndex('special_occasions', ['user_id', 'date']);
    await queryInterface.removeIndex('mobile_devices', ['user_id', 'platform']);
    await queryInterface.removeIndex('last_minute_slots', ['expires_at', 'status']);
    await queryInterface.removeIndex('last_minute_slots', ['restaurant_id', 'status', 'date_time']);
    await queryInterface.removeIndex('integration_installations', ['integration_id', 'status']);
    await queryInterface.removeIndex('integration_installations', ['restaurant_id', 'status']);
    await queryInterface.removeIndex('loyalty_members', ['program_id', 'status']);
    await queryInterface.removeIndex('loyalty_members', ['user_id', 'program_id']);
    await queryInterface.removeIndex('restaurant_accessibility', ['restaurant_id']);
    await queryInterface.removeIndex('accessibility_profiles', ['user_id']);
    await queryInterface.removeIndex('pricing_rules', ['restaurant_id', 'enabled']);

    // Remove chain_id from restaurants
    await queryInterface.removeColumn('restaurants', 'chain_id');

    // Drop tables
    await queryInterface.dropTable('corporate_accounts');
    await queryInterface.dropTable('restaurant_chains');
    await queryInterface.dropTable('special_occasions');
    await queryInterface.dropTable('mobile_devices');
    await queryInterface.dropTable('last_minute_slots');
    await queryInterface.dropTable('integration_installations');
    await queryInterface.dropTable('marketplace_integrations');
    await queryInterface.dropTable('loyalty_members');
    await queryInterface.dropTable('loyalty_programs');
    await queryInterface.dropTable('restaurant_accessibility');
    await queryInterface.dropTable('accessibility_profiles');
    await queryInterface.dropTable('pricing_rules');
  }
};