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

    const operatingHours: any[] = [];
    const daysOfWeek = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

    // Generate operating hours for each restaurant
    restaurants.forEach((restaurant: any) => {
      daysOfWeek.forEach((day) => {
        let openTime, closeTime;
        let isClosed = false;

        // Different hours for different restaurants
        if (restaurant.name === 'The Italian Corner') {
          // Closed on Mondays
          if (day === 'monday') {
            isClosed = true;
          } else {
            openTime = '11:30:00';
            closeTime = '22:00:00';
            // Extended hours on Friday and Saturday
            if (day === 'friday' || day === 'saturday') {
              closeTime = '23:00:00';
            }
          }
        } else if (restaurant.name === 'Sakura Sushi Bar') {
          // Lunch and dinner service with break
          openTime = '11:30:00';
          closeTime = '14:30:00';
          
          // Add dinner hours as separate entry
          if (day !== 'sunday') {
            operatingHours.push({
              id: uuidv4(),
              restaurantId: restaurant.id,
              dayOfWeek: day,
              openTime: '17:30:00',
              closeTime: '22:30:00',
              isClosed: false,
              createdAt: now,
              updatedAt: now,
            });
          }
        } else if (restaurant.name === 'The Burger Joint') {
          // Open all week, longer hours
          openTime = '11:00:00';
          closeTime = '23:00:00';
          // Late night on Friday and Saturday
          if (day === 'friday' || day === 'saturday') {
            closeTime = '01:00:00';
          }
        } else if (restaurant.name === 'Le Petit Bistro') {
          // Closed Sunday and Monday
          if (day === 'sunday' || day === 'monday') {
            isClosed = true;
          } else {
            openTime = '17:00:00';
            closeTime = '22:00:00';
            // Extended hours on Saturday
            if (day === 'saturday') {
              closeTime = '23:00:00';
            }
          }
        }

        if (!isClosed && openTime && closeTime) {
          operatingHours.push({
            id: uuidv4(),
            restaurantId: restaurant.id,
            dayOfWeek: day,
            openTime,
            closeTime,
            isClosed: false,
            createdAt: now,
            updatedAt: now,
          });
        } else if (isClosed) {
          operatingHours.push({
            id: uuidv4(),
            restaurantId: restaurant.id,
            dayOfWeek: day,
            openTime: null,
            closeTime: null,
            isClosed: true,
            createdAt: now,
            updatedAt: now,
          });
        }
      });
    });

    await queryInterface.bulkInsert('restaurant_operating_hours', operatingHours);
  },

  down: async (queryInterface: any) => {
    await queryInterface.bulkDelete('restaurant_operating_hours', null, {});
  },
};