# 🚀 OpenTable Clone - Production Deployment Guide

## Overview

This guide provides comprehensive instructions for deploying the OpenTable Clone application to production with all integrated services including blockchain loyalty, monitoring, caching, and real-time features.

## 📋 Pre-Deployment Checklist

### 🔧 Infrastructure Requirements

- [ ] **Server Resources**
  - Minimum: 8 vCPUs, 16GB RAM, 100GB SSD
  - Recommended: 16 vCPUs, 32GB RAM, 200GB SSD
  - Network: 1Gbps minimum bandwidth

- [ ] **Database**
  - PostgreSQL 14+ with read replicas for high availability
  - Connection pooling configured (PgBouncer recommended)
  - Backup strategy implemented (automated daily backups)

- [ ] **External Services**
  - Redis cluster or managed Redis service
  - Domain name and SSL certificates
  - CDN for static assets (CloudFront, Cloudflare)
  - Email service (SendGrid, AWS SES)
  - SMS service (Twilio)

### 🔐 Security Configuration

- [ ] **Environment Variables**
  - All secrets properly configured (see .env.example)
  - JWT secrets generated with high entropy
  - Database passwords using strong credentials
  - API keys for external services configured

- [ ] **Network Security**
  - Firewall rules configured (ports 80, 443, 22 only)
  - Rate limiting configured for all endpoints
  - HTTPS enforced with proper SSL certificates
  - Security headers implemented

- [ ] **Blockchain Security**
  - Wallet private keys stored in secure vault
  - Smart contract addresses verified
  - Gas limits and pricing configured
  - Blockchain RPC endpoints secured

### 📊 Monitoring Setup

- [ ] **Application Monitoring**
  - Prometheus metrics collection enabled
  - Grafana dashboards configured
  - Alert rules for critical metrics
  - Log aggregation setup (ELK stack or similar)

- [ ] **Health Checks**
  - Load balancer health checks configured
  - Application health endpoints verified
  - Database connection monitoring
  - External service dependency checks

## 🛠️ Deployment Steps

### Step 1: Environment Preparation

```bash
# 1. Clone repository
git clone <repository-url>
cd opentable-clone

# 2. Set up environment
cp .env.example .env
# Edit .env with production values

# 3. Create logs directory
chmod +x backend/scripts/setup-logs.sh
./backend/scripts/setup-logs.sh

# 4. Set up database
# Run database migrations
npm run migrate

# 5. Build applications
cd backend && npm run build
cd ../frontend && npm run build:production
```

### Step 2: Docker Deployment

```bash
# 1. Build Docker images
docker-compose build

# 2. Run database migrations
docker-compose run --rm backend npm run migrate

# 3. Start all services
docker-compose up -d

# 4. Verify services are running
docker-compose ps
./scripts/health-check-all.sh
```

### Step 3: Load Balancer Configuration

```nginx
# Nginx configuration example
upstream backend {
    server backend:3001;
}

upstream frontend {
    server frontend:3000;
}

server {
    listen 80;
    server_name yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com;
    
    ssl_certificate /path/to/certificate.crt;
    ssl_certificate_key /path/to/private.key;
    
    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    
    # API routes
    location /api {
        proxy_pass http://backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # Frontend
    location / {
        proxy_pass http://frontend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # WebSocket support
    location /socket.io/ {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

### Step 4: Monitoring Setup

```bash
# 1. Start monitoring services
docker-compose up -d prometheus grafana

# 2. Import Grafana dashboards
./scripts/setup-monitoring.sh

# 3. Configure alerting
./scripts/setup-alerts.sh

# 4. Verify monitoring
curl http://localhost:9090/metrics  # Prometheus
curl http://localhost:3000         # Grafana
```

## 🔍 Post-Deployment Verification

### Functional Testing

```bash
# 1. Run health checks
./scripts/health-check-all.sh

# 2. API endpoint verification
curl -f https://yourdomain.com/api/health
curl -f https://yourdomain.com/api/monitoring/health

# 3. Frontend verification
curl -f https://yourdomain.com/

# 4. WebSocket testing
node scripts/test-websocket.js

# 5. Database connectivity
node scripts/test-database.js

