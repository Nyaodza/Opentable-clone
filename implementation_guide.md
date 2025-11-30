# ServiceSphere Technical Implementation Guide

## Quick Start for Developers

### 1. Web Application Setup

#### Frontend Stack
- **Framework**: React 18+ with TypeScript
- **State**: Redux Toolkit + RTK Query
- **UI**: Material-UI or Chakra UI
- **Routing**: React Router v6
- **Build**: Vite (recommended) or Next.js

#### Initial Setup Commands
```bash
# Create React app with TypeScript
npm create vite@latest serviceSphere-web -- --template react-ts
cd serviceSphere-web

# Install core dependencies
npm install @reduxjs/toolkit react-redux react-router-dom
npm install @mui/material @emotion/react @emotion/styled
npm install axios react-hook-form react-query
npm install -D @types/react @types/node eslint prettier
```

#### Project Structure
```
src/
├── api/           # API service layer
├── components/    # Reusable components
├── features/      # Feature-based modules
├── hooks/         # Custom hooks
├── pages/         # Page components
├── store/         # Redux store
├── types/         # TypeScript types
└── utils/         # Utilities
```

#### Core Component Examples

**Restaurant Search Component**
```typescript
// src/features/search/RestaurantSearch.tsx
import { useState } from 'react';
import { useSearchRestaurantsQuery } from '../../api/restaurantApi';

export const RestaurantSearch: React.FC = () => {
  const [filters, setFilters] = useState({
    query: '',
    cuisine: '',
    date: new Date(),
    partySize: 2
  });
  
  const { data, isLoading } = useSearchRestaurantsQuery(filters);
  
  return (
    <Box>
      <SearchFilters onChange={setFilters} />
      {isLoading ? (
        <CircularProgress />
      ) : (
        <RestaurantGrid restaurants={data?.restaurants || []} />
      )}
    </Box>
  );
};
```

**Booking Flow Component**
```typescript
// src/features/booking/BookingFlow.tsx
interface BookingFlowProps {
  restaurantId: string;
}

export const BookingFlow: React.FC<BookingFlowProps> = ({ restaurantId }) => {
  const [step, setStep] = useState<'select' | 'details' | 'confirm'>('select');
  const [bookingData, setBookingData] = useState<BookingData>({});
  
  const handleSubmit = async () => {
    try {
      const result = await createBooking(bookingData);
      navigate(`/booking/confirmation/${result.id}`);
    } catch (error) {
      showError('Booking failed. Please try again.');
    }
  };
  
  return (
    <Stepper activeStep={step}>
      {step === 'select' && <TimeSlotSelector />}
      {step === 'details' && <GuestDetails />}
      {step === 'confirm' && <BookingConfirmation />}
    </Stepper>
  );
};
```

### 2. Mobile Application Setup

#### React Native Setup
```bash
# Initialize React Native app
npx react-native init ServiceSphereMobile --template react-native-template-typescript

# Install navigation and core libraries
npm install @react-navigation/native @react-navigation/stack
npm install react-native-screens react-native-safe-area-context
npm install @reduxjs/toolkit react-redux
npm install react-native-vector-icons react-native-maps
```

#### Mobile Navigation Structure
```typescript
// src/navigation/AppNavigator.tsx
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';

const Stack = createStackNavigator();

export const AppNavigator = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="Search" component={SearchScreen} />
        <Stack.Screen name="Restaurant" component={RestaurantScreen} />
        <Stack.Screen name="Booking" component={BookingScreen} />
        <Stack.Screen name="Profile" component={ProfileScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};
```

### 3. Backend Services Implementation

#### Microservice Template (Node.js)
```javascript
// service-template/src/index.js
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { connectDB } = require('./config/database');
const { errorHandler } = require('./middleware/errorHandler');

const app = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/v1', require('./routes'));

// Error handling
app.use(errorHandler);

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Service running on port ${PORT}`);
});
```

#### Auth Service Implementation
```javascript
// auth-service/src/controllers/authController.js
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { User } = require('../models');

