import { Request, Response, NextFunction } from 'express';
import { body, query, param, validationResult, ValidationChain } from 'express-validator';
import { AppError } from './error.middleware';

// Enhanced validation middleware
export const handleValidationErrors = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const formattedErrors = errors.array().map(error => ({
      field: error.type === 'field' ? error.path : 'general',
      message: error.msg,
      value: error.type === 'field' ? error.value : undefined,
    }));

    throw new AppError(
      'Validation failed',
      400,
      'VALIDATION_ERROR'
    );
  }
  
  next();
};

// Custom validators
const customValidators = {
  // Strong password validation
  strongPassword: (value: string) => {
    const minLength = 8;
    const hasLowerCase = /[a-z]/.test(value);
    const hasUpperCase = /[A-Z]/.test(value);
    const hasNumbers = /\d/.test(value);
    const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(value);
    
    if (value.length < minLength) {
      throw new Error(`Password must be at least ${minLength} characters long`);
    }
    if (!hasLowerCase) {
      throw new Error('Password must contain at least one lowercase letter');
    }
    if (!hasUpperCase) {
      throw new Error('Password must contain at least one uppercase letter');
    }
    if (!hasNumbers) {
      throw new Error('Password must contain at least one number');
    }
    if (!hasSpecialChar) {
      throw new Error('Password must contain at least one special character');
    }
    return true;
  },

  // Phone number validation (international format)
  phoneNumber: (value: string) => {
    const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
    if (!phoneRegex.test(value.replace(/[\s\-\(\)]/g, ''))) {
      throw new Error('Invalid phone number format');
    }
    return true;
  },

  // Credit card validation (basic Luhn algorithm)
  creditCard: (value: string) => {
    const num = value.replace(/\s/g, '');
    if (!/^\d+$/.test(num)) {
      throw new Error('Credit card number must contain only digits');
    }
    
    let sum = 0;
    let alternate = false;
    
    for (let i = num.length - 1; i >= 0; i--) {
      let n = parseInt(num.charAt(i), 10);
      
      if (alternate) {
        n *= 2;
        if (n > 9) {
          n = (n % 10) + 1;
        }
      }
      
      sum += n;
      alternate = !alternate;
    }
    
    if (sum % 10 !== 0) {
      throw new Error('Invalid credit card number');
    }
    return true;
  },

  // Future date validation
  futureDate: (value: string) => {
    const date = new Date(value);
    const now = new Date();
    
    if (date <= now) {
      throw new Error('Date must be in the future');
    }
    return true;
  },

  // Business hours validation
  businessHours: (value: string) => {
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(value)) {
      throw new Error('Time must be in HH:MM format (24-hour)');
    }
    return true;
  },

  // ZIP code validation (US format)
  zipCode: (value: string) => {
    const zipRegex = /^\d{5}(-\d{4})?$/;
    if (!zipRegex.test(value)) {
      throw new Error('ZIP code must be in format 12345 or 12345-6789');
    }
    return true;
  },

  // SQL injection prevention
  noSQLInjection: (value: string) => {
    const sqlPatterns = [
      /(\b(ALTER|CREATE|DELETE|DROP|EXEC(UTE)?|INSERT( +INTO)?|MERGE|SELECT|UPDATE|UNION( +ALL)?)\b)/i,
      /(\'|(\'\')|(\'\|)|(\;)|(--)|(\|)|(\/\*))/i,
      /(\b(AND|OR)\b.*(=|>|<|!=|<>|<=|>=))/i,
    ];
    
    if (sqlPatterns.some(pattern => pattern.test(value))) {
      throw new Error('Invalid input detected');
    }
    return true;
  },

  // XSS prevention
  noXSS: (value: string) => {
    const xssPatterns = [
      /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
      /javascript:/gi,
      /on\w+\s*=/gi,
      /<iframe/gi,
      /<object/gi,
      /<embed/gi,
    ];
    
    if (xssPatterns.some(pattern => pattern.test(value))) {
      throw new Error('Invalid content detected');
    }
    return true;
  },
};

