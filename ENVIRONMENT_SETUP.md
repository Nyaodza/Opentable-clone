# 🔐 Environment Configuration Guide

## Overview

This guide explains how to properly configure environment variables for the OpenTable Clone platform across all environments (development, staging, production).

## 🚨 Security First Principles

1. **NEVER** commit `.env` files with real secrets to version control
2. **ALWAYS** use `.env.example` files as templates
3. **STORE** production secrets in a secrets management service
4. **ROTATE** secrets regularly (minimum every 90 days)
5. **AUDIT** secret access and usage

## 📋 Environment Setup Steps

### Step 1: Copy Template Files

```bash
# Root directory
cp .env.production.example .env.production

# Backend
cd backend
cp .env.example .env

# Frontend  
cd ../frontend
cp .env.example .env
```

### Step 2: Generate Secure Secrets

#### JWT Secrets (64+ characters recommended)
```bash
# Generate JWT secret
openssl rand -base64 64

# Generate refresh token secret (use different value)
openssl rand -base64 64
```

#### Session Secret
```bash
openssl rand -base64 48
```

#### Encryption Key (32 characters for AES-256)
```bash
openssl rand -hex 32
```

### Step 3: Required Third-Party Services

Before deploying to production, you need accounts and API keys for:

#### Essential Services
- [ ] **Database**: PostgreSQL 14+ (AWS RDS, Google Cloud SQL, or Supabase)
- [ ] **Cache**: Redis 6+ (AWS ElastiCache, Redis Cloud)
- [ ] **Email**: SendGrid, AWS SES, or Mailgun
- [ ] **SMS**: Twilio
- [ ] **Payments**: Stripe

#### Optional but Recommended
- [ ] **File Storage**: AWS S3 or Cloudflare R2
- [ ] **CDN**: Cloudflare or AWS CloudFront
- [ ] **Error Tracking**: Sentry
- [ ] **Analytics**: Google Analytics 4, Mixpanel
- [ ] **Monitoring**: Datadog, New Relic, or Prometheus/Grafana

#### Advanced Features
- [ ] **Blockchain**: Infura or Alchemy (Polygon RPC)
- [ ] **AI**: OpenAI API (for AI Concierge)
- [ ] **Voice**: Amazon Alexa Developer Account, Google Actions
- [ ] **OAuth**: Google Cloud Console, Facebook Developers, Apple Developer

## 🔑 Secret Management Best Practices

### Development Environment
```bash
# Use .env.local for local overrides
echo ".env.local" >> .gitignore
```

### Staging/Production Environments

**Option 1: AWS Secrets Manager**
```typescript
// Example: Load secrets at runtime
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';

async function getSecret(secretName: string) {
  const client = new SecretsManagerClient({ region: 'us-east-1' });
  const response = await client.send(
    new GetSecretValueCommand({ SecretId: secretName })
  );
  return JSON.parse(response.SecretString);
}
```

**Option 2: HashiCorp Vault**
```bash
# Install Vault CLI
vault kv get secret/opentable/production
```

**Option 3: Environment Variables via CI/CD**
- GitHub Secrets
- GitLab CI/CD Variables
- Vercel Environment Variables

## 📝 Environment Variable Checklist

### ✅ Required for Startup
```bash
# Core
NODE_ENV=production
PORT=3001
DATABASE_URL=postgresql://...
REDIS_URL=redis://...

# Security
JWT_SECRET=...
SESSION_SECRET=...
```

### ⚠️ Required for Full Functionality

#### Payment Processing
```bash
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

#### Email/SMS
```bash
SENDGRID_API_KEY=SG...
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
```

#### File Uploads
```bash
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_S3_BUCKET=...
```

### 🚀 Optional Advanced Features

#### Blockchain Loyalty
```bash
POLYGON_RPC_URL=https://polygon-mainnet.infura.io/v3/...
LOYALTY_TOKEN_CONTRACT=0x...
BLOCKCHAIN_WALLET_PRIVATE_KEY=... # Use AWS KMS in production!
```

#### AI Concierge
```bash
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4
```

#### VR Experiences
```bash
ENABLE_VR_EXPERIENCES=true
# WebRTC configuration needed
```

#### Voice/IoT
```bash
ALEXA_SKILL_ID=amzn1.ask.skill...
GOOGLE_ACTION_PROJECT_ID=...
```

## 🔍 Environment Validation

### Startup Validation Script

Create `scripts/validate-env.ts`:

```typescript
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'staging', 'production']),
  PORT: z.string().regex(/^\d+$/),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),
  JWT_SECRET: z.string().min(64),
  SESSION_SECRET: z.string().min(48),
  // Add all required vars
});

