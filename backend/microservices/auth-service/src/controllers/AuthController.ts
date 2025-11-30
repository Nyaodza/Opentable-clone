import { Request, Response, NextFunction } from 'express';
import passport from 'passport';
import { TokenService } from '../services/TokenService';
import { UserService } from '../services/UserService';
import { RedisService } from '../services/RedisService';
import { User } from '../types';
import { config } from '../config/environment';
import { logger } from '../utils/logger';
import { AuthenticatedRequest } from '../middleware/auth';

export class AuthController {
  private tokenService: TokenService;
  private userService: UserService;
  private redisService: RedisService;

  constructor() {
    this.tokenService = new TokenService();
    this.redisService = new RedisService();
    this.userService = new UserService(this.redisService);
  }

  // Initiate Google OAuth flow
  googleAuth = passport.authenticate('google', { scope: ['profile', 'email'] });

  // Handle Google OAuth callback
  googleCallback = (req: Request, res: Response, next: NextFunction) => {
    passport.authenticate('google', { session: false }, async (err: Error, user: User) => {
      if (err || !user) {
        logger.error('Google authentication failed:', err);
        return res.redirect(`${config.frontendUrl}/login?error=auth_failed`);
      }

      try {
        // Generate tokens
        const tokens = this.tokenService.generateTokens(user);
        
        // Store refresh token
        await this.redisService.setRefreshToken(
          user.id,
          tokens.refreshToken,
          7 * 24 * 60 * 60 // 7 days
        );

        // Redirect to frontend with tokens
        const redirectUrl = new URL(`${config.frontendUrl}/auth/callback`);
        redirectUrl.searchParams.append('accessToken', tokens.accessToken);
        redirectUrl.searchParams.append('refreshToken', tokens.refreshToken);
        
        res.redirect(redirectUrl.toString());
      } catch (error) {
        logger.error('Token generation error:', error);
        res.redirect(`${config.frontendUrl}/login?error=token_error`);
      }
    })(req, res, next);
  };

  // Refresh access token
  refreshToken = async (req: Request, res: Response) => {
    try {
      const { refreshToken } = req.body;
      
      if (!refreshToken) {
        return res.status(400).json({ error: 'Refresh token required' });
      }

      // Verify refresh token
      const payload = this.tokenService.verifyRefreshToken(refreshToken);
      if (!payload) {
        return res.status(401).json({ error: 'Invalid refresh token' });
      }

      // Check if refresh token is in Redis
      const isValid = await this.redisService.isRefreshTokenValid(payload.userId, refreshToken);
      if (!isValid) {
        return res.status(401).json({ error: 'Refresh token revoked' });
      }

      // Get user
      const user = await this.userService.findUserById(payload.userId);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Generate new tokens
      const tokens = this.tokenService.generateTokens(user);
      
      // Revoke old refresh token
      await this.redisService.revokeRefreshToken(payload.userId, refreshToken);
      
      // Store new refresh token
      await this.redisService.setRefreshToken(
        user.id,
        tokens.refreshToken,
        7 * 24 * 60 * 60 // 7 days
      );

      res.json({
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      });
    } catch (error) {
      logger.error('Refresh token error:', error);
      res.status(500).json({ error: 'Failed to refresh token' });
    }
  };

  // Get current user
  getCurrentUser = async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const user = await this.userService.findUserById(req.user.id);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      res.json({
        id: user.id,
        email: user.email,
        name: user.name,
        picture: user.picture,
        role: user.role,
        createdAt: user.createdAt,
        lastLogin: user.lastLogin,
      });
    } catch (error) {
      logger.error('Get current user error:', error);
      res.status(500).json({ error: 'Failed to get user' });
    }
  };

  // Logout
  logout = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { refreshToken } = req.body;
      
      if (req.user && refreshToken) {
        // Revoke refresh token
        await this.redisService.revokeRefreshToken(req.user.id, refreshToken);
      }

      res.json({ message: 'Logged out successfully' });
    } catch (error) {
      logger.error('Logout error:', error);
      res.status(500).json({ error: 'Failed to logout' });
    }
  };

  // Logout from all devices
  logoutAll = async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      // Revoke all refresh tokens
      await this.redisService.revokeAllRefreshTokens(req.user.id);

      res.json({ message: 'Logged out from all devices' });
    } catch (error) {
      logger.error('Logout all error:', error);
      res.status(500).json({ error: 'Failed to logout from all devices' });
    }
  };

  // Admin: Get all users
  getAllUsers = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const users = await this.userService.getAllUsers();
      
      const sanitizedUsers = users.map(user => ({
        id: user.id,
        email: user.email,
        name: user.name,
        picture: user.picture,
        role: user.role,
        createdAt: user.createdAt,
        lastLogin: user.lastLogin,
      }));

      res.json(sanitizedUsers);
    } catch (error) {
      logger.error('Get all users error:', error);
      res.status(500).json({ error: 'Failed to get users' });
    }
  };

  // Admin: Update user role
  updateUserRole = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { userId } = req.params;
      const { role } = req.body;

      if (!['admin', 'viewer'].includes(role)) {
        return res.status(400).json({ error: 'Invalid role' });
      }

      await this.userService.updateUserRole(userId, role);
      
      res.json({ message: 'User role updated successfully' });
    } catch (error) {
      logger.error('Update user role error:', error);
      res.status(500).json({ error: 'Failed to update user role' });
    }
  };

  // Admin: Delete user
  deleteUser = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { userId } = req.params;

      if (req.user?.id === userId) {
        return res.status(400).json({ error: 'Cannot delete your own account' });
      }

      await this.userService.deleteUser(userId);
      await this.redisService.revokeAllRefreshTokens(userId);
      
      res.json({ message: 'User deleted successfully' });
    } catch (error) {
      logger.error('Delete user error:', error);
      res.status(500).json({ error: 'Failed to delete user' });
    }
  };
}