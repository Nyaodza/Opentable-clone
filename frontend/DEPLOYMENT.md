# Deployment Guide

This guide covers deploying the OpenTable Clone frontend to various platforms.

## Prerequisites

Before deploying, ensure you have:
- All environment variables configured
- Database migrations completed
- Backend API deployed and accessible
- SSL certificates (for production)

## Deployment Options

### 1. Vercel (Recommended)

Vercel provides the easiest deployment for Next.js applications.

#### Steps:

1. **Install Vercel CLI**
   ```bash
   npm i -g vercel
   ```

2. **Login to Vercel**
   ```bash
   vercel login
   ```

3. **Deploy**
   ```bash
   vercel
   ```

4. **Configure Environment Variables**
   - Go to your Vercel dashboard
   - Navigate to Project Settings > Environment Variables
   - Add all variables from `.env.example`

5. **Configure Domain**
   - Add custom domain in Vercel dashboard
   - Update DNS records

### 2. Docker Deployment

#### Build and Run Locally:

```bash
# Build image
docker build -t opentable-frontend .

# Run container
docker run -p 3000:3000 \
  --env-file .env.production \
  opentable-frontend
```

#### Deploy to Cloud Providers:

**AWS ECS:**
```bash
# Build and push to ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin [your-ecr-uri]
docker build -t opentable-frontend .
docker tag opentable-frontend:latest [your-ecr-uri]/opentable-frontend:latest
docker push [your-ecr-uri]/opentable-frontend:latest
```

**Google Cloud Run:**
```bash
# Build and push to GCR
gcloud builds submit --tag gcr.io/[PROJECT-ID]/opentable-frontend

# Deploy
gcloud run deploy --image gcr.io/[PROJECT-ID]/opentable-frontend --platform managed
```

### 3. Traditional VPS Deployment

#### Using PM2:

1. **Install dependencies on server**
   ```bash
   sudo apt update
   sudo apt install nodejs npm nginx
   npm install -g pm2
   ```

2. **Clone and build**
   ```bash
   git clone [your-repo]
   cd opentable-clone/frontend
   npm install
   npm run build
   ```

3. **Create PM2 ecosystem file**
   ```javascript
   // ecosystem.config.js
   module.exports = {
     apps: [{
       name: 'opentable-frontend',
       script: 'npm',
       args: 'start',
       env: {
         NODE_ENV: 'production',
         PORT: 3000
       }
     }]
   };
   ```

4. **Start with PM2**
   ```bash
   pm2 start ecosystem.config.js
   pm2 save
   pm2 startup
   ```

5. **Configure Nginx**
   ```nginx
   server {
       listen 80;
       server_name yourdomain.com;

       location / {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

### 4. Kubernetes Deployment

```yaml
# deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: opentable-frontend
spec:
  replicas: 3
  selector:
    matchLabels:
      app: opentable-frontend
  template:
    metadata:
      labels:
        app: opentable-frontend
    spec:
      containers:
      - name: frontend
        image: your-registry/opentable-frontend:latest
        ports:
        - containerPort: 3000
        env:
        - name: NODE_ENV
          value: "production"
        envFrom:
        - configMapRef:
            name: frontend-config
        - secretRef:
            name: frontend-secrets
```

## Environment Configuration

### Production Environment Variables

Create `.env.production` with:

```env
# Required
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
NEXT_PUBLIC_WS_URL=wss://ws.yourdomain.com
NEXTAUTH_URL=https://yourdomain.com
NEXTAUTH_SECRET=[generate-secure-secret]

# OAuth
GOOGLE_CLIENT_ID=[production-client-id]
GOOGLE_CLIENT_SECRET=[production-client-secret]

# Services
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_xxx
DATABASE_URL=postgresql://user:pass@prod-db:5432/opentable
REDIS_URL=redis://prod-redis:6379

# Optional
SENTRY_DSN=[your-sentry-dsn]
NEXT_PUBLIC_GA_MEASUREMENT_ID=[your-ga-id]
```

## Post-Deployment Checklist

- [ ] SSL certificate configured
- [ ] Environment variables set
- [ ] Database connected and migrated
- [ ] Redis cache connected
- [ ] WebSocket connection working
- [ ] OAuth providers configured
- [ ] Stripe webhooks configured
- [ ] Email service configured
- [ ] CDN configured for static assets
- [ ] Monitoring and alerts set up
- [ ] Backup strategy implemented
- [ ] Rate limiting configured
- [ ] WAF rules configured

## Performance Optimization

1. **Enable CDN**
   - CloudFlare or AWS CloudFront
   - Cache static assets
   - Configure cache headers

2. **Image Optimization**
   - Use Next.js Image component
   - Configure image domains
   - Implement lazy loading

3. **Database Optimization**
   - Add indexes
   - Use connection pooling
   - Implement caching strategy

4. **Bundle Optimization**
   ```bash
   # Analyze bundle
   npm run analyze
   ```

## Monitoring

### Recommended Services:

1. **Application Monitoring**
   - Sentry for error tracking
   - New Relic for performance
   - LogRocket for session replay

2. **Infrastructure Monitoring**
   - CloudWatch (AWS)
   - Stackdriver (GCP)
   - Datadog

3. **Uptime Monitoring**
   - Pingdom
   - UptimeRobot
   - StatusCake

## Security Considerations

1. **Headers**: Security headers are configured in `next.config.js`
2. **HTTPS**: Always use SSL in production
3. **Secrets**: Never commit secrets to Git
4. **Dependencies**: Regular updates with `npm audit`
5. **Rate Limiting**: Configure at API gateway level
6. **WAF**: Use CloudFlare or AWS WAF

## Troubleshooting

### Common Issues:

1. **Build Failures**
   - Check Node.js version (18+)
   - Clear `.next` folder
   - Verify all dependencies

2. **Runtime Errors**
   - Check environment variables
   - Verify API connectivity
   - Check logs: `pm2 logs`

3. **Performance Issues**
   - Enable caching
   - Optimize images
   - Check database queries

## Rollback Strategy

1. **Vercel**: Use deployment history
2. **Docker**: Tag previous versions
3. **PM2**: Keep previous build folder
4. **Kubernetes**: Use deployment rollout

## Support

For deployment support:
- Check logs first
- Review environment variables
- Verify network connectivity
- Contact: devops@opentable-clone.com