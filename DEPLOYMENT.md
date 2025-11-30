# OpenTable Clone - Deployment Guide

This guide covers deploying the OpenTable Clone application to various environments.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Environment Setup](#environment-setup)
3. [Database Setup](#database-setup)
4. [Docker Deployment](#docker-deployment)
5. [AWS Deployment](#aws-deployment)
6. [Heroku Deployment](#heroku-deployment)
7. [DigitalOcean Deployment](#digitalocean-deployment)
8. [Monitoring and Maintenance](#monitoring-and-maintenance)

## Prerequisites

- Node.js 18+ and npm
- PostgreSQL 13+
- Redis 6+
- Docker and Docker Compose (for containerized deployment)
- Git
- Domain name (for production)
- SSL certificates (for production)

## Environment Setup

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/opentable-clone.git
cd opentable-clone
```

### 2. Environment Variables

Create production environment files:

#### Backend (.env.production)

```env
NODE_ENV=production
PORT=3001
DATABASE_URL=postgresql://user:password@host:5432/opentable_prod
REDIS_URL=redis://host:6379
JWT_SECRET=your_production_jwt_secret
JWT_EXPIRES_IN=15m
JWT_REFRESH_SECRET=your_production_refresh_secret
JWT_REFRESH_EXPIRES_IN=30d
STRIPE_SECRET_KEY=sk_live_your_stripe_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
FRONTEND_URL=https://yourdomain.com
EMAIL_HOST=smtp.sendgrid.net
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=apikey
EMAIL_PASS=your_sendgrid_api_key
EMAIL_FROM=noreply@yourdomain.com
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_S3_BUCKET=opentable-clone-prod
FIREBASE_SERVICE_ACCOUNT={"type":"service_account"...}
```

#### Frontend (.env.production)

```env
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
NEXT_PUBLIC_SOCKET_URL=https://api.yourdomain.com
NEXTAUTH_URL=https://yourdomain.com
NEXTAUTH_SECRET=your_nextauth_secret
```

## Database Setup

### 1. Create Production Database

```sql
CREATE DATABASE opentable_prod;
CREATE USER opentable_user WITH ENCRYPTED PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE opentable_prod TO opentable_user;
```

### 2. Run Migrations

```bash
cd backend
npm run migrate:up
```

### 3. Seed Initial Data (Optional)

```bash
npm run seed:up
```

## Docker Deployment

### 1. Build Images

```bash
# Build all services
docker-compose -f docker-compose.yml build

# Or build specific services
docker-compose build backend
docker-compose build frontend
```

### 2. Run with Docker Compose

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### 3. Production Docker Compose

Create `docker-compose.prod.yml`:

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_DB: opentable_prod
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data
    restart: unless-stopped

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
      target: production
    environment:
      NODE_ENV: production
      DATABASE_URL: postgresql://${DB_USER}:${DB_PASSWORD}@postgres:5432/opentable_prod
      REDIS_URL: redis://redis:6379
    depends_on:
      - postgres
      - redis
    restart: unless-stopped

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
      target: production
    environment:
      NODE_ENV: production
      NEXT_PUBLIC_API_URL: https://api.yourdomain.com
    depends_on:
      - backend
    restart: unless-stopped

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.prod.conf:/etc/nginx/nginx.conf:ro
      - ./ssl:/etc/nginx/ssl:ro
    depends_on:
      - frontend
      - backend
    restart: unless-stopped

volumes:
  postgres_data:
  redis_data:
```

## AWS Deployment

### 1. EC2 Instance Setup

```bash
# Connect to EC2 instance
ssh -i your-key.pem ec2-user@your-instance-ip

# Install Docker
sudo yum update -y
sudo amazon-linux-extras install docker
sudo service docker start
sudo usermod -a -G docker ec2-user

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

### 2. RDS PostgreSQL Setup

1. Create RDS PostgreSQL instance
2. Configure security groups
3. Update DATABASE_URL in environment

### 3. ElastiCache Redis Setup

1. Create ElastiCache Redis cluster
2. Configure security groups
3. Update REDIS_URL in environment

### 4. S3 Bucket Setup

```bash
# Create bucket
aws s3 mb s3://opentable-clone-prod

# Configure CORS
aws s3api put-bucket-cors --bucket opentable-clone-prod --cors-configuration file://cors.json
```

### 5. Load Balancer Configuration

1. Create Application Load Balancer
2. Configure target groups for backend and frontend
3. Set up SSL certificates

### 6. Auto Scaling

```bash
# Create launch template
aws ec2 create-launch-template --launch-template-name opentable-template --version-description "v1" --launch-template-data file://launch-template.json

# Create auto scaling group
aws autoscaling create-auto-scaling-group --auto-scaling-group-name opentable-asg --launch-template LaunchTemplateName=opentable-template --min-size 2 --max-size 10 --desired-capacity 2
```

## Heroku Deployment

### 1. Install Heroku CLI

```bash
# macOS
brew tap heroku/brew && brew install heroku

# Ubuntu
curl https://cli-assets.heroku.com/install-ubuntu.sh | sh
```

### 2. Create Heroku Apps

```bash
# Create backend app
heroku create opentable-clone-api
heroku addons:create heroku-postgresql:hobby-dev
heroku addons:create heroku-redis:hobby-dev

# Create frontend app
heroku create opentable-clone-web
```

### 3. Configure Environment Variables

```bash
# Backend
heroku config:set NODE_ENV=production -a opentable-clone-api
heroku config:set JWT_SECRET=your_secret -a opentable-clone-api
# ... set all other variables

# Frontend
heroku config:set NEXT_PUBLIC_API_URL=https://opentable-clone-api.herokuapp.com -a opentable-clone-web
```

### 4. Deploy

```bash
# Backend
git subtree push --prefix backend heroku-backend master

# Frontend
git subtree push --prefix frontend heroku-frontend master
```

## DigitalOcean Deployment

### 1. Create Droplet

```bash
# Create droplet with Docker pre-installed
doctl compute droplet create opentable-prod --size s-2vcpu-4gb --image docker-20-04 --region nyc1
```

### 2. Setup Managed Database

```bash
# Create PostgreSQL cluster
doctl databases create opentable-db --engine pg --region nyc1 --size db-s-1vcpu-1gb

# Create Redis cluster
doctl databases create opentable-redis --engine redis --region nyc1 --size db-s-1vcpu-1gb
```

### 3. Configure Firewall

```bash
doctl compute firewall create --name opentable-firewall --inbound-rules "protocol:tcp,ports:22,sources:addresses:0.0.0.0/0 protocol:tcp,ports:80,sources:addresses:0.0.0.0/0 protocol:tcp,ports:443,sources:addresses:0.0.0.0/0"
```

### 4. Deploy with Docker

```bash
# SSH into droplet
ssh root@your-droplet-ip

# Clone repository
git clone https://github.com/yourusername/opentable-clone.git
cd opentable-clone

# Run Docker Compose
docker-compose -f docker-compose.prod.yml up -d
```

## Monitoring and Maintenance

### 1. Health Checks

Create health check endpoints:

```typescript
// backend/src/routes/health.routes.ts
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

router.get('/health/detailed', async (req, res) => {
  const checks = {
    database: await checkDatabase(),
    redis: await checkRedis(),
    storage: await checkStorage(),
  };
  
  res.json({
    status: Object.values(checks).every(c => c.status === 'ok') ? 'ok' : 'degraded',
    checks,
  });
});
```

### 2. Logging

Configure centralized logging:

```bash
# Install logging agent
curl -sSO https://dl.google.com/cloudagents/add-logging-agent-repo.sh
sudo bash add-logging-agent-repo.sh
sudo apt-get update
sudo apt-get install google-fluentd
```

### 3. Monitoring Setup

#### Prometheus Configuration

```yaml
# prometheus.yml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'backend'
    static_configs:
      - targets: ['backend:3001']
  
  - job_name: 'frontend'
    static_configs:
      - targets: ['frontend:3000']
```

#### Grafana Dashboard

Import dashboard JSON for monitoring:
- API response times
- Database query performance
- Redis hit/miss rates
- Error rates
- Active users

### 4. Backup Strategy

#### Database Backup

```bash
# Create backup script
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups"
DB_NAME="opentable_prod"

# Backup database
pg_dump $DATABASE_URL > $BACKUP_DIR/backup_$DATE.sql

# Upload to S3
aws s3 cp $BACKUP_DIR/backup_$DATE.sql s3://opentable-backups/db/

# Clean old backups (keep last 30 days)
find $BACKUP_DIR -name "backup_*.sql" -mtime +30 -delete
```

#### Automated Backups

```bash
# Add to crontab
0 2 * * * /home/ubuntu/backup.sh
```

### 5. SSL/TLS Setup

#### Let's Encrypt with Certbot

```bash
# Install Certbot
sudo apt-get update
sudo apt-get install certbot python3-certbot-nginx

# Obtain certificate
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com -d api.yourdomain.com

# Auto-renewal
sudo certbot renew --dry-run
```

### 6. Performance Optimization

#### CDN Configuration

```nginx
# nginx.conf
location ~* \.(jpg|jpeg|png|gif|ico|css|js)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

#### Database Optimization

```sql
-- Create indexes
CREATE INDEX idx_reservations_date ON reservations(date);
CREATE INDEX idx_reservations_restaurant_date ON reservations(restaurant_id, date);
CREATE INDEX idx_restaurants_city ON restaurants(city);
CREATE INDEX idx_restaurants_cuisine ON restaurants(cuisine_type);

-- Analyze tables
ANALYZE reservations;
ANALYZE restaurants;
ANALYZE users;
```

### 7. Security Hardening

#### Firewall Rules

```bash
# UFW setup
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow http
sudo ufw allow https
sudo ufw enable
```

#### Security Headers

```nginx
# nginx.conf
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Referrer-Policy "no-referrer-when-downgrade" always;
add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;
```

### 8. Scaling Considerations

#### Horizontal Scaling

```yaml
# docker-compose.scale.yml
services:
  backend:
    deploy:
      replicas: 3
      restart_policy:
        condition: on-failure
        delay: 5s
        max_attempts: 3
```

#### Database Read Replicas

```javascript
// Configure Sequelize for read replicas
const sequelize = new Sequelize({
  dialect: 'postgres',
  replication: {
    read: [
      { host: 'read-replica-1.amazonaws.com' },
      { host: 'read-replica-2.amazonaws.com' }
    ],
    write: { host: 'master.amazonaws.com' }
  }
});
```

## Troubleshooting

### Common Issues

1. **Database Connection Errors**
   - Check security groups/firewall rules
   - Verify connection string
   - Check database server status

2. **Redis Connection Issues**
   - Verify Redis is running
   - Check max connections limit
   - Monitor memory usage

3. **File Upload Problems**
   - Check S3 bucket permissions
   - Verify CORS configuration
   - Check file size limits

4. **Performance Issues**
   - Enable query logging
   - Check for N+1 queries
   - Monitor CPU and memory usage
   - Review database indexes

### Debug Commands

```bash
# Check container logs
docker logs -f container_name

# Database connections
psql $DATABASE_URL -c "SELECT count(*) FROM pg_stat_activity;"

# Redis info
redis-cli info stats

# System resources
htop
df -h
free -m
```

## Maintenance Mode

```javascript
// maintenance.js
const maintenanceMode = process.env.MAINTENANCE_MODE === 'true';

app.use((req, res, next) => {
  if (maintenanceMode && !req.path.startsWith('/health')) {
    return res.status(503).json({
      message: 'Service temporarily unavailable for maintenance',
      retryAfter: 3600
    });
  }
  next();
});
```

## Rollback Procedure

```bash
# Tag releases
git tag -a v1.0.0 -m "Release version 1.0.0"
git push origin v1.0.0

# Rollback to previous version
docker-compose down
git checkout v0.9.0
docker-compose build
docker-compose up -d

# Database rollback
npm run migrate:down 1
```