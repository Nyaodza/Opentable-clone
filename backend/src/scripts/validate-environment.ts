/**
 * Environment Validation Script
 * Validates all required environment variables before application startup
 * Run this with: npm run validate:env
 */

import { z } from 'zod';
import * as dotenv from 'dotenv';
import { exit } from 'process';

// Load environment variables
dotenv.config();

// Define validation schema
const envSchema = z.object({
  // Application
  NODE_ENV: z.enum(['development', 'staging', 'production']),
  PORT: z.string().regex(/^\d+$/, 'PORT must be a number'),
  
  // Database
  DATABASE_URL: z.string().url('DATABASE_URL must be a valid PostgreSQL connection string'),
  DB_HOST: z.string().min(1, 'DB_HOST is required'),
  DB_PORT: z.string().regex(/^\d+$/),
  DB_NAME: z.string().min(1),
  DB_USER: z.string().min(1),
  DB_PASSWORD: z.string().min(8, 'DB_PASSWORD must be at least 8 characters'),
  
  // Redis
  REDIS_URL: z.string().url('REDIS_URL must be a valid Redis connection string'),
  REDIS_HOST: z.string().min(1),
  REDIS_PORT: z.string().regex(/^\d+$/),
  
  // Security
  JWT_SECRET: z.string().min(64, 'JWT_SECRET must be at least 64 characters for security'),
  JWT_REFRESH_SECRET: z.string().min(64, 'JWT_REFRESH_SECRET must be at least 64 characters'),
  SESSION_SECRET: z.string().min(48, 'SESSION_SECRET must be at least 48 characters'),
  ENCRYPTION_KEY: z.string().length(32, 'ENCRYPTION_KEY must be exactly 32 characters'),
  
  // Email (required in production)
  SENDGRID_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().email().optional(),
  
  // SMS (optional but recommended)
  TWILIO_ACCOUNT_SID: z.string().optional(),
  TWILIO_AUTH_TOKEN: z.string().optional(),
  TWILIO_PHONE_NUMBER: z.string().optional(),
  
  // Payments (required for reservations with deposits)
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_PUBLISHABLE_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  
  // File Storage
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),
  AWS_REGION: z.string().optional(),
  AWS_S3_BUCKET: z.string().optional(),
  
  // Optional Advanced Features
  OPENAI_API_KEY: z.string().optional(),
  POLYGON_RPC_URL: z.string().url().optional(),
  SENTRY_DSN: z.string().url().optional(),
});

// Conditional validation based on environment
const productionRequiredFields = [
  'SENDGRID_API_KEY',
  'EMAIL_FROM',
  'STRIPE_SECRET_KEY',
  'STRIPE_PUBLISHABLE_KEY',
  'AWS_ACCESS_KEY_ID',
  'AWS_SECRET_ACCESS_KEY',
  'SENTRY_DSN',
];

const recommendedFields = [
  'TWILIO_ACCOUNT_SID',
  'TWILIO_AUTH_TOKEN',
  'OPENAI_API_KEY',
];

// Color output helpers
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

function log(message: string, color: keyof typeof colors = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function validateEnvironment() {
  log('\n🔍 Validating Environment Configuration...\n', 'bright');
  
  const errors: string[] = [];
  const warnings: string[] = [];
  const info: string[] = [];
  
  try {
    // Parse and validate
    const result = envSchema.safeParse(process.env);
    
    if (!result.success) {
      log('❌ Environment Validation Failed!\n', 'red');
      
      result.error.issues.forEach((issue) => {
        const field = issue.path.join('.');
        const message = issue.message;
        errors.push(`  • ${field}: ${message}`);
      });
      
      log('ERRORS:', 'red');
      errors.forEach(err => log(err, 'red'));
      
      log('\n💡 Fix these errors in your .env file before starting the application.\n', 'yellow');
      exit(1);
    }
    
    // Additional production checks
    if (process.env.NODE_ENV === 'production') {
      log('🔐 Running Production Environment Checks...\n', 'blue');
      
      productionRequiredFields.forEach((field) => {
        if (!process.env[field]) {
          errors.push(`  • ${field}: Required in production but not set`);
        }
      });
      
      // Check for placeholder values
      const placeholderPatterns = [
        /REPLACE_WITH/,
        /YOUR_/,
        /SECURE_PASSWORD_HERE/,
        /test-secret/,
      ];
      
      Object.entries(process.env).forEach(([key, value]) => {
        if (value && placeholderPatterns.some(pattern => pattern.test(value))) {
          errors.push(`  • ${key}: Contains placeholder value - must be replaced with actual secret`);
        }
      });
      
      if (errors.length > 0) {
        log('❌ Production Environment Issues:\n', 'red');
        errors.forEach(err => log(err, 'red'));
        log('\n', 'reset');
        exit(1);
      }
    }
    
    // Check recommended fields
    recommendedFields.forEach((field) => {
      if (!process.env[field]) {
        warnings.push(`  • ${field}: Not configured (optional but recommended)`);
      }
    });
    
    // Security checks
    if (process.env.JWT_SECRET === process.env.JWT_REFRESH_SECRET) {
      errors.push('  • JWT_SECRET and JWT_REFRESH_SECRET must be different');
    }
    
    if (process.env.NODE_ENV === 'production' && process.env.DB_SSL !== 'true') {
      warnings.push('  • DB_SSL: Should be enabled in production');
    }
    
    // Final report
    if (errors.length > 0) {
      log('❌ VALIDATION FAILED\n', 'red');
      log('ERRORS:', 'red');
      errors.forEach(err => log(err, 'red'));
      log('\n', 'reset');
      exit(1);
    }
    
    if (warnings.length > 0) {
      log('⚠️  WARNINGS:', 'yellow');
      warnings.forEach(warn => log(warn, 'yellow'));
      log('\n', 'reset');
    }
    
    // Success!
    log('✅ Environment Validation Successful!\n', 'green');
    log(`📊 Configuration Summary:`, 'blue');
    log(`  • Environment: ${process.env.NODE_ENV}`, 'blue');
    log(`  • Database: ${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`, 'blue');
    log(`  • Redis: ${process.env.REDIS_HOST}:${process.env.REDIS_PORT}`, 'blue');
    log(`  • API Port: ${process.env.PORT}`, 'blue');
    
    if (process.env.STRIPE_SECRET_KEY) {
      log(`  • Payments: Stripe configured`, 'blue');
    }
    if (process.env.SENDGRID_API_KEY) {
      log(`  • Email: SendGrid configured`, 'blue');
    }
    if (process.env.TWILIO_ACCOUNT_SID) {
      log(`  • SMS: Twilio configured`, 'blue');
    }
    if (process.env.OPENAI_API_KEY) {
      log(`  • AI: OpenAI configured`, 'blue');
    }
    if (process.env.POLYGON_RPC_URL) {
      log(`  • Blockchain: Polygon configured`, 'blue');
    }
    if (process.env.SENTRY_DSN) {
      log(`  • Monitoring: Sentry configured`, 'blue');
    }
    
    log('\n🚀 Ready to start application!\n', 'green');
    exit(0);
    
  } catch (error) {
    log('❌ Unexpected error during validation:', 'red');
    console.error(error);
    exit(1);
  }
}

// Run validation
validateEnvironment();
