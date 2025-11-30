import { Application } from 'express';
import { 
  generalLimiter,
  authLimiter,
  apiLimiter,
  adminLimiter,
  securityHeaders,
  corsOptions,
  sanitizeInput,
  securityLogger,
  ipWhitelist,
  fileUploadSecurity,
} from '../middleware/security.middleware';
import { errorHandler, notFound, gracefulShutdown } from '../middleware/error.middleware';

// Security configuration interface
export interface SecurityConfig {
  rateLimiting: {
    enabled: boolean;
    windowMs: number;
    maxRequests: number;
    authMaxRequests: number;
    adminMaxRequests: number;
  };
  cors: {
    enabled: boolean;
    allowedOrigins: string[];
    credentials: boolean;
  };
  helmet: {
    enabled: boolean;
    contentSecurityPolicy: boolean;
    hsts: boolean;
  };
  ipWhitelisting: {
    enabled: boolean;
    adminIPs: string[];
  };
  fileUpload: {
    enabled: boolean;
    maxFileSize: number;
    maxFiles: number;
    allowedMimeTypes: string[];
  };
  audit: {
    enabled: boolean;
    logFailedAttempts: boolean;
    logSuspiciousActivity: boolean;
  };
  encryption: {
    bcryptRounds: number;
    jwtExpiry: string;
    refreshTokenExpiry: string;
  };
}

// Default security configuration
export const defaultSecurityConfig: SecurityConfig = {
  rateLimiting: {
    enabled: true,
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 100,
    authMaxRequests: 5,
    adminMaxRequests: 200,
  },
  cors: {
    enabled: true,
    allowedOrigins: [
      process.env.FRONTEND_URL || 'http://localhost:3000',
      'http://localhost:3000',
      'http://localhost:3001',
    ],
    credentials: true,
  },
  helmet: {
    enabled: true,
    contentSecurityPolicy: true,
    hsts: true,
  },
  ipWhitelisting: {
    enabled: process.env.NODE_ENV === 'production',
    adminIPs: (process.env.ADMIN_IPS || '').split(',').filter(Boolean),
  },
  fileUpload: {
    enabled: true,
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '5242880'), // 5MB
    maxFiles: parseInt(process.env.MAX_FILES_PER_REQUEST || '10'),
    allowedMimeTypes: [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/webp',
      'application/pdf',
    ],
  },
  audit: {
    enabled: true,
    logFailedAttempts: true,
    logSuspiciousActivity: true,
  },
  encryption: {
    bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS || '12'),
    jwtExpiry: process.env.JWT_EXPIRES_IN || '7d',
    refreshTokenExpiry: process.env.REFRESH_TOKEN_EXPIRES_IN || '30d',
  },
};

// Apply security middleware to Express app
export const applySecurity = (app: Application, config: SecurityConfig = defaultSecurityConfig) => {
  console.log('Applying security middleware...');

  // Trust proxy (important for rate limiting and IP detection)
  app.set('trust proxy', 1);

  // Security headers
  if (config.helmet.enabled) {
    app.use(securityHeaders);
    console.log('✓ Security headers enabled');
  }

  // CORS configuration
  if (config.cors.enabled) {
    app.use(corsOptions);
    console.log('✓ CORS enabled with allowed origins:', config.cors.allowedOrigins);
  }

  // Input sanitization
  app.use(sanitizeInput);
  console.log('✓ Input sanitization enabled');

  // Security logging
  if (config.audit.logSuspiciousActivity) {
    app.use(securityLogger);
    console.log('✓ Security logging enabled');
  }

  // Rate limiting
  if (config.rateLimiting.enabled) {
    // General rate limiting
    app.use('/api', generalLimiter);
    console.log('✓ General rate limiting enabled');

    // Auth rate limiting
    app.use('/api/auth', authLimiter);
    console.log('✓ Auth rate limiting enabled');

    // Admin rate limiting with IP whitelisting
    if (config.ipWhitelisting.enabled && config.ipWhitelisting.adminIPs.length > 0) {
      app.use('/api/admin', ipWhitelist(config.ipWhitelisting.adminIPs));
      console.log('✓ Admin IP whitelisting enabled');
    }
    app.use('/api/admin', adminLimiter);
    console.log('✓ Admin rate limiting enabled');
  }

  // File upload security
  if (config.fileUpload.enabled) {
    app.use('/api/upload', fileUploadSecurity);
    console.log('✓ File upload security enabled');
  }

  console.log('Security middleware configuration complete');
};

// Apply error handling
export const applyErrorHandling = (app: Application) => {
  console.log('Applying error handling middleware...');

  // 404 handler
  app.use(notFound);

  // Global error handler
  app.use(errorHandler);

  console.log('✓ Error handling middleware enabled');
};

