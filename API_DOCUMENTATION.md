# OpenTable Clone API Documentation

## Overview
Enterprise-grade restaurant reservation platform with comprehensive business features and innovative technologies.

**Base URL**: `https://api.opentable-clone.com`
**API Version**: `v2.0.0`
**Authentication**: Bearer token (JWT)

## Table of Contents
1. [Authentication](#authentication)
2. [Core Features](#core-features)
3. [Enhanced Business Features](#enhanced-business-features)
4. [Innovative Features](#innovative-features)
5. [Error Handling](#error-handling)
6. [Rate Limiting](#rate-limiting)

## Authentication

### POST /api/auth/register
Register a new user account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!",
  "firstName": "John",
  "lastName": "Doe",
  "phone": "+1234567890"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "user": {
      "id": "user_123",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe"
    }
  }
}
```

### POST /api/auth/login
Authenticate and receive access token.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!"
}
```

## Core Features

### Restaurants

#### GET /api/restaurants
Get list of restaurants with filtering.

**Query Parameters:**
- `location` - Location coordinates or address
- `cuisine` - Cuisine type filter
- `priceRange` - Price range (1-4)
- `rating` - Minimum rating
- `features` - Required features (comma-separated)
- `page` - Page number (default: 1)
- `limit` - Results per page (default: 20)

**Response:**
```json
{
  "success": true,
  "data": {
    "restaurants": [...],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 150,
      "pages": 8
    }
  }
}
```

### Reservations

#### POST /api/reservations
Create a new reservation.

**Request Body:**
```json
{
  "restaurantId": "rest_123",
  "dateTime": "2024-10-01T19:00:00Z",
  "partySize": 4,
  "specialRequests": "Window table preferred",
  "occasionId": "birthday"
}
```

#### GET /api/reservations/:id
Get reservation details.

#### PUT /api/reservations/:id
Update existing reservation.

#### DELETE /api/reservations/:id
Cancel reservation.

## Enhanced Business Features

### Dynamic Pricing

#### POST /api/pricing/calculate
Calculate dynamic price for a reservation.

**Request Body:**
```json
{
  "restaurantId": "rest_123",
  "dateTime": "2024-10-01T19:00:00Z",
  "partySize": 4,
  "tableType": "window"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "basePrice": 50,
    "adjustedPrice": 65,
    "surgeMultiplier": 1.3,
    "appliedRules": [
      {
        "name": "Peak Hours",
        "adjustment": 30
      }
    ],
    "savings": null,
    "demandLevel": "high"
  }
}
```

#### POST /api/pricing/rules
Create pricing rule for restaurant.

**Request Body:**
```json
{
  "restaurantId": "rest_123",
  "type": "surge",
  "name": "Weekend Peak",
  "conditions": {
    "dayOfWeek": [5, 6],
    "timeRange": {
      "start": "18:00",
      "end": "22:00"
    },
    "minOccupancy": 0.7
  },
  "adjustment": {
    "type": "percentage",
    "value": 25
  }
}
```

### Business Intelligence

#### GET /api/intelligence/dashboard/:restaurantId
Get comprehensive analytics dashboard.

**Response:**
```json
{
  "success": true,
  "data": {
    "kpis": {
      "revenue": {
        "current": 125000,
        "previous": 110000,
        "change": 13.6
      },
      "occupancyRate": 78,
      "averageTicket": 85,
      "repeatCustomerRate": 35
    },
    "trends": [...],
    "predictions": {
      "nextMonthRevenue": 135000,
      "peakDays": ["2024-10-05", "2024-10-12"],
      "recommendedStaffing": {...}
    }
  }
}
```

#### POST /api/intelligence/predict
Get predictive analytics for planning.

**Request Body:**
```json
{
  "restaurantId": "rest_123",
  "metric": "revenue",
  "period": {
    "start": "2024-10-01",
    "end": "2024-10-31"
  },
  "factors": ["seasonality", "events", "weather"]
}
```

### Accessibility Features

#### POST /api/accessibility/profile
Create or update accessibility profile.

**Request Body:**
```json
{
  "preferences": {
    "visualImpairment": "low_vision",
    "fontSize": "large",
    "highContrast": true,
    "screenReaderMode": false,
    "hearingImpairment": "none",
    "motorImpairment": "mild",
    "cognitiveSupport": "none",
    "primaryLanguage": "en",
    "readingLevel": "intermediate"
  }
}
```

#### POST /api/accessibility/restaurants/search
Find restaurants with specific accessibility features.

**Request Body:**
```json
{
  "requirements": {
    "wheelchairAccessible": true,
    "brailleMenu": true,
    "quietAreas": true
  },
  "location": {
    "lat": 37.7749,
    "lng": -122.4194
  },
  "radius": 5
}
```

### Enhanced Loyalty Program

#### POST /api/loyalty-enhanced/enroll
Enroll in loyalty program.

**Request Body:**
```json
{
  "programId": "lp_premium",
  "referralCode": "FRIEND2024"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "memberId": "mem_789",
    "tier": "bronze",
    "points": {
      "current": 100,
      "lifetime": 100
    },
    "benefits": [...],
    "nextTier": {
      "name": "silver",
      "pointsRequired": 900
    }
  }
}
```

#### POST /api/loyalty-enhanced/points/earn
Award points for activities.

**Request Body:**
```json
{
  "memberId": "mem_789",
  "source": {
    "type": "reservation",
    "referenceId": "res_456",
    "amount": 150,
    "description": "Dining at The French Laundry"
  }
}
```

#### POST /api/loyalty-enhanced/points/redeem
Redeem points for rewards.

**Request Body:**
```json
{
  "memberId": "mem_789",
  "redemptionRuleId": "discount_10"
}
```

### Integration Marketplace

#### GET /api/marketplace/integrations
Browse available integrations.

**Query Parameters:**
- `category` - Integration category (pos, payment, marketing, etc.)
- `pricing` - Free or paid
- `compliance` - Required compliance (gdpr, ccpa, pci)
- `rating` - Minimum rating

#### POST /api/marketplace/install
Install integration for restaurant.

**Request Body:**
```json
{
  "integrationId": "int_toast_pos",
  "restaurantId": "rest_123",
  "config": {
    "apiKey": "toast_api_key_123",
    "locationId": "loc_456",
    "syncFrequency": "realtime"
  }
}
```

### Last-Minute Availability

#### POST /api/last-minute/search
Search for last-minute dining options.

**Request Body:**
```json
{
  "dateTime": "2024-09-24T19:00:00Z",
  "partySize": 2,
  "location": {
    "lat": 37.7749,
    "lng": -122.4194
  },
  "radius": 3,
  "minDiscount": 20
}
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "slotId": "lms_123",
      "restaurantId": "rest_456",
      "dateTime": "2024-09-24T19:30:00Z",
      "partySize": 2,
      "discount": 25,
      "type": "cancellation",
      "expiresAt": "2024-09-24T18:30:00Z"
    }
  ]
}
```

#### POST /api/last-minute/reserve/:slotId
Reserve a last-minute slot.

### Waitlist Transparency

#### GET /api/waitlist-transparency/:waitlistId
Get public waitlist view.

**Response:**
```json
{
  "success": true,
  "data": {
    "waitlist": {
      "status": "open",
      "statistics": {
        "partiesWaiting": 12,
        "averageWaitTime": 25,
        "currentWaitTime": 20
      },
      "entries": [
        {
          "position": 1,
          "displayName": "J. Smith",
          "partySize": 4,
          "estimatedSeatTime": "2024-09-24T19:15:00Z"
        }
      ],
      "predictions": {
        "nextAvailable": "2024-09-24T19:05:00Z",
        "expectedClearTime": "2024-09-24T20:30:00Z"
      }
    }
  }
}
```

#### POST /api/waitlist-transparency/join
Join transparent waitlist.

**Request Body:**
```json
{
  "waitlistId": "twl_123",
  "partySize": 4,
  "displayName": "Johnson Party",
  "preferences": {
    "seatingArea": "outdoor",
    "accessibility": true
  },
  "notifications": {
    "positionUpdates": true,
    "fiveMinuteWarning": true
  }
}
```

### Mobile App Features

#### POST /api/mobile-app/register-device
Register mobile device for notifications.

**Request Body:**
```json
{
  "platform": "ios",
  "deviceInfo": {
    "model": "iPhone 14 Pro",
    "osVersion": "17.0",
    "appVersion": "2.0.0"
  },
  "pushTokens": {
    "fcm": "fcm_token_123"
  }
}
```

#### POST /api/mobile-app/sync
Sync offline changes.

**Request Body:**
```json
{
  "deviceId": "dev_123",
  "changes": [
    {
      "type": "create",
      "entity": "favorite",
      "data": {...},
      "timestamp": "2024-09-24T10:00:00Z"
    }
  ]
}
```

### Special Occasions

#### POST /api/occasions/create
Create special occasion tracking.

**Request Body:**
```json
{
  "type": "anniversary",
  "date": "2024-10-15",
  "recurring": true,
  "preferences": {
    "restaurantTypes": ["fine_dining", "romantic"],
    "priceRange": [3, 4]
  },
  "reminderDays": [14, 7, 1]
}
```

### Restaurant Chain Management

#### POST /api/chains/create
Create restaurant chain.

**Request Body:**
```json
{
  "name": "Gourmet Group",
  "headquarters": {
    "address": "123 Corporate Blvd",
    "city": "San Francisco",
    "country": "USA"
  },
  "brandGuidelines": {...},
  "sharedConfig": {
    "menuSync": true,
    "pricingStrategy": "regional",
    "loyaltyProgram": "unified"
  }
}
```

#### POST /api/chains/:chainId/locations
Add location to chain.

### Corporate Accounts

#### POST /api/corporate/create
Create corporate account.

**Request Body:**
```json
{
  "companyName": "Tech Corp",
  "billingAddress": {...},
  "spendingLimits": {
    "monthly": 50000,
    "perEmployee": 200,
    "perMeal": 100
  },
  "approvalWorkflow": {
    "threshold": 500,
    "approvers": ["manager_123"]
  }
}
```

## Innovative Features

### Blockchain Loyalty Points
#### GET /api/blockchain/balance/:userId
Get blockchain-verified points balance.

### VR Restaurant Preview
#### GET /api/vr/tour/:restaurantId
Get VR tour assets for restaurant.

### AI Concierge
#### POST /api/ai/recommend
Get AI-powered recommendations.

**Request Body:**
```json
{
  "preferences": "romantic dinner for anniversary",
  "dateTime": "2024-10-15T19:00:00Z",
  "location": "San Francisco",
  "budget": 200
}
```

### Voice Reservations
#### POST /api/voice/process
Process voice command for reservation.

### Predictive Preferences
#### GET /api/ai/preferences/:userId
Get AI-learned user preferences.

### Social Dining
#### POST /api/social/match
Find dining companions with similar interests.

### Sustainability Scoring
#### GET /api/sustainability/:restaurantId
Get detailed sustainability metrics.

### AR Menu Preview
#### GET /api/ar/menu/:restaurantId
Get AR menu visualization data.

## Error Handling

All API responses follow a consistent error format:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input parameters",
    "details": {
      "field": "email",
      "issue": "Invalid email format"
    }
  },
  "timestamp": "2024-09-24T12:00:00Z"
}
```

### Error Codes
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `409` - Conflict
- `422` - Unprocessable Entity
- `429` - Too Many Requests
- `500` - Internal Server Error
- `503` - Service Unavailable

## Rate Limiting

API rate limits are enforced per endpoint:

- **Standard endpoints**: 100 requests/minute
- **Search endpoints**: 30 requests/minute
- **Analytics endpoints**: 10 requests/minute
- **AI endpoints**: 5 requests/minute

Rate limit headers are included in all responses:
- `X-RateLimit-Limit`: Maximum requests allowed
- `X-RateLimit-Remaining`: Requests remaining
- `X-RateLimit-Reset`: Unix timestamp when limit resets

## Webhooks

Configure webhooks to receive real-time updates:

### Available Events
- `reservation.created`
- `reservation.confirmed`
- `reservation.cancelled`
- `review.submitted`
- `payment.processed`
- `loyalty.points_earned`
- `integration.status_changed`

### Webhook Payload
```json
{
  "event": "reservation.created",
  "timestamp": "2024-09-24T12:00:00Z",
  "data": {...},
  "signature": "sha256=..."
}
```

## SDKs and Libraries

Official SDKs available for:
- JavaScript/TypeScript (npm: @opentable-clone/sdk)
- Python (pip: opentable-clone)
- Ruby (gem: opentable-clone)
- PHP (composer: opentable-clone/sdk)
- Go (go get: github.com/opentable-clone/go-sdk)

## Support

- **Documentation**: https://docs.opentable-clone.com
- **API Status**: https://status.opentable-clone.com
- **Support Email**: api-support@opentable-clone.com
- **Developer Forum**: https://forum.opentable-clone.com