'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Create listing images table
    await queryInterface.createTable('listing_images', {
      id: {
        type: Sequelize.STRING,
        primaryKey: true,
        allowNull: false,
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
      originalUrl: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      cdnUrl: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      thumbnailUrl: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      sizes: {
        type: Sequelize.JSONB,
        allowNull: false,
        defaultValue: {},
      },
      metadata: {
        type: Sequelize.JSONB,
        allowNull: false,
        defaultValue: {},
      },
      originalSize: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      optimizedSize: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      format: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      lastUsed: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
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

    // Create image processing queue table
    await queryInterface.createTable('image_processing_queue', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      listingId: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      imageUrl: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      status: {
        type: Sequelize.ENUM('pending', 'processing', 'completed', 'failed'),
        defaultValue: 'pending',
      },
      priority: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
      },
      attempts: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
      },
      errorMessage: {
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
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
    });

    // Create CDN cache tracking table
    await queryInterface.createTable('cdn_cache_entries', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      cdnKey: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true,
      },
      cdnUrl: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      provider: {
        type: Sequelize.ENUM('cloudfront', 'cloudflare', 'fastly', 'custom'),
        allowNull: false,
      },
      size: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      contentType: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      etag: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      lastModified: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      hits: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
      },
      bandwidth: {
        type: Sequelize.BIGINT,
        defaultValue: 0,
      },
      region: {
        type: Sequelize.STRING,
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

    // Create image performance metrics table
    await queryInterface.createTable('image_performance_metrics', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      imageId: {
        type: Sequelize.STRING,
        allowNull: false,
        references: {
          model: 'listing_images',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      loadTime: {
        type: Sequelize.FLOAT,
        allowNull: false,
      },
      renderTime: {
        type: Sequelize.FLOAT,
        allowNull: false,
      },
      viewportSize: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      deviceType: {
        type: Sequelize.ENUM('desktop', 'mobile', 'tablet'),
        allowNull: false,
      },
      connectionType: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      cacheHit: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      lazyLoaded: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      userAgent: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      country: {
        type: Sequelize.STRING(2),
        allowNull: true,
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
    });

    // Create listing image references table (many-to-many)
    await queryInterface.createTable('listing_image_references', {
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
      imageId: {
        type: Sequelize.STRING,
        allowNull: false,
        references: {
          model: 'listing_images',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      position: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      isPrimary: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      caption: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      altText: {
        type: Sequelize.TEXT,
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

    // Add indexes
    await queryInterface.addIndex('listing_images', ['listingId']);
    await queryInterface.addIndex('listing_images', ['originalUrl'], {
      name: 'idx_listing_images_original_url',
      type: 'HASH',
    });
    await queryInterface.addIndex('listing_images', ['lastUsed']);
    await queryInterface.addIndex('listing_images', ['createdAt']);

    await queryInterface.addIndex('image_processing_queue', ['status', 'priority']);
    await queryInterface.addIndex('image_processing_queue', ['listingId']);
    await queryInterface.addIndex('image_processing_queue', ['createdAt']);

    await queryInterface.addIndex('cdn_cache_entries', ['cdnKey']);
    await queryInterface.addIndex('cdn_cache_entries', ['provider']);
    await queryInterface.addIndex('cdn_cache_entries', ['lastModified']);
    await queryInterface.addIndex('cdn_cache_entries', ['hits']);

    await queryInterface.addIndex('image_performance_metrics', ['imageId']);
    await queryInterface.addIndex('image_performance_metrics', ['loadTime']);
    await queryInterface.addIndex('image_performance_metrics', ['deviceType']);
    await queryInterface.addIndex('image_performance_metrics', ['cacheHit']);
    await queryInterface.addIndex('image_performance_metrics', ['createdAt']);

    await queryInterface.addIndex('listing_image_references', ['listingId', 'position']);
    await queryInterface.addIndex('listing_image_references', ['imageId']);
    await queryInterface.addIndex('listing_image_references', ['isPrimary']);

    // Add unique constraint for primary image per listing
    await queryInterface.addConstraint('listing_image_references', {
      fields: ['listingId'],
      type: 'unique',
      name: 'unique_primary_image_per_listing',
      where: {
        isPrimary: true,
      },
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('image_performance_metrics');
    await queryInterface.dropTable('listing_image_references');
    await queryInterface.dropTable('cdn_cache_entries');
    await queryInterface.dropTable('image_processing_queue');
    await queryInterface.dropTable('listing_images');
  },
};