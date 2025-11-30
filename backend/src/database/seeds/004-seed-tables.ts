import { v4 as uuidv4 } from 'uuid';

export default {
  up: async (queryInterface: any) => {
    const now = new Date();
    
    // Get restaurant IDs
    const [restaurants] = await queryInterface.sequelize.query(
      "SELECT id, name FROM restaurants"
    );

    if (restaurants.length === 0) {
      console.error('No restaurants found. Please run restaurant seeds first.');
      return;
    }

    const tables: any[] = [];

    restaurants.forEach((restaurant: any) => {
      // Different table configurations for different restaurants
      if (restaurant.name === 'The Italian Corner') {
        // Small intimate restaurant
        // 4 two-person tables
        for (let i = 1; i <= 4; i++) {
          tables.push({
            id: uuidv4(),
            restaurantId: restaurant.id,
            tableNumber: `T${i}`,
            capacity: 2,
            isActive: true,
            createdAt: now,
            updatedAt: now,
          });
        }
        // 6 four-person tables
        for (let i = 5; i <= 10; i++) {
          tables.push({
            id: uuidv4(),
            restaurantId: restaurant.id,
            tableNumber: `T${i}`,
            capacity: 4,
            isActive: true,
            createdAt: now,
            updatedAt: now,
          });
        }
        // 2 six-person tables
        for (let i = 11; i <= 12; i++) {
          tables.push({
            id: uuidv4(),
            restaurantId: restaurant.id,
            tableNumber: `T${i}`,
            capacity: 6,
            isActive: true,
            createdAt: now,
            updatedAt: now,
          });
        }
      } else if (restaurant.name === 'Sakura Sushi Bar') {
        // Sushi bar seats
        for (let i = 1; i <= 12; i++) {
          tables.push({
            id: uuidv4(),
            restaurantId: restaurant.id,
            tableNumber: `BAR${i}`,
            capacity: 1,
            isActive: true,
            createdAt: now,
            updatedAt: now,
          });
        }
        // Regular tables
        for (let i = 1; i <= 8; i++) {
          tables.push({
            id: uuidv4(),
            restaurantId: restaurant.id,
            tableNumber: `T${i}`,
            capacity: 4,
            isActive: true,
            createdAt: now,
            updatedAt: now,
          });
        }
        // Private rooms
        tables.push({
          id: uuidv4(),
          restaurantId: restaurant.id,
          tableNumber: 'PRIVATE1',
          capacity: 8,
          isActive: true,
          createdAt: now,
          updatedAt: now,
        });
        tables.push({
          id: uuidv4(),
          restaurantId: restaurant.id,
          tableNumber: 'PRIVATE2',
          capacity: 10,
          isActive: true,
          createdAt: now,
          updatedAt: now,
        });
      } else if (restaurant.name === 'The Burger Joint') {
        // Casual dining with mix of table sizes
        // 10 two-person tables
        for (let i = 1; i <= 10; i++) {
          tables.push({
            id: uuidv4(),
            restaurantId: restaurant.id,
            tableNumber: `T${i}`,
            capacity: 2,
            isActive: true,
            createdAt: now,
            updatedAt: now,
          });
        }
        // 8 four-person tables
        for (let i = 11; i <= 18; i++) {
          tables.push({
            id: uuidv4(),
            restaurantId: restaurant.id,
            tableNumber: `T${i}`,
            capacity: 4,
            isActive: true,
            createdAt: now,
            updatedAt: now,
          });
        }
        // 4 booth tables for 6
        for (let i = 1; i <= 4; i++) {
          tables.push({
            id: uuidv4(),
            restaurantId: restaurant.id,
            tableNumber: `BOOTH${i}`,
            capacity: 6,
            isActive: true,
            createdAt: now,
            updatedAt: now,
          });
        }
        // Outdoor seating
        for (let i = 1; i <= 6; i++) {
          tables.push({
            id: uuidv4(),
            restaurantId: restaurant.id,
            tableNumber: `PATIO${i}`,
            capacity: 4,
            isActive: true,
            createdAt: now,
            updatedAt: now,
          });
        }
      } else if (restaurant.name === 'Le Petit Bistro') {
        // Fine dining with fewer tables
        // 6 two-person tables
        for (let i = 1; i <= 6; i++) {
          tables.push({
            id: uuidv4(),
            restaurantId: restaurant.id,
            tableNumber: `T${i}`,
            capacity: 2,
            isActive: true,
            createdAt: now,
            updatedAt: now,
          });
        }
        // 4 four-person tables
        for (let i = 7; i <= 10; i++) {
          tables.push({
            id: uuidv4(),
            restaurantId: restaurant.id,
            tableNumber: `T${i}`,
            capacity: 4,
            isActive: true,
            createdAt: now,
            updatedAt: now,
          });
        }
        // Chef's table
        tables.push({
          id: uuidv4(),
          restaurantId: restaurant.id,
          tableNumber: 'CHEF',
          capacity: 8,
          isActive: true,
          createdAt: now,
          updatedAt: now,
        });
        // Wine room
        tables.push({
          id: uuidv4(),
          restaurantId: restaurant.id,
          tableNumber: 'WINE',
          capacity: 12,
          isActive: true,
          createdAt: now,
          updatedAt: now,
        });
      }
    });

    await queryInterface.bulkInsert('restaurant_tables', tables);
  },

  down: async (queryInterface: any) => {
    await queryInterface.bulkDelete('restaurant_tables', null, {});
  },
};