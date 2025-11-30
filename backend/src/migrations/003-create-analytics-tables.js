'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Listing view analytics table
    await queryInterface.createTable('listing_views', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      listingId: {
        type: Sequelize.STRING,
        allowNull: false,
        references: {
          model: 'unified_listings',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
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
      sessionId: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      ipAddress: {
        type: Sequelize.INET,
        allowNull: true,
      },
      userAgent: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      referrer: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      searchQuery: {
        type: Sequelize.JSONB,
        allowNull: true,
      },
      viewDuration: {
        type: Sequelize.INTEGER, // in seconds
        allowNull: true,
      },
      deviceType: {
        type: Sequelize.ENUM('desktop', 'mobile', 'tablet'),
        allowNull: true,
      },
      location: {
        type: Sequelize.JSONB,
        allowNull: true,
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
    });

    // Search analytics table
    await queryInterface.createTable('search_analytics', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
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
      sessionId: {
        type: Sequelize.STRING,
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
      searchParams: {
        type: Sequelize.JSONB,
        allowNull: false,
      },
      resultsCount: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      localResults: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
      },
      apiResults: {
        type: Sequelize.JSONB,
        defaultValue: {},
      },
      responseTime: {
        type: Sequelize.INTEGER, // in milliseconds
        allowNull: false,
      },
      clicked: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      clickedListingId: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      converted: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      ipAddress: {
        type: Sequelize.INET,
        allowNull: true,
      },
      userAgent: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
    });

    // Provider performance analytics table
    await queryInterface.createTable('provider_analytics', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
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
      requestCount: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
      },
      successCount: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
      },
      errorCount: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
      },
      avgResponseTime: {
        type: Sequelize.FLOAT,
        defaultValue: 0,
      },
      totalResults: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
      },
      uniqueResults: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
      },
      clicksReceived: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
      },
      bookingsReceived: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
      },
      revenue: {
        type: Sequelize.DECIMAL(10, 2),
        defaultValue: 0,
      },
      lastRequestAt: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      date: {
        type: Sequelize.DATEONLY,
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

    // Listing performance summary table
    await queryInterface.createTable('listing_performance', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      listingId: {
        type: Sequelize.STRING,
        allowNull: false,
        references: {
          model: 'unified_listings',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      views: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
      },
      uniqueViews: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
      },
      clicks: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
      },
      bookings: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
      },
      revenue: {
        type: Sequelize.DECIMAL(10, 2),
        defaultValue: 0,
      },
      avgViewDuration: {
        type: Sequelize.FLOAT,
        defaultValue: 0,
      },
      bounceRate: {
        type: Sequelize.FLOAT,
        defaultValue: 0,
      },
      conversionRate: {
        type: Sequelize.FLOAT,
        defaultValue: 0,
      },
      avgPosition: {
        type: Sequelize.FLOAT,
        defaultValue: 0,
      },
      date: {
        type: Sequelize.DATEONLY,
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
    await queryInterface.addIndex('listing_views', ['listingId', 'createdAt']);
    await queryInterface.addIndex('listing_views', ['userId', 'createdAt']);
    await queryInterface.addIndex('listing_views', ['sessionId']);
    await queryInterface.addIndex('listing_views', ['createdAt']);
    
    await queryInterface.addIndex('search_analytics', ['serviceType', 'createdAt']);
    await queryInterface.addIndex('search_analytics', ['userId', 'createdAt']);
    await queryInterface.addIndex('search_analytics', ['sessionId']);
    await queryInterface.addIndex('search_analytics', ['createdAt']);
    
    await queryInterface.addIndex('provider_analytics', ['source', 'date']);
    await queryInterface.addIndex('provider_analytics', ['serviceType', 'date']);
    await queryInterface.addIndex('provider_analytics', ['date']);
    
    await queryInterface.addIndex('listing_performance', ['listingId', 'date']);
    await queryInterface.addIndex('listing_performance', ['date']);
    
    // Add unique constraints
    await queryInterface.addConstraint('provider_analytics', {
      fields: ['source', 'serviceType', 'date'],
      type: 'unique',
      name: 'unique_provider_service_date',
    });
    
    await queryInterface.addConstraint('listing_performance', {
      fields: ['listingId', 'date'],
      type: 'unique',
      name: 'unique_listing_date',
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('listing_performance');
    await queryInterface.dropTable('provider_analytics');
    await queryInterface.dropTable('search_analytics');
    await queryInterface.dropTable('listing_views');
  },
};