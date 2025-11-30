# TravelSphere Auth Service

Authentication service for TravelSphere Admin Dashboard using Google OAuth 2.0 and JWT tokens.

## Features

- Google OAuth 2.0 authentication
- JWT access and refresh tokens
- Role-based access control (Admin/Viewer)
- User management endpoints
- Session management
- Redis-based token storage

## Prerequisites

1. Google Cloud Console project with OAuth 2.0 credentials
2. Redis instance
3. Node.js 18+

## Setup

### 1. Google OAuth Configuration

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select existing
3. Enable Google+ API
4. Create OAuth 2.0 credentials:
   - Application type: Web application
   - Authorized redirect URIs: `http://localhost:8034/auth/google/callback`
   - Copy Client ID and Client Secret

### 2. Environment Configuration

Copy `.env.auth.example` to `.env` and update:

```bash
cp .env.auth.example .env
```

Required environment variables:
- `GOOGLE_CLIENT_ID`: Your Google OAuth client ID
- `GOOGLE_CLIENT_SECRET`: Your Google OAuth client secret
- `JWT_SECRET`: Strong secret for JWT signing
- `JWT_REFRESH_SECRET`: Different secret for refresh tokens
- `SESSION_SECRET`: Secret for session encryption
- `ADMIN_EMAILS`: Comma-separated list of admin emails

### 3. Installation

```bash
cd microservices/auth-service
npm install
```

### 4. Development

```bash
npm run dev
```

### 5. Production Build

```bash
npm run build
npm start
```

## API Endpoints

### Public Endpoints

- `GET /auth/google` - Initiate Google OAuth flow
- `GET /auth/google/callback` - OAuth callback handler
- `POST /auth/refresh` - Refresh access token

### Protected Endpoints

- `GET /auth/me` - Get current user info
- `POST /auth/logout` - Logout current session
- `POST /auth/logout-all` - Logout all sessions

### Admin Endpoints

- `GET /auth/users` - List all users
- `PUT /auth/users/:userId/role` - Update user role
- `DELETE /auth/users/:userId` - Delete user

## Authentication Flow

1. User clicks "Sign in with Google"
2. Redirected to Google OAuth consent screen
3. After approval, redirected back with auth code
4. Exchange auth code for user info
5. Generate JWT tokens and return to frontend
6. Frontend stores tokens and makes authenticated requests

## Token Management

- Access tokens expire in 1 hour (configurable)
- Refresh tokens expire in 7 days (configurable)
- Refresh tokens are stored in Redis
- Tokens can be revoked individually or all at once

## Security

- HTTPS required in production
- CORS configured for specific origins
- Rate limiting on auth endpoints
- Secure session cookies
- Token rotation on refresh

## Docker

Build and run with Docker:

```bash
docker build -t auth-service .
docker run -p 8034:8034 --env-file .env auth-service
```

## Testing

```bash
npm test
```

## Monitoring

- Health check: `GET /health`
- Logs: Check `logs/` directory
- Metrics: Integrate with monitoring service