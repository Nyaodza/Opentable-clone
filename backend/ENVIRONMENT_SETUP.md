# 🔧 Environment Setup Guide

## Required Environment Variables

Create a `.env` file in the backend directory with the following variables:

### Database Configuration
```env
# PostgreSQL Database
DB_NAME=opentable_clone
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=your_password_here

# Connection Pool Settings
DB_POOL_MAX=20
DB_POOL_MIN=5
DB_POOL_ACQUIRE=60000
DB_POOL_IDLE=10000
```

### Authentication & Security
```env
# JWT Configuration
JWT_SECRET=your_super_secret_jwt_key_here_minimum_32_characters
JWT_REFRESH_SECRET=your_refresh_secret_here

# Session Configuration
SESSION_SECRET=your_session_secret_here
```

### External API Keys (Required for Disruptive Features)
```env
# OpenAI API (for AI Concierge)
OPENAI_API_KEY=your_openai_api_key_here

# Blockchain Configuration
POLYGON_RPC_URL=https://polygon-rpc.com
ETHEREUM_RPC_URL=https://mainnet.infura.io/v3/your_project_id
LOYALTY_CONTRACT_ADDRESS=0x1234567890123456789012345678901234567890

# Voice/IoT Integration
ALEXA_SKILL_ID=your_alexa_skill_id
GOOGLE_PROJECT_ID=your_google_project_id
GOOGLE_PRIVATE_KEY=your_google_private_key
```

### Payment Processing
```env
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
```

### Email Services
```env
# SMTP Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASSWORD=your_app_password
```

### Redis Configuration
```env
# Redis for Caching and Sessions
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password
```

### File Storage (AWS S3)
```env
# AWS S3 Configuration
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
S3_BUCKET_NAME=opentable-clone-uploads
AWS_REGION=us-east-1
```

### Development/Production Settings
```env
# Environment
NODE_ENV=development
PORT=3001

# CORS Configuration
FRONTEND_URL=http://localhost:3000

# Logging
LOG_LEVEL=debug
```

## Quick Setup Commands

### 1. Install Dependencies
```bash
cd backend
npm install
```

### 2. Setup Database
```bash
# Create PostgreSQL database
createdb opentable_clone

# Run database migrations
npm run db:migrate

# Seed with sample data
npm run db:seed
```

### 3. Setup Redis (Optional but recommended)
```bash
# Install Redis
brew install redis  # macOS
sudo apt-get install redis-server  # Ubuntu

# Start Redis
redis-server
```

### 4. Start Development Server
```bash
npm run dev
```

## Testing Disruptive Features

Once the server is running, you can test the disruptive features:

### Blockchain Loyalty
```bash
curl http://localhost:3001/api/disruptive/blockchain/loyalty/leaderboard
```

### Virtual Experiences
```bash
curl http://localhost:3001/api/disruptive/virtual-experiences
```

### Health Check
```bash
curl http://localhost:3001/api/disruptive/health
```

## Minimal Configuration for Development

If you want to test without external APIs, use these minimal settings:

```env
# Minimal .env for development
NODE_ENV=development
PORT=3001
DB_NAME=opentable_clone
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=password
JWT_SECRET=minimum_32_character_secret_key_for_development_only
FRONTEND_URL=http://localhost:3000
```

This will allow the server to start and basic features to work, even without external API keys.
