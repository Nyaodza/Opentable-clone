import crypto from 'crypto';
import { promisify } from 'util';
import { AppError } from '../utils/errors';
import { logger } from '../utils/logger';

const scrypt = promisify(crypto.scrypt);

export interface EncryptionConfig {
  algorithm: string;
  keyLength: number;
  saltLength: number;
  ivLength: number;
  tagLength: number;
  iterations: number;
}

export class EncryptionService {
  private static readonly config: EncryptionConfig = {
    algorithm: 'aes-256-gcm',
    keyLength: 32,
    saltLength: 32,
    ivLength: 16,
    tagLength: 16,
    iterations: 100000,
  };

  private static masterKey: Buffer;
  private static keyRotationSchedule: Map<string, Date> = new Map();

  static initialize(): void {
    // Load master key from environment or key management service
    const masterKeyHex = process.env.MASTER_ENCRYPTION_KEY;
    if (!masterKeyHex) {
      throw new Error('Master encryption key not configured');
    }

    this.masterKey = Buffer.from(masterKeyHex, 'hex');
    if (this.masterKey.length !== this.config.keyLength) {
      throw new Error('Invalid master key length');
    }

    // Initialize key rotation schedule
    this.scheduleKeyRotation();
  }

  // Field-level encryption
  static async encryptField(plaintext: string, context?: string): Promise<string> {
    try {
      // Generate salt and IV
      const salt = crypto.randomBytes(this.config.saltLength);
      const iv = crypto.randomBytes(this.config.ivLength);

      // Derive key from master key and salt
      const key = await this.deriveKey(this.masterKey, salt, context);

      // Encrypt
      const cipher = crypto.createCipheriv(this.config.algorithm, key, iv);
      
      let encrypted = cipher.update(plaintext, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      const authTag = cipher.getAuthTag();

      // Combine salt, iv, authTag, and encrypted data
      const combined = Buffer.concat([
        salt,
        iv,
        authTag,
        Buffer.from(encrypted, 'hex'),
      ]);

      return combined.toString('base64');
    } catch (error) {
      logger.error('Field encryption failed:', error);
      throw new AppError('Encryption failed', 500);
    }
  }

  static async decryptField(encryptedData: string, context?: string): Promise<string> {
    try {
      const combined = Buffer.from(encryptedData, 'base64');

      // Extract components
      const salt = combined.slice(0, this.config.saltLength);
      const iv = combined.slice(this.config.saltLength, this.config.saltLength + this.config.ivLength);
      const authTag = combined.slice(
        this.config.saltLength + this.config.ivLength,
        this.config.saltLength + this.config.ivLength + this.config.tagLength
      );
      const encrypted = combined.slice(this.config.saltLength + this.config.ivLength + this.config.tagLength);

      // Derive key
      const key = await this.deriveKey(this.masterKey, salt, context);

      // Decrypt
      const decipher = crypto.createDecipheriv(this.config.algorithm, key, iv);
      decipher.setAuthTag(authTag);

      let decrypted = decipher.update(encrypted, null, 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error) {
      logger.error('Field decryption failed:', error);
      throw new AppError('Decryption failed', 500);
    }
  }

  // File encryption
  static async encryptFile(buffer: Buffer, metadata?: any): Promise<{
    encrypted: Buffer;
    key: string;
    metadata: any;
  }> {
    // Generate file encryption key
    const fileKey = crypto.randomBytes(this.config.keyLength);
    const iv = crypto.randomBytes(this.config.ivLength);

    // Encrypt file
    const cipher = crypto.createCipheriv(this.config.algorithm, fileKey, iv);
    
    const encrypted = Buffer.concat([
      cipher.update(buffer),
      cipher.final(),
    ]);

    const authTag = cipher.getAuthTag();

    // Encrypt file key with master key
    const encryptedKey = await this.encryptField(fileKey.toString('base64'), 'file_key');

    // Prepare encrypted metadata
    const encryptedMetadata = metadata ? {
      ...metadata,
      iv: iv.toString('base64'),
      authTag: authTag.toString('base64'),
      algorithm: this.config.algorithm,
      encryptedAt: new Date(),
    } : {};

    return {
      encrypted,
      key: encryptedKey,
      metadata: encryptedMetadata,
    };
  }

  static async decryptFile(
    encrypted: Buffer,
    encryptedKey: string,
    metadata: any
  ): Promise<Buffer> {
    // Decrypt file key
    const fileKey = Buffer.from(
      await this.decryptField(encryptedKey, 'file_key'),
      'base64'
    );

    const iv = Buffer.from(metadata.iv, 'base64');
    const authTag = Buffer.from(metadata.authTag, 'base64');

    // Decrypt file
    const decipher = crypto.createDecipheriv(metadata.algorithm || this.config.algorithm, fileKey, iv);
    decipher.setAuthTag(authTag);

    return Buffer.concat([
      decipher.update(encrypted),
      decipher.final(),
    ]);
  }

  // Tokenization
  static async tokenize(data: string, type: string): Promise<string> {
    // Generate token
    const token = crypto.randomBytes(32).toString('base64url');
    
    // Store mapping in secure storage
    const encrypted = await this.encryptField(data, `token:${type}`);
    
    // In production, store in secure token vault
    await this.storeToken(token, encrypted, type);

    return token;
  }

  static async detokenize(token: string, type: string): Promise<string> {
    // Retrieve from secure storage
    const encrypted = await this.retrieveToken(token, type);
    if (!encrypted) {
      throw new AppError('Invalid token', 404);
    }

    return this.decryptField(encrypted, `token:${type}`);
  }

  // Format-preserving encryption (FPE)
  static async encryptPII(
    value: string,
    format: 'ssn' | 'phone' | 'email' | 'creditcard'
  ): Promise<string> {
    switch (format) {
      case 'ssn':
        return this.encryptSSN(value);
      case 'phone':
        return this.encryptPhone(value);
      case 'email':
        return this.encryptEmail(value);
      case 'creditcard':
        return this.encryptCreditCard(value);
      default:
        throw new AppError('Unsupported format', 400);
    }
  }

  private static async encryptSSN(ssn: string): Promise<string> {
    // Keep format XXX-XX-XXXX
    const cleaned = ssn.replace(/\D/g, '');
    if (cleaned.length !== 9) {
      throw new AppError('Invalid SSN format', 400);
    }

    // Encrypt middle portion, keep first 3 and last 4 for searching
    const first = cleaned.slice(0, 3);
    const middle = await this.encryptDigits(cleaned.slice(3, 5));
    const last = cleaned.slice(5);

    return `${first}-${middle}-${last}`;
  }

  private static async encryptPhone(phone: string): Promise<string> {
    // Keep country code and area code visible
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length < 10) {
      throw new AppError('Invalid phone format', 400);
    }

    const countryCode = cleaned.length > 10 ? cleaned.slice(0, -10) : '';
    const areaCode = cleaned.slice(-10, -7);
    const encrypted = await this.encryptDigits(cleaned.slice(-7));

    return countryCode + areaCode + encrypted;
  }

  private static async encryptEmail(email: string): Promise<string> {
    const [local, domain] = email.split('@');
    if (!local || !domain) {
      throw new AppError('Invalid email format', 400);
    }

    // Keep first 2 and last 2 characters of local part
    if (local.length <= 4) {
      return `${local}@${domain}`;
    }

    const first = local.slice(0, 2);
    const last = local.slice(-2);
    const middle = await this.encryptString(local.slice(2, -2));

    return `${first}${middle}${last}@${domain}`;
  }

  private static async encryptCreditCard(card: string): Promise<string> {
    const cleaned = card.replace(/\D/g, '');
    if (cleaned.length < 13 || cleaned.length > 19) {
      throw new AppError('Invalid credit card format', 400);
    }

    // Keep first 6 (BIN) and last 4 visible
    const bin = cleaned.slice(0, 6);
    const last4 = cleaned.slice(-4);
    const middle = await this.encryptDigits(cleaned.slice(6, -4));

    return `${bin}${middle}${last4}`;
  }

  // Helper methods
  private static async deriveKey(
    masterKey: Buffer,
    salt: Buffer,
    context?: string
  ): Promise<Buffer> {
    const info = context ? Buffer.from(context, 'utf8') : Buffer.alloc(0);
    
    // Use HKDF for key derivation
    const prk = crypto.createHmac('sha256', salt).update(masterKey).digest();
    
    let t = Buffer.alloc(0);
    let okm = Buffer.alloc(0);
    
    for (let i = 1; okm.length < this.config.keyLength; i++) {
      t = crypto
        .createHmac('sha256', prk)
        .update(Buffer.concat([t, info, Buffer.from([i])]))
        .digest();
      okm = Buffer.concat([okm, t]);
    }

    return okm.slice(0, this.config.keyLength);
  }

  private static async encryptDigits(digits: string): Promise<string> {
    // Simple format-preserving encryption for digits
    const encrypted = await this.encryptField(digits, 'fpe_digits');
    
    // Convert to digits only (simplified - use proper FPE library in production)
    let result = '';
    for (let i = 0; i < digits.length; i++) {
      const byte = encrypted.charCodeAt(i % encrypted.length);
      result += (byte % 10).toString();
    }
    
    return result;
  }

  private static async encryptString(str: string): Promise<string> {
    // Encrypt and encode in a way that preserves length approximately
    const encrypted = await this.encryptField(str, 'fpe_string');
    
    // Return base64url encoded but truncated to similar length
    return encrypted.replace(/[+\/=]/g, '').slice(0, str.length);
  }

  // Token storage (simplified - use secure vault in production)
  private static tokenStore: Map<string, { encrypted: string; type: string; expiry: Date }> = new Map();

  private static async storeToken(token: string, encrypted: string, type: string): Promise<void> {
    this.tokenStore.set(token, {
      encrypted,
      type,
      expiry: new Date(Date.now() + 86400000), // 24 hours
    });

    // Clean expired tokens
    this.cleanExpiredTokens();
  }

  private static async retrieveToken(token: string, type: string): Promise<string | null> {
    const stored = this.tokenStore.get(token);
    
    if (!stored || stored.type !== type) {
      return null;
    }

    if (stored.expiry < new Date()) {
      this.tokenStore.delete(token);
      return null;
    }

    return stored.encrypted;
  }

  private static cleanExpiredTokens(): void {
    const now = new Date();
    for (const [token, data] of this.tokenStore.entries()) {
      if (data.expiry < now) {
        this.tokenStore.delete(token);
      }
    }
  }

  // Key rotation
  private static scheduleKeyRotation(): void {
    // Schedule key rotation every 90 days
    setInterval(() => {
      this.checkKeyRotation();
    }, 86400000); // Check daily
  }

  private static async checkKeyRotation(): Promise<void> {
    const rotationDue = new Date();
    rotationDue.setDate(rotationDue.getDate() - 90);

    for (const [keyId, lastRotation] of this.keyRotationSchedule.entries()) {
      if (lastRotation < rotationDue) {
        await this.rotateKey(keyId);
      }
    }
  }

  private static async rotateKey(keyId: string): Promise<void> {
    logger.info(`Rotating encryption key: ${keyId}`);
    
    // Generate new key
    const newKey = crypto.randomBytes(this.config.keyLength);
    
    // Re-encrypt data with new key (implement based on your data storage)
    // This is application-specific
    
    // Update rotation schedule
    this.keyRotationSchedule.set(keyId, new Date());
  }

  // Secure key storage
  static async securelyStoreKey(key: Buffer, keyId: string): Promise<void> {
    // In production, use AWS KMS, Azure Key Vault, or similar
    // This is a simplified example
    const encrypted = await this.encryptField(key.toString('base64'), `key:${keyId}`);
    
    // Store encrypted key
    await this.storeEncryptedKey(keyId, encrypted);
  }

  static async securelyRetrieveKey(keyId: string): Promise<Buffer> {
    const encrypted = await this.retrieveEncryptedKey(keyId);
    if (!encrypted) {
      throw new AppError('Key not found', 404);
    }

    const decrypted = await this.decryptField(encrypted, `key:${keyId}`);
    return Buffer.from(decrypted, 'base64');
  }

  // Placeholder methods for key storage
  private static encryptedKeys: Map<string, string> = new Map();

  private static async storeEncryptedKey(keyId: string, encrypted: string): Promise<void> {
    this.encryptedKeys.set(keyId, encrypted);
  }

  private static async retrieveEncryptedKey(keyId: string): Promise<string | null> {
    return this.encryptedKeys.get(keyId) || null;
  }
}