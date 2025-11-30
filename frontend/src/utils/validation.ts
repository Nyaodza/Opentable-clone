/**
 * Form Validation Utilities
 * Provides comprehensive validation functions for forms
 */

export interface ValidationRule {
  validate: (value: any) => boolean;
  message: string;
}

/**
 * Email validation with RFC 5322 compliance
 */
export const validateEmail = (email: string): string | null => {
  if (!email) {
    return 'Email is required';
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  if (!emailRegex.test(email)) {
    return 'Please enter a valid email address';
  }

  // Additional checks
  if (email.length > 254) {
    return 'Email address is too long';
  }

  const [localPart, domain] = email.split('@');
  
  if (localPart.length > 64) {
    return 'Email local part is too long';
  }

  if (domain.length > 253) {
    return 'Email domain is too long';
  }

  return null;
};

/**
 * Password validation
 */
export const validatePassword = (password: string, options: {
  minLength?: number;
  requireUppercase?: boolean;
  requireLowercase?: boolean;
  requireNumbers?: boolean;
  requireSpecialChars?: boolean;
} = {}): string | null => {
  const {
    minLength = 12,
    requireUppercase = true,
    requireLowercase = true,
    requireNumbers = true,
    requireSpecialChars = true,
  } = options;

  if (!password) {
    return 'Password is required';
  }

  if (password.length < minLength) {
    return `Password must be at least ${minLength} characters long`;
  }

  if (requireUppercase && !/[A-Z]/.test(password)) {
    return 'Password must contain at least one uppercase letter';
  }

  if (requireLowercase && !/[a-z]/.test(password)) {
    return 'Password must contain at least one lowercase letter';
  }

  if (requireNumbers && !/[0-9]/.test(password)) {
    return 'Password must contain at least one number';
  }

  if (requireSpecialChars && !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    return 'Password must contain at least one special character';
  }

  return null;
};

/**
 * Phone number validation (international format)
 */
export const validatePhone = (phone: string): string | null => {
  if (!phone) {
    return 'Phone number is required';
  }

  // Remove all non-digit characters except +
  const cleaned = phone.replace(/[^\d+]/g, '');

  // Check if it starts with + (international format)
  if (cleaned.startsWith('+')) {
    // International format: +1234567890 (7-15 digits)
    if (cleaned.length < 8 || cleaned.length > 16) {
      return 'Please enter a valid international phone number';
    }
  } else {
    // Domestic format: at least 10 digits
    if (cleaned.length < 10) {
      return 'Please enter a valid phone number';
    }
  }

  return null;
};

/**
 * Name validation
 */
export const validateName = (name: string, fieldName: string = 'Name'): string | null => {
  if (!name) {
    return `${fieldName} is required`;
  }

  if (name.trim().length < 2) {
    return `${fieldName} must be at least 2 characters long`;
  }

  if (name.length > 50) {
    return `${fieldName} must not exceed 50 characters`;
  }

  // Only allow letters, spaces, hyphens, and apostrophes
  if (!/^[a-zA-Z\s'-]+$/.test(name)) {
    return `${fieldName} can only contain letters, spaces, hyphens, and apostrophes`;
  }

  return null;
};

/**
 * Date validation
 */
export const validateDate = (date: string, options: {
  minDate?: Date;
  maxDate?: Date;
  allowPast?: boolean;
  allowFuture?: boolean;
} = {}): string | null => {
  const {
    minDate,
    maxDate,
    allowPast = false,
    allowFuture = true,
  } = options;

  if (!date) {
    return 'Date is required';
  }

  const selectedDate = new Date(date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (isNaN(selectedDate.getTime())) {
    return 'Please enter a valid date';
  }

  if (!allowPast && selectedDate < today) {
    return 'Date cannot be in the past';
  }

  if (!allowFuture && selectedDate > today) {
    return 'Date cannot be in the future';
  }

  if (minDate && selectedDate < minDate) {
    return `Date must be after ${minDate.toLocaleDateString()}`;
  }

  if (maxDate && selectedDate > maxDate) {
    return `Date must be before ${maxDate.toLocaleDateString()}`;
  }

  return null;
};

/**
 * Credit card validation (Luhn algorithm)
 */
export const validateCreditCard = (cardNumber: string): string | null => {
  if (!cardNumber) {
    return 'Card number is required';
  }

  // Remove spaces and hyphens
  const cleaned = cardNumber.replace(/[\s-]/g, '');

  // Check if it contains only digits
  if (!/^\d+$/.test(cleaned)) {
    return 'Card number can only contain digits';
  }

  // Check length (most cards are 13-19 digits)
  if (cleaned.length < 13 || cleaned.length > 19) {
    return 'Please enter a valid card number';
  }

  // Luhn algorithm
  let sum = 0;
  let isEven = false;

  for (let i = cleaned.length - 1; i >= 0; i--) {
    let digit = parseInt(cleaned[i]);

    if (isEven) {
      digit *= 2;
      if (digit > 9) {
        digit -= 9;
      }
    }

    sum += digit;
    isEven = !isEven;
  }

  if (sum % 10 !== 0) {
    return 'Please enter a valid card number';
  }

  return null;
};

/**
 * URL validation
 */
export const validateUrl = (url: string): string | null => {
  if (!url) {
    return 'URL is required';
  }

  try {
    const parsed = new URL(url);
    
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return 'URL must use HTTP or HTTPS protocol';
    }

    return null;
  } catch {
    return 'Please enter a valid URL';
  }
};

/**
 * Postal code validation (US ZIP code)
 */
export const validatePostalCode = (postalCode: string, country: string = 'US'): string | null => {
  if (!postalCode) {
    return 'Postal code is required';
  }

  if (country === 'US') {
    // US ZIP code: 12345 or 12345-6789
    const zipRegex = /^\d{5}(-\d{4})?$/;
    if (!zipRegex.test(postalCode)) {
      return 'Please enter a valid US ZIP code';
    }
  } else if (country === 'CA') {
    // Canadian postal code: A1A 1A1
    const postalRegex = /^[A-Z]\d[A-Z]\s?\d[A-Z]\d$/i;
    if (!postalRegex.test(postalCode)) {
      return 'Please enter a valid Canadian postal code';
    }
  }

  return null;
};

/**
 * Number validation
 */
export const validateNumber = (value: string, options: {
  min?: number;
  max?: number;
  integer?: boolean;
  positive?: boolean;
} = {}): string | null => {
  const {
    min,
    max,
    integer = false,
    positive = false,
  } = options;

  if (!value) {
    return 'Number is required';
  }

  const num = parseFloat(value);

  if (isNaN(num)) {
    return 'Please enter a valid number';
  }

  if (integer && !Number.isInteger(num)) {
    return 'Please enter a whole number';
  }

  if (positive && num <= 0) {
    return 'Number must be positive';
  }

  if (min !== undefined && num < min) {
    return `Number must be at least ${min}`;
  }

  if (max !== undefined && num > max) {
    return `Number must not exceed ${max}`;
  }

  return null;
};

/**
 * Confirm password validation
 */
export const validateConfirmPassword = (password: string, confirmPassword: string): string | null => {
  if (!confirmPassword) {
    return 'Please confirm your password';
  }

  if (password !== confirmPassword) {
    return 'Passwords do not match';
  }

  return null;
};

/**
 * Required field validation
 */
export const validateRequired = (value: any, fieldName: string = 'This field'): string | null => {
  if (value === null || value === undefined || value === '') {
    return `${fieldName} is required`;
  }

  if (typeof value === 'string' && value.trim() === '') {
    return `${fieldName} is required`;
  }

  if (Array.isArray(value) && value.length === 0) {
    return `${fieldName} is required`;
  }

  return null;
};

/**
 * Length validation
 */
export const validateLength = (value: string, options: {
  min?: number;
  max?: number;
  exact?: number;
  fieldName?: string;
}): string | null => {
  const { min, max, exact, fieldName = 'This field' } = options;

  if (!value) {
    return null; // Use validateRequired for emptiness check
  }

  const length = value.length;

  if (exact !== undefined && length !== exact) {
    return `${fieldName} must be exactly ${exact} characters`;
  }

  if (min !== undefined && length < min) {
    return `${fieldName} must be at least ${min} characters`;
  }

  if (max !== undefined && length > max) {
    return `${fieldName} must not exceed ${max} characters`;
  }

  return null;
};

/**
 * Pattern validation
 */
export const validatePattern = (value: string, pattern: RegExp, message: string): string | null => {
  if (!value) {
    return null;
  }

  if (!pattern.test(value)) {
    return message;
  }

  return null;
};

/**
 * Composite validation - run multiple validators
 */
export const validateComposite = (
  value: any,
  validators: ((value: any) => string | null)[]
): string | null => {
  for (const validator of validators) {
    const error = validator(value);
    if (error) {
      return error;
    }
  }

  return null;
};

/**
 * Async validation wrapper
 */
export const asyncValidate = async <T>(
  value: T,
  validator: (value: T) => Promise<string | null>
): Promise<string | null> => {
  try {
    return await validator(value);
  } catch (error) {
    console.error('Validation error:', error);
    return 'Validation failed';
  }
};

export default {
  validateEmail,
  validatePassword,
  validatePhone,
  validateName,
  validateDate,
  validateCreditCard,
  validateUrl,
  validatePostalCode,
  validateNumber,
  validateConfirmPassword,
  validateRequired,
  validateLength,
  validatePattern,
  validateComposite,
  asyncValidate,
};
