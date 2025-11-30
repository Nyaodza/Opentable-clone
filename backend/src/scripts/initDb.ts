import { sequelize } from '../config/database';
import { User, UserRole } from '../models/User';
import { Restaurant, CuisineType, PriceRange } from '../models/Restaurant';
import { Table } from '../models/Table';
import { RestaurantHours } from '../models/RestaurantHours';
import { Review } from '../models/Review';
import { Reservation } from '../models/Reservation';
import bcrypt from 'bcryptjs';

const initDatabase = async () => {
  try {
    console.log('🚀 Initializing database...');

    // Test connection
    await sequelize.authenticate();
    console.log('✅ Database connection established.');

    // Sync all models
    await sequelize.sync({ force: true });
    console.log('✅ Database tables created.');

    // Create seed data
    console.log('🌱 Creating seed data...');

    // Create admin user
    const adminUser = await User.create({
      firstName: 'Admin',
      lastName: 'User',
      email: 'admin@opentable-clone.com',
      password: 'Admin@123456',
      role: UserRole.ADMIN,
      emailVerified: true,
      phone: '+1234567890'
    });

    // Create restaurant owners
    const owner1 = await User.create({
      firstName: 'John',
      lastName: 'Doe',
      email: 'owner1@demo.com',
      password: 'Demo123!',
      role: UserRole.RESTAURANT_OWNER,
      emailVerified: true,
      phone: '+1234567891'
    });

    const owner2 = await User.create({
      firstName: 'Jane',
      lastName: 'Smith',
      email: 'owner2@demo.com',
      password: 'Demo123!',
      role: UserRole.RESTAURANT_OWNER,
      emailVerified: true,
      phone: '+1234567892'
    });

    // Create diners
    const diner1 = await User.create({
      firstName: 'Alice',
      lastName: 'Johnson',
      email: 'diner1@demo.com',
      password: 'Demo123!',
      role: UserRole.DINER,
      emailVerified: true,
      phone: '+1234567893',
      preferences: {
        cuisineTypes: ['Italian', 'French'],
        dietaryRestrictions: ['Vegetarian']
      }
    });

    const diner2 = await User.create({
      firstName: 'Bob',
      lastName: 'Wilson',
      email: 'diner2@demo.com',
      password: 'Demo123!',
      role: UserRole.DINER,
      emailVerified: true,
      phone: '+1234567894'
    });

    console.log('✅ Users created.');

    // Create restaurants
    const restaurant1 = await Restaurant.create({
      name: 'La Bella Italia',
      description: 'Authentic Italian cuisine in the heart of downtown. Experience traditional recipes passed down through generations.',
      cuisineType: CuisineType.ITALIAN,
      address: '123 Main Street',
      city: 'New York',
      state: 'NY',
      zipCode: '10001',
      country: 'USA',
      latitude: 40.7128,
      longitude: -74.0060,
      phone: '+1234567895',
      email: 'info@labellaitalia.com',
      website: 'https://labellaitalia.com',
      priceRange: PriceRange.MODERATE,
      totalCapacity: 60,
      images: [
        'https://images.unsplash.com/photo-1555396273-367ea4eb4db5',
        'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4'
      ],
      amenities: ['WiFi', 'Outdoor Seating', 'Private Dining', 'Bar'],
      settings: {
        reservationDuration: 120,
        advanceBookingDays: 30,
        minPartySize: 1,
        maxPartySize: 10,
        cancellationWindow: 24
      },
      ownerId: owner1.id
    });

    const restaurant2 = await Restaurant.create({
      name: 'Le Petit Bistro',
      description: 'Cozy French bistro offering classic dishes with a modern twist. Perfect for romantic dinners.',
      cuisineType: CuisineType.FRENCH,
      address: '456 Oak Avenue',
      city: 'San Francisco',
      state: 'CA',
      zipCode: '94102',
      country: 'USA',
      latitude: 37.7749,
      longitude: -122.4194,
      phone: '+1234567896',
      email: 'contact@lepetitbistro.com',
      website: 'https://lepetitbistro.com',
      priceRange: PriceRange.EXPENSIVE,
      totalCapacity: 40,
      images: [
        'https://images.unsplash.com/photo-1414235077428-338989a2e8c0',
        'https://images.unsplash.com/photo-1552566626-52f8b828add9'
      ],
      amenities: ['Wine Bar', 'Private Events', 'Valet Parking'],
      settings: {
        reservationDuration: 150,
        advanceBookingDays: 45,
        minPartySize: 2,
        maxPartySize: 8,
        cancellationWindow: 48
      },
      ownerId: owner2.id
    });

    const restaurant3 = await Restaurant.create({
      name: 'Sakura Sushi',
      description: 'Premium Japanese dining experience with master sushi chefs and fresh daily imports from Japan.',
      cuisineType: CuisineType.JAPANESE,
      address: '789 Cherry Blossom Lane',
      city: 'Los Angeles',
      state: 'CA',
      zipCode: '90001',
      country: 'USA',
      latitude: 34.0522,
      longitude: -118.2437,
      phone: '+1234567897',
      email: 'info@sakurasushi.com',
      priceRange: PriceRange.LUXURY,
      totalCapacity: 50,
      images: [
        'https://images.unsplash.com/photo-1579584425555-c3ce17fd4351',
        'https://images.unsplash.com/photo-1563245258-d35eaa3d524f'
      ],
      amenities: ['Sushi Bar', 'Private Rooms', 'Sake Bar', 'Valet Parking'],
      settings: {
        reservationDuration: 90,
        advanceBookingDays: 60,
        minPartySize: 1,
        maxPartySize: 12,
        cancellationWindow: 72
      },
      ownerId: owner2.id
    });

    console.log('✅ Restaurants created.');

    // Create tables for each restaurant
    // Restaurant 1 tables
    for (let i = 1; i <= 10; i++) {
      await Table.create({
        restaurantId: restaurant1.id,
        tableNumber: `T${i}`,
        capacity: i <= 4 ? 2 : i <= 8 ? 4 : 6,
        minCapacity: i <= 4 ? 1 : 2,
        location: i <= 6 ? 'indoor' : 'outdoor',
        isActive: true
      });
    }

    // Restaurant 2 tables
    for (let i = 1; i <= 8; i++) {
      await Table.create({
        restaurantId: restaurant2.id,
        tableNumber: `B${i}`,
        capacity: i <= 4 ? 2 : 4,
        minCapacity: i <= 4 ? 1 : 2,
        location: 'indoor',
        isActive: true
      });
    }

    // Restaurant 3 tables
    for (let i = 1; i <= 12; i++) {
      await Table.create({
        restaurantId: restaurant3.id,
        tableNumber: i <= 6 ? `BAR${i}` : `TABLE${i-6}`,
        capacity: i <= 6 ? 1 : 4,
        minCapacity: 1,
        location: i <= 6 ? 'sushi-bar' : 'dining-room',
        isActive: true
      });
    }

    console.log('✅ Tables created.');

    // Create restaurant hours
    const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    
    for (const restaurant of [restaurant1, restaurant2, restaurant3]) {
      for (const day of daysOfWeek) {
        const isWeekend = day === 'Saturday' || day === 'Sunday';
        await RestaurantHours.create({
          restaurantId: restaurant.id,
          dayOfWeek: day,
          openTime: isWeekend ? '11:00' : '12:00',
          closeTime: isWeekend ? '23:00' : '22:00',
          isClosed: false,
          lastReservationTime: isWeekend ? '21:30' : '20:30'
        });
      }
    }

    console.log('✅ Restaurant hours created.');

    // Create some reviews
    const review1 = await Review.create({
      userId: diner1.id,
      restaurantId: restaurant1.id,
      overallRating: 5,
      foodRating: 5,
      serviceRating: 5,
      ambianceRating: 4,
      valueRating: 5,
      comment: 'Amazing authentic Italian food! The pasta was perfect and the service was excellent.',
      visitDate: new Date('2024-01-15'),
      isVerified: true
    });

    const review2 = await Review.create({
      userId: diner2.id,
      restaurantId: restaurant2.id,
      overallRating: 4,
      foodRating: 5,
      serviceRating: 4,
      ambianceRating: 4,
      valueRating: 3,
      comment: 'Great French cuisine, though a bit pricey. The duck confit was exceptional.',
      visitDate: new Date('2024-01-20'),
      isVerified: true
    });

    // Update restaurant ratings
    await restaurant1.update({ averageRating: 5, totalReviews: 1 });
    await restaurant2.update({ averageRating: 4, totalReviews: 1 });

    console.log('✅ Reviews created.');

    // Create a test reservation
    const testReservation = await Reservation.create({
      userId: diner1.id,
      restaurantId: restaurant1.id,
      dateTime: new Date('2024-12-25 19:00:00'),
      partySize: 2,
      status: 'confirmed',
      specialRequests: 'Anniversary dinner, please arrange something special',
      confirmationCode: 'RES123456',
      guestInfo: {
        firstName: 'Alice',
        lastName: 'Johnson',
        email: 'diner1@demo.com',
        phone: '+1234567893'
      }
    });

    console.log('✅ Test reservation created.');

    console.log('\n🎉 Database initialization complete!');
    console.log('\n📝 Test accounts:');
    console.log('Admin: admin@opentable-clone.com / Admin@123456');
    console.log('Restaurant Owner 1: owner1@demo.com / Demo123!');
    console.log('Restaurant Owner 2: owner2@demo.com / Demo123!');
    console.log('Diner 1: diner1@demo.com / Demo123!');
    console.log('Diner 2: diner2@demo.com / Demo123!');

  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
};

// Run if called directly
if (require.main === module) {
  initDatabase();
}

export default initDatabase;