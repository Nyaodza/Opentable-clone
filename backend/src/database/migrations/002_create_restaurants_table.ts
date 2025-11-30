import { QueryInterface, DataTypes } from 'sequelize';

export default {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.createTable('restaurants', {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      ownerId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
        onDelete: 'CASCADE',
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      cuisineType: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      priceRange: {
        type: DataTypes.ENUM('$', '$$', '$$$', '$$$$'),
        allowNull: false,
      },
      address: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      city: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      state: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      zipCode: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      country: {
        type: DataTypes.STRING,
        defaultValue: 'USA',
      },
      phone: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      email: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      website: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      latitude: {
        type: DataTypes.DECIMAL(10, 8),
        allowNull: true,
      },
      longitude: {
        type: DataTypes.DECIMAL(11, 8),
        allowNull: true,
      },
      images: {
        type: DataTypes.JSON,
        defaultValue: [],
      },
      logo: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      coverImage: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      features: {
        type: DataTypes.JSON,
        defaultValue: [],
      },
      amenities: {
        type: DataTypes.JSON,
        defaultValue: [],
      },
      dietaryRestrictions: {
        type: DataTypes.JSON,
        defaultValue: [],
      },
      averageRating: {
        type: DataTypes.DECIMAL(2, 1),
        defaultValue: 0,
      },
      totalReviews: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
      },
      totalReservations: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
      },
      isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },
      isVerified: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
      verifiedAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      verifiedBy: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      stripeAccountId: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      stripeAccountStatus: {
        type: DataTypes.STRING,
        defaultValue: 'pending',
      },
      cancellationPolicy: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      reservationDeposit: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
      },
      maxAdvanceBookingDays: {
        type: DataTypes.INTEGER,
        defaultValue: 60,
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
      },
    });

    // Add indexes
    await queryInterface.addIndex('restaurants', ['ownerId']);
    await queryInterface.addIndex('restaurants', ['cuisineType']);
    await queryInterface.addIndex('restaurants', ['city']);
    await queryInterface.addIndex('restaurants', ['isActive']);
    await queryInterface.addIndex('restaurants', ['averageRating']);
    await queryInterface.addIndex('restaurants', ['latitude', 'longitude']);
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.dropTable('restaurants');
  },
};