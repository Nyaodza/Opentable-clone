import { Request, Response, NextFunction } from 'express';
import { authenticateJWT, requireAdmin, requireAuth } from '../../middleware/auth';
import passport from 'passport';
import { User } from '../../types';

// Mock passport
jest.mock('passport');

describe('Auth Middleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockReq = {
      headers: {},
      user: undefined,
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    mockNext = jest.fn();
  });

  describe('authenticateJWT', () => {
    it('should authenticate valid JWT', () => {
      const mockUser: User = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        role: 'viewer',
        createdAt: new Date(),
        lastLogin: new Date(),
      };

      (passport.authenticate as jest.Mock).mockImplementation(
        (strategy, options, callback) => {
          return (req: Request, res: Response, next: NextFunction) => {
            callback(null, mockUser);
          };
        }
      );

      authenticateJWT(mockReq as Request, mockRes as Response, mockNext);

      expect(mockReq.user).toEqual(mockUser);
      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should return 401 for invalid JWT', () => {
      (passport.authenticate as jest.Mock).mockImplementation(
        (strategy, options, callback) => {
          return (req: Request, res: Response, next: NextFunction) => {
            callback(null, false);
          };
        }
      );

      authenticateJWT(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 500 for authentication error', () => {
      const error = new Error('Auth error');
      
      (passport.authenticate as jest.Mock).mockImplementation(
        (strategy, options, callback) => {
          return (req: Request, res: Response, next: NextFunction) => {
            callback(error, null);
          };
        }
      );

      authenticateJWT(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Authentication error' });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('requireAdmin', () => {
    it('should allow admin users', () => {
      mockReq.user = {
        id: 'user-123',
        email: 'admin@example.com',
        name: 'Admin User',
        role: 'admin',
        createdAt: new Date(),
        lastLogin: new Date(),
      };

      requireAdmin(mockReq as any, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should return 403 for non-admin users', () => {
      mockReq.user = {
        id: 'user-123',
        email: 'viewer@example.com',
        name: 'Viewer User',
        role: 'viewer',
        createdAt: new Date(),
        lastLogin: new Date(),
      };

      requireAdmin(mockReq as any, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({ 
        error: 'Forbidden - Admin access required' 
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 401 if no user', () => {
      mockReq.user = undefined;

      requireAdmin(mockReq as any, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('requireAuth', () => {
    it('should allow authenticated users', () => {
      mockReq.user = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        role: 'viewer',
        createdAt: new Date(),
        lastLogin: new Date(),
      };

      requireAuth(mockReq as any, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should return 401 if no user', () => {
      mockReq.user = undefined;

      requireAuth(mockReq as any, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });
});