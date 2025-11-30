import { User, UserRole, AuthProvider } from '../models/User';
import { JWTUtils } from '../utils/jwt.utils';
import { EmailService } from './email.service';
import { RedisService } from './redis.service';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { OAuth2Client } from 'google-auth-library';
import axios from 'axios';

interface RegisterDTO {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phoneNumber?: string;
  role?: UserRole;
}

interface LoginDTO {
  email: string;
  password: string;
  rememberMe?: boolean;
}

interface OAuthDTO {
  provider: AuthProvider;
  token: string;
  userData?: any;
}

interface TokenResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: string;
  user: any;
}

export class AuthService {
  private static googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
  private static emailService = new EmailService();
  private static redisService = RedisService.getInstance();

  /**
   * Register new user
   */
  static async register(data: RegisterDTO): Promise<TokenResponse> {
    // Check if user already exists
    const existingUser = await User.findOne({ where: { email: data.email } });
    if (existingUser) {
      throw new Error('User with this email already exists');
    }

    // Create new user
    const user = await User.create({
      ...data,
      role: data.role || UserRole.DINER,
      authProvider: AuthProvider.LOCAL,
      emailVerificationToken: uuidv4(),
      emailVerificationExpires: new Date(Date.now() + 86400000) // 24 hours
    });

    // Send verification email
    await this.emailService.sendVerificationEmail(user);

    // Generate tokens
    return this.generateTokenResponse(user);
  }

  /**
   * Login user
   */
  static async login(data: LoginDTO, ipAddress?: string): Promise<TokenResponse> {
    // Find user by email
    const user = await User.findOne({ where: { email: data.email } });
    if (!user) {
      throw new Error('Invalid email or password');
    }

    // Check if user is active
    if (!user.isActive) {
      throw new Error('Account is deactivated. Please contact support.');
    }

    // Verify password
    const isPasswordValid = await user.comparePassword(data.password);
    if (!isPasswordValid) {
      throw new Error('Invalid email or password');
    }

    // Update last login
    await user.updateLastLogin(ipAddress);

    // Generate tokens
    const tokenResponse = await this.generateTokenResponse(user);

    // Store refresh token in Redis
    const refreshTokenExpiry = data.rememberMe ? 30 * 24 * 60 * 60 : 24 * 60 * 60; // 30 days or 1 day
    await this.redisService.setex(
      `refresh_token:${user.id}`,
      refreshTokenExpiry,
      tokenResponse.refreshToken
    );

    return tokenResponse;
  }

  /**
   * Google OAuth login
   */
  static async googleLogin(token: string): Promise<TokenResponse> {
    try {
      // Verify Google token
      const ticket = await this.googleClient.verifyIdToken({
        idToken: token,
        audience: process.env.GOOGLE_CLIENT_ID
      });

      const payload = ticket.getPayload();
      if (!payload) {
        throw new Error('Invalid Google token');
      }

      // Find or create user
      let user = await User.findOne({
        where: { email: payload.email }
      });

      if (!user) {
        // Create new user from Google data
        user = await User.create({
          email: payload.email!,
          firstName: payload.given_name || 'User',
          lastName: payload.family_name || '',
          googleId: payload.sub,
          avatar: payload.picture,
          emailVerified: payload.email_verified || false,
          authProvider: AuthProvider.GOOGLE,
          role: UserRole.DINER
        });
      } else if (!user.googleId) {
        // Link existing account with Google
        user.googleId = payload.sub;
        user.avatar = user.avatar || payload.picture;
        user.emailVerified = true;
        await user.save();
      }

      // Update last login
      await user.updateLastLogin();

      // Generate tokens
      return this.generateTokenResponse(user);
    } catch (error) {
      throw new Error('Google authentication failed');
    }
  }

  /**
   * Facebook OAuth login
   */
  static async facebookLogin(accessToken: string): Promise<TokenResponse> {
    try {
      // Get user data from Facebook
      const response = await axios.get('https://graph.facebook.com/me', {
        params: {
          access_token: accessToken,
          fields: 'id,email,first_name,last_name,picture'
        }
      });

      const fbData = response.data;

      // Find or create user
      let user = await User.findOne({
        where: { email: fbData.email }
      });

      if (!user) {
        // Create new user from Facebook data
        user = await User.create({
          email: fbData.email,
          firstName: fbData.first_name,
          lastName: fbData.last_name,
          facebookId: fbData.id,
          avatar: fbData.picture?.data?.url,
          emailVerified: true,
          authProvider: AuthProvider.FACEBOOK,
          role: UserRole.DINER
        });
      } else if (!user.facebookId) {
        // Link existing account with Facebook
        user.facebookId = fbData.id;
        user.avatar = user.avatar || fbData.picture?.data?.url;
        user.emailVerified = true;
        await user.save();
      }

      // Update last login
      await user.updateLastLogin();

      // Generate tokens
      return this.generateTokenResponse(user);
    } catch (error) {
      throw new Error('Facebook authentication failed');
    }
  }

