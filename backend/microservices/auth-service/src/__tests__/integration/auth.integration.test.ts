import request from 'supertest';
import express from 'express';
import { AuthController } from '../../controllers/AuthController';
import { TokenService } from '../../services/TokenService';
import { UserService } from '../../services/UserService';
import { RedisService } from '../../services/RedisService';
import authRoutes from '../../routes/auth';
import { authenticateJWT, requireAdmin } from '../../middleware/auth';

// Mock services
jest.mock('../../services/RedisService');
jest.mock('../../config/passport', () => ({
  initializePassport: jest.fn().mockResolvedValue({
    initialize: () => (req: any, res: any, next: any) => next(),
    session: () => (req: any, res: any, next: any) => next(),
  }),
}));

describe('Auth API Integration Tests', () => {
  let app: express.Application;
  let mockRedisService: jest.Mocked<RedisService>;
  let tokenService: TokenService;
  let userService: UserService;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/auth', authRoutes);

    mockRedisService = new RedisService() as jest.Mocked<RedisService>;
    tokenService = new TokenService();
    userService = new UserService(mockRedisService);

    jest.clearAllMocks();
  });

  describe('POST /auth/refresh', () => {
    it('should refresh valid token', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        role: 'viewer' as const,
        createdAt: new Date(),
        lastLogin: new Date(),
      };

      const tokens = tokenService.generateTokens(mockUser);
      
      mockRedisService.get.mockImplementation(async (key: string) => {
        if (key === `refresh:${mockUser.id}:${tokens.refreshToken}`) {
          return '1';
        }
        if (key === `user:${mockUser.id}`) {
          return JSON.stringify(mockUser);
        }
        return null;
      });

      const response = await request(app)
        .post('/auth/refresh')
        .send({ refreshToken: tokens.refreshToken });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');
      expect(response.body.accessToken).not.toBe(tokens.accessToken);
    });

    it('should reject invalid refresh token', async () => {
      const response = await request(app)
        .post('/auth/refresh')
        .send({ refreshToken: 'invalid-token' });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error', 'Invalid refresh token');
    });

    it('should reject revoked refresh token', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        role: 'viewer' as const,
        createdAt: new Date(),
        lastLogin: new Date(),
      };

      const tokens = tokenService.generateTokens(mockUser);
      mockRedisService.get.mockResolvedValue(null); // Token not in Redis

      const response = await request(app)
        .post('/auth/refresh')
        .send({ refreshToken: tokens.refreshToken });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error', 'Refresh token revoked');
    });

    it('should validate refresh token request body', async () => {
      const response = await request(app)
        .post('/auth/refresh')
        .send({}); // Missing refreshToken

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Validation error');
    });
  });

  describe('Protected Routes', () => {
    let mockAuthenticatedReq: any;

    beforeEach(() => {
      mockAuthenticatedReq = {
        user: {
          id: 'user-123',
          email: 'test@example.com',
          name: 'Test User',
          role: 'viewer',
          createdAt: new Date(),
          lastLogin: new Date(),
        },
      };

      // Mock authentication middleware
      jest.spyOn(require('../../middleware/auth'), 'authenticateJWT')
        .mockImplementation((req: any, res: any, next: any) => {
          req.user = mockAuthenticatedReq.user;
          next();
        });
    });

    describe('GET /auth/me', () => {
      it('should return current user info', async () => {
        mockRedisService.get.mockResolvedValueOnce(
          JSON.stringify(mockAuthenticatedReq.user)
        );

        const response = await request(app)
          .get('/auth/me')
          .set('Authorization', 'Bearer valid-token');

        expect(response.status).toBe(200);
        expect(response.body).toMatchObject({
          id: 'user-123',
          email: 'test@example.com',
          name: 'Test User',
          role: 'viewer',
        });
      });
    });

    describe('POST /auth/logout', () => {
      it('should logout user', async () => {
        const response = await request(app)
          .post('/auth/logout')
          .set('Authorization', 'Bearer valid-token')
          .send({ refreshToken: 'refresh-token' });

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('message', 'Logged out successfully');
        expect(mockRedisService.del).toHaveBeenCalledWith(
          'refresh:user-123:refresh-token'
        );
      });
    });

    describe('POST /auth/logout-all', () => {
      it('should logout from all devices', async () => {
        mockRedisService.keys.mockResolvedValueOnce([
          'refresh:user-123:token1',
          'refresh:user-123:token2',
        ]);

        const response = await request(app)
          .post('/auth/logout-all')
          .set('Authorization', 'Bearer valid-token');

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('message', 'Logged out from all devices');
        expect(mockRedisService.keys).toHaveBeenCalledWith('refresh:user-123:*');
        expect(mockRedisService.del).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('Admin Routes', () => {
    beforeEach(() => {
      // Mock admin authentication
      jest.spyOn(require('../../middleware/auth'), 'authenticateJWT')
        .mockImplementation((req: any, res: any, next: any) => {
          req.user = {
            id: 'admin-123',
            email: 'admin@example.com',
            name: 'Admin User',
            role: 'admin',
            createdAt: new Date(),
            lastLogin: new Date(),
          };
          next();
        });

      jest.spyOn(require('../../middleware/auth'), 'requireAdmin')
        .mockImplementation((req: any, res: any, next: any) => next());
    });

    describe('GET /auth/users', () => {
      it('should return all users for admin', async () => {
        const users = [
          {
            id: 'user-1',
            email: 'user1@example.com',
            name: 'User 1',
            role: 'viewer',
            createdAt: new Date(),
            lastLogin: new Date(),
          },
          {
            id: 'user-2',
            email: 'user2@example.com',
            name: 'User 2',
            role: 'admin',
            createdAt: new Date(),
            lastLogin: new Date(),
          },
        ];

        mockRedisService.keys.mockResolvedValueOnce(['user:user-1', 'user:user-2']);
        mockRedisService.get
          .mockResolvedValueOnce(JSON.stringify(users[0]))
          .mockResolvedValueOnce(JSON.stringify(users[1]));

        const response = await request(app)
          .get('/auth/users')
          .set('Authorization', 'Bearer admin-token');

        expect(response.status).toBe(200);
        expect(response.body).toHaveLength(2);
        expect(response.body[0]).toMatchObject({
          id: 'user-1',
          email: 'user1@example.com',
          role: 'viewer',
        });
      });
    });

    describe('PUT /auth/users/:userId/role', () => {
      it('should update user role', async () => {
        const targetUser = {
          id: 'user-123',
          email: 'user@example.com',
          name: 'Test User',
          role: 'viewer',
          createdAt: new Date(),
          lastLogin: new Date(),
        };

        mockRedisService.get.mockResolvedValueOnce(JSON.stringify(targetUser));

        const response = await request(app)
          .put('/auth/users/user-123/role')
          .set('Authorization', 'Bearer admin-token')
          .send({ role: 'admin' });

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('message', 'User role updated successfully');
        expect(mockRedisService.set).toHaveBeenCalled();
      });

      it('should validate role value', async () => {
        const response = await request(app)
          .put('/auth/users/user-123/role')
          .set('Authorization', 'Bearer admin-token')
          .send({ role: 'invalid-role' });

        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('error', 'Validation error');
      });
    });

    describe('DELETE /auth/users/:userId', () => {
      it('should delete user', async () => {
        const targetUser = {
          id: 'user-123',
          email: 'user@example.com',
          name: 'Test User',
          role: 'viewer',
          createdAt: new Date(),
          lastLogin: new Date(),
        };

        mockRedisService.get.mockResolvedValueOnce(JSON.stringify(targetUser));

        const response = await request(app)
          .delete('/auth/users/user-123')
          .set('Authorization', 'Bearer admin-token');

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('message', 'User deleted successfully');
        expect(mockRedisService.del).toHaveBeenCalledWith('user:user-123');
        expect(mockRedisService.del).toHaveBeenCalledWith('email:user@example.com');
      });

      it('should prevent self-deletion', async () => {
        const response = await request(app)
          .delete('/auth/users/admin-123')
          .set('Authorization', 'Bearer admin-token');

        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('error', 'Cannot delete your own account');
      });
    });
  });
});