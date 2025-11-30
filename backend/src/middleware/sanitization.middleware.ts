import { Request, Response, NextFunction } from 'express';
import { logger } from '../config/logger';

/**
 * Advanced input sanitization middleware
 * Prevents XSS, SQL injection, and other injection attacks
 */

// HTML entities to escape
const htmlEntities: { [key: string]: string } = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#x27;',
  '/': '&#x2F;',
};

/**
 * Escape HTML special characters
 */
export const escapeHtml = (text: string): string => {
  return text.replace(/[&<>"'\/]/g, (char) => htmlEntities[char] || char);
};

/**
 * Remove potentially dangerous HTML tags and attributes
 */
export const stripDangerousHtml = (html: string): string => {
  // Remove script tags and their content
  let cleaned = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  
  // Remove event handlers (onclick, onerror, etc.)
  cleaned = cleaned.replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, '');
  
  // Remove javascript: protocol
  cleaned = cleaned.replace(/javascript:/gi, '');
  
  // Remove data: protocol (can be used for XSS)
  cleaned = cleaned.replace(/data:text\/html/gi, '');
  
  // Remove vbscript: protocol
  cleaned = cleaned.replace(/vbscript:/gi, '');
  
  // Remove iframe tags
  cleaned = cleaned.replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '');
  
  // Remove object tags
  cleaned = cleaned.replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '');
  
  // Remove embed tags
  cleaned = cleaned.replace(/<embed\b[^>]*>/gi, '');
  
  return cleaned;
};

/**
 * Sanitize SQL to prevent injection
 */
export const sanitizeSql = (input: string): string => {
  // Escape single quotes
  let sanitized = input.replace(/'/g, "''");
  
  // Remove SQL comments
  sanitized = sanitized.replace(/--.*$/gm, '');
  sanitized = sanitized.replace(/\/\*[\s\S]*?\*\//g, '');
  
  // Remove dangerous SQL keywords in suspicious contexts
  const dangerousPatterns = [
    /(\s|^)(union|select|insert|update|delete|drop|create|alter|exec|execute)(\s|$)/gi,
  ];
  
  dangerousPatterns.forEach(pattern => {
    if (pattern.test(sanitized)) {
      logger.warn('Potential SQL injection attempt detected', { input: sanitized });
    }
  });
  
  return sanitized;
};

/**
 * Sanitize file paths to prevent directory traversal
 */
export const sanitizeFilePath = (path: string): string => {
  // Remove directory traversal attempts
  let sanitized = path.replace(/\.\./g, '');
  
  // Remove leading slashes
  sanitized = sanitized.replace(/^\/+/, '');
  
  // Remove null bytes
  sanitized = sanitized.replace(/\0/g, '');
  
  // Normalize path separators
  sanitized = sanitized.replace(/\\/g, '/');
  
  return sanitized;
};

/**
 * Sanitize email addresses
 */
export const sanitizeEmail = (email: string): string => {
  // Remove whitespace
  let sanitized = email.trim().toLowerCase();
  
  // Basic validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(sanitized)) {
    throw new Error('Invalid email format');
  }
  
  return sanitized;
};

/**
 * Sanitize phone numbers
 */
export const sanitizePhone = (phone: string): string => {
  // Remove all non-numeric characters except + at the start
  return phone.replace(/[^\d+]/g, '').replace(/(?!^)\+/g, '');
};

/**
 * Sanitize URLs
 */
export const sanitizeUrl = (url: string): string => {
  try {
    const parsed = new URL(url);
    
    // Only allow http and https protocols
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      throw new Error('Invalid URL protocol');
    }
    
    return parsed.toString();
  } catch (error) {
    logger.warn('Invalid URL detected', { url });
    throw new Error('Invalid URL format');
  }
};

/**
 * Deep sanitize object recursively
 */
export const sanitizeObject = (obj: any, depth = 0): any => {
  // Prevent infinite recursion
  if (depth > 10) {
    return obj;
  }

  if (typeof obj === 'string') {
    return escapeHtml(obj);
  }

  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item, depth + 1));
  }

  if (obj !== null && typeof obj === 'object') {
    const sanitized: any = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        sanitized[key] = sanitizeObject(obj[key], depth + 1);
      }
    }
    return sanitized;
  }

  return obj;
};

/**
 * Middleware to sanitize request body, query, and params
 */