  /**
   * Refresh access token
   */
  static async refreshToken(refreshToken: string): Promise<TokenResponse> {
    try {
      // Verify refresh token
      const decoded = JWTUtils.verifyRefreshToken(refreshToken);

      // Check if refresh token exists in Redis
      const storedToken = await this.redisService.get(`refresh_token:${decoded.userId}`);
      if (!storedToken || storedToken !== refreshToken) {
        throw new Error('Invalid refresh token');
      }

      // Find user
      const user = await User.findByPk(decoded.userId);
      if (!user || !user.isActive) {
        throw new Error('User not found or inactive');
      }

      // Generate new tokens
      const tokenResponse = await this.generateTokenResponse(user);

      // Update refresh token in Redis
      await this.redisService.setex(
        `refresh_token:${user.id}`,
        30 * 24 * 60 * 60, // 30 days
        tokenResponse.refreshToken
      );

      return tokenResponse;
    } catch (error) {
      throw new Error('Failed to refresh token');
    }
  }

  /**
   * Logout user
   */
  static async logout(userId: string): Promise<void> {
    // Remove refresh token from Redis
    await this.redisService.del(`refresh_token:${userId}`);
    
    // Blacklist current access token (optional)
    // This would require storing the token with its expiry time
  }

  /**
   * Request password reset
   */
  static async requestPasswordReset(email: string): Promise<void> {
    const user = await User.findOne({ where: { email } });
    if (!user) {
      // Don't reveal if user exists
      return;
    }

    // Generate reset token
    const resetToken = user.generatePasswordResetToken();
    await user.save();

    // Send reset email
    await this.emailService.sendPasswordResetEmail(user, resetToken);
  }

  /**
   * Reset password
   */
  static async resetPassword(token: string, newPassword: string): Promise<void> {
    const user = await User.findOne({
      where: {
        passwordResetToken: token,
        passwordResetExpires: { $gt: new Date() }
      }
    });

    if (!user) {
      throw new Error('Invalid or expired reset token');
    }

    // Update password
    user.password = newPassword;
    user.passwordResetToken = null;
    user.passwordResetExpires = null;
    await user.save();

    // Send confirmation email
    await this.emailService.sendPasswordChangedEmail(user);
  }

  /**
   * Verify email
   */
  static async verifyEmail(token: string): Promise<void> {
    const user = await User.findOne({
      where: {
        emailVerificationToken: token,
        emailVerificationExpires: { $gt: new Date() }
      }
    });

    if (!user) {
      throw new Error('Invalid or expired verification token');
    }

    await user.verifyEmail();
    
    // Send welcome email
    await this.emailService.sendWelcomeEmail(user);
  }

  /**
   * Resend verification email
   */
  static async resendVerificationEmail(userId: string): Promise<void> {
    const user = await User.findByPk(userId);
    if (!user || user.emailVerified) {
      throw new Error('User not found or already verified');
    }

    // Generate new token
    user.generateEmailVerificationToken();
    await user.save();

    // Send verification email
    await this.emailService.sendVerificationEmail(user);
  }

  /**
   * Change password
   */
  static async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string
  ): Promise<void> {
    const user = await User.findByPk(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Verify current password
    const isPasswordValid = await user.comparePassword(currentPassword);
    if (!isPasswordValid) {
      throw new Error('Current password is incorrect');
    }

    // Update password
    user.password = newPassword;
    await user.save();

    // Send confirmation email
    await this.emailService.sendPasswordChangedEmail(user);
  }

  /**
   * Enable two-factor authentication
   */
  static async enableTwoFactor(userId: string): Promise<{ secret: string; qrCode: string }> {
    const user = await User.findByPk(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Generate secret
    const speakeasy = require('speakeasy');
    const secret = speakeasy.generateSecret({
      name: `OpenTable Clone (${user.email})`
    });

    // Save secret
    user.twoFactorSecret = secret.base32;
    await user.save();

    // Generate QR code
    const qrcode = require('qrcode');
    const qrCode = await qrcode.toDataURL(secret.otpauth_url);

    return { secret: secret.base32, qrCode };
  }

  /**
   * Verify two-factor code
   */
  static async verifyTwoFactor(userId: string, code: string): Promise<boolean> {
    const user = await User.findByPk(userId);
    if (!user || !user.twoFactorSecret) {
      throw new Error('Two-factor authentication not enabled');
    }

    const speakeasy = require('speakeasy');
    const verified = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token: code,
      window: 2
    });

    if (verified && !user.twoFactorEnabled) {
      user.twoFactorEnabled = true;
      await user.save();
    }

    return verified;
  }

  /**
   * Generate token response
   */
  private static async generateTokenResponse(user: User): Promise<TokenResponse> {
    const accessToken = JWTUtils.generateAccessToken(user);
    const { token: refreshToken } = JWTUtils.generateRefreshToken(user);

    return {
      accessToken,
      refreshToken,
      expiresIn: 900, // 15 minutes in seconds
      tokenType: 'Bearer',
      user: user.toJSON()
    };
  }
}