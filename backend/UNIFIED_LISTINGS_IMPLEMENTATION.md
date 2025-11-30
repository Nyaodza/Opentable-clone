# Unified Listings Implementation

## Overview

This implementation provides a comprehensive unified listings system that combines local database listings with affiliate/API listings from multiple travel service providers. The system is designed to seamlessly present results from various sources without revealing the source to end users.

## Architecture

### Backend Components

#### 1. Models & Types
- **`UnifiedListing` Model** (`src/models/UnifiedListing.ts`)
  - Comprehensive database model supporting all service types
  - Enums for `ServiceType`, `ListingSource`, and `ListingStatus`
  - Automatic score calculation and location normalization
  - Support for metadata, amenities, and flexible pricing

#### 2. API Provider System
- **Base Provider** (`src/services/api-providers/BaseApiProvider.ts`)
  - Abstract base class with circuit breaker, rate limiting, and caching
  - Automatic response normalization and error handling
  - Health monitoring and quota tracking

- **Provider Factory** (`src/services/api-providers/ApiProviderFactory.ts`)
  - Centralized provider configuration and instantiation
  - Environment-based provider enablement
  - Configurable rate limits, timeouts, and cache TTLs

- **Sample Provider** (`src/services/api-providers/activities/ViatorProvider.ts`)
  - Complete implementation for Viator activities API
  - Demonstrates data transformation and normalization patterns
  - Extensible for other providers

#### 3. Unified Service
- **`UnifiedListingsService`** (`src/services/UnifiedListingsService.ts`)
  - Core service orchestrating local and API searches
  - Parallel fetching with error isolation
  - Smart merging: local first, then interleaved API results
  - Comprehensive caching and admin functions

#### 4. API Layer
- **Controller** (`src/controllers/unified-listings.controller.ts`)
  - RESTful endpoints for search, CRUD, and admin operations
  - View/click/booking tracking
  - Validation and error handling

- **Routes** (`src/routes/unified-listings.routes.ts`)
  - Public search and details endpoints
  - Authenticated listing management
  - Admin provider control and moderation

### Frontend Components

#### 1. React Components
- **`UnifiedListingCard`** - Displays individual listings with uniform styling
- **`UnifiedListingsGrid`** - Infinite scroll grid with loading states
- **`UnifiedListings`** - Complete search page with filters

#### 2. Features
- Service type selection with icons
- Location and date search
- Price and rating filters
- Infinite scroll pagination
- Loading and error states
- Click tracking

## Data Flow

### Search Process
1. **User Search** → Frontend builds `SearchParams`
2. **API Request** → `/api/listings/search` with filters
3. **Service Layer** → `UnifiedListingsService.searchCombinedListings()`
4. **Parallel Fetching**:
   - Local DB query with score calculation
   - Multiple API provider calls (up to 4 results each)
5. **Merging Strategy**:
   - All local listings first (sorted by score)
   - API listings interleaved by provider
   - Unified response format
6. **Caching** → Results cached for 5-10 minutes
7. **Response** → Paginated results with source breakdown

### Listing Merging Algorithm
```typescript
// 1. Sort local listings by calculated score
localListings.sort((a, b) => (b.score || 0) - (a.score || 0));

// 2. Group API listings by provider, limit 4 per provider
const merged = [...localListings];

// 3. Round-robin interleave API listings
while (hasApiListings) {
  for (provider in providers) {
    if (provider.hasListings()) {
      merged.push(provider.getNext());
    }
  }
}
```

## API Provider Integration

### Supported Providers

#### Activities & Tours
- **Viator** - Global tours and activities (implemented)
- **GetYourGuide** - European focus (configured)
- **Travelpayouts** - Multi-category provider (configured)

#### Hotels & Accommodation
- **Booking.com** - Hotel demand API (configured)
- **Expedia EPS Rapid** - Hotel inventory (configured)
- **Vrbo** - Vacation rentals (configured)

#### Transportation
- **Kiwi.com Tequila** - Flight search (configured)
- **Skyscanner** - Flight comparison (configured)
- **DiscoverCars** - Car rentals (configured)
- **Rentalcars.com** - Car rentals (configured)

#### Events & Entertainment
- **Eventbrite** - Event ticketing (configured)
- **Ticketmaster** - Major events (configured)

#### Cruises
- **CruiseDirect** - Cruise bookings (configured)
- **GoToSea** - Cruise aggregator (configured)

### Adding New Providers

1. **Create Provider Class**:
```typescript
export class NewProvider extends BaseApiProvider {
  protected getDefaultHeaders() { /* headers */ }
  protected convertSearchParams(params) { /* convert */ }
  normalizeResponse(data) { /* normalize */ }
}
```

2. **Add to Factory**:
```typescript
const newConfig = this.getProviderConfig(ListingSource.NEW_PROVIDER);
if (newConfig?.enabled) {
  providers[ServiceType.TARGET].push(new NewProvider(newConfig));
}
```

