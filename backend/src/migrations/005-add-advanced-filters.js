'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Add advanced filter columns to unified_listings table
    await queryInterface.addColumn('unified_listings', 'amenities', {
      type: Sequelize.JSONB,
      defaultValue: [],
      allowNull: false,
    });

    await queryInterface.addColumn('unified_listings', 'categories', {
      type: Sequelize.ARRAY(Sequelize.STRING),
      defaultValue: [],
      allowNull: false,
    });

    await queryInterface.addColumn('unified_listings', 'instantConfirmation', {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
      allowNull: false,
    });

    await queryInterface.addColumn('unified_listings', 'cancellationPolicy', {
      type: Sequelize.ENUM('free', 'flexible', 'moderate', 'strict', 'super_strict'),
      defaultValue: 'moderate',
      allowNull: false,
    });

    await queryInterface.addColumn('unified_listings', 'accessibility', {
      type: Sequelize.JSONB,
      defaultValue: {},
      allowNull: false,
    });

    await queryInterface.addColumn('unified_listings', 'languagesSupported', {
      type: Sequelize.ARRAY(Sequelize.STRING),
      defaultValue: ['en'],
      allowNull: false,
    });

    await queryInterface.addColumn('unified_listings', 'ageRestrictions', {
      type: Sequelize.JSONB,
      defaultValue: {},
      allowNull: false,
    });

    await queryInterface.addColumn('unified_listings', 'groupSize', {
      type: Sequelize.JSONB,
      defaultValue: { min: 1, max: null },
      allowNull: false,
    });

    await queryInterface.addColumn('unified_listings', 'highlights', {
      type: Sequelize.ARRAY(Sequelize.STRING),
      defaultValue: [],
      allowNull: false,
    });

    await queryInterface.addColumn('unified_listings', 'included', {
      type: Sequelize.ARRAY(Sequelize.STRING),
      defaultValue: [],
      allowNull: false,
    });

    await queryInterface.addColumn('unified_listings', 'excluded', {
      type: Sequelize.ARRAY(Sequelize.STRING),
      defaultValue: [],
      allowNull: false,
    });

    await queryInterface.addColumn('unified_listings', 'requirements', {
      type: Sequelize.ARRAY(Sequelize.STRING),
      defaultValue: [],
      allowNull: false,
    });

    await queryInterface.addColumn('unified_listings', 'tags', {
      type: Sequelize.ARRAY(Sequelize.STRING),
      defaultValue: [],
      allowNull: false,
    });

    await queryInterface.addColumn('unified_listings', 'difficulty', {
      type: Sequelize.ENUM('easy', 'moderate', 'challenging', 'difficult', 'extreme'),
      allowNull: true,
    });

    await queryInterface.addColumn('unified_listings', 'duration', {
      type: Sequelize.JSONB,
      defaultValue: {},
      allowNull: false,
    });

    await queryInterface.addColumn('unified_listings', 'schedule', {
      type: Sequelize.JSONB,
      defaultValue: {},
      allowNull: false,
    });

    // Add indexes for performance
    await queryInterface.addIndex('unified_listings', {
      fields: ['amenities'],
      using: 'gin',
      name: 'idx_unified_listings_amenities',
    });

    await queryInterface.addIndex('unified_listings', {
      fields: ['categories'],
      using: 'gin',
      name: 'idx_unified_listings_categories',
    });

    await queryInterface.addIndex('unified_listings', {
      fields: ['instantConfirmation'],
      name: 'idx_unified_listings_instant_confirmation',
    });

    await queryInterface.addIndex('unified_listings', {
      fields: ['cancellationPolicy'],
      name: 'idx_unified_listings_cancellation_policy',
    });

    await queryInterface.addIndex('unified_listings', {
      fields: ['tags'],
      using: 'gin',
      name: 'idx_unified_listings_tags',
    });

    await queryInterface.addIndex('unified_listings', {
      fields: ['difficulty'],
      name: 'idx_unified_listings_difficulty',
    });

    await queryInterface.addIndex('unified_listings', {
      fields: ['languagesSupported'],
      using: 'gin',
      name: 'idx_unified_listings_languages',
    });

    // Create filter presets table for common filter combinations
    await queryInterface.createTable('filter_presets', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      serviceType: {
        type: Sequelize.ENUM(
          'activities',
          'car_rentals',
          'cruises',
          'events',
          'flights',
          'hotels',
          'nightlife',
          'restaurants',
          'tours',
          'vacation_rentals'
        ),
        allowNull: false,
      },
      filters: {
        type: Sequelize.JSONB,
        allowNull: false,
      },
      isPublic: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
      },
      usageCount: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
      },
      createdBy: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
    });

    // Add indexes for filter presets
    await queryInterface.addIndex('filter_presets', ['serviceType', 'isPublic']);
    await queryInterface.addIndex('filter_presets', ['usageCount']);
    await queryInterface.addIndex('filter_presets', ['createdBy']);

    // Create saved filters table for user-specific filters
    await queryInterface.createTable('saved_filters', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      userId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      serviceType: {
        type: Sequelize.ENUM(
          'activities',
          'car_rentals',
          'cruises',
          'events',
          'flights',
          'hotels',
          'nightlife',
          'restaurants',
          'tours',
          'vacation_rentals'
        ),
        allowNull: false,
      },
      filters: {
        type: Sequelize.JSONB,
        allowNull: false,
      },
      isDefault: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      lastUsed: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
    });

    // Add indexes for saved filters
    await queryInterface.addIndex('saved_filters', ['userId', 'serviceType']);
    await queryInterface.addIndex('saved_filters', ['userId', 'isDefault']);
    await queryInterface.addIndex('saved_filters', ['lastUsed']);

    // Add unique constraint for user default filters per service type
    await queryInterface.addConstraint('saved_filters', {
      fields: ['userId', 'serviceType'],
      type: 'unique',
      name: 'unique_user_default_filter_per_service',
      where: {
        isDefault: true,
      },
    });
  },

  down: async (queryInterface, Sequelize) => {
    // Drop tables
    await queryInterface.dropTable('saved_filters');
    await queryInterface.dropTable('filter_presets');

    // Remove columns from unified_listings
    await queryInterface.removeColumn('unified_listings', 'amenities');
    await queryInterface.removeColumn('unified_listings', 'categories');
    await queryInterface.removeColumn('unified_listings', 'instantConfirmation');
    await queryInterface.removeColumn('unified_listings', 'cancellationPolicy');
    await queryInterface.removeColumn('unified_listings', 'accessibility');
    await queryInterface.removeColumn('unified_listings', 'languagesSupported');
    await queryInterface.removeColumn('unified_listings', 'ageRestrictions');
    await queryInterface.removeColumn('unified_listings', 'groupSize');
    await queryInterface.removeColumn('unified_listings', 'highlights');
    await queryInterface.removeColumn('unified_listings', 'included');
    await queryInterface.removeColumn('unified_listings', 'excluded');
    await queryInterface.removeColumn('unified_listings', 'requirements');
    await queryInterface.removeColumn('unified_listings', 'tags');
    await queryInterface.removeColumn('unified_listings', 'difficulty');
    await queryInterface.removeColumn('unified_listings', 'duration');
    await queryInterface.removeColumn('unified_listings', 'schedule');
  },
};