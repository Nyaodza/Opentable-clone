import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import { authenticator } from 'otplib';
import crypto from 'crypto';
import { User } from '../models/User';
import { redisClient } from '../config/redis';
import { EmailService } from './email.service';
import { SmsService } from './sms.service';
import { AppError } from '../utils/errors';
import { logger } from '../utils/logger';

export interface TwoFactorMethod {
  type: 'totp' | 'sms' | 'email' | 'backup';
  enabled: boolean;
  verified: boolean;
  primary: boolean;
}

export interface BackupCode {
  code: string;
  used: boolean;
  usedAt?: Date;
}

export class TwoFactorService {
  private static readonly TOTP_WINDOW = 2; // Allow 2 time windows for clock drift
  private static readonly BACKUP_CODES_COUNT = 10;
  private static readonly SMS_CODE_LENGTH = 6;
  private static readonly EMAIL_CODE_LENGTH = 6;
  private static readonly CODE_EXPIRY = 300; // 5 minutes

  // Enable TOTP (Time-based One-Time Password)
  static async enableTOTP(userId: string): Promise<{
    secret: string;
    qrCode: string;
    backupCodes: string[];
  }> {
    const user = await User.findByPk(userId);
    if (!user) {
      throw new AppError('User not found', 404);
    }

    // Generate secret
    const secret = speakeasy.generateSecret({
      name: `OpenTable Clone (${user.email})`,
      issuer: 'OpenTable Clone',
      length: 32,
    });

    // Store temporary secret until verified
    await redisClient.setex(
      `2fa:totp:temp:${userId}`,
      600, // 10 minutes to verify
      JSON.stringify({
        secret: secret.base32,
        ascii: secret.ascii,
        hex: secret.hex,
      })
    );

    // Generate QR code
    const qrCode = await QRCode.toDataURL(secret.otpauth_url!);

    // Generate backup codes
    const backupCodes = this.generateBackupCodes();
    
    // Store backup codes temporarily
    await redisClient.setex(
      `2fa:backup:temp:${userId}`,
      600,
      JSON.stringify(backupCodes)
    );

    return {
      secret: secret.base32,
      qrCode,
      backupCodes: backupCodes.map(b => b.code),
    };
  }

