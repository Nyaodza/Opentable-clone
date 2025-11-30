import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

export default {
  up: async (queryInterface: any) => {
    const now = new Date();
    const hashedPassword = await bcrypt.hash('password123', 10);

    const users = [
      {
        id: uuidv4(),
        firstName: 'Admin',
        lastName: 'User',
        email: 'admin@opentable-clone.com',
        password: hashedPassword,
        phone: '+1234567890',
        role: 'admin',
        loyaltyPoints: 0,
        preferences: JSON.stringify({
          notifications: {
            email: true,
            push: true,
            sms: true,
          },
          dietary: [],
          cuisinePreferences: [],
        }),
        isActive: true,
        emailVerified: true,
        lastLogin: now,
        lastActiveAt: now,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: uuidv4(),
        firstName: 'John',
        lastName: 'Restaurant',
        email: 'owner@restaurant.com',
        password: hashedPassword,
        phone: '+1234567891',
        role: 'restaurant_owner',
        loyaltyPoints: 0,
        preferences: JSON.stringify({
          notifications: {
            email: true,
            push: true,
            sms: true,
          },
        }),
        isActive: true,
        emailVerified: true,
        lastLogin: now,
        lastActiveAt: now,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: uuidv4(),
        firstName: 'Jane',
        lastName: 'Diner',
        email: 'diner@example.com',
        password: hashedPassword,
        phone: '+1234567892',
        role: 'diner',
        loyaltyPoints: 500,
        preferences: JSON.stringify({
          notifications: {
            email: true,
            push: false,
            sms: true,
          },
          dietary: ['vegetarian'],
          cuisinePreferences: ['italian', 'japanese'],
        }),
        isActive: true,
        emailVerified: true,
        lastLogin: now,
        lastActiveAt: now,
        dateOfBirth: '1990-05-15',
        createdAt: now,
        updatedAt: now,
      },
      {
        id: uuidv4(),
        firstName: 'Mike',
        lastName: 'Staff',
        email: 'staff@restaurant.com',
        password: hashedPassword,
        phone: '+1234567893',
        role: 'restaurant_staff',
        loyaltyPoints: 0,
        preferences: JSON.stringify({
          notifications: {
            email: true,
            push: true,
            sms: false,
          },
        }),
        isActive: true,
        emailVerified: true,
        lastLogin: now,
        lastActiveAt: now,
        createdAt: now,
        updatedAt: now,
      },
    ];

    await queryInterface.bulkInsert('users', users);
  },

  down: async (queryInterface: any) => {
    await queryInterface.bulkDelete('users', {
      email: {
        [queryInterface.sequelize.Op.in]: [
          'admin@opentable-clone.com',
          'owner@restaurant.com',
          'diner@example.com',
          'staff@restaurant.com',
        ],
      },
    });
  },
};