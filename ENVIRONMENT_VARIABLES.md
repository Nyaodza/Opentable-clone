# Environment Variables Documentation

This document describes all environment variables needed to run the OpenTable Clone application.

## Frontend (.env.local)

Create a `.env.local` file in the `/frontend` directory with the following variables:

```bash
# ===========================================
# API Configuration
# ===========================================
# Backend API URL
NEXT_PUBLIC_API_URL=http://localhost:3001

# Site URL for SEO and sitemaps
NEXT_PUBLIC_SITE_URL=http://localhost:3000
SITE_URL=http://localhost:3000

# ===========================================
# Authentication (NextAuth.js)
# ===========================================
# Generate with: openssl rand -base64 32
NEXTAUTH_SECRET=your-secret-key-here
NEXTAUTH_URL=http://localhost:3000

# ===========================================
# Third-Party Services
# ===========================================
# Stripe (for payments)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_key_here

# Mapbox (for maps)
NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN=your-mapbox-token-here

# Sentry (for error monitoring)
NEXT_PUBLIC_SENTRY_DSN=your-sentry-dsn-here
SENTRY_AUTH_TOKEN=your-sentry-auth-token

# ===========================================
# Analytics
# ===========================================
# Google Analytics
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX

# ===========================================
# Feature Flags
# ===========================================
NEXT_PUBLIC_ENABLE_PWA=true
NEXT_PUBLIC_ENABLE_ANALYTICS=true
NEXT_PUBLIC_ENABLE_ERROR_REPORTING=true

# ===========================================
# Build Configuration
# ===========================================
# Set to 'true' to enable bundle analyzer
ANALYZE=false
```

## Backend (.env)

Create a `.env` file in the `/backend` directory with the following variables:

```bash
# ===========================================
# Server Configuration
# ===========================================
NODE_ENV=development
PORT=3001

# ===========================================
# Database Configuration
# ===========================================
# PostgreSQL connection
DB_HOST=localhost
DB_PORT=5432
DB_NAME=opentable_clone
DB_USER=postgres
DB_PASSWORD=your-database-password
DATABASE_URL=postgresql://postgres:your-password@localhost:5432/opentable_clone

# ===========================================
# Redis Configuration
# ===========================================
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_URL=redis://localhost:6379

# ===========================================
# Authentication
# ===========================================
# JWT Secret - Generate with: openssl rand -base64 64
JWT_SECRET=your-jwt-secret-key-here-minimum-32-characters
JWT_EXPIRES_IN=7d
JWT_REFRESH_SECRET=your-refresh-secret-key-here
JWT_REFRESH_EXPIRES_IN=30d

# ===========================================
# Email Configuration (Nodemailer)
# ===========================================
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_FROM=noreply@opentableclone.com

# ===========================================
# Payment Processing (Stripe)
# ===========================================
STRIPE_SECRET_KEY=sk_test_your_key_here
STRIPE_PUBLISHABLE_KEY=pk_test_your_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret

# ===========================================
# File Storage (AWS S3)
# ===========================================
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
AWS_REGION=us-east-1
AWS_S3_BUCKET=opentable-clone-uploads

# ===========================================
# Push Notifications (Firebase)
# ===========================================
FIREBASE_PROJECT_ID=your-firebase-project-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour Key Here\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk@your-project.iam.gserviceaccount.com

# ===========================================
# SMS Notifications (Twilio)
# ===========================================
TWILIO_ACCOUNT_SID=your-twilio-account-sid
TWILIO_AUTH_TOKEN=your-twilio-auth-token
TWILIO_PHONE_NUMBER=+1234567890
ENABLE_SMS_REMINDERS=false

# ===========================================
# OAuth Providers
# ===========================================
# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Apple Sign-In
APPLE_CLIENT_ID=your-apple-client-id
APPLE_TEAM_ID=your-apple-team-id
APPLE_KEY_ID=your-apple-key-id
APPLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour Key Here\n-----END PRIVATE KEY-----"

# ===========================================
# Blockchain (Ethereum/Polygon)
# ===========================================
BLOCKCHAIN_NETWORK=polygon
BLOCKCHAIN_RPC_URL=https://polygon-rpc.com
BLOCKCHAIN_PRIVATE_KEY=your-wallet-private-key
LOYALTY_CONTRACT_ADDRESS=0x...

# ===========================================
# AI/ML Services
# ===========================================
OPENAI_API_KEY=your-openai-api-key

# ===========================================
# Monitoring & Logging
# ===========================================
LOG_LEVEL=info
SENTRY_DSN=your-sentry-dsn

# ===========================================
# Rate Limiting
# ===========================================
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# ===========================================
# CORS Configuration
# ===========================================
CORS_ORIGIN=http://localhost:3000
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001

# ===========================================
# Feature Flags
# ===========================================
ENABLE_GRAPHQL=true
ENABLE_WEBSOCKETS=true
ENABLE_CRON_JOBS=true
```

## Quick Setup

### Development

1. Copy the frontend environment variables to `frontend/.env.local`
2. Copy the backend environment variables to `backend/.env`
3. Update the values with your actual credentials
4. Start the development servers:
   ```bash
   # Terminal 1 - Backend
   cd backend && npm run dev
   
   # Terminal 2 - Frontend
   cd frontend && npm run dev
   ```

### Production

For production deployment, set these environment variables in your hosting platform (Vercel, AWS, etc.).

**Critical for Production:**
- Use strong, unique values for `JWT_SECRET` and `NEXTAUTH_SECRET`
- Enable HTTPS and update URLs accordingly
- Use production API keys for Stripe, Twilio, etc.
- Configure proper CORS origins


