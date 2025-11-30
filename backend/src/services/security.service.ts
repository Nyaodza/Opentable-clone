import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import speakeasy from 'speakeasy';
import { RateLimiterRedis } from 'rate-limiter-flexible';
import { redisClient } from '../config/redis';
import { AppError } from '../utils/errors';
import { logger } from '../utils/logger';
import { AuditLog } from '../models/AuditLog';
import { User } from '../models/User';

export interface SecurityConfig {
  passwordPolicy: {
    minLength: number;
    requireUppercase: boolean;
    requireLowercase: boolean;
    requireNumbers: boolean;
    requireSpecialChars: boolean;
    preventReuse: number;
    maxAge: number; // days
  };
  sessionPolicy: {
    maxConcurrentSessions: number;
    sessionTimeout: number; // minutes
    absoluteTimeout: number; // minutes
    renewalThreshold: number; // minutes
  };
  rateLimiting: {
    login: { points: number; duration: number };
    api: { points: number; duration: number };
    passwordReset: { points: number; duration: number };
    registration: { points: number; duration: number };
  };
  ipWhitelist: string[];
  ipBlacklist: string[];
  geoBlocking: {
    enabled: boolean;
    allowedCountries: string[];
    blockedCountries: string[];
  };
}

export class SecurityService {
  private static config: SecurityConfig = {
    passwordPolicy: {
      minLength: 12,
      requireUppercase: true,
      requireLowercase: true,
      requireNumbers: true,
      requireSpecialChars: true,
      preventReuse: 5,
      maxAge: 90,
    },
    sessionPolicy: {
      maxConcurrentSessions: 3,
      sessionTimeout: 30,
      absoluteTimeout: 480,
      renewalThreshold: 5,
    },
    rateLimiting: {
      login: { points: 5, duration: 900 }, // 5 attempts per 15 minutes
      api: { points: 100, duration: 60 }, // 100 requests per minute
      passwordReset: { points: 3, duration: 3600 }, // 3 attempts per hour
      registration: { points: 3, duration: 3600 }, // 3 attempts per hour
    },
    ipWhitelist: [],
    ipBlacklist: [],
    geoBlocking: {
      enabled: false,
      allowedCountries: [],
      blockedCountries: [],
    },
  };

  private static rateLimiters: Map<string, RateLimiterRedis> = new Map();

  static initialize(customConfig?: Partial<SecurityConfig>): void {
    // Merge custom config
    if (customConfig) {
      this.config = { ...this.config, ...customConfig };
    }

    // Initialize rate limiters
    Object.entries(this.config.rateLimiting).forEach(([key, config]) => {
      this.rateLimiters.set(
        key,
        new RateLimiterRedis({
          storeClient: redisClient,
          keyPrefix: `ratelimit:${key}`,
          points: config.points,
          duration: config.duration,
          blockDuration: config.duration,
        })
      );
    });
  }

