# 🚀 OpenTable Clone Deployment Guide

## Quick Start

### Option 1: Local Development
```bash
# Quick local deployment
./scripts/quick-deploy.sh staging
```

### Option 2: Production Deployment
```bash
# Full production deployment
./deploy.sh production
```

## Prerequisites

- Node.js 18+
- Docker & Docker Compose
- Kubernetes cluster (for production)
- PostgreSQL & Redis instances
- Polygon wallet with MATIC tokens

## Environment Setup

### 1. Configure Environment Variables

Copy and customize environment files:
```bash
cp .env.staging .env.local
cp .env.production .env.prod
```

Update with your actual values:
- Database URLs
- API keys (OpenAI, Google Maps, Stripe)
- OAuth credentials
- Blockchain private keys

### 2. Smart Contract Deployment

```bash
cd backend
npm install
npm run blockchain:compile

# Deploy to testnet
npm run blockchain:deploy:testnet

# Deploy to mainnet
npm run blockchain:deploy
```

### 3. Database Setup

```bash
# Initialize database
npm run db:setup
npm run db:migrate
npm run db:seed
```

## Deployment Options

### Local Development
```bash
# Start all services
docker-compose up -d

# Or run individually
cd backend && npm run dev
cd frontend && npm run dev
```

### Staging Environment
```bash
# Deploy to staging
./deploy.sh staging

# Access staging
# Frontend: https://staging.opentable-clone.com
# Backend: https://staging-api.opentable-clone.com
```

### Production Environment
```bash
# Deploy to production
./deploy.sh production

# Access production
# Frontend: https://opentable-clone.com
# Backend: https://api.opentable-clone.com
```

## Kubernetes Deployment

### Prerequisites
- Kubernetes cluster
- kubectl configured
- Docker registry access

### Deploy
```bash
# Create namespace and secrets
kubectl apply -f k8s/namespace.yaml

# Deploy applications
kubectl apply -f k8s/backend-deployment.yaml
kubectl apply -f k8s/frontend-deployment.yaml

# Check status
kubectl get pods -n opentable
```

## Monitoring & Maintenance

### Health Checks
```bash
# Backend health
curl https://api.opentable-clone.com/health

# Frontend health
curl https://opentable-clone.com/api/health
```

### Logs
```bash
# Kubernetes logs
kubectl logs -f deployment/opentable-backend -n opentable

# Docker logs
docker-compose logs -f backend
```

### Scaling
```bash
# Scale backend
kubectl scale deployment opentable-backend --replicas=5 -n opentable

# Scale frontend
kubectl scale deployment opentable-frontend --replicas=3 -n opentable
```

## Testing

### Run Tests
```bash
# Backend tests
cd backend && npm test

# Frontend tests
cd frontend && npm test

# E2E tests
cd frontend && npm run test:e2e
```

### Load Testing
```bash
# Install k6
brew install k6

# Run load tests
k6 run tests/load/reservation-flow.js
```

## Troubleshooting

### Common Issues

1. **Smart Contract Deployment Fails**
   - Check wallet has sufficient MATIC
   - Verify RPC URL is correct
   - Ensure private key is valid

2. **Database Connection Issues**
   - Verify DATABASE_URL format
   - Check database server is running
   - Ensure firewall allows connections

3. **OAuth Login Fails**
   - Verify OAuth app configurations
   - Check redirect URLs match
   - Ensure client secrets are correct

4. **Kubernetes Pods Not Starting**
   - Check resource limits
   - Verify secrets are created
   - Review pod logs for errors

### Debug Commands
```bash
# Check pod status
kubectl describe pod <pod-name> -n opentable

# View recent events
kubectl get events -n opentable --sort-by=.metadata.creationTimestamp

# Access pod shell
kubectl exec -it <pod-name> -n opentable -- /bin/sh
```

## Security Checklist

- [ ] Environment variables secured
- [ ] Database credentials rotated
- [ ] SSL certificates configured
- [ ] Rate limiting enabled
- [ ] CORS properly configured
- [ ] OAuth apps secured
- [ ] Blockchain private keys secured
- [ ] Monitoring alerts configured

## Performance Optimization

### Backend
- Enable Redis caching
- Configure connection pooling
- Optimize database queries
- Enable compression

### Frontend
- Enable CDN
- Optimize images
- Configure caching headers
- Minimize bundle size

### Blockchain
- Batch transactions
- Optimize gas usage
- Use layer 2 solutions
- Cache contract calls

## Backup & Recovery

### Database Backup
```bash
# Create backup
pg_dump $DATABASE_URL > backup.sql

# Restore backup
psql $DATABASE_URL < backup.sql
```

### Configuration Backup
```bash
# Backup Kubernetes configs
kubectl get all -n opentable -o yaml > k8s-backup.yaml

# Backup environment files
tar -czf env-backup.tar.gz .env.*
```

## Support

For deployment issues:
1. Check this guide
2. Review application logs
3. Check Kubernetes events
4. Verify environment configuration
5. Test individual components

## Next Steps After Deployment

1. **Monitor Performance**
   - Set up Grafana dashboards
   - Configure Prometheus metrics
   - Enable error tracking

2. **User Onboarding**
   - Create user documentation
   - Set up support channels
   - Prepare marketing materials

3. **Continuous Improvement**
   - Collect user feedback
   - Monitor usage analytics
   - Plan feature updates

🎉 **Congratulations! Your OpenTable clone is now live!** 🍽️
