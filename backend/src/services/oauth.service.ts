import { OAuth2Client } from 'google-auth-library';
import axios from 'axios';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { User } from '../models/User';
import { AuthService } from './auth.service';
import { AppError } from '../utils/errors';
import { logger } from '../utils/logger';
import { redisClient } from '../config/redis';

export interface OAuthProvider {
  name: string;
  clientId: string;
  clientSecret: string;
  authorizationUrl: string;
  tokenUrl: string;
  userInfoUrl: string;
  scope: string[];
}

export interface OAuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  profileImage?: string;
  provider: string;
  verified: boolean;
}

export class OAuthService {
  private static providers: Map<string, OAuthProvider> = new Map();
  private static googleClient: OAuth2Client;

  static initialize(): void {
    // Configure OAuth providers
    this.providers.set('google', {
      name: 'Google',
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorizationUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
      tokenUrl: 'https://oauth2.googleapis.com/token',
      userInfoUrl: 'https://www.googleapis.com/oauth2/v2/userinfo',
      scope: ['openid', 'email', 'profile'],
    });

    this.providers.set('facebook', {
      name: 'Facebook',
      clientId: process.env.FACEBOOK_CLIENT_ID!,
      clientSecret: process.env.FACEBOOK_CLIENT_SECRET!,
      authorizationUrl: 'https://www.facebook.com/v12.0/dialog/oauth',
      tokenUrl: 'https://graph.facebook.com/v12.0/oauth/access_token',
      userInfoUrl: 'https://graph.facebook.com/me',
      scope: ['email', 'public_profile'],
    });

    this.providers.set('apple', {
      name: 'Apple',
      clientId: process.env.APPLE_CLIENT_ID!,
      clientSecret: this.generateAppleClientSecret(),
      authorizationUrl: 'https://appleid.apple.com/auth/authorize',
      tokenUrl: 'https://appleid.apple.com/auth/token',
      userInfoUrl: '', // Apple provides user info in ID token
      scope: ['name', 'email'],
    });

    // Initialize Google client for verification
    this.googleClient = new OAuth2Client(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      `${process.env.API_URL}/auth/google/callback`
    );
  }

  // Generate authorization URL
  static getAuthorizationUrl(
    provider: string,
    redirectUri: string,
    state?: string
  ): string {
    const providerConfig = this.providers.get(provider);
    if (!providerConfig) {
      throw new AppError(`Unknown OAuth provider: ${provider}`, 400);
    }

    const params = new URLSearchParams({
      client_id: providerConfig.clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: providerConfig.scope.join(' '),
      state: state || this.generateState(),
    });

    // Provider-specific parameters
    if (provider === 'google') {
      params.append('access_type', 'offline');
      params.append('prompt', 'select_account');
    } else if (provider === 'apple') {
      params.append('response_mode', 'form_post');
    }

    return `${providerConfig.authorizationUrl}?${params.toString()}`;
  }

  // Exchange authorization code for tokens
  static async exchangeCodeForTokens(
    provider: string,
    code: string,
    redirectUri: string
  ): Promise<{ accessToken: string; refreshToken?: string; idToken?: string }> {
    const providerConfig = this.providers.get(provider);
    if (!providerConfig) {
      throw new AppError(`Unknown OAuth provider: ${provider}`, 400);
    }

    try {
      const params = new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
        client_id: providerConfig.clientId,
        client_secret: providerConfig.clientSecret,
      });