  // Password validation
  static validatePassword(password: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    const policy = this.config.passwordPolicy;

    if (password.length < policy.minLength) {
      errors.push(`Password must be at least ${policy.minLength} characters long`);
    }

    if (policy.requireUppercase && !/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }

    if (policy.requireLowercase && !/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }

    if (policy.requireNumbers && !/\d/.test(password)) {
      errors.push('Password must contain at least one number');
    }

    if (policy.requireSpecialChars && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }

    // Check for common patterns
    if (this.containsCommonPatterns(password)) {
      errors.push('Password contains common patterns or dictionary words');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  // Check password history
  static async checkPasswordHistory(
    userId: string,
    newPassword: string
  ): Promise<boolean> {
    const user = await User.findByPk(userId);
    if (!user || !user.passwordHistory) return true;

    const recentPasswords = user.passwordHistory.slice(0, this.config.passwordPolicy.preventReuse);
    
    for (const oldHash of recentPasswords) {
      if (await bcrypt.compare(newPassword, oldHash)) {
        return false;
      }
    }

    return true;
  }

  // Update password with history
  static async updatePassword(
    userId: string,
    newPassword: string
  ): Promise<void> {
    const user = await User.findByPk(userId);
    if (!user) throw new AppError('User not found', 404);

    // Check password history
    if (!await this.checkPasswordHistory(userId, newPassword)) {
      throw new AppError('Password has been used recently', 400);
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // Update password history
    user.passwordHistory = user.passwordHistory || [];
    user.passwordHistory.unshift(hashedPassword);
    user.passwordHistory = user.passwordHistory.slice(0, this.config.passwordPolicy.preventReuse + 1);

    // Update password and metadata
    user.password = hashedPassword;
    user.passwordChangedAt = new Date();
    user.forcePasswordChange = false;

    await user.save();

    await AuditLog.logSecurity(userId, 'password_changed', {
      method: 'user_initiated',
    });
  }

  // Session management
  static async createSession(
    userId: string,
    sessionData: any
  ): Promise<string> {
    const sessionId = crypto.randomBytes(32).toString('hex');
    const sessionKey = `session:${userId}:${sessionId}`;

    // Check concurrent sessions
    const userSessions = await this.getUserSessions(userId);
    if (userSessions.length >= this.config.sessionPolicy.maxConcurrentSessions) {
      // Remove oldest session
      const oldestSession = userSessions.sort((a, b) => 
        a.createdAt - b.createdAt
      )[0];
      await this.terminateSession(userId, oldestSession.id);
    }

    // Create new session
    const session = {
      id: sessionId,
      userId,
      createdAt: Date.now(),
      lastActivity: Date.now(),
      expiresAt: Date.now() + (this.config.sessionPolicy.sessionTimeout * 60 * 1000),
      absoluteExpiry: Date.now() + (this.config.sessionPolicy.absoluteTimeout * 60 * 1000),
      ...sessionData,
    };

    await redisClient.setex(
      sessionKey,
      this.config.sessionPolicy.absoluteTimeout * 60,
      JSON.stringify(session)
    );

    // Add to user's session list
    await redisClient.sadd(`sessions:user:${userId}`, sessionId);

    return sessionId;
  }

  static async validateSession(
    userId: string,
    sessionId: string
  ): Promise<boolean> {
    const sessionKey = `session:${userId}:${sessionId}`;
    const sessionData = await redisClient.get(sessionKey);

    if (!sessionData) return false;

    const session = JSON.parse(sessionData);
    const now = Date.now();

    // Check absolute expiry
    if (now > session.absoluteExpiry) {
      await this.terminateSession(userId, sessionId);
      return false;
    }

    // Check session timeout
    if (now > session.expiresAt) {
      await this.terminateSession(userId, sessionId);
      return false;
    }

    // Renew session if needed
    if (session.expiresAt - now < this.config.sessionPolicy.renewalThreshold * 60 * 1000) {
      session.lastActivity = now;
      session.expiresAt = now + (this.config.sessionPolicy.sessionTimeout * 60 * 1000);
      
      await redisClient.setex(
        sessionKey,
        this.config.sessionPolicy.absoluteTimeout * 60,
        JSON.stringify(session)
      );
    }

    return true;
  }

  static async terminateSession(userId: string, sessionId: string): Promise<void> {
    const sessionKey = `session:${userId}:${sessionId}`;
    await redisClient.del(sessionKey);
    await redisClient.srem(`sessions:user:${userId}`, sessionId);
    
    await AuditLog.logSecurity(userId, 'session_terminated', {
      sessionId,
    });
  }

  static async getUserSessions(userId: string): Promise<any[]> {
    const sessionIds = await redisClient.smembers(`sessions:user:${userId}`);
    const sessions = [];

    for (const sessionId of sessionIds) {
      const sessionData = await redisClient.get(`session:${userId}:${sessionId}`);
      if (sessionData) {
        sessions.push(JSON.parse(sessionData));
      } else {
        // Clean up orphaned session ID
        await redisClient.srem(`sessions:user:${userId}`, sessionId);
      }
    }

    return sessions;
  }

  // Rate limiting
  static async checkRateLimit(
    key: string,
    identifier: string
  ): Promise<{ allowed: boolean; retryAfter?: number }> {
    const limiter = this.rateLimiters.get(key);
    if (!limiter) {
      throw new Error(`Rate limiter not found for key: ${key}`);
    }

    try {
      await limiter.consume(identifier);
      return { allowed: true };
    } catch (rejRes) {
      return {
        allowed: false,
        retryAfter: Math.round(rejRes.msBeforeNext / 1000) || 60,
      };
    }
  }

  // IP validation
  static validateIP(ip: string): { allowed: boolean; reason?: string } {
    // Check blacklist
    if (this.config.ipBlacklist.includes(ip)) {
      return { allowed: false, reason: 'IP blacklisted' };
    }

    // Check whitelist (if configured)
    if (this.config.ipWhitelist.length > 0 && !this.config.ipWhitelist.includes(ip)) {
      return { allowed: false, reason: 'IP not whitelisted' };
    }

    return { allowed: true };
  }

  // Geo-blocking
  static async validateGeoLocation(ip: string): Promise<{ allowed: boolean; country?: string }> {
    if (!this.config.geoBlocking.enabled) {
      return { allowed: true };
    }

    try {
      // Use IP geolocation service
      const response = await fetch(`https://ipapi.co/${ip}/json/`);
      const data = await response.json();
      const country = data.country_code;

      if (this.config.geoBlocking.blockedCountries.includes(country)) {
        return { allowed: false, country };
      }

      if (
        this.config.geoBlocking.allowedCountries.length > 0 &&
        !this.config.geoBlocking.allowedCountries.includes(country)
      ) {
        return { allowed: false, country };
      }

      return { allowed: true, country };
    } catch (error) {
      logger.error('Geo-location check failed:', error);
      // Fail open - allow access if geo check fails
      return { allowed: true };
    }
  }

  // CSRF token management
  static generateCSRFToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  static async validateCSRFToken(sessionId: string, token: string): Promise<boolean> {
    const storedToken = await redisClient.get(`csrf:${sessionId}`);
    return storedToken === token;
  }

  // Content Security Policy
  static getCSPHeader(nonce: string): string {
    return [
      `default-src 'self'`,
      `script-src 'self' 'nonce-${nonce}' https://apis.google.com`,
      `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com`,
      `font-src 'self' https://fonts.gstatic.com`,
      `img-src 'self' data: https: blob:`,
      `connect-src 'self' https://api.stripe.com`,
      `frame-src 'self' https://js.stripe.com`,
      `object-src 'none'`,
      `base-uri 'self'`,
      `form-action 'self'`,
      `frame-ancestors 'none'`,
      `upgrade-insecure-requests`,
    ].join('; ');
  }

  // Security headers
  static getSecurityHeaders(nonce: string): Record<string, string> {
    return {
      'Content-Security-Policy': this.getCSPHeader(nonce),
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
    };
  }

  // Encryption utilities
  static encrypt(text: string): string {
    const algorithm = 'aes-256-gcm';
    const key = Buffer.from(process.env.ENCRYPTION_KEY!, 'hex');
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(algorithm, key, iv);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;
  }

  static decrypt(encryptedData: string): string {
    const algorithm = 'aes-256-gcm';
    const key = Buffer.from(process.env.ENCRYPTION_KEY!, 'hex');
    
    const parts = encryptedData.split(':');
    const iv = Buffer.from(parts[0], 'hex');
    const authTag = Buffer.from(parts[1], 'hex');
    const encrypted = parts[2];
    
    const decipher = crypto.createDecipheriv(algorithm, key, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }

  // Common password patterns
  private static containsCommonPatterns(password: string): boolean {
    const commonPatterns = [
      /password/i,
      /12345/,
      /qwerty/i,
      /admin/i,
      /letmein/i,
      /welcome/i,
      /monkey/i,
      /dragon/i,
    ];

    return commonPatterns.some(pattern => pattern.test(password));
  }

  // Security monitoring
  static async detectAnomalousActivity(
    userId: string,
    activity: {
      type: string;
      ip: string;
      userAgent: string;
      location?: string;
    }
  ): Promise<boolean> {
    // Get user's recent activity
    const recentActivity = await AuditLog.getUserActivity(userId, {
      startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days
      limit: 100,
    });

    // Check for unusual patterns
    const anomalies: string[] = [];

    // New IP address
    const recentIPs = new Set(recentActivity.map(a => a.ipAddress).filter(Boolean));
    if (!recentIPs.has(activity.ip)) {
      anomalies.push('new_ip');
    }

    // New device
    const recentUserAgents = new Set(recentActivity.map(a => a.userAgent).filter(Boolean));
    if (!recentUserAgents.has(activity.userAgent)) {
      anomalies.push('new_device');
    }

    // Unusual time (e.g., 2-6 AM user's local time)
    const hour = new Date().getHours();
    if (hour >= 2 && hour <= 6) {
      anomalies.push('unusual_time');
    }

    // Multiple failed attempts
    const recentFailures = recentActivity.filter(
      a => a.status === 'failure' && a.createdAt > new Date(Date.now() - 3600000)
    );
    if (recentFailures.length >= 3) {
      anomalies.push('multiple_failures');
    }

    if (anomalies.length > 0) {
      await AuditLog.logSecurity(userId, 'anomalous_activity_detected', {
        anomalies,
        activity,
      });
      return true;
    }

    return false;
  }
}