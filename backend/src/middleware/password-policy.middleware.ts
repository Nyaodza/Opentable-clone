import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import axios from 'axios';
import { logger } from '../config/logger';

/**
 * Password Policy Middleware
 * Implements strong password requirements and breach detection
 */

interface PasswordValidationResult {
  isValid: boolean;
  errors: string[];
  strength: 'weak' | 'medium' | 'strong' | 'very-strong';
  score: number; // 0-100
}

/**
 * Password policy configuration
 */
export const passwordPolicy = {
  minLength: 12,
  maxLength: 128,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: true,
  specialChars: '!@#$%^&*()_+-=[]{}|;:,.<>?',
  preventCommonPasswords: true,
  preventUserInfo: true,
  checkBreachedPasswords: true,
  maxPasswordHistory: 5, // Prevent reuse of last N passwords
};

/**
 * Common/weak passwords list (subset - in production use a larger list)
 */
const commonPasswords = new Set([
  'password', 'password123', '123456', '12345678', 'qwerty',
  'abc123', 'monkey', '1234567', 'letmein', 'trustno1',
  'dragon', 'baseball', 'iloveyou', 'master', 'sunshine',
  'ashley', 'bailey', 'passw0rd', 'shadow', '123123',
  'admin', 'admin123', 'root', 'toor', 'pass',
]);

/**
 * Calculate password strength score
 */
export const calculatePasswordStrength = (password: string): { score: number; strength: string } => {
  let score = 0;

  // Length scoring
  if (password.length >= 8) score += 10;
  if (password.length >= 12) score += 15;
  if (password.length >= 16) score += 10;
  if (password.length >= 20) score += 5;

  // Character variety scoring
  if (/[a-z]/.test(password)) score += 10;
  if (/[A-Z]/.test(password)) score += 10;
  if (/[0-9]/.test(password)) score += 10;
  if (/[^a-zA-Z0-9]/.test(password)) score += 15;

  // Multiple character types
  const types = [
    /[a-z]/.test(password),
    /[A-Z]/.test(password),
    /[0-9]/.test(password),
    /[^a-zA-Z0-9]/.test(password),
  ].filter(Boolean).length;
  
  if (types >= 3) score += 10;
  if (types === 4) score += 10;

  // Penalty for sequential characters
  if (/abc|bcd|cde|123|234|345/i.test(password)) score -= 10;

  // Penalty for repeated characters
  if (/(.)\1{2,}/.test(password)) score -= 15;

  // Bonus for entropy (unique characters)
  const uniqueChars = new Set(password).size;
  if (uniqueChars >= password.length * 0.7) score += 10;

  // Cap score at 100
  score = Math.min(100, Math.max(0, score));

  // Determine strength category
  let strength: string;
  if (score < 40) strength = 'weak';
  else if (score < 60) strength = 'medium';
  else if (score < 80) strength = 'strong';
  else strength = 'very-strong';

  return { score, strength };
};

/**
 * Validate password against policy
 */
