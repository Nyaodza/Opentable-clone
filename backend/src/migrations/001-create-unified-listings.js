'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('unified_listings', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
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
      source: {
        type: Sequelize.ENUM(
          'local',
          'viator',
          'getyourguide',
          'travelpayouts',
          'discovercars',
          'rentalcars',
          'cruisedirect',
          'expedia',
          'gotosea',
          'eventbrite',
          'ticketmaster',
          'kiwi',
          'skyscanner',
          'booking',
          'opentable',
          'vrbo'
        ),
        allowNull: false,
        defaultValue: 'local',
      },
      externalId: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      title: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      location: {
        type: Sequelize.JSONB,
        allowNull: false,
        defaultValue: {},
      },
      rating: {
        type: Sequelize.DECIMAL(3, 2),
        allowNull: true,
        validate: {
          min: 0,
          max: 5,
        },
      },
      reviewCount: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
      },
      price: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
      },
      currency: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      priceUnit: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      images: {
        type: Sequelize.ARRAY(Sequelize.STRING),
        defaultValue: [],
      },
      thumbnailUrl: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      url: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      amenities: {
        type: Sequelize.JSONB,
        defaultValue: {},
      },
      metadata: {
        type: Sequelize.JSONB,
        defaultValue: {},
      },
      score: {
        type: Sequelize.FLOAT,
        defaultValue: 0,
      },
      status: {
        type: Sequelize.ENUM('active', 'inactive', 'pending', 'suspended'),
        defaultValue: 'active',
      },
      userId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      availableFrom: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      availableUntil: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      isFeatured: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      viewCount: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
      },
      clickCount: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
      },
      bookingCount: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
      },
      lastSyncedAt: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      apiResponse: {
        type: Sequelize.JSONB,
        defaultValue: {},
      },
      cityLower: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      countryLower: {
        type: Sequelize.STRING,
        allowNull: false,
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

    // Add indexes for performance
    await queryInterface.addIndex('unified_listings', ['serviceType']);
    await queryInterface.addIndex('unified_listings', ['source']);
    await queryInterface.addIndex('unified_listings', ['status']);
    await queryInterface.addIndex('unified_listings', ['availableFrom']);
    await queryInterface.addIndex('unified_listings', ['availableUntil']);
    await queryInterface.addIndex('unified_listings', ['cityLower']);
    await queryInterface.addIndex('unified_listings', ['countryLower']);
    await queryInterface.addIndex('unified_listings', ['score']);
    await queryInterface.addIndex('unified_listings', ['isFeatured']);
    await queryInterface.addIndex('unified_listings', ['rating']);
    await queryInterface.addIndex('unified_listings', ['price']);
    
    // Composite indexes for common queries
    await queryInterface.addIndex('unified_listings', ['serviceType', 'status', 'cityLower']);
    await queryInterface.addIndex('unified_listings', ['serviceType', 'status', 'countryLower']);
    await queryInterface.addIndex('unified_listings', ['source', 'externalId']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('unified_listings');
  },
};