      const response = await axios.post(providerConfig.tokenUrl, params, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });

      return {
        accessToken: response.data.access_token,
        refreshToken: response.data.refresh_token,
        idToken: response.data.id_token,
      };
    } catch (error) {
      logger.error(`OAuth token exchange failed for ${provider}:`, error);
      throw new AppError('Failed to exchange authorization code', 500);
    }
  }

  // Get user info from OAuth provider
  static async getUserInfo(
    provider: string,
    accessToken: string,
    idToken?: string
  ): Promise<OAuthUser> {
    const providerConfig = this.providers.get(provider);
    if (!providerConfig) {
      throw new AppError(`Unknown OAuth provider: ${provider}`, 400);
    }

    try {
      if (provider === 'google') {
        return this.getGoogleUserInfo(accessToken, idToken);
      } else if (provider === 'facebook') {
        return this.getFacebookUserInfo(accessToken);
      } else if (provider === 'apple') {
        return this.getAppleUserInfo(idToken!);
      }

      throw new AppError(`User info not implemented for ${provider}`, 501);
    } catch (error) {
      logger.error(`Failed to get user info from ${provider}:`, error);
      throw new AppError('Failed to get user information', 500);
    }
  }

  // Provider-specific user info methods
  private static async getGoogleUserInfo(
    accessToken: string,
    idToken?: string
  ): Promise<OAuthUser> {
    if (idToken) {
      // Verify and decode ID token
      const ticket = await this.googleClient.verifyIdToken({
        idToken,
        audience: process.env.GOOGLE_CLIENT_ID,
      });
      
      const payload = ticket.getPayload()!;
      
      return {
        id: payload.sub,
        email: payload.email!,
        firstName: payload.given_name || '',
        lastName: payload.family_name || '',
        profileImage: payload.picture,
        provider: 'google',
        verified: payload.email_verified || false,
      };
    }

    // Fallback to userinfo endpoint
    const response = await axios.get(
      'https://www.googleapis.com/oauth2/v2/userinfo',
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    return {
      id: response.data.id,
      email: response.data.email,
      firstName: response.data.given_name || '',
      lastName: response.data.family_name || '',
      profileImage: response.data.picture,
      provider: 'google',
      verified: response.data.verified_email || false,
    };
  }

  private static async getFacebookUserInfo(accessToken: string): Promise<OAuthUser> {
    const response = await axios.get('https://graph.facebook.com/me', {
      params: {
        fields: 'id,email,first_name,last_name,picture',
        access_token: accessToken,
      },
    });

    return {
      id: response.data.id,
      email: response.data.email,
      firstName: response.data.first_name || '',
      lastName: response.data.last_name || '',
      profileImage: response.data.picture?.data?.url,
      provider: 'facebook',
      verified: true, // Facebook doesn't provide email verification status
    };
  }

  private static getAppleUserInfo(idToken: string): OAuthUser {
    // Decode Apple ID token
    const decoded = jwt.decode(idToken) as any;
    
    return {
      id: decoded.sub,
      email: decoded.email,
      firstName: decoded.name?.firstName || '',
      lastName: decoded.name?.lastName || '',
      provider: 'apple',
      verified: decoded.email_verified || false,
    };
  }

  // Sign in or register user with OAuth
  static async signInWithOAuth(oauthUser: OAuthUser): Promise<{
    user: User;
    token: string;
    refreshToken: string;
    isNewUser: boolean;
  }> {
    // Check if user exists with this email
    let user = await User.findOne({
      where: { email: oauthUser.email },
    });

    let isNewUser = false;

    if (!user) {
      // Create new user
      user = await User.create({
        email: oauthUser.email,
        firstName: oauthUser.firstName,
        lastName: oauthUser.lastName,
        profileImage: oauthUser.profileImage,
        isVerified: oauthUser.verified,
        oauthProviders: {
          [oauthUser.provider]: {
            id: oauthUser.id,
            connected: true,
            connectedAt: new Date(),
          },
        },
      });
      isNewUser = true;
    } else {
      // Link OAuth provider to existing user
      if (!user.oauthProviders) {
        user.oauthProviders = {};
      }
      
      user.oauthProviders[oauthUser.provider] = {
        id: oauthUser.id,
        connected: true,
        connectedAt: new Date(),
      };

      // Update profile image if not set
      if (!user.profileImage && oauthUser.profileImage) {
        user.profileImage = oauthUser.profileImage;
      }

      // Mark as verified if OAuth provider verified
      if (!user.isVerified && oauthUser.verified) {
        user.isVerified = true;
      }

      await user.save();
    }

    // Generate tokens
    const { token, refreshToken } = AuthService.generateTokens(user);

    // Log security event
    await this.logSecurityEvent(user.id, 'oauth_login', {
      provider: oauthUser.provider,
      isNewUser,
    });

    return {
      user,
      token,
      refreshToken,
      isNewUser,
    };
  }

  // Unlink OAuth provider
  static async unlinkProvider(userId: string, provider: string): Promise<void> {
    const user = await User.findByPk(userId);
    if (!user) {
      throw new AppError('User not found', 404);
    }

    if (!user.oauthProviders?.[provider]) {
      throw new AppError('Provider not linked', 400);
    }

    // Check if user has password or other providers
    const hasPassword = !!user.password;
    const otherProviders = Object.keys(user.oauthProviders).filter(p => p !== provider);

    if (!hasPassword && otherProviders.length === 0) {
      throw new AppError(
        'Cannot unlink last authentication method. Please set a password first.',
        400
      );
    }

    delete user.oauthProviders[provider];
    await user.save();

    await this.logSecurityEvent(userId, 'oauth_unlinked', {
      provider,
    });
  }

  // Refresh OAuth access token
  static async refreshAccessToken(
    provider: string,
    refreshToken: string
  ): Promise<{ accessToken: string; expiresIn: number }> {
    const providerConfig = this.providers.get(provider);
    if (!providerConfig) {
      throw new AppError(`Unknown OAuth provider: ${provider}`, 400);
    }

    try {
      const params = new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: providerConfig.clientId,
        client_secret: providerConfig.clientSecret,
      });

      const response = await axios.post(providerConfig.tokenUrl, params, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });

      return {
        accessToken: response.data.access_token,
        expiresIn: response.data.expires_in || 3600,
      };
    } catch (error) {
      logger.error(`OAuth token refresh failed for ${provider}:`, error);
      throw new AppError('Failed to refresh access token', 500);
    }
  }

  // Generate state parameter for CSRF protection
  private static generateState(): string {
    const state = crypto.randomBytes(32).toString('base64url');
    
    // Store state in Redis with expiry
    redisClient.setex(`oauth:state:${state}`, 600, '1'); // 10 minutes
    
    return state;
  }

  // Verify state parameter
  static async verifyState(state: string): Promise<boolean> {
    const exists = await redisClient.get(`oauth:state:${state}`);
    if (exists) {
      await redisClient.del(`oauth:state:${state}`);
      return true;
    }
    return false;
  }

  // Generate Apple client secret
  private static generateAppleClientSecret(): string {
    const teamId = process.env.APPLE_TEAM_ID!;
    const clientId = process.env.APPLE_CLIENT_ID!;
    const keyId = process.env.APPLE_KEY_ID!;
    const privateKey = process.env.APPLE_PRIVATE_KEY!;

    const headers = {
      alg: 'ES256',
      kid: keyId,
    };

    const claims = {
      iss: teamId,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 86400 * 180, // 180 days
      aud: 'https://appleid.apple.com',
      sub: clientId,
    };

    return jwt.sign(claims, privateKey, {
      algorithm: 'ES256',
      header: headers,
    });
  }

  // Log security event
  private static async logSecurityEvent(
    userId: string,
    event: string,
    data: any
  ): Promise<void> {
    const AuditLog = require('../models/audit-log.model').default;
    
    await AuditLog.create({
      userId,
      action: event,
      category: 'authentication',
      details: data,
    });
  }

  // Get linked providers for user
  static async getLinkedProviders(userId: string): Promise<string[]> {
    const user = await User.findByPk(userId);
    if (!user || !user.oauthProviders) {
      return [];
    }

    return Object.keys(user.oauthProviders).filter(
      provider => user.oauthProviders![provider].connected
    );
  }

  // Validate provider callback
  static async validateCallback(
    provider: string,
    params: any
  ): Promise<{ code: string; state: string }> {
    // Check for errors
    if (params.error) {
      throw new AppError(
        params.error_description || `OAuth error: ${params.error}`,
        400
      );
    }

    // Validate required parameters
    if (!params.code) {
      throw new AppError('Missing authorization code', 400);
    }

    if (!params.state) {
      throw new AppError('Missing state parameter', 400);
    }

    // Verify state
    const validState = await this.verifyState(params.state);
    if (!validState) {
      throw new AppError('Invalid state parameter', 400);
    }

    return {
      code: params.code,
      state: params.state,
    };
  }
}