export const validatePassword = async (
  password: string,
  userInfo?: { email?: string; name?: string; username?: string }
): Promise<PasswordValidationResult> => {
  const errors: string[] = [];
  const { score, strength } = calculatePasswordStrength(password);

  // Check minimum length
  if (password.length < passwordPolicy.minLength) {
    errors.push(`Password must be at least ${passwordPolicy.minLength} characters long`);
  }

  // Check maximum length
  if (password.length > passwordPolicy.maxLength) {
    errors.push(`Password must not exceed ${passwordPolicy.maxLength} characters`);
  }

  // Check for uppercase
  if (passwordPolicy.requireUppercase && !/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  // Check for lowercase
  if (passwordPolicy.requireLowercase && !/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }

  // Check for numbers
  if (passwordPolicy.requireNumbers && !/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  // Check for special characters
  if (passwordPolicy.requireSpecialChars) {
    const specialCharsRegex = new RegExp(`[${passwordPolicy.specialChars.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')}]`);
    if (!specialCharsRegex.test(password)) {
      errors.push('Password must contain at least one special character (!@#$%^&*...)');
    }
  }

  // Check for common passwords
  if (passwordPolicy.preventCommonPasswords && commonPasswords.has(password.toLowerCase())) {
    errors.push('Password is too common and easily guessable');
  }

  // Check for user info in password
  if (passwordPolicy.preventUserInfo && userInfo) {
    const lowerPassword = password.toLowerCase();
    
    if (userInfo.email && lowerPassword.includes(userInfo.email.split('@')[0].toLowerCase())) {
      errors.push('Password should not contain your email address');
    }
    
    if (userInfo.name && lowerPassword.includes(userInfo.name.toLowerCase())) {
      errors.push('Password should not contain your name');
    }
    
    if (userInfo.username && lowerPassword.includes(userInfo.username.toLowerCase())) {
      errors.push('Password should not contain your username');
    }
  }

  // Check against breached passwords database (HaveIBeenPwned)
  if (passwordPolicy.checkBreachedPasswords) {
    const isBreached = await checkPasswordBreach(password);
    if (isBreached) {
      errors.push('This password has been found in data breaches and is not secure');
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    strength: strength as 'weak' | 'medium' | 'strong' | 'very-strong',
    score,
  };
};

/**
 * Check if password has been breached using HaveIBeenPwned API
 * Uses k-anonymity model - only sends first 5 chars of hash
 */
export const checkPasswordBreach = async (password: string): Promise<boolean> => {
  try {
    // Hash the password with SHA-1
    const crypto = require('crypto');
    const hash = crypto.createHash('sha1').update(password).digest('hex').toUpperCase();
    
    // Send only first 5 characters (k-anonymity)
    const prefix = hash.substring(0, 5);
    const suffix = hash.substring(5);

    // Query HaveIBeenPwned API
    const response = await axios.get(
      `https://api.pwnedpasswords.com/range/${prefix}`,
      {
        headers: {
          'User-Agent': 'OpenTable-Clone-PasswordChecker',
          'Add-Padding': 'true', // Extra security
        },
        timeout: 5000, // 5 second timeout
      }
    );

    // Check if our suffix is in the response
    const hashes = response.data.split('\r\n');
    for (const line of hashes) {
      const [hashSuffix] = line.split(':');
      if (hashSuffix === suffix) {
        return true; // Password has been breached
      }
    }

    return false; // Password not found in breaches
  } catch (error) {
    // If API is down, log but don't block user
    logger.warn('Failed to check password breach status:', error);
    return false;
  }
};

/**
 * Check if password has been used recently
 */
export const checkPasswordHistory = async (
  userId: string,
  newPassword: string,
  previousPasswordHashes: string[]
): Promise<boolean> => {
  try {
    // Check against last N passwords
    for (const oldHash of previousPasswordHashes.slice(0, passwordPolicy.maxPasswordHistory)) {
      const isMatch = await bcrypt.compare(newPassword, oldHash);
      if (isMatch) {
        return false; // Password has been used before
      }
    }
    return true; // Password is unique
  } catch (error) {
    logger.error('Error checking password history:', error);
    return true; // Allow if check fails
  }
};

/**
 * Middleware to validate password on registration/update
 */
export const validatePasswordMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { password, email, name, username } = req.body;

    if (!password) {
      res.status(400).json({
        success: false,
        error: 'Password is required',
      });
      return;
    }

    // Validate password
    const validation = await validatePassword(password, { email, name, username });

    if (!validation.isValid) {
      res.status(400).json({
        success: false,
        error: 'Password does not meet security requirements',
        details: validation.errors,
        strength: validation.strength,
        score: validation.score,
      });
      return;
    }

    // Attach validation result to request for logging
    (req as any).passwordValidation = validation;

    next();
  } catch (error) {
    logger.error('Password validation middleware error:', error);
    res.status(500).json({
      success: false,
      error: 'Password validation failed',
    });
  }
};

/**
 * Middleware to check password history (for password changes)
 */
export const checkPasswordHistoryMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { newPassword } = req.body;
    const userId = req.user?.id;

    if (!userId || !newPassword) {
      return next();
    }

    // Get user's password history from database
    // This would typically query your User model
    // For now, we'll skip the actual query
    const previousPasswordHashes: string[] = []; // TODO: Fetch from database

    const isUnique = await checkPasswordHistory(userId, newPassword, previousPasswordHashes);

    if (!isUnique) {
      res.status(400).json({
        success: false,
        error: 'Password reuse not allowed',
        message: `You cannot reuse any of your last ${passwordPolicy.maxPasswordHistory} passwords`,
      });
      return;
    }

    next();
  } catch (error) {
    logger.error('Password history check error:', error);
    next(); // Don't block on error
  }
};

/**
 * Generate a strong random password
 */
export const generateStrongPassword = (length: number = 16): string => {
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const numbers = '0123456789';
  const special = passwordPolicy.specialChars;
  
  const allChars = uppercase + lowercase + numbers + special;
  let password = '';

  // Ensure at least one of each required type
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += special[Math.floor(Math.random() * special.length)];

  // Fill the rest randomly
  for (let i = password.length; i < length; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }

  // Shuffle the password
  return password.split('').sort(() => Math.random() - 0.5).join('');
};

/**
 * Password strength endpoint
 */
export const checkPasswordStrength = async (req: Request, res: Response): Promise<void> => {
  try {
    const { password } = req.body;

    if (!password) {
      res.status(400).json({
        success: false,
        error: 'Password is required',
      });
      return;
    }

    const validation = await validatePassword(password);

    res.json({
      success: true,
      data: {
        strength: validation.strength,
        score: validation.score,
        isValid: validation.isValid,
        errors: validation.errors,
        suggestions: generatePasswordSuggestions(validation),
      },
    });
  } catch (error) {
    logger.error('Password strength check error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check password strength',
    });
  }
};

/**
 * Generate password improvement suggestions
 */
const generatePasswordSuggestions = (validation: PasswordValidationResult): string[] => {
  const suggestions: string[] = [];

  if (validation.score < 60) {
    suggestions.push('Consider making your password longer (16+ characters recommended)');
  }

  if (!validation.errors.find(e => e.includes('uppercase'))) {
    suggestions.push('Add more uppercase letters');
  }

  if (!validation.errors.find(e => e.includes('special'))) {
    suggestions.push('Include more special characters');
  }

  if (validation.score < 40) {
    suggestions.push('Avoid common words and patterns');
    suggestions.push('Use a passphrase with random words');
  }

  return suggestions;
};

export default {
  validatePassword,
  validatePasswordMiddleware,
  checkPasswordHistoryMiddleware,
  calculatePasswordStrength,
  checkPasswordBreach,
  checkPasswordHistory,
  generateStrongPassword,
  checkPasswordStrength,
  passwordPolicy,
};
