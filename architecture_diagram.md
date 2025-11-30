# ServiceSphere Architecture Diagrams

## System Architecture Overview

```mermaid
graph TB
    subgraph "Client Layer"
        WEB[Web App<br/>React + TypeScript]
        MOBILE[Mobile Apps<br/>React Native]
        WIDGET[Embeddable Widget<br/>Vanilla JS]
    end
    
    subgraph "CDN & Load Balancer"
        CF[CloudFront CDN]
        ALB[Application Load Balancer]
    end
    
    subgraph "API Gateway"
        KONG[Kong API Gateway<br/>• Authentication<br/>• Rate Limiting<br/>• Routing]
    end
    
    subgraph "Microservices"
        AUTH[Auth Service<br/>Node.js]
        SEARCH[Search Service<br/>Python + ES]
        BOOKING[Booking Service<br/>Node.js]
        RESTAURANT[Restaurant Service<br/>Node.js]
        GUEST[Guest Service<br/>Node.js]
        NOTIFY[Notification Service<br/>Node.js]
        PAY[Payment Service<br/>Node.js]
        AI[AI/ML Service<br/>Python]
    end
    
    subgraph "Data Layer"
        PG[(PostgreSQL<br/>Primary DB)]
        MONGO[(MongoDB<br/>Documents)]
        ES[(Elasticsearch<br/>Search)]
        REDIS[(Redis<br/>Cache & Sessions)]
    end
    
    subgraph "Message Queue"
        KAFKA[Apache Kafka<br/>Event Streaming]
    end
    
    WEB --> CF
    MOBILE --> CF
    WIDGET --> CF
    CF --> ALB
    ALB --> KONG
    
    KONG --> AUTH
    KONG --> SEARCH
    KONG --> BOOKING
    KONG --> RESTAURANT
    KONG --> GUEST
    KONG --> NOTIFY
    KONG --> PAY
    KONG --> AI
    
    AUTH --> PG
    AUTH --> REDIS
    SEARCH --> ES
    BOOKING --> PG
    BOOKING --> KAFKA
    RESTAURANT --> PG
    RESTAURANT --> MONGO
    GUEST --> PG
    NOTIFY --> KAFKA
    PAY --> PG
    AI --> PG
    AI --> REDIS
```

## Data Flow for Restaurant Booking

```mermaid
sequenceDiagram
    participant U as User
    participant W as Web App
    participant G as API Gateway
    participant A as Auth Service
    participant S as Search Service
    participant B as Booking Service
    participant N as Notification Service
    participant R as Restaurant Service
    
    U->>W: Search for restaurant
    W->>G: GET /api/search
    G->>A: Validate token
    A-->>G: Token valid
    G->>S: Search query
    S-->>G: Restaurant results
    G-->>W: Display results
    W-->>U: Show restaurants
    
    U->>W: Select restaurant & time
    W->>G: POST /api/availability
    G->>B: Check availability
    B->>R: Get table info
    R-->>B: Table data
    B-->>G: Available slots
    G-->>W: Time slots
    W-->>U: Show available times
    
    U->>W: Confirm booking
    W->>G: POST /api/bookings
    G->>B: Create booking
    B->>R: Reserve table
    B->>N: Send confirmation
    B-->>G: Booking created
    G-->>W: Booking details
    W-->>U: Confirmation page
    
    N->>U: Email/SMS confirmation
```

## Database Schema Relationships

```mermaid
erDiagram
    USERS ||--o{ BOOKINGS : makes
    USERS ||--o{ REVIEWS : writes
    USERS ||--o{ FAVORITES : has
    USERS {
        uuid id PK
        string email UK
        string password_hash
        string user_type
        jsonb profile
        timestamp created_at
    }
    
    RESTAURANTS ||--o{ BOOKINGS : receives
    RESTAURANTS ||--o{ TABLES : has
    RESTAURANTS ||--o{ REVIEWS : gets
    RESTAURANTS ||--o{ MENU_ITEMS : offers
    RESTAURANTS {
        uuid id PK
        string name
        string slug UK
        point coordinates
        jsonb address
        array cuisine_types
        int price_range
        jsonb operating_hours
    }
    
    TABLES ||--o{ BOOKINGS : reserved_for
    TABLES {
        uuid id PK
        uuid restaurant_id FK
        string table_number
        int capacity
        string location
        boolean is_available
    }
    
    BOOKINGS {
        uuid id PK
        uuid restaurant_id FK
        uuid user_id FK
        uuid table_id FK
        date booking_date
        time booking_time
        int party_size
        string status
        string confirmation_code UK
    }
    
    REVIEWS {
        uuid id PK
        uuid restaurant_id FK
        uuid user_id FK
        int rating
        text content
        timestamp created_at
    }
```

## Deployment Architecture

```mermaid
graph TB
    subgraph "AWS Multi-Region Setup"
        subgraph "Region: US-East-1 (Primary)"
            EKS1[EKS Cluster]
            RDS1[(RDS PostgreSQL<br/>Primary)]
            EC1[(ElastiCache<br/>Redis)]
            S3_1[S3 Bucket<br/>Static Assets]
        end
        
        subgraph "Region: EU-West-1"
            EKS2[EKS Cluster]
            RDS2[(RDS PostgreSQL<br/>Read Replica)]
            EC2[(ElastiCache<br/>Redis)]
            S3_2[S3 Bucket<br/>Static Assets]
        end
        
        subgraph "Global Services"
            R53[Route 53<br/>DNS]
            CF2[CloudFront<br/>CDN]
            WAF[AWS WAF]
        end
    end
    
    R53 --> CF2
    CF2 --> WAF
    WAF --> EKS1
    WAF --> EKS2
    
    EKS1 --> RDS1
    EKS1 --> EC1
    EKS2 --> RDS2
    EKS2 --> EC2
    
    RDS1 -.->|Replication| RDS2
    S3_1 -.->|Cross-Region Replication| S3_2
```

