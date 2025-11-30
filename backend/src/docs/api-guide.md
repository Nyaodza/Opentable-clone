# OpenTable Clone API Documentation

## Overview

The OpenTable Clone API is a comprehensive restaurant reservation platform that provides endpoints for user management, restaurant discovery, reservations, payments, reviews, and more. This RESTful API is built with Express.js, TypeScript, and PostgreSQL.

## Base URL

- **Development**: `http://localhost:3001/api`
- **Production**: `https://api.opentableclone.com/api`

## Authentication

The API uses JWT (JSON Web Tokens) for authentication. Include the token in the Authorization header:

```
Authorization: Bearer YOUR_JWT_TOKEN
```

### Getting Started

1. **Register a new account** or **login** to get your JWT token
2. **Include the token** in all authenticated requests
3. **Handle token expiration** by refreshing or re-authenticating

## Response Format

All API responses follow a consistent format:

### Success Response
```json
{
  "success": true,
  "timestamp": "2024-01-15T10:30:00.000Z",
  "data": {
    // Response data here
  }
}
```

### Error Response
```json
{
  "success": false,
  "timestamp": "2024-01-15T10:30:00.000Z",
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": [
    {
      "field": "fieldName",
      "message": "Field-specific error message"
    }
  ]
}
```

### Paginated Response
```json
{
  "success": true,
  "timestamp": "2024-01-15T10:30:00.000Z",
  "data": {
    "items": [],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 150,
      "pages": 8,
      "hasNext": true,
      "hasPrev": false
    }
  }
}
```

## Rate Limiting

The API implements rate limiting to ensure fair usage:

- **General endpoints**: 100 requests per 15 minutes
- **Authentication endpoints**: 5 requests per 15 minutes  
- **Admin endpoints**: 200 requests per 15 minutes

Rate limit headers are included in responses:
- `X-RateLimit-Limit`: Request limit for the current window
- `X-RateLimit-Remaining`: Remaining requests in current window
- `X-RateLimit-Reset`: Unix timestamp when the window resets

## Error Codes

| Code | Description |
|------|-------------|
| `VALIDATION_ERROR` | Input validation failed |
| `UNAUTHORIZED` | Authentication required |
| `FORBIDDEN` | Access denied |
| `NOT_FOUND` | Resource not found |
| `RATE_LIMIT_EXCEEDED` | Too many requests |
| `INTERNAL_ERROR` | Server error |
| `DATABASE_ERROR` | Database operation failed |
| `PAYMENT_ERROR` | Payment processing failed |

## Pagination

Most list endpoints support pagination with these query parameters:

- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20, max: 100)
- `sort`: Sort field and direction (e.g., `name:asc`, `createdAt:desc`)

## Filtering and Search

Many endpoints support filtering and search:

- **Text search**: `q` parameter for general search
- **Filters**: Specific parameters like `cuisine`, `location`, `priceRange`
- **Date ranges**: `startDate` and `endDate` parameters
- **Status filtering**: `status` parameter for reservations, etc.

## Real-time Updates

The API supports real-time updates via WebSocket connections:

```javascript
import io from 'socket.io-client';

const socket = io('http://localhost:3001', {
  auth: { token: 'YOUR_JWT_TOKEN' }
});

// Listen for events
socket.on('reservation:updated', (data) => {
  console.log('Reservation updated:', data);
});
```

## File Uploads

File upload endpoints accept multipart/form-data:

- **Max file size**: 5MB per file
- **Max files per request**: 10
- **Supported formats**: JPEG, PNG, GIF, WebP, PDF
- **Storage**: AWS S3 (production) or local storage (development)

## Testing

### Using curl

```bash
# Register a new user
curl -X POST "http://localhost:3001/api/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "John",
    "lastName": "Doe", 
    "email": "john@example.com",
    "password": "password123"
  }'

# Login
curl -X POST "http://localhost:3001/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "password123"
  }'

# Get restaurants (with token)
curl -X GET "http://localhost:3001/api/restaurants" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Using JavaScript/Fetch

```javascript
// Helper function for API calls
async function apiCall(endpoint, options = {}) {
  const token = localStorage.getItem('token');
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers
    },
    ...options
  };

  const response = await fetch(`/api${endpoint}`, config);
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Request failed');
  }
  
  return response.json();
}

// Usage examples
const restaurants = await apiCall('/restaurants?cuisine=Italian');
const reservation = await apiCall('/reservations', {
  method: 'POST',
  body: JSON.stringify({
    restaurantId: 'restaurant-id',
    reservationDate: '2024-01-15',
    reservationTime: '19:00',
    partySize: 4
  })
});
```

### Using Python/Requests

```python
import requests

