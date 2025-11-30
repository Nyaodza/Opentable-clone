import { User, GoogleProfile } from '../types';
import { config } from '../config/environment';
import { logger } from '../utils/logger';
import { RedisService } from './RedisService';
import { v4 as uuidv4 } from 'uuid';

export class UserService {
  constructor(private redisService: RedisService) {}

  async findOrCreateUser(profile: GoogleProfile): Promise<User> {
    const email = profile.emails[0]?.value;
    if (!email) {
      throw new Error('No email found in Google profile');
    }

    // Check if user exists
    let user = await this.findUserByEmail(email);
    if (user) {
      // Update last login
      user.lastLogin = new Date();
      await this.updateUser(user);
      return user;
    }

    // Create new user
    const newUser: User = {
      id: uuidv4(),
      email,
      name: profile.displayName,
      picture: profile.photos[0]?.value,
      googleId: profile.id,
      role: config.adminEmails.includes(email) ? 'admin' : 'viewer',
      createdAt: new Date(),
      lastLogin: new Date(),
    };

    await this.saveUser(newUser);
    logger.info(`New user created: ${email}`);
    return newUser;
  }

  async findUserById(id: string): Promise<User | null> {
    const userData = await this.redisService.get(`user:${id}`);
    if (!userData) return null;
    return JSON.parse(userData);
  }

  async findUserByEmail(email: string): Promise<User | null> {
    const userId = await this.redisService.get(`email:${email}`);
    if (!userId) return null;
    return this.findUserById(userId);
  }

  async findUserByGoogleId(googleId: string): Promise<User | null> {
    const userId = await this.redisService.get(`google:${googleId}`);
    if (!userId) return null;
    return this.findUserById(userId);
  }

  async saveUser(user: User): Promise<void> {
    // Save user data
    await this.redisService.set(`user:${user.id}`, JSON.stringify(user));
    
    // Create email index
    await this.redisService.set(`email:${user.email}`, user.id);
    
    // Create Google ID index if available
    if (user.googleId) {
      await this.redisService.set(`google:${user.googleId}`, user.id);
    }
  }

  async updateUser(user: User): Promise<void> {
    await this.saveUser(user);
  }

  async deleteUser(userId: string): Promise<void> {
    const user = await this.findUserById(userId);
    if (!user) return;

    // Delete user data
    await this.redisService.del(`user:${userId}`);
    
    // Delete indexes
    await this.redisService.del(`email:${user.email}`);
    if (user.googleId) {
      await this.redisService.del(`google:${user.googleId}`);
    }
  }

  async getAllUsers(): Promise<User[]> {
    const keys = await this.redisService.keys('user:*');
    const users: User[] = [];
    
    for (const key of keys) {
      const userData = await this.redisService.get(key);
      if (userData) {
        users.push(JSON.parse(userData));
      }
    }
    
    return users;
  }

  async updateUserRole(userId: string, role: 'admin' | 'viewer'): Promise<void> {
    const user = await this.findUserById(userId);
    if (!user) {
      throw new Error('User not found');
    }
    
    user.role = role;
    await this.updateUser(user);
  }
}