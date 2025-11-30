import { TokenService } from '../../services/TokenService';
import { User } from '../../types';
import jwt from 'jsonwebtoken';

describe('TokenService', () => {
  let tokenService: TokenService;
  let mockUser: User;

  beforeEach(() => {
    tokenService = new TokenService();
    mockUser = {
      id: 'test-user-id',
      email: 'test@example.com',
      name: 'Test User',
      role: 'admin',
      createdAt: new Date(),
      lastLogin: new Date(),
    };
  });

  describe('generateTokens', () => {
    it('should generate access and refresh tokens', () => {
      const tokens = tokenService.generateTokens(mockUser);

      expect(tokens).toHaveProperty('accessToken');
      expect(tokens).toHaveProperty('refreshToken');
      expect(typeof tokens.accessToken).toBe('string');
      expect(typeof tokens.refreshToken).toBe('string');
      expect(tokens.accessToken).not.toBe(tokens.refreshToken);
    });

    it('should include user data in token payload', () => {
      const tokens = tokenService.generateTokens(mockUser);
      const decoded = jwt.decode(tokens.accessToken) as any;

      expect(decoded.userId).toBe(mockUser.id);
      expect(decoded.email).toBe(mockUser.email);
      expect(decoded.role).toBe(mockUser.role);
    });
  });

  describe('verifyAccessToken', () => {
    it('should verify valid access token', () => {
      const tokens = tokenService.generateTokens(mockUser);
      const payload = tokenService.verifyAccessToken(tokens.accessToken);

      expect(payload).not.toBeNull();
      expect(payload?.userId).toBe(mockUser.id);
      expect(payload?.email).toBe(mockUser.email);
    });

    it('should return null for invalid token', () => {
      const payload = tokenService.verifyAccessToken('invalid-token');
      expect(payload).toBeNull();
    });

    it('should return null for expired token', () => {
      const expiredToken = jwt.sign(
        { userId: 'test', email: 'test@example.com', role: 'admin' },
        process.env.JWT_SECRET!,
        { expiresIn: '-1s' }
      );
      const payload = tokenService.verifyAccessToken(expiredToken);
      expect(payload).toBeNull();
    });
  });

  describe('verifyRefreshToken', () => {
    it('should verify valid refresh token', () => {
      const tokens = tokenService.generateTokens(mockUser);
      const payload = tokenService.verifyRefreshToken(tokens.refreshToken);

      expect(payload).not.toBeNull();
      expect(payload?.userId).toBe(mockUser.id);
    });

    it('should return null for token signed with wrong secret', () => {
      const wrongToken = jwt.sign(
        { userId: 'test', email: 'test@example.com', role: 'admin' },
        'wrong-secret',
        { expiresIn: '7d' }
      );
      const payload = tokenService.verifyRefreshToken(wrongToken);
      expect(payload).toBeNull();
    });
  });

  describe('decodeToken', () => {
    it('should decode token without verification', () => {
      const tokens = tokenService.generateTokens(mockUser);
      const payload = tokenService.decodeToken(tokens.accessToken);

      expect(payload).not.toBeNull();
      expect(payload?.userId).toBe(mockUser.id);
    });

    it('should return null for malformed token', () => {
      const payload = tokenService.decodeToken('not-a-jwt');
      expect(payload).toBeNull();
    });
  });
});