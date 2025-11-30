import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { User } from '../models/User';

interface TokenPayload {
  userId: string;
  email: string;
  role: string;
  sessionId?: string;
}

interface RefreshTokenPayload extends TokenPayload {
  tokenId: string;
}

export class JWTUtils {
  private static readonly accessTokenSecret = process.env.JWT_SECRET || 'dev_secret';
  private static readonly refreshTokenSecret = process.env.JWT_REFRESH_SECRET || 'dev_refresh_secret';
  private static readonly accessTokenExpiry = process.env.JWT_EXPIRES_IN || '15m';
  private static readonly refreshTokenExpiry = process.env.REFRESH_TOKEN_EXPIRES_IN || '30d';

  /**
   * Generate access token
   */
  static generateAccessToken(user: User): string {
    const payload: TokenPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      sessionId: uuidv4()
    };

    return jwt.sign(payload, this.accessTokenSecret, {
      expiresIn: this.accessTokenExpiry,
      issuer: 'opentable-clone',
      audience: 'opentable-users'
    });
  }

  /**
   * Generate refresh token
   */
  static generateRefreshToken(user: User): { token: string; tokenId: string } {
    const tokenId = uuidv4();
    const payload: RefreshTokenPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      tokenId
    };

    const token = jwt.sign(payload, this.refreshTokenSecret, {
      expiresIn: this.refreshTokenExpiry,
      issuer: 'opentable-clone',
      audience: 'opentable-users'
    });

    return { token, tokenId };
  }

  /**
   * Verify access token
   */
  static verifyAccessToken(token: string): TokenPayload {
    try {
      return jwt.verify(token, this.accessTokenSecret, {
        issuer: 'opentable-clone',
        audience: 'opentable-users'
      }) as TokenPayload;
    } catch (error) {
      throw new Error('Invalid or expired access token');
    }
  }

  /**
   * Verify refresh token
   */
  static verifyRefreshToken(token: string): RefreshTokenPayload {
    try {
      return jwt.verify(token, this.refreshTokenSecret, {
        issuer: 'opentable-clone',
        audience: 'opentable-users'
      }) as RefreshTokenPayload;
    } catch (error) {
      throw new Error('Invalid or expired refresh token');
    }
  }

  /**
   * Decode token without verification (for debugging)
   */
  static decodeToken(token: string): any {
    return jwt.decode(token);
  }

  /**
   * Generate password reset token
   */
  static generatePasswordResetToken(userId: string): string {
    return jwt.sign(
      { userId, type: 'password_reset' },
      this.accessTokenSecret,
      { expiresIn: '1h' }
    );
  }

  /**
   * Generate email verification token
   */
  static generateEmailVerificationToken(userId: string, email: string): string {
    return jwt.sign(
      { userId, email, type: 'email_verification' },
      this.accessTokenSecret,
      { expiresIn: '24h' }
    );
  }

  /**
   * Verify special purpose token (password reset, email verification)
   */
  static verifySpecialToken(token: string, type: string): any {
    try {
      const decoded = jwt.verify(token, this.accessTokenSecret) as any;
      if (decoded.type !== type) {
        throw new Error('Invalid token type');
      }
      return decoded;
    } catch (error) {
      throw new Error(`Invalid ${type} token`);
    }
  }
}