try {
  envSchema.parse(process.env);
  console.log('✅ Environment validation successful');
} catch (error) {
  console.error('❌ Environment validation failed:', error);
  process.exit(1);
}
```

### Run validation on startup
```json
{
  "scripts": {
    "start": "npm run validate:env && node dist/server.js",
    "validate:env": "ts-node scripts/validate-env.ts"
  }
}
```

## 🏢 Multi-Environment Strategy

### Environment Hierarchy
```
.env.example          # Template (committed)
.env                  # Development defaults (committed, no secrets)
.env.local            # Developer overrides (NOT committed)
.env.development      # Development secrets (NOT committed)
.env.staging          # Staging secrets (NOT committed)
.env.production       # Production secrets (NOT committed)
```

### Loading Priority (highest to lowest)
1. `.env.production` (if NODE_ENV=production)
2. `.env.local`
3. `.env`
4. `.env.example`

## 🔄 Secret Rotation Procedure

### Every 90 Days
1. Generate new secrets
2. Update secrets in management system
3. Deploy updated configuration
4. Verify all services work
5. Deprecate old secrets (keep for 7 days)
6. Delete old secrets

### Emergency Rotation (Breach)
1. Immediately revoke compromised secrets
2. Generate new secrets
3. Emergency deployment
4. Audit access logs
5. Post-mortem analysis

## 🧪 Testing Environments

### Local Development
```bash
DATABASE_URL=postgresql://localhost:5432/opentable_dev
REDIS_URL=redis://localhost:6379
STRIPE_SECRET_KEY=sk_test_... # Use test keys!
```

### CI/CD Testing
```bash
DATABASE_URL=postgresql://test_db:5432/opentable_test
REDIS_URL=redis://test_redis:6379
# Use mock services or test API keys
```

### Staging
- Use separate database/Redis instances
- Use Stripe test mode
- Mirror production configuration
- Use real (but limited) third-party services

## 📊 Monitoring Secret Usage

### Track Secret Access
```typescript
// Log when secrets are accessed (not the values!)
console.log('[SECRET_ACCESS]', {
  key: 'STRIPE_SECRET_KEY',
  timestamp: new Date(),
  service: 'payment-processor',
  // NEVER log actual secret value
});
```

### Alerts
- Failed authentication attempts
- Unusual secret access patterns
- API rate limit errors (may indicate leaked keys)

## 🆘 Emergency Contacts

### Security Issues
- Email: security@yourdomain.com
- On-call: [PagerDuty/OpsGenie]

### Secret Compromise Response
1. Immediately revoke compromised credentials
2. Contact security team
3. Review access logs
4. Generate new secrets
5. Emergency deployment
6. Document incident

## 📚 Additional Resources

- [AWS Secrets Manager Documentation](https://docs.aws.amazon.com/secretsmanager/)
- [HashiCorp Vault Best Practices](https://www.vaultproject.io/docs/best-practices)
- [OWASP Secret Management Cheat Sheet](https://cheatsheetseries.owasp.org/)
- [Stripe API Keys Best Practices](https://stripe.com/docs/keys)

## ✅ Pre-Deployment Checklist

- [ ] All required environment variables configured
- [ ] Secrets stored in management system (not in code)
- [ ] `.env.production` added to `.gitignore`
- [ ] Environment validation script passes
- [ ] Database connection tested
- [ ] Redis connection tested
- [ ] External API credentials verified
- [ ] HTTPS enforced for all environments
- [ ] Monitoring and alerting configured
- [ ] Secret rotation schedule documented

---

**Last Updated:** November 1, 2025  
**Owner:** Platform Team  
**Review Schedule:** Quarterly
