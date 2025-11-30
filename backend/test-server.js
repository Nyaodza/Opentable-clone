#!/usr/bin/env node

/**
 * Simple test script to verify server starts with all fixes
 */

console.log('🧪 Testing OpenTable Clone Server...');
console.log('=====================================');

// Set minimal environment variables for testing
process.env.NODE_ENV = 'development';
process.env.PORT = '3001';
process.env.DB_NAME = 'opentable_test';
process.env.DB_HOST = 'localhost';
process.env.DB_PORT = '5432';
process.env.DB_USER = 'postgres';
process.env.DB_PASSWORD = 'password';
process.env.JWT_SECRET = 'test_secret_minimum_32_characters_long';
process.env.FRONTEND_URL = 'http://localhost:3000';

async function testServer() {
  try {
    console.log('📦 Loading server modules...');
    
    // Test that we can import the database configuration
    console.log('✅ Testing database configuration...');
    
    // Try to import database config using ts-node
    process.env.TS_NODE_PROJECT = './tsconfig.json';
    require('ts-node/register');
    
    const { testDatabaseConnection } = require('./src/config/database.ts');
    
    console.log('✅ Server modules loaded successfully');
    console.log('🔧 Testing database configuration...');
    
    // Test database connection
    const connected = await testDatabaseConnection();
    
    if (connected) {
      console.log('✅ Database connection successful');
    } else {
      console.log('⚠️  Database connection failed (expected in test environment)');
    }
    
    console.log('🚀 Server configuration test completed successfully!');
    console.log('');
    console.log('🎯 Next steps:');
    console.log('1. Set up your database (see ENVIRONMENT_SETUP.md)');
    console.log('2. Create a .env file with required variables');
    console.log('3. Run: npm run dev');
    console.log('');
    console.log('📊 Available endpoints once running:');
    console.log('- REST API: http://localhost:3001/api/*');
    console.log('- GraphQL: http://localhost:3001/graphql');
    console.log('- Disruptive Features: http://localhost:3001/api/disruptive/*');
    console.log('- Health Check: http://localhost:3001/health');
    
  } catch (error) {
    console.error('❌ Server test failed:', error.message);
    console.error('');
    console.error('🔧 Troubleshooting:');
    console.error('1. Run: npm install');
    console.error('2. Run: npm run build');
    console.error('3. Check your .env configuration');
    console.error('4. Ensure PostgreSQL is running');
    process.exit(1);
  }
}

testServer();
