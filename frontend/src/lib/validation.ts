export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export interface ValidationRule<T = any> {
  validate: (value: T) => boolean;
  message: string;
}

export class Validator<T = any> {
  private rules: ValidationRule<T>[] = [];

  constructor(private value: T) {}

  required(message = 'This field is required'): this {
    this.rules.push({
      validate: (value) => {
        if (typeof value === 'string') return value.trim().length > 0;
        if (Array.isArray(value)) return value.length > 0;
        return value !== null && value !== undefined;
      },
      message,
    });
    return this;
  }

  email(message = 'Please enter a valid email address'): this {
    this.rules.push({
      validate: (value) => {
        if (typeof value !== 'string') return false;
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(value);
      },
      message,
    });
    return this;
  }

  minLength(min: number, message?: string): this {
    this.rules.push({
      validate: (value) => {
        if (typeof value !== 'string') return false;
        return value.length >= min;
      },
      message: message || `Must be at least ${min} characters`,
    });
    return this;
  }

  maxLength(max: number, message?: string): this {
    this.rules.push({
      validate: (value) => {
        if (typeof value !== 'string') return false;
        return value.length <= max;
      },
      message: message || `Must be no more than ${max} characters`,
    });
    return this;
  }

  pattern(regex: RegExp, message: string): this {
    this.rules.push({
      validate: (value) => {
        if (typeof value !== 'string') return false;
        return regex.test(value);
      },
      message,
    });
    return this;
  }

  phone(message = 'Please enter a valid phone number'): this {
    this.rules.push({
      validate: (value) => {
        if (typeof value !== 'string') return false;
        const phoneRegex = /^[\+]?[(]?[\d\s\-\(\)]{10,}$/;
        return phoneRegex.test(value.replace(/\s/g, ''));
      },
      message,
    });
    return this;
  }

  url(message = 'Please enter a valid URL'): this {
    this.rules.push({
      validate: (value) => {
        if (typeof value !== 'string') return false;
        try {
          new URL(value);
          return true;
        } catch {
          return false;
        }
      },
      message,
    });
    return this;
  }

  numeric(message = 'Must be a number'): this {
    this.rules.push({
      validate: (value) => {
        return !isNaN(Number(value)) && isFinite(Number(value));
      },
      message,
    });
    return this;
  }

  min(min: number, message?: string): this {
    this.rules.push({
      validate: (value) => {
        const num = Number(value);
        return !isNaN(num) && num >= min;
      },
      message: message || `Must be at least ${min}`,
    });
    return this;
  }

  max(max: number, message?: string): this {
    this.rules.push({
      validate: (value) => {
        const num = Number(value);
        return !isNaN(num) && num <= max;
      },
      message: message || `Must be no more than ${max}`,
    });
    return this;
  }

  matches(other: T, message = 'Values do not match'): this {
    this.rules.push({
      validate: (value) => value === other,
      message,
    });
    return this;
  }

  custom(validate: (value: T) => boolean, message: string): this {
    this.rules.push({ validate, message });
    return this;
  }

  validate(): ValidationResult {
    const errors: string[] = [];

    for (const rule of this.rules) {
      if (!rule.validate(this.value)) {
        errors.push(rule.message);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  static create<T>(value: T): Validator<T> {
    return new Validator(value);
  }
}

// Common validation patterns
export const ValidationPatterns = {
  password: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
  strongPassword: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
  phone: /^[\+]?[(]?[\d\s\-\(\)]{10,}$/,
  creditCard: /^\d{13,19}$/,
  zip: /^\d{5}(-\d{4})?$/,
  name: /^[a-zA-Z\s'-]{2,}$/,
} as const;

// Form validation helper
export function validateForm<T extends Record<string, any>>(
  data: T,
  rules: Record<keyof T, (value: any) => ValidationResult>
): ValidationResult {
  const errors: string[] = [];

  for (const [field, rule] of Object.entries(rules)) {
    const result = rule(data[field]);
    if (!result.isValid) {
      errors.push(...result.errors);
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

// Sanitization helpers
export const sanitize = {
  string: (value: string): string => {
    return value.trim().replace(/[<>]/g, '');
  },
  
  email: (value: string): string => {
    return value.trim().toLowerCase();
  },
  
  phone: (value: string): string => {
    return value.replace(/[^\d\+\(\)\-\s]/g, '');
  },
  
  html: (value: string): string => {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;');
  },
  
  sql: (value: string): string => {
    return value.replace(/['";\\]/g, '');
  },
};

export default Validator;