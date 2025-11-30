import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { body } from 'express-validator';
import {
  authenticate,
  authRateLimiter,
  generalRateLimiter
} from '../middleware/auth.middleware';

const router = Router();

// Validation rules
const registerValidation = [
  body('firstName')
    .trim()
    .notEmpty().withMessage('First name is required')
    .isLength({ min: 2, max: 50 }).withMessage('First name must be between 2 and 50 characters'),
  body('lastName')
    .trim()
    .notEmpty().withMessage('Last name is required')
    .isLength({ min: 2, max: 50 }).withMessage('Last name must be between 2 and 50 characters'),
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Invalid email format')
    .normalizeEmail(),
  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must contain uppercase, lowercase, number, and special character'),
  body('phoneNumber')
    .optional()
    .isMobilePhone('any').withMessage('Invalid phone number')
];

const loginValidation = [
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Invalid email format')
    .normalizeEmail(),
  body('password')
    .notEmpty().withMessage('Password is required'),
  body('rememberMe')
    .optional()
    .isBoolean().withMessage('Remember me must be a boolean')
];

const emailValidation = [
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Invalid email format')
    .normalizeEmail()
];

const passwordResetValidation = [
  body('token')
    .trim()
    .notEmpty().withMessage('Reset token is required'),
  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must contain uppercase, lowercase, number, and special character')
];

const changePasswordValidation = [
  body('currentPassword')
    .notEmpty().withMessage('Current password is required'),
  body('newPassword')
    .notEmpty().withMessage('New password is required')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must contain uppercase, lowercase, number, and special character')
    .custom((value, { req }) => value !== req.body.currentPassword)
    .withMessage('New password must be different from current password')
];

// Public routes (with rate limiting)
router.post('/register', authRateLimiter, registerValidation, AuthController.register);
router.post('/login', authRateLimiter, loginValidation, AuthController.login);
router.post('/google', authRateLimiter, AuthController.googleLogin);
router.post('/facebook', authRateLimiter, AuthController.facebookLogin);
router.post('/refresh', generalRateLimiter, AuthController.refreshToken);
router.post('/forgot-password', authRateLimiter, emailValidation, AuthController.forgotPassword);
router.post('/reset-password', authRateLimiter, passwordResetValidation, AuthController.resetPassword);
router.get('/verify-email', generalRateLimiter, AuthController.verifyEmail);

// Protected routes (require authentication)
router.use(authenticate); // All routes below require authentication

router.post('/logout', AuthController.logout);
router.get('/me', AuthController.getCurrentUser);
router.put('/profile', AuthController.updateProfile);
router.post('/change-password', changePasswordValidation, AuthController.changePassword);
router.post('/resend-verification', authRateLimiter, AuthController.resendVerification);

// Two-factor authentication
router.post('/2fa/enable', AuthController.enableTwoFactor);
router.post('/2fa/verify', AuthController.verifyTwoFactor);

// Account deletion
router.delete('/account', AuthController.deleteAccount);

export default router;