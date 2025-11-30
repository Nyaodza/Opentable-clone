#!/bin/bash

# OpenTable Clone Development Startup Script
echo "🚀 Starting OpenTable Clone Development Environment..."
echo "=================================================="

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker Desktop."
    exit 1
fi

# Navigate to project directory
cd "$(dirname "$0")"

# Start Docker services
echo "🐳 Starting Docker services..."
docker-compose up -d postgres redis

# Wait for PostgreSQL to be ready
echo "⏳ Waiting for PostgreSQL to be ready..."
until docker-compose exec -T postgres pg_isready -U postgres > /dev/null 2>&1; do
    echo -n "."
    sleep 1
done
echo " ✅"

# Wait for Redis to be ready
echo "⏳ Waiting for Redis to be ready..."
until docker-compose exec -T redis redis-cli ping > /dev/null 2>&1; do
    echo -n "."
    sleep 1
done
echo " ✅"

# Install backend dependencies
echo "📦 Installing backend dependencies..."
cd backend
npm install

# Initialize database
echo "🗄️  Initializing database..."
npm run db:init

# Start backend server
echo "🔧 Starting backend server..."
npm run dev &
BACKEND_PID=$!

# Wait for backend to start
echo "⏳ Waiting for backend server..."
until curl -s http://localhost:3001/health > /dev/null 2>&1; do
    echo -n "."
    sleep 1
done
echo " ✅"

# Install frontend dependencies
echo "📦 Installing frontend dependencies..."
cd ../frontend
npm install

# Start frontend server
echo "🎨 Starting frontend server..."
npm start &
FRONTEND_PID=$!

# Wait for frontend to start
echo "⏳ Waiting for frontend server..."
until curl -s http://localhost:3000 > /dev/null 2>&1; do
    echo -n "."
    sleep 1
done
echo " ✅"

echo ""
echo "=================================================="
echo "✅ Development environment is ready!"
echo "=================================================="
echo "📍 Frontend: http://localhost:3000"
echo "📍 Backend API: http://localhost:3001"
echo "📚 API Documentation: http://localhost:3001/api-docs"
echo "📊 Monitoring: http://localhost:3001/api/monitoring/health"
echo "=================================================="
echo ""
echo "📝 Test Accounts:"
echo "Admin: admin@opentable-clone.com / Admin@123456"
echo "Restaurant Owner: owner1@demo.com / Demo123!"
echo "Diner: diner1@demo.com / Demo123!"
echo "=================================================="
echo ""
echo "Press Ctrl+C to stop all services"
echo ""

# Keep script running and handle shutdown
trap "echo '🛑 Shutting down services...'; kill $BACKEND_PID $FRONTEND_PID; docker-compose down; exit" INT TERM

# Wait for background processes
wait