exports.register = async (req, res) => {
  try {
    const { email, password, userType } = req.body;
    
    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ error: 'User already exists' });
    }
    
    // Hash password and create user
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
      email,
      password: hashedPassword,
      userType
    });
    
    // Generate tokens
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);
    
    res.status(201).json({
      user: { id: user.id, email: user.email },
      accessToken,
      refreshToken
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
```

#### Booking Service Implementation
```javascript
// booking-service/src/controllers/bookingController.js
const { Booking, Restaurant, Table } = require('../models');
const { publishEvent } = require('../utils/eventBus');

exports.createBooking = async (req, res) => {
  try {
    const { restaurantId, date, time, partySize, specialRequests } = req.body;
    const userId = req.user.id;
    
    // Check availability
    const availableTable = await findAvailableTable(restaurantId, date, time, partySize);
    if (!availableTable) {
      return res.status(409).json({ error: 'No tables available' });
    }
    
    // Create booking
    const booking = await Booking.create({
      restaurantId,
      userId,
      tableId: availableTable.id,
      date,
      time,
      partySize,
      specialRequests,
      status: 'confirmed'
    });
    
    // Publish event for notifications
    await publishEvent('booking.created', {
      bookingId: booking.id,
      userId,
      restaurantId
    });
    
    res.status(201).json(booking);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
```

### 4. Database Schema

#### PostgreSQL Schema Setup
```sql
-- Core tables
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE restaurants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  description TEXT,
  cuisine_types TEXT[],
  price_range INT CHECK (price_range BETWEEN 1 AND 4),
  coordinates POINT,
  address JSONB NOT NULL,
  contact JSONB,
  operating_hours JSONB,
  features TEXT[],
  images TEXT[],
  rating DECIMAL(2,1) DEFAULT 0,
  review_count INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_restaurants_coordinates ON restaurants USING GIST(coordinates);
CREATE INDEX idx_restaurants_cuisine ON restaurants USING GIN(cuisine_types);

CREATE TABLE bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  table_id UUID REFERENCES tables(id),
  booking_date DATE NOT NULL,
  booking_time TIME NOT NULL,
  party_size INT NOT NULL CHECK (party_size > 0),
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  special_requests TEXT,
  confirmation_code VARCHAR(20) UNIQUE,
  total_amount DECIMAL(10,2),
  deposit_amount DECIMAL(10,2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_booking UNIQUE (restaurant_id, table_id, booking_date, booking_time)
);

CREATE INDEX idx_bookings_date ON bookings(booking_date);
CREATE INDEX idx_bookings_user ON bookings(user_id);
```

### 5. API Gateway Configuration

#### Kong API Gateway Setup
```yaml
# kong.yml
_format_version: "2.1"

services:
  - name: auth-service
    url: http://auth-service:3001
    routes:
      - name: auth-routes
        paths:
          - /api/auth
    plugins:
      - name: rate-limiting
        config:
          minute: 100
          
  - name: booking-service
    url: http://booking-service:3002
    routes:
      - name: booking-routes
        paths:
          - /api/bookings
    plugins:
      - name: jwt
      - name: cors

plugins:
  - name: prometheus
    config:
      per_consumer: true
```

### 6. Docker & Kubernetes Setup

#### Docker Compose for Development
```yaml
# docker-compose.yml
version: '3.8'

services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: serviceSphere
      POSTGRES_USER: admin
      POSTGRES_PASSWORD: password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  elasticsearch:
    image: elasticsearch:8.11.0
    environment:
      - discovery.type=single-node
      - "ES_JAVA_OPTS=-Xms512m -Xmx512m"
    ports:
      - "9200:9200"

  auth-service:
    build: ./services/auth-service
    environment:
      DATABASE_URL: postgresql://admin:password@postgres:5432/serviceSphere
      REDIS_URL: redis://redis:6379
      JWT_SECRET: your-secret-key
    depends_on:
      - postgres
      - redis
    ports:
      - "3001:3001"

  booking-service:
    build: ./services/booking-service
    environment:
      DATABASE_URL: postgresql://admin:password@postgres:5432/serviceSphere
      REDIS_URL: redis://redis:6379
    depends_on:
      - postgres
      - redis
    ports:
      - "3002:3002"

volumes:
  postgres_data:
```

#### Kubernetes Deployment
```yaml
# k8s/booking-service.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: booking-service
spec:
  replicas: 3
  selector:
    matchLabels:
      app: booking-service
  template:
    metadata:
      labels:
        app: booking-service
    spec:
      containers:
      - name: booking-service
        image: serviceSphere/booking-service:latest
        ports:
        - containerPort: 3002
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: db-secret
              key: url
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
---
apiVersion: v1
kind: Service
metadata:
  name: booking-service
spec:
  selector:
    app: booking-service
  ports:
  - port: 3002
    targetPort: 3002
```

### 7. Development Workflow

#### Git Workflow
```bash
# Feature branch workflow
git checkout -b feature/restaurant-search
# Make changes
git add .
git commit -m "feat: implement restaurant search with filters"
git push origin feature/restaurant-search
# Create PR for review
```

#### Testing Strategy
```javascript
// Unit test example
describe('BookingService', () => {
  it('should check table availability', async () => {
    const mockTable = { id: '123', capacity: 4 };
    jest.spyOn(tableRepository, 'findAvailable').mockResolvedValue(mockTable);
    
    const result = await bookingService.checkAvailability({
      restaurantId: '456',
      date: '2024-12-25',
      time: '19:00',
      partySize: 2
    });
    
    expect(result.available).toBe(true);
    expect(result.tableId).toBe('123');
  });
});
```

### 8. Quick Development Commands

```bash
# Start all services locally
docker-compose up -d

# Run database migrations
npm run migrate:up

# Start web app development server
cd apps/web && npm run dev

# Start mobile app (iOS)
cd apps/mobile && npx react-native run-ios

# Run tests
npm run test

# Build for production
npm run build

# Deploy to staging
npm run deploy:staging
```

### 9. Environment Configuration

```env
# .env.example
NODE_ENV=development
PORT=3000

# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/serviceSphere

# Redis
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=15m
REFRESH_TOKEN_EXPIRES_IN=7d

# External APIs
GOOGLE_MAPS_API_KEY=your-key
STRIPE_SECRET_KEY=your-key
TWILIO_ACCOUNT_SID=your-sid
TWILIO_AUTH_TOKEN=your-token

# AWS
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-key
AWS_SECRET_ACCESS_KEY=your-secret
```

### 10. Monitoring & Logging

```javascript
// Structured logging with Winston
const winston = require('winston');

const logger = winston.createLogger({
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});

// Request logging middleware
app.use((req, res, next) => {
  logger.info({
    method: req.method,
    url: req.url,
    ip: req.ip,
    timestamp: new Date().toISOString()
  });
  next();
});
```

## Next Steps

1. **Clone the starter repository** (once created)
2. **Set up your development environment** using Docker Compose
3. **Start with Phase 1 features** as outlined in the development plan
4. **Follow the sprint schedule** for systematic progress
5. **Use the provided code templates** as starting points

For detailed implementation of each feature, refer to the main development plan document.