class OpenTableAPI:
    def __init__(self, base_url="http://localhost:3001/api"):
        self.base_url = base_url
        self.token = None
    
    def login(self, email, password):
        response = requests.post(f"{self.base_url}/auth/login", json={
            "email": email,
            "password": password
        })
        response.raise_for_status()
        data = response.json()
        self.token = data["data"]["token"]
        return data
    
    def get_headers(self):
        headers = {"Content-Type": "application/json"}
        if self.token:
            headers["Authorization"] = f"Bearer {self.token}"
        return headers
    
    def get_restaurants(self, **params):
        response = requests.get(
            f"{self.base_url}/restaurants",
            params=params,
            headers=self.get_headers()
        )
        response.raise_for_status()
        return response.json()

# Usage
api = OpenTableAPI()
api.login("john@example.com", "password123")
restaurants = api.get_restaurants(cuisine="Italian", location="NYC")
```

## Best Practices

### 1. Authentication
- Store JWT tokens securely (httpOnly cookies recommended for web apps)
- Handle token expiration gracefully
- Don't include sensitive data in tokens

### 2. Error Handling
- Always check response status codes
- Parse error responses for detailed information
- Implement retry logic for transient errors
- Log errors for debugging

### 3. Performance
- Use pagination for large datasets
- Implement client-side caching where appropriate
- Use specific fields in queries when possible
- Compress request/response data

### 4. Security
- Validate all input data
- Use HTTPS in production
- Implement proper CORS settings
- Rate limit your requests

### 5. Real-time Features
- Use WebSockets for live updates
- Handle connection drops gracefully
- Implement proper room management
- Clean up event listeners

## SDK Libraries

### JavaScript/TypeScript SDK

```typescript
import { OpenTableClient } from '@opentable-clone/sdk';

const client = new OpenTableClient({
  baseURL: 'http://localhost:3001/api',
  apiKey: 'your-api-key'
});

// Auto-handled authentication
await client.auth.login(email, password);

// Type-safe API calls
const restaurants = await client.restaurants.list({
  cuisine: 'Italian',
  location: 'NYC',
  page: 1,
  limit: 20
});

// Real-time subscriptions
client.subscriptions.onReservationUpdate((reservation) => {
  console.log('Reservation updated:', reservation);
});
```

### Python SDK

```python
from opentable_clone import OpenTableClient

client = OpenTableClient(
    base_url="http://localhost:3001/api",
    api_key="your-api-key"
)

# Authentication
client.auth.login(email="john@example.com", password="password123")

# API calls with automatic retries and error handling
restaurants = client.restaurants.list(
    cuisine="Italian",
    location="NYC", 
    page=1,
    limit=20
)

# Async support
import asyncio

async def get_data():
    async with client:
        restaurants = await client.restaurants.alist(cuisine="Italian")
        return restaurants
```

## Webhooks

The API supports webhooks for real-time notifications:

### Supported Events
- `reservation.created`
- `reservation.updated`
- `reservation.cancelled`
- `payment.completed`
- `payment.failed`
- `review.created`
- `user.registered`

### Webhook Configuration

```javascript
// Configure webhook endpoint
POST /api/admin/webhooks
{
  "url": "https://your-app.com/webhooks/opentable",
  "events": ["reservation.created", "payment.completed"],
  "secret": "your-webhook-secret"
}
```

### Webhook Payload

```json
{
  "event": "reservation.created",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "data": {
    "reservation": {
      "id": "reservation-id",
      "restaurantId": "restaurant-id",
      "userId": "user-id",
      // ... reservation data
    }
  },
  "signature": "webhook-signature"
}
```

## Monitoring and Health Checks

### Health Check Endpoint

```bash
GET /api/monitoring/health
```

Returns detailed system health information including:
- API status
- Database connectivity
- Redis connectivity
- External service status
- Performance metrics

### Metrics Endpoints

```bash
# API metrics
GET /api/monitoring/metrics?timeframe=3600000

# System metrics  
GET /api/monitoring/system

# Real-time metrics
GET /api/monitoring/realtime

# Historical data
GET /api/monitoring/history?hours=24
```

## Support and Resources

- **API Documentation**: `/api-docs` (Swagger UI)
- **OpenAPI Spec**: `/api-docs.json`
- **Postman Collection**: Available on request
- **Status Page**: Coming soon
- **Support Email**: support@opentableclone.com

## Changelog

### v1.0.0 (Current)
- Initial API release
- Full restaurant and reservation management
- Payment processing with Stripe
- Real-time notifications
- Comprehensive monitoring
- Performance optimizations

---

For more detailed endpoint documentation, visit the [Swagger UI](/api-docs) when the server is running.