// Common validation chains
export const validationChains = {
  // User registration
  userRegistration: [
    body('firstName')
      .trim()
      .isLength({ min: 2, max: 50 })
      .withMessage('First name must be between 2 and 50 characters')
      .matches(/^[a-zA-Z\s\-\']+$/)
      .withMessage('First name can only contain letters, spaces, hyphens, and apostrophes')
      .custom(customValidators.noXSS),
    
    body('lastName')
      .trim()
      .isLength({ min: 2, max: 50 })
      .withMessage('Last name must be between 2 and 50 characters')
      .matches(/^[a-zA-Z\s\-\']+$/)
      .withMessage('Last name can only contain letters, spaces, hyphens, and apostrophes')
      .custom(customValidators.noXSS),
    
    body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Please provide a valid email address')
      .isLength({ max: 255 })
      .withMessage('Email address is too long'),
    
    body('password')
      .custom(customValidators.strongPassword),
    
    body('phone')
      .optional()
      .custom(customValidators.phoneNumber),
  ],

  // User login
  userLogin: [
    body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Please provide a valid email address'),
    
    body('password')
      .notEmpty()
      .withMessage('Password is required'),
  ],

  // Restaurant creation
  restaurantCreation: [
    body('name')
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage('Restaurant name must be between 2 and 100 characters')
      .custom(customValidators.noXSS)
      .custom(customValidators.noSQLInjection),
    
    body('description')
      .trim()
      .isLength({ min: 10, max: 1000 })
      .withMessage('Description must be between 10 and 1000 characters')
      .custom(customValidators.noXSS),
    
    body('cuisineType')
      .isIn(['italian', 'mexican', 'chinese', 'indian', 'american', 'french', 'japanese', 'thai', 'mediterranean', 'other'])
      .withMessage('Invalid cuisine type'),
    
    body('priceRange')
      .isIn(['$', '$$', '$$$', '$$$$'])
      .withMessage('Invalid price range'),
    
    body('address')
      .trim()
      .isLength({ min: 5, max: 200 })
      .withMessage('Address must be between 5 and 200 characters')
      .custom(customValidators.noXSS),
    
    body('city')
      .trim()
      .isLength({ min: 2, max: 50 })
      .withMessage('City must be between 2 and 50 characters')
      .custom(customValidators.noXSS),
    
    body('state')
      .trim()
      .isLength({ min: 2, max: 50 })
      .withMessage('State must be between 2 and 50 characters')
      .custom(customValidators.noXSS),
    
    body('zipCode')
      .custom(customValidators.zipCode),
    
    body('phone')
      .custom(customValidators.phoneNumber),
    
    body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Please provide a valid email address'),
    
    body('website')
      .optional()
      .isURL()
      .withMessage('Please provide a valid website URL'),
  ],

  // Reservation creation
  reservationCreation: [
    body('dateTime')
      .isISO8601()
      .withMessage('Date and time must be a valid ISO 8601 datetime')
      .custom(customValidators.futureDate),
    
    body('partySize')
      .isInt({ min: 1, max: 20 })
      .withMessage('Party size must be between 1 and 20'),
    
    body('specialRequests')
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage('Special requests must be less than 500 characters')
      .custom(customValidators.noXSS),
  ],

  // Restaurant hours
  restaurantHours: [
    body('*.openTime')
      .custom(customValidators.businessHours),
    
    body('*.closeTime')
      .custom(customValidators.businessHours),
    
    body('*.dayOfWeek')
      .isIn(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'])
      .withMessage('Invalid day of week'),
    
    body('*.isClosed')
      .isBoolean()
      .withMessage('isClosed must be a boolean'),
  ],

  // Payment information
  paymentInfo: [
    body('amount')
      .isFloat({ min: 0.01 })
      .withMessage('Amount must be a positive number'),
    
    body('currency')
      .isIn(['USD', 'EUR', 'GBP', 'CAD'])
      .withMessage('Invalid currency'),
    
    body('paymentMethodId')
      .isLength({ min: 1 })
      .withMessage('Payment method ID is required'),
  ],

  // Review creation
  reviewCreation: [
    body('overallRating')
      .isInt({ min: 1, max: 5 })
      .withMessage('Overall rating must be between 1 and 5'),
    
    body('foodRating')
      .isInt({ min: 1, max: 5 })
      .withMessage('Food rating must be between 1 and 5'),
    
    body('serviceRating')
      .isInt({ min: 1, max: 5 })
      .withMessage('Service rating must be between 1 and 5'),
    
    body('ambianceRating')
      .isInt({ min: 1, max: 5 })
      .withMessage('Ambiance rating must be between 1 and 5'),
    
    body('comment')
      .optional()
      .trim()
      .isLength({ max: 1000 })
      .withMessage('Comment must be less than 1000 characters')
      .custom(customValidators.noXSS),
    
    body('visitDate')
      .isISO8601()
      .withMessage('Visit date must be a valid date'),
  ],

  // Pagination
  pagination: [
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page must be a positive integer'),
    
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100'),
    
    query('sort')
      .optional()
      .isIn(['name', 'rating', 'price', 'distance', 'created_at'])
      .withMessage('Invalid sort field'),
    
    query('order')
      .optional()
      .isIn(['asc', 'desc'])
      .withMessage('Order must be asc or desc'),
  ],

  // Search and filtering
  restaurantSearch: [
    query('q')
      .optional()
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage('Search query must be between 1 and 100 characters')
      .custom(customValidators.noXSS)
      .custom(customValidators.noSQLInjection),
    
    query('cuisineType')
      .optional()
      .isIn(['italian', 'mexican', 'chinese', 'indian', 'american', 'french', 'japanese', 'thai', 'mediterranean', 'other'])
      .withMessage('Invalid cuisine type'),
    
    query('priceRange')
      .optional()
      .isIn(['$', '$$', '$$$', '$$$$'])
      .withMessage('Invalid price range'),
    
    query('city')
      .optional()
      .trim()
      .isLength({ max: 50 })
      .withMessage('City name is too long')
      .custom(customValidators.noXSS),
    
    query('minRating')
      .optional()
      .isFloat({ min: 0, max: 5 })
      .withMessage('Minimum rating must be between 0 and 5'),
    
    query('latitude')
      .optional()
      .isFloat({ min: -90, max: 90 })
      .withMessage('Invalid latitude'),
    
    query('longitude')
      .optional()
      .isFloat({ min: -180, max: 180 })
      .withMessage('Invalid longitude'),
    
    query('radius')
      .optional()
      .isFloat({ min: 0.1, max: 100 })
      .withMessage('Radius must be between 0.1 and 100 km'),
  ],

  // UUID parameter validation
  uuidParam: [
    param('id')
      .isUUID()
      .withMessage('Invalid ID format'),
  ],

  // Date range validation
  dateRange: [
    query('startDate')
      .optional()
      .isISO8601()
      .withMessage('Start date must be a valid ISO 8601 date'),
    
    query('endDate')
      .optional()
      .isISO8601()
      .withMessage('End date must be a valid ISO 8601 date')
      .custom((endDate, { req }) => {
        if (req.query?.startDate && endDate <= req.query.startDate) {
          throw new Error('End date must be after start date');
        }
        return true;
      }),
  ],
};

// Validation middleware factory
export const validate = (chains: ValidationChain[]) => {
  return [...chains, handleValidationErrors];
};

export default {
  validate,
  validationChains,
  customValidators,
  handleValidationErrors,
};