3. **Configure Environment**:
```bash
NEW_PROVIDER_ENABLED=true
NEW_PROVIDER_API_KEY=your_key_here
```

## Configuration

### Environment Variables
See `.env.unified-listings.example` for complete configuration:

```bash
# Provider enablement
VIATOR_ENABLED=true
VIATOR_API_KEY=your_key

# Rate limiting and caching
REDIS_URL=redis://localhost:6379
CACHE_TTL=600  # 10 minutes
```

### Admin Controls
- Enable/disable providers per service type
- Configure max listings per provider (default: 4)
- Monitor provider health and quota
- Moderate user-submitted listings
- Feature/unfeature local listings

## Database Schema

### UnifiedListing Table
```sql
CREATE TABLE unified_listings (
  id UUID PRIMARY KEY,
  service_type ENUM(...) NOT NULL,
  source ENUM(...) DEFAULT 'local',
  external_id VARCHAR,
  title VARCHAR NOT NULL,
  description TEXT,
  location JSONB NOT NULL,
  rating DECIMAL(3,2),
  price DECIMAL(10,2),
  currency VARCHAR(3),
  images TEXT[],
  url VARCHAR NOT NULL,
  metadata JSONB DEFAULT '{}',
  score FLOAT DEFAULT 0,
  status ENUM DEFAULT 'active',
  user_id UUID REFERENCES users(id),
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

-- Indexes for performance
CREATE INDEX ON unified_listings (service_type, city_lower);
CREATE INDEX ON unified_listings (source, status);
CREATE INDEX ON unified_listings (score DESC);
```

## Caching Strategy

### Multi-Level Caching
1. **API Response Cache** - Raw provider responses (5-10 min TTL)
2. **Combined Results Cache** - Merged search results (5 min TTL)
3. **Provider Health Cache** - Health check results (1 min TTL)

### Cache Keys
```typescript
// API provider cache
'listing:viator:activities:paris:2024-01-01:2024-01-07'

// Combined search cache
'combined_listings:hotels:new_york:1:20:price_asc'

// Provider status cache
'provider_status:booking:health'
```

## Performance Optimizations

### Parallel Processing
- All API calls execute in parallel using `Promise.allSettled()`
- Failed providers don't block successful ones
- Circuit breakers prevent cascade failures

### Rate Limiting
- Per-provider rate limits (configurable)
- Token bucket algorithm with `limiter` package
- Graceful degradation when limits exceeded

### Database Optimization
- Compound indexes on search fields
- JSONB for flexible metadata storage
- Calculated score field for fast sorting

## Error Handling

### Circuit Breaker Pattern
```typescript
const circuitBreaker = new CircuitBreaker(apiCall, {
  timeout: 10000,
  errorThresholdPercentage: 50,
  resetTimeout: 30000
});
```

### Graceful Degradation
- Failed API calls return empty arrays, don't crash search
- Local listings always returned if available
- User sees best available results with transparent error logging

## Monitoring & Analytics

### Metrics Tracked
- View counts per listing
- Click-through rates by source
- Booking conversion tracking
- Provider response times
- Error rates by provider

### Admin Dashboard
- Real-time provider status
- Performance metrics
- Revenue attribution
- A/B testing capabilities

## Security Considerations

### API Key Management
- Environment variable storage
- Rotation capability
- Provider-specific permissions

### Rate Limiting Protection
- Prevents API quota exhaustion
- User-level rate limiting
- IP-based protection

### Content Moderation
- User-submitted listings require approval
- Automated content filtering
- Admin moderation interface

## Future Enhancements

### Planned Features
1. **ML-Based Ranking** - Personalized listing scores
2. **Real-Time Inventory** - Live availability checking
3. **Dynamic Pricing** - Price comparison and alerts
4. **Review Aggregation** - Cross-platform review consolidation
5. **Geographic Clustering** - Map-based result presentation

### Scalability Improvements
1. **Microservice Architecture** - Split providers into separate services
2. **CDN Integration** - Image and static content delivery
3. **Search Optimization** - Elasticsearch integration
4. **Async Processing** - Background data synchronization

## Testing Strategy

### Unit Tests
- Provider normalization logic
- Merging algorithm correctness
- Score calculation accuracy

### Integration Tests
- End-to-end search flows
- API provider mocking
- Database operations

### Performance Tests
- Load testing with multiple providers
- Cache effectiveness measurement
- Response time benchmarking

## Deployment

### Required Services
- PostgreSQL database
- Redis cache
- API provider credentials
- Node.js runtime

### Environment Setup
1. Copy `.env.unified-listings.example` to `.env`
2. Configure database connection
3. Add API provider credentials
4. Run database migrations
5. Start application

### Production Considerations
- Load balancer configuration
- Redis clustering for high availability
- API provider SLA monitoring
- Backup and disaster recovery

This implementation provides a solid foundation for a travel marketplace that can scale to handle millions of listings while maintaining excellent user experience and operational efficiency.