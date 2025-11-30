'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Webhook endpoints table
    await queryInterface.createTable('webhook_endpoints', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      url: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true,
      },
      secret: {
        type: Sequelize.STRING,
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
      },
      events: {
        type: Sequelize.ARRAY(Sequelize.STRING),
        allowNull: false,
        defaultValue: [],
      },
      isActive: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
      },
      lastUsed: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      failureCount: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
      },
      maxRetries: {
        type: Sequelize.INTEGER,
        defaultValue: 3,
      },
      retryBackoff: {
        type: Sequelize.INTEGER,
        defaultValue: 30, // seconds
      },
      timeout: {
        type: Sequelize.INTEGER,
        defaultValue: 30000, // milliseconds
      },
      headers: {
        type: Sequelize.JSONB,
        defaultValue: {},
      },
      metadata: {
        type: Sequelize.JSONB,
        defaultValue: {},
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

    // Webhook events table
    await queryInterface.createTable('webhook_events', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      endpointId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'webhook_endpoints',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      eventType: {
        type: Sequelize.ENUM(
          'listing.created',
          'listing.updated',
          'listing.deleted',
          'listing.availability.changed',
          'listing.price.changed',
          'listing.status.changed'
        ),
        allowNull: false,
      },
      listingId: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      payload: {
        type: Sequelize.JSONB,
        allowNull: false,
      },
      signature: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      status: {
        type: Sequelize.ENUM('pending', 'processing', 'delivered', 'failed', 'cancelled'),
        defaultValue: 'pending',
      },
      attempts: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
      },
      lastAttempt: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      nextRetry: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      responseStatus: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      responseBody: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      responseTime: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      errorMessage: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      deliveredAt: {
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

    // Incoming webhook logs table
    await queryInterface.createTable('incoming_webhook_logs', {
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
      eventType: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      payload: {
        type: Sequelize.JSONB,
        allowNull: false,
      },
      headers: {
        type: Sequelize.JSONB,
        allowNull: false,
      },
      signature: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      verified: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      processed: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      processingStatus: {
        type: Sequelize.ENUM('success', 'failed', 'pending'),
        defaultValue: 'pending',
      },
      errorMessage: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      listingsAffected: {
        type: Sequelize.ARRAY(Sequelize.STRING),
        defaultValue: [],
      },
      ipAddress: {
        type: Sequelize.INET,
        allowNull: true,
      },
      userAgent: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      processedAt: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
    });

    // Add indexes for performance
    await queryInterface.addIndex('webhook_endpoints', ['source', 'isActive']);
    await queryInterface.addIndex('webhook_endpoints', ['url']);
    
    await queryInterface.addIndex('webhook_events', ['endpointId', 'status']);
    await queryInterface.addIndex('webhook_events', ['eventType', 'createdAt']);
    await queryInterface.addIndex('webhook_events', ['status', 'nextRetry']);
    await queryInterface.addIndex('webhook_events', ['listingId']);
    
    await queryInterface.addIndex('incoming_webhook_logs', ['source', 'createdAt']);
    await queryInterface.addIndex('incoming_webhook_logs', ['processed', 'processingStatus']);
    await queryInterface.addIndex('incoming_webhook_logs', ['eventType']);
    await queryInterface.addIndex('incoming_webhook_logs', ['createdAt']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('incoming_webhook_logs');
    await queryInterface.dropTable('webhook_events');
    await queryInterface.dropTable('webhook_endpoints');
  },
};