// Security monitoring and alerting
export class SecurityMonitor {
  private static instance: SecurityMonitor;
  private suspiciousActivityThreshold = 5;
  private monitoringInterval = 60000; // 1 minute
  private isMonitoring = false;

  private constructor() {}

  static getInstance(): SecurityMonitor {
    if (!SecurityMonitor.instance) {
      SecurityMonitor.instance = new SecurityMonitor();
    }
    return SecurityMonitor.instance;
  }

  startMonitoring() {
    if (this.isMonitoring) return;

    this.isMonitoring = true;
    console.log('Starting security monitoring...');

    setInterval(async () => {
      await this.checkSuspiciousActivity();
      await this.checkFailedLogins();
      await this.checkSystemHealth();
    }, this.monitoringInterval);
  }

  stopMonitoring() {
    this.isMonitoring = false;
    console.log('Security monitoring stopped');
  }

  private async checkSuspiciousActivity() {
    try {
      // This would integrate with your audit log system
      // For now, we'll use a placeholder implementation
      const suspiciousIPs = await this.getSuspiciousIPs();
      
      if (suspiciousIPs.length > 0) {
        console.warn('Suspicious activity detected from IPs:', suspiciousIPs);
        await this.alertSecurityTeam('Suspicious activity detected', { ips: suspiciousIPs });
      }
    } catch (error) {
      console.error('Error checking suspicious activity:', error);
    }
  }

  private async checkFailedLogins() {
    try {
      // Check for excessive failed login attempts
      const failedAttempts = await this.getRecentFailedLogins();
      
      if (failedAttempts > this.suspiciousActivityThreshold) {
        console.warn('Excessive failed login attempts detected:', failedAttempts);
        await this.alertSecurityTeam('Excessive failed logins', { count: failedAttempts });
      }
    } catch (error) {
      console.error('Error checking failed logins:', error);
    }
  }

  private async checkSystemHealth() {
    try {
      // Basic system health checks
      const memoryUsage = process.memoryUsage();
      const uptime = process.uptime();
      
      // Alert if memory usage is too high
      if (memoryUsage.heapUsed / memoryUsage.heapTotal > 0.9) {
        console.warn('High memory usage detected:', memoryUsage);
        await this.alertSecurityTeam('High memory usage', { memoryUsage });
      }

      // Log system stats periodically
      if (uptime % 3600 < 60) { // Every hour
        console.log('System health:', { memoryUsage, uptime });
      }
    } catch (error) {
      console.error('Error checking system health:', error);
    }
  }

  private async getSuspiciousIPs(): Promise<string[]> {
    // Placeholder implementation
    // In a real system, this would query the audit log database
    return [];
  }

  private async getRecentFailedLogins(): Promise<number> {
    // Placeholder implementation
    // In a real system, this would query the audit log database
    return 0;
  }

  private async alertSecurityTeam(message: string, data: any) {
    // Placeholder implementation
    // In a real system, this would send alerts via email, Slack, SMS, etc.
    console.warn('SECURITY ALERT:', message, data);
    
    // Example integrations:
    // - Send email to security team
    // - Post to Slack channel
    // - Create incident in monitoring system
    // - Log to external security service
  }
}

// Environment-specific security configurations
export const getSecurityConfigForEnvironment = (env: string): SecurityConfig => {
  const baseConfig = { ...defaultSecurityConfig };

  switch (env) {
    case 'development':
      return {
        ...baseConfig,
        rateLimiting: {
          ...baseConfig.rateLimiting,
          maxRequests: 1000, // More lenient for development
        },
        ipWhitelisting: {
          ...baseConfig.ipWhitelisting,
          enabled: false, // Disabled for development
        },
        audit: {
          ...baseConfig.audit,
          logSuspiciousActivity: false, // Less logging for development
        },
      };

    case 'staging':
      return {
        ...baseConfig,
        rateLimiting: {
          ...baseConfig.rateLimiting,
          maxRequests: 500, // Moderate limits for staging
        },
      };

    case 'production':
      return {
        ...baseConfig,
        rateLimiting: {
          ...baseConfig.rateLimiting,
          enabled: true,
        },
        ipWhitelisting: {
          ...baseConfig.ipWhitelisting,
          enabled: true,
        },
        audit: {
          ...baseConfig.audit,
          enabled: true,
          logFailedAttempts: true,
          logSuspiciousActivity: true,
        },
      };

    default:
      return baseConfig;
  }
};

export default {
  applySecurity,
  applyErrorHandling,
  SecurityMonitor,
  defaultSecurityConfig,
  getSecurityConfigForEnvironment,
};