## Microservices Communication Pattern

```mermaid
graph LR
    subgraph "Synchronous Communication"
        A1[Service A] -->|REST/gRPC| B1[Service B]
        B1 -->|Response| A1
    end
    
    subgraph "Asynchronous Communication"
        A2[Service A] -->|Publish| K[Kafka]
        K -->|Subscribe| B2[Service B]
        K -->|Subscribe| C2[Service C]
    end
    
    subgraph "Service Mesh"
        ISTIO[Istio Service Mesh<br/>• mTLS<br/>• Circuit Breaking<br/>• Load Balancing]
    end
```

## CI/CD Pipeline

```mermaid
graph LR
    DEV[Developer] -->|Push| GIT[GitHub]
    GIT -->|Webhook| GHA[GitHub Actions]
    
    subgraph "Build Stage"
        GHA --> TEST[Run Tests]
        TEST --> LINT[Lint Code]
        LINT --> BUILD[Build Docker Images]
    end
    
    subgraph "Deploy Stage"
        BUILD --> ECR[Push to ECR]
        ECR --> STAGE[Deploy to Staging]
        STAGE --> E2E[E2E Tests]
        E2E -->|Pass| PROD[Deploy to Production]
    end
    
    PROD --> MON[Monitoring<br/>Prometheus/Grafana]
```

## Security Architecture

```mermaid
graph TB
    subgraph "External Layer"
        USER[Users]
        CDN[CDN/WAF]
    end
    
    subgraph "DMZ"
        LB[Load Balancer<br/>SSL Termination]
        APIGW[API Gateway<br/>Rate Limiting]
    end
    
    subgraph "Application Layer"
        AUTH2[Auth Service<br/>OAuth/JWT]
        APP[Application Services]
    end
    
    subgraph "Data Layer"
        DB[(Encrypted Database)]
        VAULT[HashiCorp Vault<br/>Secrets Management]
    end
    
    USER -->|HTTPS| CDN
    CDN -->|HTTPS| LB
    LB --> APIGW
    APIGW --> AUTH2
    AUTH2 --> APP
    APP --> DB
    APP --> VAULT
    
    style CDN fill:#f9f,stroke:#333,stroke-width:4px
    style AUTH2 fill:#f9f,stroke:#333,stroke-width:4px
    style DB fill:#f9f,stroke:#333,stroke-width:4px
```

## State Management Flow (Frontend)

```mermaid
graph TD
    subgraph "Redux Store"
        STORE[Central Store]
        AUTH_S[Auth State]
        USER_S[User State]
        REST_S[Restaurant State]
        BOOK_S[Booking State]
    end
    
    subgraph "React Components"
        COMP1[Search Component]
        COMP2[Booking Component]
        COMP3[Profile Component]
    end
    
    subgraph "API Layer"
        API[API Service]
        WS[WebSocket Service]
    end
    
    COMP1 -->|Dispatch Action| STORE
    COMP2 -->|Dispatch Action| STORE
    COMP3 -->|Dispatch Action| STORE
    
    STORE --> AUTH_S
    STORE --> USER_S
    STORE --> REST_S
    STORE --> BOOK_S
    
    STORE -->|Subscribe| COMP1
    STORE -->|Subscribe| COMP2
    STORE -->|Subscribe| COMP3
    
    STORE <-->|Async Actions| API
    STORE <-->|Real-time Updates| WS
```

## Mobile App Architecture

```mermaid
graph TB
    subgraph "React Native App"
        NAV[React Navigation]
        SCREENS[Screen Components]
        NATIVE[Native Modules]
    end
    
    subgraph "State & Data"
        REDUX[Redux Store]
        ASYNC[AsyncStorage]
        SQLITE[SQLite<br/>Offline Storage]
    end
    
    subgraph "Native Features"
        LOC[Location Services]
        PUSH[Push Notifications]
        CAM[Camera/Gallery]
        BIO[Biometric Auth]
    end
    
    subgraph "Services"
        API2[API Client]
        SYNC[Sync Service]
        ANALYTICS[Analytics]
    end
    
    NAV --> SCREENS
    SCREENS --> REDUX
    SCREENS --> NATIVE
    
    REDUX --> API2
    REDUX --> ASYNC
    
    NATIVE --> LOC
    NATIVE --> PUSH
    NATIVE --> CAM
    NATIVE --> BIO
    
    SYNC --> SQLITE
    SYNC --> API2
```

## Performance Optimization Strategy

```mermaid
graph LR
    subgraph "Frontend Optimization"
        LAZY[Lazy Loading]
        CACHE1[Browser Cache]
        CDN1[CDN Assets]
        COMPRESS[Compression]
    end
    
    subgraph "Backend Optimization"
        CACHE2[Redis Cache]
        INDEX[DB Indexing]
        POOL[Connection Pooling]
        QUEUE[Job Queue]
    end
    
    subgraph "Infrastructure"
        AUTO[Auto Scaling]
        LB2[Load Balancing]
        REGION[Multi-Region]
        MONITOR[Monitoring]
    end
    
    LAZY --> Performance
    CACHE1 --> Performance
    CDN1 --> Performance
    COMPRESS --> Performance
    
    CACHE2 --> Performance
    INDEX --> Performance
    POOL --> Performance
    QUEUE --> Performance
    
    AUTO --> Performance
    LB2 --> Performance
    REGION --> Performance
    MONITOR --> Performance
```

These diagrams provide a visual representation of the ServiceSphere architecture and can be rendered using any Mermaid-compatible viewer or integrated into documentation tools.