  // Verify and confirm TOTP setup
  static async verifyTOTPSetup(userId: string, token: string): Promise<boolean> {
    const tempSecretData = await redisClient.get(`2fa:totp:temp:${userId}`);
    if (!tempSecretData) {
      throw new AppError('TOTP setup expired or not found', 400);
    }

    const { secret } = JSON.parse(tempSecretData);

    // Verify token
    const verified = speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      token,
      window: this.TOTP_WINDOW,
    });

    if (!verified) {
      throw new AppError('Invalid verification code', 400);
    }

    // Get backup codes
    const backupCodesData = await redisClient.get(`2fa:backup:temp:${userId}`);
    const backupCodes = backupCodesData ? JSON.parse(backupCodesData) : this.generateBackupCodes();

    // Save to user
    const user = await User.findByPk(userId);
    if (!user) {
      throw new AppError('User not found', 404);
    }

    user.twoFactorSecret = this.encryptSecret(secret);
    user.twoFactorEnabled = true;
    user.twoFactorMethods = {
      totp: { type: 'totp', enabled: true, verified: true, primary: true },
    };
    user.backupCodes = this.hashBackupCodes(backupCodes);
    await user.save();

    // Clean up temporary data
    await redisClient.del(`2fa:totp:temp:${userId}`);
    await redisClient.del(`2fa:backup:temp:${userId}`);

    // Log security event
    await this.logSecurityEvent(userId, 'totp_enabled', {
      method: 'totp',
    });

    return true;
  }

  // Verify TOTP token
  static async verifyTOTP(userId: string, token: string): Promise<boolean> {
    const user = await User.findByPk(userId);
    if (!user || !user.twoFactorEnabled || !user.twoFactorSecret) {
      return false;
    }

    const secret = this.decryptSecret(user.twoFactorSecret);

    const verified = speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      token,
      window: this.TOTP_WINDOW,
    });

    if (verified) {
      await this.logSecurityEvent(userId, 'totp_verified', {
        success: true,
      });
    }

    return verified;
  }

  // Send SMS code
  static async sendSMSCode(userId: string, phoneNumber: string): Promise<void> {
    const code = this.generateNumericCode(this.SMS_CODE_LENGTH);
    
    // Store code in Redis
    await redisClient.setex(
      `2fa:sms:${userId}`,
      this.CODE_EXPIRY,
      JSON.stringify({
        code,
        phoneNumber,
        attempts: 0,
      })
    );

    // Send SMS
    await SmsService.sendSMS(phoneNumber, `Your OpenTable verification code is: ${code}`);

    await this.logSecurityEvent(userId, 'sms_code_sent', {
      phoneNumber: this.maskPhoneNumber(phoneNumber),
    });
  }

  // Verify SMS code
  static async verifySMSCode(userId: string, code: string): Promise<boolean> {
    const data = await redisClient.get(`2fa:sms:${userId}`);
    if (!data) {
      throw new AppError('SMS code expired or not found', 400);
    }

    const smsData = JSON.parse(data);
    
    // Check attempts
    if (smsData.attempts >= 3) {
      await redisClient.del(`2fa:sms:${userId}`);
      throw new AppError('Too many attempts. Please request a new code.', 429);
    }

    if (smsData.code !== code) {
      smsData.attempts++;
      await redisClient.setex(
        `2fa:sms:${userId}`,
        this.CODE_EXPIRY,
        JSON.stringify(smsData)
      );
      return false;
    }

    // Success - clean up
    await redisClient.del(`2fa:sms:${userId}`);
    
    await this.logSecurityEvent(userId, 'sms_verified', {
      success: true,
    });

    return true;
  }

  // Send Email code
  static async sendEmailCode(userId: string): Promise<void> {
    const user = await User.findByPk(userId);
    if (!user) {
      throw new AppError('User not found', 404);
    }

    const code = this.generateNumericCode(this.EMAIL_CODE_LENGTH);
    
    // Store code in Redis
    await redisClient.setex(
      `2fa:email:${userId}`,
      this.CODE_EXPIRY,
      JSON.stringify({
        code,
        email: user.email,
        attempts: 0,
      })
    );

    // Send email
    await EmailService.sendEmail({
      to: user.email,
      subject: 'Your OpenTable Verification Code',
      template: 'two-factor-code',
      data: {
        code,
        userName: user.firstName,
        expiresIn: '5 minutes',
      },
    });

    await this.logSecurityEvent(userId, 'email_code_sent', {
      email: this.maskEmail(user.email),
    });
  }

  // Verify Email code
  static async verifyEmailCode(userId: string, code: string): Promise<boolean> {
    const data = await redisClient.get(`2fa:email:${userId}`);
    if (!data) {
      throw new AppError('Email code expired or not found', 400);
    }

    const emailData = JSON.parse(data);
    
    // Check attempts
    if (emailData.attempts >= 3) {
      await redisClient.del(`2fa:email:${userId}`);
      throw new AppError('Too many attempts. Please request a new code.', 429);
    }

    if (emailData.code !== code) {
      emailData.attempts++;
      await redisClient.setex(
        `2fa:email:${userId}`,
        this.CODE_EXPIRY,
        JSON.stringify(emailData)
      );
      return false;
    }

    // Success - clean up
    await redisClient.del(`2fa:email:${userId}`);
    
    await this.logSecurityEvent(userId, 'email_verified', {
      success: true,
    });

    return true;
  }

  // Verify backup code
  static async verifyBackupCode(userId: string, code: string): Promise<boolean> {
    const user = await User.findByPk(userId);
    if (!user || !user.backupCodes) {
      return false;
    }

    // Find unused backup code
    const backupCodeIndex = user.backupCodes.findIndex(
      bc => !bc.used && this.verifyBackupCodeHash(code, bc.code)
    );

    if (backupCodeIndex === -1) {
      return false;
    }

    // Mark as used
    user.backupCodes[backupCodeIndex].used = true;
    user.backupCodes[backupCodeIndex].usedAt = new Date();
    await user.save();

    await this.logSecurityEvent(userId, 'backup_code_used', {
      remaining: user.backupCodes.filter(bc => !bc.used).length,
    });

    // Send notification if low on backup codes
    const remainingCodes = user.backupCodes.filter(bc => !bc.used).length;
    if (remainingCodes <= 2) {
      await EmailService.sendEmail({
        to: user.email,
        subject: 'Low on Backup Codes',
        template: 'low-backup-codes',
        data: {
          userName: user.firstName,
          remaining: remainingCodes,
        },
      });
    }

    return true;
  }

  // Generate new backup codes
  static async regenerateBackupCodes(userId: string): Promise<string[]> {
    const user = await User.findByPk(userId);
    if (!user) {
      throw new AppError('User not found', 404);
    }

    const backupCodes = this.generateBackupCodes();
    user.backupCodes = this.hashBackupCodes(backupCodes);
    await user.save();

    await this.logSecurityEvent(userId, 'backup_codes_regenerated', {
      count: backupCodes.length,
    });

    return backupCodes.map(bc => bc.code);
  }

  // Disable 2FA
  static async disable2FA(userId: string): Promise<void> {
    const user = await User.findByPk(userId);
    if (!user) {
      throw new AppError('User not found', 404);
    }

    user.twoFactorEnabled = false;
    user.twoFactorSecret = null;
    user.twoFactorMethods = {};
    user.backupCodes = [];
    await user.save();

    await this.logSecurityEvent(userId, 'two_factor_disabled', {});
  }

  // Helper methods
  private static generateBackupCodes(): BackupCode[] {
    const codes: BackupCode[] = [];
    
    for (let i = 0; i < this.BACKUP_CODES_COUNT; i++) {
      codes.push({
        code: this.generateBackupCode(),
        used: false,
      });
    }

    return codes;
  }

  private static generateBackupCode(): string {
    const code = crypto.randomBytes(4).toString('hex').toUpperCase();
    return `${code.slice(0, 4)}-${code.slice(4)}`;
  }

  private static generateNumericCode(length: number): string {
    const digits = '0123456789';
    let code = '';
    
    for (let i = 0; i < length; i++) {
      code += digits[Math.floor(Math.random() * digits.length)];
    }
    
    return code;
  }

  private static hashBackupCodes(codes: BackupCode[]): BackupCode[] {
    return codes.map(bc => ({
      ...bc,
      code: crypto.createHash('sha256').update(bc.code).digest('hex'),
    }));
  }

  private static verifyBackupCodeHash(code: string, hash: string): boolean {
    return crypto.createHash('sha256').update(code).digest('hex') === hash;
  }

  private static encryptSecret(secret: string): string {
    const algorithm = 'aes-256-gcm';
    const key = Buffer.from(process.env.ENCRYPTION_KEY!, 'hex');
    const iv = crypto.randomBytes(16);
    
    const cipher = crypto.createCipheriv(algorithm, key, iv);
    
    let encrypted = cipher.update(secret, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;
  }

  private static decryptSecret(encryptedSecret: string): string {
    const algorithm = 'aes-256-gcm';
    const key = Buffer.from(process.env.ENCRYPTION_KEY!, 'hex');
    
    const parts = encryptedSecret.split(':');
    const iv = Buffer.from(parts[0], 'hex');
    const authTag = Buffer.from(parts[1], 'hex');
    const encrypted = parts[2];
    
    const decipher = crypto.createDecipheriv(algorithm, key, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }

  private static maskEmail(email: string): string {
    const [local, domain] = email.split('@');
    const maskedLocal = local.slice(0, 2) + '*'.repeat(Math.max(0, local.length - 4)) + local.slice(-2);
    return `${maskedLocal}@${domain}`;
  }

  private static maskPhoneNumber(phone: string): string {
    return phone.slice(0, 3) + '*'.repeat(phone.length - 7) + phone.slice(-4);
  }

  private static async logSecurityEvent(
    userId: string,
    event: string,
    data: any
  ): Promise<void> {
    const AuditLog = require('../models/audit-log.model').default;
    
    await AuditLog.create({
      userId,
      action: event,
      category: 'security',
      details: data,
      ipAddress: data.ipAddress,
      userAgent: data.userAgent,
    });
  }

  // WebAuthn/FIDO2 support
  static async registerWebAuthn(userId: string, credential: any): Promise<void> {
    // Store WebAuthn credential
    const user = await User.findByPk(userId);
    if (!user) {
      throw new AppError('User not found', 404);
    }

    user.webAuthnCredentials = user.webAuthnCredentials || [];
    user.webAuthnCredentials.push({
      credentialId: credential.id,
      publicKey: credential.publicKey,
      counter: credential.counter,
      deviceName: credential.deviceName || 'Unknown Device',
      createdAt: new Date(),
    });

    await user.save();

    await this.logSecurityEvent(userId, 'webauthn_registered', {
      deviceName: credential.deviceName,
    });
  }

  static async verifyWebAuthn(userId: string, assertion: any): Promise<boolean> {
    const user = await User.findByPk(userId);
    if (!user || !user.webAuthnCredentials) {
      return false;
    }

    // Find matching credential
    const credential = user.webAuthnCredentials.find(
      c => c.credentialId === assertion.id
    );

    if (!credential) {
      return false;
    }

    // Verify assertion (simplified - use proper WebAuthn library)
    // This would involve verifying the signature with the stored public key

    return true;
  }
}