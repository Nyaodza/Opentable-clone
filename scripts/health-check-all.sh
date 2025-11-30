#!/bin/bash

# OpenTable Clone - Comprehensive Health Check Script
# Verifies all services are running and healthy

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
BACKEND_URL="${BACKEND_URL:-http://localhost:3001}"
FRONTEND_URL="${FRONTEND_URL:-http://localhost:3000}"
PROMETHEUS_URL="${PROMETHEUS_URL:-http://localhost:9090}"
GRAFANA_URL="${GRAFANA_URL:-http://localhost:3001}"
REDIS_HOST="${REDIS_HOST:-localhost}"
REDIS_PORT="${REDIS_PORT:-6379}"
DATABASE_URL="${DATABASE_URL:-postgresql://localhost:5432/opentable}"

# Timeout for health checks
TIMEOUT=10

echo -e "${BLUE}🏥 OpenTable Clone - Health Check Suite${NC}"
echo -e "${BLUE}======================================${NC}"
echo ""

# Function to check HTTP endpoint
check_http_endpoint() {
    local name=$1
    local url=$2
    local expected_status=${3:-200}
    
    echo -n "Checking $name... "
    
    if curl -f -s -m $TIMEOUT "$url" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ HEALTHY${NC}"
        return 0
    else
        echo -e "${RED}❌ UNHEALTHY${NC}"
        return 1
    fi
}

# Function to check service with custom test
check_service() {
    local name=$1
    local command=$2
    
    echo -n "Checking $name... "
    
    if eval "$command" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ HEALTHY${NC}"
        return 0
    else
        echo -e "${RED}❌ UNHEALTHY${NC}"
        return 1
    fi
}

# Function to check Docker service
check_docker_service() {
    local service_name=$1
    
    echo -n "Checking Docker service $service_name... "
    
    if docker-compose ps "$service_name" | grep -q "Up"; then
        echo -e "${GREEN}✅ RUNNING${NC}"
        return 0
    else
        echo -e "${RED}❌ NOT RUNNING${NC}"
        return 1
    fi
}

# Track overall health
overall_health=0

echo -e "${YELLOW}📊 Core Services${NC}"
echo "=================="

# Backend API Health
if ! check_http_endpoint "Backend API" "$BACKEND_URL/api/health"; then
    overall_health=1
fi

# Frontend Health
if ! check_http_endpoint "Frontend" "$FRONTEND_URL"; then
    overall_health=1
fi

# Database Health
if ! check_service "PostgreSQL Database" "node -e \"
const { Client } = require('pg');
const client = new Client({ connectionString: '$DATABASE_URL' });
client.connect().then(() => {
    client.query('SELECT 1').then(() => {
        client.end();
        process.exit(0);
    });
}).catch(() => process.exit(1));
\""; then
    overall_health=1
fi

# Redis Health
if ! check_service "Redis Cache" "redis-cli -h $REDIS_HOST -p $REDIS_PORT ping | grep -q PONG"; then
    overall_health=1
fi

echo ""
echo -e "${YELLOW}🐳 Docker Services${NC}"
echo "==================="

# Check Docker services
services=("backend" "frontend" "postgres" "redis" "prometheus" "grafana")
for service in "${services[@]}"; do
    if ! check_docker_service "$service"; then
        overall_health=1
    fi
done

echo ""
echo -e "${YELLOW}📈 Monitoring Services${NC}"
echo "======================="

# Prometheus Health
if ! check_http_endpoint "Prometheus" "$PROMETHEUS_URL/-/healthy"; then
    overall_health=1
fi

# Grafana Health
if ! check_http_endpoint "Grafana" "$GRAFANA_URL/api/health"; then
    overall_health=1
fi

echo ""
echo -e "${YELLOW}🔗 API Endpoints${NC}"
echo "=================="

# API endpoint checks
api_endpoints=(
    "Auth:/api/auth/health"
    "Restaurants:/api/restaurants/health"
    "Reservations:/api/reservations/health"
    "Users:/api/users/health"
    "Notifications:/api/notifications/health"
)

for endpoint in "${api_endpoints[@]}"; do
    name="${endpoint%%:*}"
    path="${endpoint##*:}"
    if ! check_http_endpoint "$name API" "$BACKEND_URL$path"; then
        overall_health=1
    fi
done

echo ""
echo -e "${YELLOW}⚡ Real-time Services${NC}"
echo "====================="

