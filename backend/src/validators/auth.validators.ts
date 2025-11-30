import * as yup from 'yup';
import { emailSchema, passwordSchema, phoneSchema } from './common.validators';
import { UserRole } from '../models/User';

// Registration validator
export const registerSchema = yup.object({
  firstName: yup.string()
    .min(2, 'First name must be at least 2 characters')
    .max(50, 'First name must be less than 50 characters')
    .required('First name is required'),
  
  lastName: yup.string()
    .min(2, 'Last name must be at least 2 characters')
    .max(50, 'Last name must be less than 50 characters')
    .required('Last name is required'),
  
  email: emailSchema,
  password: passwordSchema,
  phone: phoneSchema.optional(),
  
  role: yup.string()
    .oneOf(Object.values(UserRole), 'Invalid user role')
    .default(UserRole.DINER)
});

// Login validator
export const loginSchema = yup.object({
  email: emailSchema,
  password: yup.string().required('Password is required')
});

// Forgot password validator
export const forgotPasswordSchema = yup.object({
  email: emailSchema
});

// Reset password validator
export const resetPasswordSchema = yup.object({
  token: yup.string().required('Reset token is required'),
  password: passwordSchema
});

// Change password validator
export const changePasswordSchema = yup.object({
  currentPassword: yup.string().required('Current password is required'),
  newPassword: passwordSchema
});

// Update profile validator
export const updateProfileSchema = yup.object({
  firstName: yup.string()
    .min(2, 'First name must be at least 2 characters')
    .max(50, 'First name must be less than 50 characters')
    .optional(),
  
  lastName: yup.string()
    .min(2, 'Last name must be at least 2 characters')
    .max(50, 'Last name must be less than 50 characters')
    .optional(),
  
  phone: phoneSchema.optional(),
  
  preferences: yup.object({
    cuisineTypes: yup.array().of(yup.string()).optional(),
    dietaryRestrictions: yup.array().of(yup.string()).optional(),
    favoriteRestaurants: yup.array().of(yup.string().uuid()).optional()
  }).optional()
});

// Verify email validator
export const verifyEmailSchema = yup.object({
  token: yup.string().required('Verification token is required')
});

// Refresh token validator
export const refreshTokenSchema = yup.object({
  refreshToken: yup.string().required('Refresh token is required')
});