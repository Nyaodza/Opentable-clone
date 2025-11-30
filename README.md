# 🍽️ OpenTable Clone

A **complete, production-ready** restaurant reservation platform built with modern web technologies. This comprehensive solution includes web, mobile apps, admin dashboard, real-time features, payment processing, and enterprise-grade security.

## ✨ Features

### 🔷 **For Diners**
- 🔍 **Advanced Search**: Filter by location, cuisine, price range, rating, and availability
- ⏰ **Real-time Availability**: Live table availability with instant booking
- 📱 **Mobile App**: Native iOS/Android app with full functionality
- 📅 **Reservation Management**: Create, modify, and cancel reservations
- ⭐ **Reviews & Ratings**: Rate restaurants and read authentic reviews
- 🎁 **Loyalty Program**: Earn points and redeem rewards
- 📧 **Smart Notifications**: Email and push notifications for bookings
- 💳 **Secure Payments**: Stripe integration for seamless transactions
- 📊 **Dining History**: Track your dining experiences and favorites

### 🔶 **For Restaurant Owners**
- 🏪 **Restaurant Dashboard**: Complete business management interface
- 📋 **Reservation System**: Advanced booking management with waitlists
- 🪑 **Table Management**: Visual floor plans and capacity optimization
- 📊 **Analytics & Reports**: Revenue, occupancy, and customer insights
- ⏰ **Operating Hours**: Flexible scheduling and holiday management
- 📷 **Media Management**: Upload photos and manage restaurant gallery
- 💰 **Payment Processing**: Integrated billing and transaction tracking
- 🔔 **Real-time Updates**: Live notifications for new bookings

### 🔸 **For Administrators**
- 👥 **User Management**: Complete user administration system
- 🏢 **Restaurant Approval**: Review and approve new restaurant listings
- 📈 **Platform Analytics**: System-wide performance and usage metrics
- ⚙️ **System Configuration**: Platform settings and feature toggles
- 🛡️ **Security Monitoring**: Real-time security alerts and audit logs
- 📊 **Performance Dashboard**: API metrics and system health monitoring

## 🚀 Tech Stack

### 🔧 **Backend**
- **Runtime**: Node.js 18+ with Express.js
- **Language**: TypeScript for type safety
- **Database**: PostgreSQL 15+ with Sequelize ORM
- **Authentication**: JWT with refresh tokens
- **Caching**: Redis for performance optimization
- **Payments**: Stripe integration
- **Email**: Nodemailer with queue processing
- **Real-time**: Socket.io for live updates
- **Security**: Helmet, CORS, rate limiting, input sanitization
- **Monitoring**: Custom analytics and health checks
- **Documentation**: OpenAPI 3.0 with Swagger UI

### 🎨 **Frontend**
- **Framework**: React 18+ with TypeScript
- **Styling**: Material-UI (MUI) with custom theming
- **Routing**: React Router v6
- **State Management**: React Query + Context API
- **Forms**: React Hook Form with Yup validation
- **Real-time**: Socket.io client
- **Testing**: Jest + React Testing Library
- **Build**: Create React App with optimizations

### 📱 **Mobile App**
- **Framework**: React Native with TypeScript
- **Navigation**: React Navigation v6
- **State**: React Query + AsyncStorage
- **UI**: Native Base components
- **Push Notifications**: Firebase Cloud Messaging
- **Maps**: React Native Maps
- **Testing**: Jest + React Native Testing Library

### ☁️ **Infrastructure**
- **Containerization**: Docker with multi-stage builds
- **Orchestration**: Docker Compose for local development
- **CI/CD**: GitHub Actions with automated testing
- **Cloud Storage**: AWS S3 for file uploads
- **Environment**: Support for dev, staging, production

## 🚀 Quick Start

### 📋 Prerequisites
- **Node.js** 18+ (with npm/yarn)
- **PostgreSQL** 15+
- **Redis** 6+ (for caching)
- **Docker** (optional, for containerized setup)

### ⚡ One-Command Setup (Docker)
```bash
# Clone the repository
git clone https://github.com/your-username/opentable-clone.git
cd opentable-clone

# Start all services with Docker
docker-compose up -d

# The application will be available at:
# - Frontend: http://localhost:3000
# - Backend API: http://localhost:3001
# - API Documentation: http://localhost:3001/api-docs
# - Admin Dashboard: http://localhost:3000/admin
```

### 🔧 Manual Setup

#### Backend Setup
```bash
cd backend

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your database and service credentials

# Set up database
createdb opentable_clone
npm run db:migrate
npm run db:seed

# Start development server
npm run dev
```

#### Frontend Setup
```bash
cd frontend

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your API endpoints

# Start development server
npm start
```

#### Mobile App Setup
```bash
cd mobile

# Install dependencies
npm install

# Install pods (iOS only)
cd ios && pod install && cd ..

# Start Metro bundler
npx react-native start

# Run on iOS
npx react-native run-ios

# Run on Android
npx react-native run-android
```

## 📚 Documentation

### 🔗 **Live Documentation**
- **📖 API Documentation**: http://localhost:3001/api-docs (Interactive Swagger UI)
- **📊 Monitoring Dashboard**: http://localhost:3001/api/monitoring/health
- **🔍 Performance Metrics**: http://localhost:3001/api/monitoring/metrics