# WebSocket Health
echo -n "Checking WebSocket connection... "
if node -e "
const io = require('socket.io-client');
const socket = io('$BACKEND_URL', { timeout: 5000 });
socket.on('connect', () => {
    socket.disconnect();
    process.exit(0);
});
socket.on('connect_error', () => process.exit(1));
setTimeout(() => process.exit(1), 5000);
" 2>/dev/null; then
    echo -e "${GREEN}✅ CONNECTED${NC}"
else
    echo -e "${RED}❌ CONNECTION FAILED${NC}"
    overall_health=1
fi

echo ""
echo -e "${YELLOW}🔐 Security Checks${NC}"
echo "==================="

# SSL Certificate check (if HTTPS)
if [[ "$BACKEND_URL" == https* ]]; then
    domain=$(echo "$BACKEND_URL" | sed 's|https://||' | cut -d'/' -f1)
    echo -n "Checking SSL certificate for $domain... "
    if openssl s_client -connect "$domain:443" -servername "$domain" < /dev/null 2>/dev/null | grep -q "Verify return code: 0"; then
        echo -e "${GREEN}✅ VALID${NC}"
    else
        echo -e "${YELLOW}⚠️  INVALID/SELF-SIGNED${NC}"
    fi
fi

# Environment variables check
echo -n "Checking critical environment variables... "
required_vars=("DATABASE_URL" "JWT_SECRET" "REDIS_URL")
missing_vars=()

for var in "${required_vars[@]}"; do
    if [[ -z "${!var}" ]]; then
        missing_vars+=("$var")
    fi
done

if [[ ${#missing_vars[@]} -eq 0 ]]; then
    echo -e "${GREEN}✅ ALL SET${NC}"
else
    echo -e "${RED}❌ MISSING: ${missing_vars[*]}${NC}"
    overall_health=1
fi

echo ""
echo -e "${YELLOW}💾 Storage & Performance${NC}"
echo "========================="

# Disk space check
echo -n "Checking disk space... "
disk_usage=$(df / | tail -1 | awk '{print $5}' | sed 's/%//')
if [[ $disk_usage -lt 80 ]]; then
    echo -e "${GREEN}✅ OK ($disk_usage% used)${NC}"
else
    echo -e "${YELLOW}⚠️  HIGH ($disk_usage% used)${NC}"
fi

# Memory usage check
echo -n "Checking memory usage... "
if command -v free >/dev/null 2>&1; then
    memory_usage=$(free | grep Mem | awk '{printf "%.0f", $3/$2 * 100}')
    if [[ $memory_usage -lt 80 ]]; then
        echo -e "${GREEN}✅ OK ($memory_usage% used)${NC}"
    else
        echo -e "${YELLOW}⚠️  HIGH ($memory_usage% used)${NC}"
    fi
else
    echo -e "${BLUE}ℹ️  N/A (macOS)${NC}"
fi

echo ""
echo -e "${YELLOW}🧪 Integration Tests${NC}"
echo "===================="

# Quick integration test
echo -n "Running quick integration test... "
if node -e "
const axios = require('axios');
(async () => {
    try {
        // Test user registration and login flow
        const registerRes = await axios.post('$BACKEND_URL/api/auth/register', {
            email: 'healthcheck@example.com',
            password: 'HealthCheck123!',
            name: 'Health Check User'
        });
        
        const loginRes = await axios.post('$BACKEND_URL/api/auth/login', {
            email: 'healthcheck@example.com',
            password: 'HealthCheck123!'
        });
        
        if (loginRes.data.token) {
            console.log('Integration test passed');
            process.exit(0);
        } else {
            process.exit(1);
        }
    } catch (error) {
        if (error.response?.status === 409) {
            // User already exists, try login
            try {
                const loginRes = await axios.post('$BACKEND_URL/api/auth/login', {
                    email: 'healthcheck@example.com',
                    password: 'HealthCheck123!'
                });
                process.exit(loginRes.data.token ? 0 : 1);
            } catch {
                process.exit(1);
            }
        } else {
            process.exit(1);
        }
    }
})();
" 2>/dev/null; then
    echo -e "${GREEN}✅ PASSED${NC}"
else
    echo -e "${RED}❌ FAILED${NC}"
    overall_health=1
fi

echo ""
echo "======================================="

# Final result
if [[ $overall_health -eq 0 ]]; then
    echo -e "${GREEN}🎉 OVERALL HEALTH: EXCELLENT${NC}"
    echo -e "${GREEN}All services are running and healthy!${NC}"
    exit 0
else
    echo -e "${RED}🚨 OVERALL HEALTH: ISSUES DETECTED${NC}"
    echo -e "${RED}Some services have health issues. Please review the output above.${NC}"
    exit 1
fi
