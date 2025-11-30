import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import session from 'express-session';
import rateLimit from 'express-rate-limit';
import { config } from './config/environment';
import { logger } from './utils/logger';
import { initializePassport } from './config/passport';
import authRoutes from './routes/auth';

const app = express();

// Security middleware
app.use(helmet());
app.use(cors({
  origin: config.cors.origins,
  credentials: true,
}));

// Request parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(compression());

// Session configuration
app.use(session({
  secret: config.session.secret,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: config.nodeEnv === 'production',
    httpOnly: true,
    maxAge: config.session.maxAge,
  },
}));

// Logging
app.use(morgan('combined', {
  stream: {
    write: (message) => logger.info(message.trim()),
  },
}));

// Rate limiting
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per window
  message: 'Too many authentication attempts, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

// Initialize Passport
initializePassport().then((passport) => {
  app.use(passport.initialize());
  app.use(passport.session());
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'auth-service' });
});

// API routes
app.use('/auth', authLimiter, authRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    service: 'TravelSphere Auth Service',
    version: '1.0.0',
    endpoints: {
      auth: {
        google: 'GET /auth/google',
        callback: 'GET /auth/google/callback',
        refresh: 'POST /auth/refresh',
        me: 'GET /auth/me',
        logout: 'POST /auth/logout',
        logoutAll: 'POST /auth/logout-all',
      },
      admin: {
        users: 'GET /auth/users',
        updateRole: 'PUT /auth/users/:userId/role',
        deleteUser: 'DELETE /auth/users/:userId',
      },
    },
  });
});

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: config.nodeEnv === 'development' ? err.message : undefined,
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Start server
const PORT = config.port;
app.listen(PORT, () => {
  logger.info(`Auth service running on port ${PORT}`);
  logger.info(`Environment: ${config.nodeEnv}`);
  logger.info(`Google OAuth callback: ${config.google.callbackUrl}`);
});