### 📖 **Comprehensive Guides**
- **[API Reference Guide](./backend/src/docs/api-guide.md)** - Complete API documentation
- **[Frontend Setup Guide](./frontend/README.md)** - Frontend development guide
- **[Mobile App Guide](./mobile/README.md)** - Mobile development guide
- **[Deployment Guide](./docs/deployment.md)** - Production deployment
- **[Contributing Guide](./docs/contributing.md)** - Development guidelines

### 🛠️ **API Endpoints Overview**

#### 🔐 Authentication & Users
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/users/profile` - User profile management
- `POST /api/auth/refresh` - Token refresh

#### 🏪 Restaurants
- `GET /api/restaurants` - Search and filter restaurants
- `GET /api/restaurants/:id` - Restaurant details
- `GET /api/restaurants/:id/availability` - Real-time availability
- `POST /api/restaurants` - Create restaurant (owners)

#### 📅 Reservations
- `POST /api/reservations` - Create reservation
- `GET /api/reservations/user` - User's reservations
- `PATCH /api/reservations/:id` - Modify reservation
- `DELETE /api/reservations/:id` - Cancel reservation

#### ⭐ Reviews & Ratings
- `POST /api/reviews` - Submit review
- `GET /api/reviews/restaurant/:id` - Restaurant reviews
- `GET /api/reviews/user` - User's reviews

#### 💳 Payments
- `POST /api/payments/create-payment-intent` - Create payment
- `GET /api/payments/user` - Payment history

#### 🎁 Loyalty Program
- `GET /api/loyalty/points` - User loyalty points
- `POST /api/loyalty/redeem` - Redeem rewards

#### 📊 Admin (Admin Only)
- `GET /api/admin/analytics` - Platform analytics
- `GET /api/admin/users` - User management
- `GET /api/admin/restaurants` - Restaurant management

## 🧪 Testing

### Backend Testing
```bash
cd backend

# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run integration tests
npm run test:e2e

# Run specific test file
npm test -- auth.test.ts
```

### Frontend Testing
```bash
cd frontend

# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch
```

### Mobile Testing
```bash
cd mobile

# Run tests
npm test

# Run tests with coverage
npm run test:coverage
```

## 🏗️ Development

### 🔄 **Development Workflow**
```bash
# Start all services for development
npm run dev:all

# Run linting
npm run lint

# Run type checking
npm run typecheck

# Build for production
npm run build

# Generate API documentation
npm run docs:generate
```

### 🐳 **Docker Development**
```bash
# Build development images
docker-compose -f docker-compose.dev.yml build

# Start development environment
docker-compose -f docker-compose.dev.yml up

# View logs
docker-compose logs -f backend frontend
```

### 📊 **Performance Monitoring**
- Real-time API metrics at `/api/monitoring/metrics`
- System health checks at `/api/monitoring/health`
- Performance analytics in admin dashboard
- Database query optimization tools

## 🚀 Deployment

### 🌐 **Production Deployment**
```bash
# Build production images
docker-compose -f docker-compose.prod.yml build

# Deploy to production
docker-compose -f docker-compose.prod.yml up -d

# Check deployment status
docker-compose ps
```

### ☁️ **Cloud Deployment Options**
- **AWS**: ECS with RDS and ElastiCache
- **Google Cloud**: GKE with Cloud SQL and Memorystore
- **Azure**: Container Instances with Azure Database
- **Heroku**: One-click deployment ready

### 🔧 **Environment Configuration**
- Development: Auto-setup with Docker Compose
- Staging: CI/CD pipeline with GitHub Actions
- Production: Blue-green deployment support

## 🛡️ Security Features

- 🔐 **JWT Authentication** with refresh tokens
- 🛡️ **Input Sanitization** and validation
- 🚦 **Rate Limiting** by IP and user
- 🔒 **HTTPS Enforcement** in production
- 🔑 **Password Hashing** with bcrypt
- 🛡️ **CSRF Protection** and secure headers
- 📝 **Audit Logging** for security events
- 🚨 **Real-time Security Monitoring**

## 📈 Performance Features

- ⚡ **Redis Caching** for frequently accessed data
- 🗄️ **Database Query Optimization** with proper indexing
- 📦 **Response Compression** and asset optimization
- 🔄 **Connection Pooling** for database connections
- 📊 **Real-time Performance Monitoring**
- 🚀 **CDN Integration** for static assets

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](./docs/contributing.md) for details.

### Development Setup for Contributors
1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes and add tests
4. Ensure all tests pass: `npm run test:all`
5. Commit your changes: `git commit -m 'Add amazing feature'`
6. Push to the branch: `git push origin feature/amazing-feature`
7. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with modern React, Node.js, and TypeScript
- Inspired by OpenTable's user experience
- Icons and design elements from Material-UI
- Testing frameworks: Jest and React Testing Library

---

**⭐ If you found this project helpful, please give it a star!**

**🐛 Found a bug?** [Open an issue](https://github.com/your-username/opentable-clone/issues)

**💡 Have a feature request?** [Start a discussion](https://github.com/your-username/opentable-clone/discussions)