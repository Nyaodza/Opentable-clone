import { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';

/**
 * Comprehensive security headers middleware
 * Implements OWASP security best practices
 */

/**
 * Content Security Policy configuration
 * Prevents XSS attacks by controlling resource loading
 */
export const contentSecurityPolicy = helmet.contentSecurityPolicy({
  directives: {
    defaultSrc: ["'self'"],
    scriptSrc: [
      "'self'",
      "'unsafe-inline'", // Required for some frontend frameworks
      "'unsafe-eval'", // Required for development, remove in production
      "https://cdn.jsdelivr.net",
      "https://cdnjs.cloudflare.com",
      "https://www.google-analytics.com",
      "https://www.googletagmanager.com",
    ],
    styleSrc: [
      "'self'",
      "'unsafe-inline'",
      "https://fonts.googleapis.com",
      "https://cdn.jsdelivr.net",
    ],
    fontSrc: [
      "'self'",
      "https://fonts.gstatic.com",
      "data:",
    ],
    imgSrc: [
      "'self'",
      "data:",
      "https:",
      "blob:",
    ],
    connectSrc: [
      "'self'",
      "https://api.stripe.com",
      "https://www.google-analytics.com",
      process.env.BACKEND_URL || "http://localhost:3001",
    ],
    frameSrc: [
      "'self'",
      "https://www.youtube.com",
      "https://player.vimeo.com",
      "https://js.stripe.com",
    ],
    objectSrc: ["'none'"],
    mediaSrc: ["'self'", "https:"],
    workerSrc: ["'self'", "blob:"],
    childSrc: ["'self'", "blob:"],
    formAction: ["'self'"],
    frameAncestors: ["'self'"],
    baseUri: ["'self'"],
    manifestSrc: ["'self'"],
  },
  reportOnly: process.env.NODE_ENV === 'development',
});

/**
 * HTTP Strict Transport Security (HSTS)
 * Forces HTTPS connections
 */
export const strictTransportSecurity = helmet.hsts({
  maxAge: 31536000, // 1 year in seconds
  includeSubDomains: true,
  preload: true,
});

/**
 * X-Frame-Options
 * Prevents clickjacking attacks
 */
export const frameOptions = helmet.frameguard({
  action: 'deny', // or 'sameorigin' if you need to embed in iframes
});

/**
 * X-Content-Type-Options
 * Prevents MIME type sniffing
 */
export const noSniff = helmet.noSniff();

/**
 * X-XSS-Protection
 * Enables browser XSS protection (legacy browsers)
 */
export const xssFilter = helmet.xssFilter();

/**
 * Referrer-Policy
 * Controls referrer information
 */
export const referrerPolicy = helmet.referrerPolicy({
  policy: 'strict-origin-when-cross-origin',
});

/**
 * X-DNS-Prefetch-Control
 * Controls DNS prefetching
 */
export const dnsPrefetchControl = helmet.dnsPrefetchControl({
  allow: false,
});

/**
 * Permissions-Policy (formerly Feature-Policy)
 * Controls browser features and APIs
 */
export const permissionsPolicy = (req: Request, res: Response, next: NextFunction) => {
  res.setHeader(
    'Permissions-Policy',
    [
      'camera=()',
      'microphone=()',
      'geolocation=(self)',
      'payment=(self)',
      'usb=()',
      'magnetometer=()',
      'gyroscope=()',
      'accelerometer=()',
    ].join(', ')
  );
  next();
};

/**
 * X-Powered-By removal
 * Hides technology stack information
 */
export const hidePoweredBy = helmet.hidePoweredBy();

/**
 * X-Download-Options
 * Prevents IE from executing downloads
 */
export const ieNoOpen = helmet.ieNoOpen();

/**
 * Cross-Origin-Embedder-Policy (COEP)
 */
export const crossOriginEmbedderPolicy = (req: Request, res: Response, next: NextFunction) => {
  res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
  next();
};

/**
 * Cross-Origin-Opener-Policy (COOP)
 */
export const crossOriginOpenerPolicy = (req: Request, res: Response, next: NextFunction) => {
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  next();
};

/**
 * Cross-Origin-Resource-Policy (CORP)
 */
export const crossOriginResourcePolicy = helmet.crossOriginResourcePolicy({
  policy: 'cross-origin',
});

/**
 * Additional custom security headers
 */
export const customSecurityHeaders = (req: Request, res: Response, next: NextFunction) => {
  // Prevent caching of sensitive data
  if (req.path.includes('/api/auth') || req.path.includes('/api/admin')) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }

  // Add server identification header (optional)
  res.setHeader('X-Content-Type-Options', 'nosniff');
  
  // Add security contact (optional)
  res.setHeader('X-Security-Contact', process.env.SECURITY_EMAIL || 'security@example.com');

  next();
};

/**
 * Combined security headers middleware
 */
export const applySecurityHeaders = (app: any) => {
  // Apply helmet with default settings
  app.use(helmet());

  // Apply additional security headers
  app.use(contentSecurityPolicy);
  app.use(strictTransportSecurity);
  app.use(frameOptions);
  app.use(noSniff);
  app.use(xssFilter);
  app.use(referrerPolicy);
  app.use(dnsPrefetchControl);
  app.use(permissionsPolicy);
  app.use(hidePoweredBy);
  app.use(ieNoOpen);
  app.use(crossOriginResourcePolicy);
  app.use(customSecurityHeaders);
  
  console.log('✓ Comprehensive security headers applied');
};

/**
 * Security headers for API responses
 */
export const apiSecurityHeaders = (req: Request, res: Response, next: NextFunction) => {
  // JSON content type enforcement
  if (req.path.startsWith('/api/')) {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    
    // Prevent caching of API responses with sensitive data
    if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    }
  }
  
  next();
};

/**
 * CORS security headers
 */
export const corsSecurityHeaders = (req: Request, res: Response, next: NextFunction) => {
  const allowedOrigins = [
    process.env.FRONTEND_URL || 'http://localhost:3000',
    'http://localhost:3000',
    'http://localhost:3001',
  ];

  const origin = req.headers.origin;
  
  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
    res.setHeader(
      'Access-Control-Allow-Headers',
      'Origin, X-Requested-With, Content-Type, Accept, Authorization, X-CSRF-Token'
    );
    res.setHeader('Access-Control-Max-Age', '86400'); // 24 hours
  }

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  next();
};

export default {
  applySecurityHeaders,
  apiSecurityHeaders,
  corsSecurityHeaders,
  contentSecurityPolicy,
  strictTransportSecurity,
  frameOptions,
  noSniff,
  xssFilter,
  referrerPolicy,
  permissionsPolicy,
  customSecurityHeaders,
};
