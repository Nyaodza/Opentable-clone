// Dynamic import for DOMPurify to handle SSR
let DOMPurify: any;
if (typeof window !== 'undefined') {
  import('isomorphic-dompurify').then(module => {
    DOMPurify = module.default;
  });
}

/**
 * Comprehensive security utilities for input sanitization and validation
 */

// Input sanitization
export const sanitize = {
  /**
   * Sanitize HTML content to prevent XSS attacks
   */
  html: (input: string): string => {
    if (typeof input !== 'string') return '';
    
    // Fallback sanitization if DOMPurify is not available
    if (!DOMPurify) {
      return input
        .replace(/[<>]/g, '')
        .replace(/javascript:/gi, '')
        .replace(/on\w+=/gi, '')
        .slice(0, 10000);
    }
    
    return DOMPurify.sanitize(input, {
      ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'p', 'br'],
      ALLOWED_ATTR: [],
    });
  },

  /**
   * Sanitize plain text input
   */
  text: (input: string): string => {
    if (typeof input !== 'string') return '';
    return input
      .trim()
      .replace(/[<>]/g, '')
      .replace(/javascript:/gi, '')
      .replace(/data:/gi, '')
      .slice(0, 10000); // Limit length
  },

  /**
   * Sanitize email addresses
   */
  email: (input: string): string => {
    if (typeof input !== 'string') return '';
    return input
      .trim()
      .toLowerCase()
      .replace(/[<>]/g, '')
      .slice(0, 254); // RFC limit
  },

  /**
   * Sanitize phone numbers
   */
  phone: (input: string): string => {
    if (typeof input !== 'string') return '';
    return input.replace(/[^\d\+\(\)\-\s]/g, '').slice(0, 20);
  },

  /**
   * Sanitize URLs
   */
  url: (input: string): string => {
    if (typeof input !== 'string') return '';
    
    // Only allow http and https protocols
    try {
      const url = new URL(input);
      if (!['http:', 'https:'].includes(url.protocol)) {
        return '';
      }
      return url.toString();
    } catch {
      return '';
    }
  },

  /**
   * Sanitize SQL input (basic protection)
   */
  sql: (input: string): string => {
    if (typeof input !== 'string') return '';
    return input
      .replace(/['";\\]/g, '')
      .replace(/--/g, '')
      .replace(/\/\*/g, '')
      .replace(/\*\//g, '');
  },

  /**
   * Sanitize file names
   */
  filename: (input: string): string => {
    if (typeof input !== 'string') return '';
    return input
      .replace(/[^a-zA-Z0-9._-]/g, '')
      .replace(/\.{2,}/g, '.')
      .slice(0, 255);
  },

  /**
   * Sanitize numbers
   */
  number: (input: any): number => {
    const num = parseFloat(input);
    return isNaN(num) ? 0 : num;
  },

  /**
   * Sanitize integers
   */
  integer: (input: any): number => {
    const num = parseInt(input, 10);
    return isNaN(num) ? 0 : num;
  },
};

// Input validation
export const validate = {
  /**
   * Validate email format
   */
  email: (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email) && email.length <= 254;
  },

  /**
   * Validate phone number
   */
  phone: (phone: string): boolean => {
    const phoneRegex = /^[\+]?[(]?[\d\s\-\(\)]{10,}$/;
    return phoneRegex.test(phone.replace(/\s/g, ''));
  },

  /**
   * Validate URL
   */
  url: (url: string): boolean => {
    try {
      const urlObj = new URL(url);
      return ['http:', 'https:'].includes(urlObj.protocol);
    } catch {
      return false;
    }
  },

  /**
   * Validate password strength
   */
  password: (password: string): {
    isValid: boolean;
    strength: 'weak' | 'medium' | 'strong';
    errors: string[];
  } => {
    const errors: string[] = [];
    
    if (password.length < 8) {
      errors.push('Password must be at least 8 characters long');
    }
    
    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }
    
    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }
    
    if (!/\d/.test(password)) {
      errors.push('Password must contain at least one number');
    }
    
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }

    const strength = errors.length === 0 ? 'strong' : 
                    errors.length <= 2 ? 'medium' : 'weak';

    return {
      isValid: errors.length === 0,
      strength,
      errors,
    };
  },

  /**
   * Validate credit card number (basic Luhn algorithm)
   */
  creditCard: (cardNumber: string): boolean => {
    const cleaned = cardNumber.replace(/\D/g, '');
    
    if (cleaned.length < 13 || cleaned.length > 19) {
      return false;
    }

    let sum = 0;
    let shouldDouble = false;

    for (let i = cleaned.length - 1; i >= 0; i--) {
      let digit = parseInt(cleaned.charAt(i), 10);

      if (shouldDouble) {
        digit *= 2;
        if (digit > 9) {
          digit -= 9;
        }
      }

      sum += digit;
      shouldDouble = !shouldDouble;
    }

    return sum % 10 === 0;
  },

  /**
   * Validate date format (YYYY-MM-DD)
   */
  date: (date: string): boolean => {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) return false;
    
    const dateObj = new Date(date);
    return dateObj instanceof Date && !isNaN(dateObj.getTime());
  },

  /**
   * Validate file upload
   */
  file: (file: File, options: {
    maxSize?: number; // in bytes
    allowedTypes?: string[];
    allowedExtensions?: string[];
  } = {}): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];
    const { maxSize = 5 * 1024 * 1024, allowedTypes = [], allowedExtensions = [] } = options;

    if (file.size > maxSize) {
      errors.push(`File size must be less than ${Math.round(maxSize / (1024 * 1024))}MB`);
    }

    if (allowedTypes.length > 0 && !allowedTypes.includes(file.type)) {
      errors.push(`File type ${file.type} is not allowed`);
    }

    if (allowedExtensions.length > 0) {
      const extension = file.name.split('.').pop()?.toLowerCase();
      if (!extension || !allowedExtensions.includes(extension)) {
        errors.push(`File extension .${extension} is not allowed`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  },
};

// Security headers and CSRF protection
export const security = {
  /**
   * Generate CSRF token
   */
  generateCSRFToken: (): string => {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  },

  /**
   * Get CSRF token from meta tag or generate new one
   */
  getCSRFToken: (): string => {
    if (typeof document !== 'undefined') {
      const metaTag = document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement;
      if (metaTag) {
        return metaTag.content;
      }
    }
    return security.generateCSRFToken();
  },

  /**
   * Rate limiting helper (client-side)
   */
  rateLimit: (() => {
    const limits = new Map<string, { count: number; resetTime: number }>();

    return (key: string, maxRequests: number, windowMs: number): boolean => {
      const now = Date.now();
      const limit = limits.get(key);

      if (!limit || now > limit.resetTime) {
        limits.set(key, { count: 1, resetTime: now + windowMs });
        return true;
      }

      if (limit.count >= maxRequests) {
        return false;
      }

      limit.count++;
      return true;
    };
  })(),

  /**
   * Content Security Policy helpers
   */
  csp: {
    /**
     * Generate nonce for inline scripts
     */
    generateNonce: (): string => {
      const array = new Uint8Array(16);
      crypto.getRandomValues(array);
      return btoa(String.fromCharCode(...Array.from(array)));
    },

    /**
     * Validate CSP nonce
     */
    validateNonce: (nonce: string): boolean => {
      try {
        return btoa(atob(nonce)) === nonce;
      } catch {
        return false;
      }
    },
  },

  /**
   * Secure random string generation
   */
  generateSecureRandom: (length: number = 32): string => {
    const array = new Uint8Array(length);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  },

  /**
   * Check if running in secure context
   */
  isSecureContext: (): boolean => {
    return typeof window !== 'undefined' && 
           (window.location.protocol === 'https:' || 
            window.location.hostname === 'localhost' ||
            window.location.hostname === '127.0.0.1');
  },
};

// Form data sanitization middleware
export const sanitizeFormData = <T extends Record<string, any>>(
  data: T,
  schema: Record<keyof T, 'text' | 'html' | 'email' | 'phone' | 'url' | 'number' | 'integer'>
): T => {
  const sanitized = {} as T;

  for (const [key, value] of Object.entries(data)) {
    const sanitizer = schema[key as keyof T];
    
    if (sanitizer && sanitize[sanitizer]) {
      sanitized[key as keyof T] = sanitize[sanitizer](value) as T[keyof T];
    } else {
      sanitized[key as keyof T] = value;
    }
  }

  return sanitized;
};

// Audit logging for security events
export const auditLog = {
  /**
   * Log security-related events
   */
  log: (event: {
    type: 'login' | 'logout' | 'failed_login' | 'password_change' | 'data_access' | 'admin_action';
    userId?: string;
    details?: Record<string, any>;
    severity?: 'low' | 'medium' | 'high' | 'critical';
  }): void => {
    const logEntry = {
      ...event,
      timestamp: new Date().toISOString(),
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
      ip: 'client-side', // Would be populated server-side
      sessionId: 'client-session', // Would use actual session ID
    };

    // In production, send to logging service
    if (process.env.NODE_ENV === 'production') {
      // Send to audit logging service
      fetch('/api/audit-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(logEntry),
      }).catch(() => {
        // Fail silently for audit logs
      });
    } else {
      console.log('🔒 Security Audit:', logEntry);
    }
  },
};

export default {
  sanitize,
  validate,
  security,
  sanitizeFormData,
  auditLog,
};