# 6. Blockchain integration
node scripts/test-blockchain.js
```

### Performance Testing

```bash
# Load testing with artillery
npm install -g artillery
artillery run tests/load-test.yml

# Performance monitoring
./scripts/performance-test.sh

# Memory and CPU monitoring
docker stats
```

### Security Verification

```bash
# SSL certificate verification
openssl s_client -connect yourdomain.com:443 -servername yourdomain.com

# Security headers check
curl -I https://yourdomain.com/

# Vulnerability scanning
npm audit
docker run --rm -v "$PWD":/app clair-scanner
```

## 📈 Scaling Considerations

### Horizontal Scaling

- **Backend**: Multiple backend instances behind load balancer
- **Frontend**: CDN distribution for static assets
- **Database**: Read replicas for query load distribution
- **Redis**: Redis Cluster for high availability
- **WebSocket**: Sticky sessions or Redis adapter

### Performance Optimization

- **Caching Strategy**: Redis for session and application cache
- **Database Optimization**: Connection pooling, query optimization
- **CDN Configuration**: Static asset caching, geographic distribution
- **Image Optimization**: WebP format, responsive images

## 🚨 Monitoring & Alerting

### Critical Metrics

- **Application Health**: Response time, error rate, throughput
- **Infrastructure**: CPU usage, memory usage, disk space
- **Database**: Connection count, query performance, replication lag
- **Blockchain**: Transaction success rate, gas prices, wallet balance

### Alert Configuration

```yaml
# Prometheus alert rules example
groups:
- name: opentable-alerts
  rules:
  - alert: HighErrorRate
    expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.1
    for: 5m
    annotations:
      summary: High error rate detected
      
  - alert: DatabaseConnectionHigh
    expr: postgresql_connections > 80
    for: 2m
    annotations:
      summary: Database connection count high
      
  - alert: BlockchainTransactionFailed
    expr: blockchain_transaction_failure_rate > 0.05
    for: 1m
    annotations:
      summary: Blockchain transaction failure rate high
```

## 🔧 Maintenance Procedures

### Regular Maintenance

- **Daily**: Health check verification, log review
- **Weekly**: Performance metrics review, security updates
- **Monthly**: Database maintenance, backup verification
- **Quarterly**: Security audits, dependency updates

### Backup & Recovery

```bash
# Database backup
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d_%H%M%S).sql

# Application backup
tar -czf app_backup_$(date +%Y%m%d).tar.gz /app

# Recovery testing
./scripts/test-recovery.sh
```

### Log Management

```bash
# Log rotation verification
logrotate -d /etc/logrotate.d/opentable-clone

# Log analysis
./scripts/analyze-logs.sh

# Archive old logs
./backend/logs/cleanup.sh
```

## 🚨 Troubleshooting

### Common Issues

1. **Database Connection Failures**
   - Check connection string and credentials
   - Verify database server status
   - Review connection pool settings

2. **Redis Connection Issues**
   - Verify Redis server status
   - Check Redis authentication
   - Review connection configuration

3. **Blockchain Transaction Failures**
   - Check wallet balance and gas prices
   - Verify smart contract addresses
   - Review blockchain network status

4. **WebSocket Connection Problems**
   - Check proxy configuration
   - Verify WebSocket upgrade headers
   - Review network connectivity

### Emergency Procedures

```bash
# Quick service restart
docker-compose restart

# Scale up resources
docker-compose up -d --scale backend=3

# Emergency maintenance mode
./scripts/maintenance-mode.sh enable

# Rollback deployment
./scripts/rollback.sh <previous_version>
```

## 📞 Support Contacts

- **Infrastructure Team**: infra@company.com
- **Database Team**: dba@company.com
- **Security Team**: security@company.com
- **On-Call Engineer**: +1-XXX-XXX-XXXX

## 📚 Additional Resources

- [API Documentation](./API_DOCUMENTATION.md)
- [Architecture Overview](./ARCHITECTURE.md)
- [Development Guide](./README.md)
- [Security Guidelines](./SECURITY.md)

---

**Last Updated**: December 26, 2024  
**Version**: 1.0.0  
**Status**: Production Ready ✅