export const sanitizeRequest = (req: Request, res: Response, next: NextFunction): void => {
  try {
    // Sanitize body
    if (req.body) {
      req.body = sanitizeObject(req.body);
    }

    // Sanitize query parameters
    if (req.query) {
      req.query = sanitizeObject(req.query);
    }

    // Sanitize URL parameters
    if (req.params) {
      req.params = sanitizeObject(req.params);
    }

    next();
  } catch (error) {
    logger.error('Error in sanitization middleware:', error);
    res.status(400).json({
      success: false,
      error: 'Invalid input data',
      message: 'Request contains invalid or malicious data',
    });
  }
};

/**
 * Validate and sanitize file uploads
 */
export const sanitizeFileUpload = (req: Request, res: Response, next: NextFunction): void => {
  try {
    if (!req.file && !req.files) {
      return next();
    }

    const validateFile = (file: any) => {
      // Check file size (max 10MB)
      const maxSize = 10 * 1024 * 1024;
      if (file.size > maxSize) {
        throw new Error('File size exceeds maximum allowed (10MB)');
      }

      // Sanitize filename
      if (file.originalname) {
        file.originalname = sanitizeFilePath(file.originalname);
      }

      // Validate MIME type
      const allowedMimeTypes = [
        'image/jpeg',
        'image/jpg',
        'image/png',
        'image/gif',
        'image/webp',
        'application/pdf',
      ];

      if (!allowedMimeTypes.includes(file.mimetype)) {
        throw new Error(`File type not allowed: ${file.mimetype}`);
      }

      // Check for double extensions (e.g., file.php.jpg)
      const filename = file.originalname.toLowerCase();
      const dangerousExtensions = ['.php', '.exe', '.sh', '.bat', '.cmd', '.js'];
      for (const ext of dangerousExtensions) {
        if (filename.includes(ext)) {
          throw new Error('File contains dangerous extension');
        }
      }
    };

    // Handle single file
    if (req.file) {
      validateFile(req.file);
    }

    // Handle multiple files
    if (req.files) {
      if (Array.isArray(req.files)) {
        req.files.forEach(validateFile);
      } else {
        Object.values(req.files).forEach(fileArray => {
          if (Array.isArray(fileArray)) {
            fileArray.forEach(validateFile);
          }
        });
      }
    }

    next();
  } catch (error: any) {
    logger.error('File upload validation failed:', error);
    res.status(400).json({
      success: false,
      error: 'File upload validation failed',
      message: error.message,
    });
  }
};

/**
 * Detect and block suspicious patterns
 */
export const detectSuspiciousPatterns = (req: Request, res: Response, next: NextFunction): void => {
  const suspiciousPatterns = [
    // SQL Injection patterns
    /(\bUNION\b|\bSELECT\b|\bINSERT\b|\bUPDATE\b|\bDELETE\b|\bDROP\b).*(\bFROM\b|\bWHERE\b)/i,
    // XSS patterns
    /<script[^>]*>.*?<\/script>/i,
    /javascript:/i,
    /onerror\s*=/i,
    /onclick\s*=/i,
    // Command injection
    /[;&|`$()]/,
    // Path traversal
    /\.\.[\/\\]/,
  ];

  const checkValue = (value: any): boolean => {
    if (typeof value === 'string') {
      return suspiciousPatterns.some(pattern => pattern.test(value));
    }
    if (Array.isArray(value)) {
      return value.some(checkValue);
    }
    if (value !== null && typeof value === 'object') {
      return Object.values(value).some(checkValue);
    }
    return false;
  };

  const hasSuspiciousContent = 
    checkValue(req.body) || 
    checkValue(req.query) || 
    checkValue(req.params);

  if (hasSuspiciousContent) {
    logger.warn('Suspicious pattern detected in request', {
      ip: req.ip,
      path: req.path,
      method: req.method,
      userAgent: req.get('user-agent'),
    });

    res.status(400).json({
      success: false,
      error: 'Invalid input',
      message: 'Request contains potentially malicious content',
    });
    return;
  }

  next();
};

export default {
  sanitizeRequest,
  sanitizeFileUpload,
  detectSuspiciousPatterns,
  escapeHtml,
  stripDangerousHtml,
  sanitizeSql,
  sanitizeFilePath,
  sanitizeEmail,
  sanitizePhone,
  sanitizeUrl,
  sanitizeObject,
};
