import { Request, Response } from 'express';
import { AuthService } from '../services/auth.service';
import { validationResult } from 'express-validator';

export class AuthController {
  /**
   * Register new user
   * POST /api/auth/register
   */
  static async register(req: Request, res: Response): Promise<void> {
    try {
      // Check validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const { firstName, lastName, email, password, phoneNumber } = req.body;

      const result = await AuthService.register({
        firstName,
        lastName,
        email,
        password,
        phoneNumber
      });

      res.status(201).json({
        success: true,
        message: 'Registration successful. Please check your email to verify your account.',
        data: result
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || 'Registration failed'
      });
    }
  }

  /**
   * Login user
   * POST /api/auth/login
   */
  static async login(req: Request, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const { email, password, rememberMe } = req.body;
      const ipAddress = req.ip || req.connection.remoteAddress;

      const result = await AuthService.login(
        { email, password, rememberMe },
        ipAddress
      );

      res.json({
        success: true,
        message: 'Login successful',
        data: result
      });
    } catch (error: any) {
      res.status(401).json({
        success: false,
        message: error.message || 'Login failed'
      });
    }
  }

  /**
   * Google OAuth login
   * POST /api/auth/google
   */
  static async googleLogin(req: Request, res: Response): Promise<void> {
    try {
      const { token } = req.body;

      if (!token) {
        res.status(400).json({
          success: false,
          message: 'Google token is required'
        });
        return;
      }

      const result = await AuthService.googleLogin(token);

      res.json({
        success: true,
        message: 'Google login successful',
        data: result
      });
    } catch (error: any) {
      res.status(401).json({
        success: false,
        message: error.message || 'Google login failed'
      });
    }
  }

  /**
   * Facebook OAuth login
   * POST /api/auth/facebook
   */
  static async facebookLogin(req: Request, res: Response): Promise<void> {
    try {
      const { accessToken } = req.body;

      if (!accessToken) {
        res.status(400).json({
          success: false,
          message: 'Facebook access token is required'
        });
        return;
      }

      const result = await AuthService.facebookLogin(accessToken);

      res.json({
        success: true,
        message: 'Facebook login successful',
        data: result
      });
    } catch (error: any) {
      res.status(401).json({
        success: false,
        message: error.message || 'Facebook login failed'
      });
    }
  }

  /**
   * Refresh access token
   * POST /api/auth/refresh
   */
  static async refreshToken(req: Request, res: Response): Promise<void> {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        res.status(400).json({
          success: false,
          message: 'Refresh token is required'
        });
        return;
      }

      const result = await AuthService.refreshToken(refreshToken);

      res.json({
        success: true,
        message: 'Token refreshed successfully',
        data: result
      });
    } catch (error: any) {
      res.status(401).json({
        success: false,
        message: error.message || 'Token refresh failed'
      });
    }
  }

  /**
   * Logout user
   * POST /api/auth/logout
   */
  static async logout(req: Request, res: Response): Promise<void> {
    try {
      if (req.userId) {
        await AuthService.logout(req.userId);
      }

      res.json({
        success: true,
        message: 'Logout successful'
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || 'Logout failed'
      });
    }
  }

  /**
   * Request password reset
   * POST /api/auth/forgot-password
   */
  static async forgotPassword(req: Request, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const { email } = req.body;
      await AuthService.requestPasswordReset(email);

      res.json({
        success: true,
        message: 'If an account exists with this email, a password reset link has been sent.'
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: 'Failed to process password reset request'
      });
    }
  }

  /**
   * Reset password with token
   * POST /api/auth/reset-password
   */
  static async resetPassword(req: Request, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const { token, password } = req.body;
      await AuthService.resetPassword(token, password);

      res.json({
        success: true,
        message: 'Password has been reset successfully'
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to reset password'
      });
    }
  }

  /**
   * Verify email
   * GET /api/auth/verify-email
   */
  static async verifyEmail(req: Request, res: Response): Promise<void> {
    try {
      const { token } = req.query;

      if (!token || typeof token !== 'string') {
        res.status(400).json({
          success: false,
          message: 'Verification token is required'
        });
        return;
      }

      await AuthService.verifyEmail(token);

      res.json({
        success: true,
        message: 'Email verified successfully'
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || 'Email verification failed'
      });
    }
  }

  /**
   * Resend verification email
   * POST /api/auth/resend-verification
   */
  static async resendVerification(req: Request, res: Response): Promise<void> {
    try {
      if (!req.userId) {
        res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
        return;
      }

      await AuthService.resendVerificationEmail(req.userId);

      res.json({
        success: true,
        message: 'Verification email has been resent'
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to resend verification email'
      });
    }
  }

  /**
   * Change password
   * POST /api/auth/change-password
   */
  static async changePassword(req: Request, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      if (!req.userId) {
        res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
        return;
      }

      const { currentPassword, newPassword } = req.body;
      await AuthService.changePassword(req.userId, currentPassword, newPassword);

      res.json({
        success: true,
        message: 'Password changed successfully'
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to change password'
      });
    }
  }

  /**
   * Get current user
   * GET /api/auth/me
   */
  static async getCurrentUser(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
        return;
      }

      res.json({
        success: true,
        data: req.user.toJSON()
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: 'Failed to get user information'
      });
    }
  }

  /**
   * Update user profile
   * PUT /api/auth/profile
   */
  static async updateProfile(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
        return;
      }

      const allowedFields = [
        'firstName',
        'lastName',
        'phoneNumber',
        'bio',
        'city',
        'state',
        'country',
        'birthDate',
        'preferences'
      ];

      const updates: any = {};
      for (const field of allowedFields) {
        if (req.body[field] !== undefined) {
          updates[field] = req.body[field];
        }
      }

      await req.user.update(updates);

      res.json({
        success: true,
        message: 'Profile updated successfully',
        data: req.user.toJSON()
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to update profile'
      });
    }
  }

  /**
   * Enable two-factor authentication
   * POST /api/auth/2fa/enable
   */
  static async enableTwoFactor(req: Request, res: Response): Promise<void> {
    try {
      if (!req.userId) {
        res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
        return;
      }

      const result = await AuthService.enableTwoFactor(req.userId);

      res.json({
        success: true,
        message: 'Scan the QR code with your authenticator app',
        data: result
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to enable two-factor authentication'
      });
    }
  }

  /**
   * Verify two-factor code
   * POST /api/auth/2fa/verify
   */
  static async verifyTwoFactor(req: Request, res: Response): Promise<void> {
    try {
      if (!req.userId) {
        res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
        return;
      }

      const { code } = req.body;
      const verified = await AuthService.verifyTwoFactor(req.userId, code);

      if (verified) {
        res.json({
          success: true,
          message: 'Two-factor authentication verified successfully'
        });
      } else {
        res.status(400).json({
          success: false,
          message: 'Invalid verification code'
        });
      }
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || 'Verification failed'
      });
    }
  }

  /**
   * Delete account
   * DELETE /api/auth/account
   */
  static async deleteAccount(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
        return;
      }

      const { password } = req.body;

      // Verify password before deletion
      const isPasswordValid = await req.user.comparePassword(password);
      if (!isPasswordValid) {
        res.status(400).json({
          success: false,
          message: 'Incorrect password'
        });
        return;
      }

      // Soft delete the account
      await req.user.destroy();

      res.json({
        success: true,
        message: 'Account deleted successfully'
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: 'Failed to delete account'
      });
    }
  }
}