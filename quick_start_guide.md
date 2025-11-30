# ServiceSphere Quick Start Guide

## 🚀 Developer Quick Start (15 minutes)

### Prerequisites
- Node.js 18+ and npm
- Docker Desktop
- Git
- PostgreSQL client (optional)
- Code editor (VS Code recommended)

### Step 1: Initial Setup (5 minutes)

```bash
# Clone the repository (when available)
git clone https://github.com/your-org/serviceSphere.git
cd serviceSphere

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Start Docker services
docker-compose up -d
```

### Step 2: Database Setup (3 minutes)

```bash
# Run database migrations
npm run db:migrate

# Seed sample data
npm run db:seed

# Verify database
npm run db:check
```

### Step 3: Start Development Servers (2 minutes)

```bash
# Terminal 1: Start backend services
npm run dev:backend

# Terminal 2: Start web app
npm run dev:web

# Terminal 3: Start mobile app (optional)
npm run dev:mobile
```

### Step 4: Access Applications (5 minutes)

- **Web App**: http://localhost:3000
- **API Gateway**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs
- **Database Admin**: http://localhost:8080 (Adminer)
- **Redis Commander**: http://localhost:8081

### Default Test Accounts

```
Restaurant Owner:
Email: owner@demo.com
Password: Demo123!

Diner:
Email: diner@demo.com
Password: Demo123!

Admin:
Email: admin@demo.com
Password: Admin123!
```

## 📁 Project Structure

```
serviceSphere/
├── apps/
│   ├── web/              # React web application
│   └── mobile/           # React Native mobile app
├── services/
│   ├── auth-service/     # Authentication service
│   ├── booking-service/  # Booking management
│   ├── restaurant-service/ # Restaurant management
│   └── search-service/   # Search & discovery
├── packages/
│   ├── shared/          # Shared utilities
│   └── ui-components/   # Shared UI components
├── infrastructure/
│   ├── docker/         # Docker configurations
│   ├── k8s/           # Kubernetes manifests
│   └── terraform/     # Infrastructure as code
└── docs/              # Documentation
```

## 🛠️ Common Development Tasks

### Creating a New Feature

```bash
# 1. Create feature branch
git checkout -b feature/your-feature-name

# 2. Generate component/service boilerplate
npm run generate:component MyComponent
npm run generate:service my-service

# 3. Run tests while developing
npm run test:watch

# 4. Build and test before committing
npm run build
npm run test
npm run lint
```

### Working with the Database

```bash
# Create a new migration
npm run db:migration:create add_user_preferences

# Run migrations
npm run db:migrate

# Rollback last migration
npm run db:rollback

# Access database CLI
npm run db:cli
```

### API Development

```bash
# Generate API client from OpenAPI spec
npm run api:generate

# Test API endpoints
npm run api:test

# View API documentation
open http://localhost:8000/docs
```

## 🔧 Configuration

### Environment Variables

```env
# Required for local development
NODE_ENV=development
DATABASE_URL=postgresql://postgres:password@localhost:5432/serviceSphere
REDIS_URL=redis://localhost:6379
JWT_SECRET=local-dev-secret

# Optional services
ELASTICSEARCH_URL=http://localhost:9200
KAFKA_BROKERS=localhost:9092
```

### VS Code Recommended Extensions

```json
{
  "recommendations": [
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "prisma.prisma",
    "ms-vscode.vscode-typescript-next",
    "bradlc.vscode-tailwindcss",
    "formulahendry.auto-rename-tag"
  ]
}
```

## 🧪 Testing

### Unit Tests
```bash
# Run all unit tests
npm run test

# Run tests for specific service
npm run test:auth-service

# Run tests with coverage
npm run test:coverage
```

### Integration Tests
```bash
# Run API integration tests
npm run test:integration

# Run specific test suite
npm run test:integration -- --grep "booking"
```

### E2E Tests
```bash
# Run E2E tests (requires app running)
npm run test:e2e

# Run E2E tests in headed mode
npm run test:e2e:headed
```

## 🐛 Debugging

### Backend Debugging

```javascript
// Add debugger statement in code
debugger;

// Or use VS Code launch configuration
{
  "type": "node",
  "request": "attach",
  "name": "Attach to Process",
  "port": 9229
}
```

### Frontend Debugging

1. Use React DevTools
2. Use Redux DevTools
3. Add `debugger` statements
4. Use Chrome DevTools

### Common Issues & Solutions

**Issue: Database connection failed**
```bash
# Check if PostgreSQL is running
docker ps | grep postgres

# Restart database
docker-compose restart postgres
```

**Issue: Port already in use**
```bash
# Find process using port
lsof -i :3000

# Kill process
kill -9 <PID>
```

**Issue: Module not found**
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

## 📚 Key Commands Reference

```bash
# Development
npm run dev              # Start all services
npm run dev:web         # Start web app only
npm run dev:api         # Start API only

# Testing
npm test                # Run all tests
npm run test:watch      # Watch mode
npm run test:coverage   # With coverage

# Building
npm run build           # Build all
npm run build:web       # Build web app
npm run build:api       # Build API

# Database
npm run db:migrate      # Run migrations
npm run db:seed         # Seed data
npm run db:reset        # Reset database

# Code Quality
npm run lint            # Run ESLint
npm run lint:fix        # Fix lint issues
npm run format          # Format code

# Docker
npm run docker:up       # Start containers
npm run docker:down     # Stop containers
npm run docker:logs     # View logs
```

## 🔗 Useful Links

- **API Documentation**: http://localhost:8000/docs
- **Storybook**: http://localhost:6006
- **Database Admin**: http://localhost:8080
- **Email Testing**: http://localhost:8025 (MailHog)
- **Performance Monitoring**: http://localhost:3001 (Grafana)

## 💡 Pro Tips

1. **Use the included Postman collection** for API testing
2. **Enable hot reloading** for faster development
3. **Use the debug console** in VS Code for breakpoint debugging
4. **Check the logs** - most issues are logged clearly
5. **Join the dev Slack channel** for quick help

## 🆘 Getting Help

1. Check the [full documentation](./docs/README.md)
2. Search existing issues on GitHub
3. Ask in the development Slack channel
4. Create a GitHub issue with:
   - Clear description
   - Steps to reproduce
   - Expected vs actual behavior
   - Environment details

## 🎯 Next Steps

1. **Explore the codebase** - Start with `apps/web/src/App.tsx`
2. **Make a small change** - Try modifying the homepage
3. **Run the tests** - Ensure everything works
4. **Pick a starter task** - Check issues labeled "good first issue"
5. **Join the team standup** - Get to know the team

Happy coding! 🚀
