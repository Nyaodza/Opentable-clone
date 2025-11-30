import { UserService } from '../../services/UserService';
import { RedisService } from '../../services/RedisService';
import { User, GoogleProfile } from '../../types';

// Mock RedisService
jest.mock('../../services/RedisService');

describe('UserService', () => {
  let userService: UserService;
  let mockRedisService: jest.Mocked<RedisService>;
  let mockGoogleProfile: GoogleProfile;

  beforeEach(() => {
    mockRedisService = new RedisService() as jest.Mocked<RedisService>;
    userService = new UserService(mockRedisService);

    mockGoogleProfile = {
      id: 'google-123',
      displayName: 'Test User',
      emails: [{ value: 'test@example.com', verified: true }],
      photos: [{ value: 'https://example.com/photo.jpg' }],
    };

    // Reset all mocks
    jest.clearAllMocks();
  });

  describe('findOrCreateUser', () => {
    it('should return existing user if found', async () => {
      const existingUser: User = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        role: 'viewer',
        createdAt: new Date('2023-01-01'),
        lastLogin: new Date('2023-01-01'),
      };

      mockRedisService.get.mockResolvedValueOnce('user-123'); // email lookup
      mockRedisService.get.mockResolvedValueOnce(JSON.stringify(existingUser)); // user data

      const result = await userService.findOrCreateUser(mockGoogleProfile);

      expect(result.id).toBe(existingUser.id);
      expect(result.email).toBe(existingUser.email);
      expect(mockRedisService.set).toHaveBeenCalled(); // Update user
    });

    it('should create new user if not found', async () => {
      mockRedisService.get.mockResolvedValue(null);

      const result = await userService.findOrCreateUser(mockGoogleProfile);

      expect(result.email).toBe('test@example.com');
      expect(result.name).toBe('Test User');
      expect(result.googleId).toBe('google-123');
      expect(result.role).toBe('viewer');
      expect(mockRedisService.set).toHaveBeenCalledTimes(3); // user data + email index + google index
    });

    it('should assign admin role if email is in admin list', async () => {
      process.env.ADMIN_EMAILS = 'admin@example.com,test@example.com';
      mockRedisService.get.mockResolvedValue(null);

      const result = await userService.findOrCreateUser(mockGoogleProfile);

      expect(result.role).toBe('admin');
    });

    it('should throw error if no email in profile', async () => {
      const profileWithoutEmail: GoogleProfile = {
        ...mockGoogleProfile,
        emails: [],
      };

      await expect(userService.findOrCreateUser(profileWithoutEmail))
        .rejects.toThrow('No email found in Google profile');
    });
  });

  describe('findUserById', () => {
    it('should return user if found', async () => {
      const user: User = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        role: 'viewer',
        createdAt: new Date(),
        lastLogin: new Date(),
      };

      mockRedisService.get.mockResolvedValueOnce(JSON.stringify(user));

      const result = await userService.findUserById('user-123');

      expect(result).toEqual(user);
      expect(mockRedisService.get).toHaveBeenCalledWith('user:user-123');
    });

    it('should return null if user not found', async () => {
      mockRedisService.get.mockResolvedValueOnce(null);

      const result = await userService.findUserById('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('deleteUser', () => {
    it('should delete user and all indexes', async () => {
      const user: User = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        googleId: 'google-123',
        role: 'viewer',
        createdAt: new Date(),
        lastLogin: new Date(),
      };

      mockRedisService.get.mockResolvedValueOnce(JSON.stringify(user));

      await userService.deleteUser('user-123');

      expect(mockRedisService.del).toHaveBeenCalledWith('user:user-123');
      expect(mockRedisService.del).toHaveBeenCalledWith('email:test@example.com');
      expect(mockRedisService.del).toHaveBeenCalledWith('google:google-123');
    });

    it('should not throw if user not found', async () => {
      mockRedisService.get.mockResolvedValueOnce(null);

      await expect(userService.deleteUser('nonexistent')).resolves.not.toThrow();
    });
  });

  describe('updateUserRole', () => {
    it('should update user role', async () => {
      const user: User = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        role: 'viewer',
        createdAt: new Date(),
        lastLogin: new Date(),
      };

      mockRedisService.get.mockResolvedValueOnce(JSON.stringify(user));

      await userService.updateUserRole('user-123', 'admin');

      expect(mockRedisService.set).toHaveBeenCalled();
      const savedUserCall = mockRedisService.set.mock.calls[0];
      const savedUser = JSON.parse(savedUserCall[1] as string);
      expect(savedUser.role).toBe('admin');
    });

    it('should throw if user not found', async () => {
      mockRedisService.get.mockResolvedValueOnce(null);

      await expect(userService.updateUserRole('nonexistent', 'admin'))
        .rejects.toThrow('User not found');
    });
  });
});