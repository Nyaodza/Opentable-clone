#!/bin/bash

# Quick Deployment Script for OpenTable Clone
set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

ENVIRONMENT=${1:-staging}

echo -e "${BLUE}🚀 Quick deployment to ${ENVIRONMENT}...${NC}"

# Install dependencies
echo -e "${YELLOW}📦 Installing dependencies...${NC}"
cd backend && npm install
cd ../frontend && npm install
cd ..

# Build applications
echo -e "${YELLOW}🔨 Building applications...${NC}"
cd backend && npm run build
cd ../frontend && npm run build
cd ..

# Deploy smart contracts
echo -e "${YELLOW}🔗 Deploying smart contracts...${NC}"
cd backend
if [ "$ENVIRONMENT" = "production" ]; then
    npm run blockchain:deploy
else
    npm run blockchain:deploy:testnet
fi
cd ..

# Start services with Docker Compose
echo -e "${YELLOW}🐳 Starting services...${NC}"
if [ "$ENVIRONMENT" = "production" ]; then
    docker-compose -f docker-compose.prod.yml up -d
else
    docker-compose up -d
fi

echo -e "${GREEN}✅ Deployment complete!${NC}"
echo -e "${BLUE}🌐 Access your application:${NC}"
echo -e "Frontend: http://localhost:3000"
echo -e "Backend: http://localhost:3001"
echo -e "GraphQL: http://localhost:3001/graphql"
