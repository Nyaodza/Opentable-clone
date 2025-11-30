#!/bin/bash

# OpenTable Clone - Complete Deployment Script
# This script handles the full deployment of all disruptive features

set -e

echo "🚀 Starting OpenTable Clone Deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if required environment variables are set
check_env_vars() {
    print_status "Checking environment variables..."
    
    required_vars=(
        "DATABASE_URL"
        "JWT_SECRET"
        "REDIS_HOST"
        "OPENAI_API_KEY"
        "STRIPE_SECRET_KEY"
    )
    
    missing_vars=()
    
    for var in "${required_vars[@]}"; do
        if [ -z "${!var}" ]; then
            missing_vars+=("$var")
        fi
    done
    
    if [ ${#missing_vars[@]} -ne 0 ]; then
        print_error "Missing required environment variables:"
        for var in "${missing_vars[@]}"; do
            echo "  - $var"
        done
        print_warning "Please set these variables in your .env file or environment"
        exit 1
    fi
    
    print_success "All required environment variables are set"
}

# Install dependencies
install_dependencies() {
    print_status "Installing backend dependencies..."
    cd backend
    npm ci --production=false
    
    print_status "Installing frontend dependencies..."
    cd ../frontend
    npm ci --production=false
    
    print_status "Installing mobile dependencies..."
    cd ../mobile
    npm ci --production=false
    
    cd ..
    print_success "Dependencies installed successfully"
}

# Build applications
build_applications() {
    print_status "Building backend application..."
    cd backend
    npm run build
    
    print_status "Building frontend application..."
    cd ../frontend
    npm run build
    
    print_status "Building mobile application..."
    cd ../mobile
    npm run build:android
    
    cd ..
    print_success "Applications built successfully"
}

# Setup database
setup_database() {
    print_status "Setting up database..."
    
    # Check if database exists
    if psql "$DATABASE_URL" -c '\q' 2>/dev/null; then
        print_success "Database connection successful"
    else
        print_error "Cannot connect to database. Please ensure PostgreSQL is running and DATABASE_URL is correct"
        exit 1
    fi
    
    # Run migrations
    print_status "Running database migrations..."
    cd backend
    
    # Check if the disruptive features migration file exists
    if [ -f "src/database/migrations/create-disruptive-features.sql" ]; then
        psql "$DATABASE_URL" -f src/database/migrations/create-disruptive-features.sql
        print_success "Disruptive features migration completed"
    else
        print_warning "Disruptive features migration file not found, skipping..."
    fi
    
    cd ..
    print_success "Database setup completed"
}

# Run tests
run_tests() {
    print_status "Running test suites..."
    
    print_status "Running backend tests..."
    cd backend
    npm test
    
    print_status "Running frontend tests..."
    cd ../frontend
    npm test -- --watchAll=false
    
    cd ..
    print_success "All tests passed"
}

# Deploy to production
deploy_production() {
    print_status "Deploying to production..."
    
    # Start backend server
    print_status "Starting backend server..."
    cd backend
    pm2 start dist/server.js --name "opentable-backend" --env production
    
    # Start frontend server (if using Next.js standalone)
    print_status "Starting frontend server..."
    cd ../frontend
    pm2 start npm --name "opentable-frontend" -- start
    
    cd ..
    print_success "Production deployment completed"
}

# Health check
health_check() {
    print_status "Performing health checks..."
    
    # Wait for servers to start
    sleep 10
    
    # Check backend health
    if curl -f http://localhost:3001/health > /dev/null 2>&1; then
        print_success "Backend health check passed"
    else
        print_error "Backend health check failed"
        exit 1
    fi
    
    # Check frontend health
    if curl -f http://localhost:3000 > /dev/null 2>&1; then
        print_success "Frontend health check passed"
    else
        print_error "Frontend health check failed"
        exit 1
    fi
    
    # Check disruptive features health
    if curl -f http://localhost:3001/api/disruptive/health > /dev/null 2>&1; then
        print_success "Disruptive features health check passed"
    else
        print_error "Disruptive features health check failed"
        exit 1
    fi
    
    print_success "All health checks passed"
}

# Main deployment flow
main() {
    echo "🎯 OpenTable Clone - Complete Deployment"
    echo "========================================"
    
    # Parse command line arguments
    SKIP_TESTS=false
    SKIP_BUILD=false
    PRODUCTION=false
    
    while [[ $# -gt 0 ]]; do
        case $1 in
            --skip-tests)
                SKIP_TESTS=true
                shift
                ;;
            --skip-build)
                SKIP_BUILD=true
                shift
                ;;
            --production)
                PRODUCTION=true
                shift
                ;;
            --help)
                echo "Usage: $0 [OPTIONS]"
                echo ""
                echo "Options:"
                echo "  --skip-tests    Skip running test suites"
                echo "  --skip-build    Skip building applications"
                echo "  --production    Deploy to production environment"
                echo "  --help          Show this help message"
                exit 0
                ;;
            *)
                print_error "Unknown option: $1"
                echo "Use --help for usage information"
                exit 1
                ;;
        esac
    done
    
    # Load environment variables
    if [ -f "backend/.env" ]; then
        export $(cat backend/.env | grep -v '^#' | xargs)
        print_success "Environment variables loaded from backend/.env"
    else
        print_warning "No .env file found, using system environment variables"
    fi
    
    # Execute deployment steps
    check_env_vars
    install_dependencies
    
    if [ "$SKIP_BUILD" = false ]; then
        build_applications
    fi
    
    setup_database
    
    if [ "$SKIP_TESTS" = false ]; then
        run_tests
    fi
    
    if [ "$PRODUCTION" = true ]; then
        deploy_production
        health_check
    fi
    
    echo ""
    echo "🎉 Deployment Summary"
    echo "===================="
    print_success "✅ Dependencies installed"
    
    if [ "$SKIP_BUILD" = false ]; then
        print_success "✅ Applications built"
    fi
    
    print_success "✅ Data setup completed"
    
    if [ "$SKIP_TESTS" = false ]; then
        print_success "✅ Tests passed"
    fi
    
    if [ "$PRODUCTION" = true ]; then
        print_success "✅ Production deployment completed"
        print_success "✅ Health checks passed"
        echo ""
        echo "🌐 Application URLs:"
        echo "   Frontend: http://localhost:3000"
        echo "   Backend API: http://localhost:3001"
        echo "   GraphQL Playground: http://localhost:3001/graphql"
        echo "   API Documentation: http://localhost:3001/api-docs"
    fi
    
    echo ""
    print_success "🚀 OpenTable Clone deployment completed successfully!"
    
    if [ "$PRODUCTION" = true ]; then
        echo ""
        echo "📊 Next Steps:"
        echo "1. Monitor application logs: pm2 logs"
        echo "2. Check application status: pm2 status"
        echo "3. View real-time metrics at: http://localhost:3001/api/analytics/dashboard"
        echo "4. Test blockchain features at: http://localhost:3000/blockchain"
        echo "5. Try virtual experiences at: http://localhost:3000/virtual"
        echo "6. Use voice commands via: http://localhost:3000/voice"
    fi
}

# Run main function
main "$@"
