#!/usr/bin/env ts-node

import * as fs from 'fs';
import * as path from 'path';
import { swaggerSpec, generatePostmanCollection } from '../config/swagger.config';
import { apiExamples, responseExamples } from '../docs/api-examples';

// Generate documentation files
class DocumentationGenerator {
  private docsDir = path.join(__dirname, '../../docs');
  private outputDir = path.join(__dirname, '../../generated-docs');

  constructor() {
    // Ensure output directory exists
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }
  }

  // Generate OpenAPI specification file
  generateOpenApiSpec() {
    const specPath = path.join(this.outputDir, 'openapi.json');
    fs.writeFileSync(specPath, JSON.stringify(swaggerSpec, null, 2));
    console.log(`✓ OpenAPI specification generated: ${specPath}`);
  }

  // Generate OpenAPI YAML file
  generateOpenApiYaml() {
    const yaml = require('js-yaml');
    const yamlPath = path.join(this.outputDir, 'openapi.yaml');
    const yamlContent = yaml.dump(swaggerSpec, { indent: 2 });
    fs.writeFileSync(yamlPath, yamlContent);
    console.log(`✓ OpenAPI YAML generated: ${yamlPath}`);
  }

  // Generate Postman collection
  generatePostmanCollectionFile() {
    const collection = generatePostmanCollection();
    const collectionPath = path.join(this.outputDir, 'postman-collection.json');
    fs.writeFileSync(collectionPath, JSON.stringify(collection, null, 2));
    console.log(`✓ Postman collection generated: ${collectionPath}`);
  }

  // Generate SDK documentation
  generateSdkDocs() {
    const sdkDocs = {
      javascript: this.generateJavaScriptSdk(),
      python: this.generatePythonSdk(),
      curl: this.generateCurlExamples(),
    };

    const sdkPath = path.join(this.outputDir, 'sdk-examples.json');
    fs.writeFileSync(sdkPath, JSON.stringify(sdkDocs, null, 2));
    console.log(`✓ SDK documentation generated: ${sdkPath}`);
  }

  // Generate JavaScript SDK examples
  private generateJavaScriptSdk() {
    return {
      installation: 'npm install @opentable-clone/sdk',
      usage: `
import { OpenTableClient } from '@opentable-clone/sdk';

const client = new OpenTableClient({
  baseURL: '${process.env.API_BASE_URL || 'http://localhost:3001/api'}',
  timeout: 30000
});

// Authentication
await client.auth.login('user@example.com', 'password');

// Get restaurants
const restaurants = await client.restaurants.list({
  cuisine: 'Italian',
  location: 'NYC'
});

// Make reservation
const reservation = await client.reservations.create({
  restaurantId: 'restaurant-id',
  date: '2024-01-15',
  time: '19:00',
  partySize: 4
});
      `.trim(),
      examples: Object.entries(apiExamples).reduce((acc, [category, examples]) => {
        acc[category] = Object.entries(examples as any).reduce((catAcc, [method, example]) => {
          catAcc[method] = (example as any).javascript;
          return catAcc;
        }, {} as any);
        return acc;
      }, {} as any)
    };
  }

  // Generate Python SDK examples
  private generatePythonSdk() {
    return {
      installation: 'pip install opentable-clone-sdk',
      usage: `
from opentable_clone import OpenTableClient

client = OpenTableClient(
    base_url="${process.env.API_BASE_URL || 'http://localhost:3001/api'}"
)

# Authentication
client.auth.login(email="user@example.com", password="password")

# Get restaurants
restaurants = client.restaurants.list(
    cuisine="Italian",
    location="NYC"
)

# Make reservation
reservation = client.reservations.create(
    restaurant_id="restaurant-id",
    date="2024-01-15",
    time="19:00",
    party_size=4
)
      `.trim(),
      examples: Object.entries(apiExamples).reduce((acc, [category, examples]) => {
        acc[category] = Object.entries(examples as any).reduce((catAcc, [method, example]) => {
          catAcc[method] = (example as any).python;
          return catAcc;
        }, {} as any);
        return acc;
      }, {} as any)
    };
  }

  // Generate cURL examples
  private generateCurlExamples() {
    return Object.entries(apiExamples).reduce((acc, [category, examples]) => {
      acc[category] = Object.entries(examples as any).reduce((catAcc, [method, example]) => {
        catAcc[method] = (example as any).curl;
        return catAcc;
      }, {} as any);
      return acc;
    }, {} as any);
  }

  // Generate endpoint reference
  generateEndpointReference() {
    const endpoints = this.extractEndpointsFromSpec();
    const referencePath = path.join(this.outputDir, 'endpoint-reference.md');
    
    let markdown = '# API Endpoint Reference\n\n';
    
    Object.entries(endpoints).forEach(([tag, tagEndpoints]) => {
      markdown += `## ${tag}\n\n`;
      
      (tagEndpoints as any[]).forEach(endpoint => {
        markdown += `### ${endpoint.method.toUpperCase()} ${endpoint.path}\n\n`;
        markdown += `${endpoint.summary}\n\n`;
        
        if (endpoint.description) {
          markdown += `${endpoint.description}\n\n`;
        }
        
        if (endpoint.parameters && endpoint.parameters.length > 0) {
          markdown += '#### Parameters\n\n';
          endpoint.parameters.forEach((param: any) => {
            markdown += `- **${param.name}** (${param.in}): ${param.description || 'No description'}\n`;
          });
          markdown += '\n';
        }
        
        markdown += '#### Response\n\n';
        markdown += '```json\n';
        markdown += JSON.stringify(responseExamples.success.example, null, 2);
        markdown += '\n```\n\n';
      });
    });
    
    fs.writeFileSync(referencePath, markdown);
    console.log(`✓ Endpoint reference generated: ${referencePath}`);
  }

  // Extract endpoints from OpenAPI spec
  private extractEndpointsFromSpec() {
    const endpoints: { [tag: string]: any[] } = {};
    
    Object.entries((swaggerSpec as any).paths || {}).forEach(([path, pathMethods]) => {
      Object.entries(pathMethods as any).forEach(([method, methodSpec]) => {
        const spec = methodSpec as any;
        const tags = spec.tags || ['Other'];
        
        tags.forEach((tag: string) => {
          if (!endpoints[tag]) {
            endpoints[tag] = [];
          }
          
          endpoints[tag].push({
            path,
            method,
            summary: spec.summary || `${method.toUpperCase()} ${path}`,
            description: spec.description,
            parameters: spec.parameters || [],
            responses: spec.responses || {}
          });
        });
      });
    });
    
    return endpoints;
  }

  // Generate changelog
  generateChangelog() {
    const changelog = {
      'v1.0.0': {
        date: '2024-01-15',
        type: 'major',
        changes: [
          'Initial API release',
          'User authentication and management',
          'Restaurant discovery and management',
          'Reservation system',
          'Payment processing with Stripe',
          'Review and rating system',
          'Loyalty program',
          'Real-time notifications',
          'Admin dashboard',
          'Performance monitoring',
          'Comprehensive security measures'
        ]
      }
    };

    const changelogPath = path.join(this.outputDir, 'changelog.json');
    fs.writeFileSync(changelogPath, JSON.stringify(changelog, null, 2));
    
    // Also generate markdown version
    const changelogMd = path.join(this.outputDir, 'CHANGELOG.md');
    let markdown = '# Changelog\n\n';
    
    Object.entries(changelog).forEach(([version, details]) => {
      markdown += `## ${version} - ${details.date}\n\n`;
      details.changes.forEach(change => {
        markdown += `- ${change}\n`;
      });
      markdown += '\n';
    });
    
    fs.writeFileSync(changelogMd, markdown);
    console.log(`✓ Changelog generated: ${changelogPath} and ${changelogMd}`);
  }

  // Generate README for API
  generateReadme() {
    const readme = `# OpenTable Clone API

A comprehensive restaurant reservation platform API built with Express.js, TypeScript, and PostgreSQL.

## Quick Start

\`\`\`bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env

# Start development server
npm run dev
\`\`\`

## Documentation

- **API Documentation**: [Swagger UI](http://localhost:3001/api-docs)
- **API Guide**: [Complete Guide](./docs/api-guide.md)
- **Postman Collection**: [Download](./generated-docs/postman-collection.json)
- **OpenAPI Spec**: [JSON](./generated-docs/openapi.json) | [YAML](./generated-docs/openapi.yaml)

## Features

- 🔐 JWT Authentication & Authorization
- 🍽️ Restaurant Management & Discovery
- 📅 Reservation System
- 💳 Payment Processing (Stripe)
- ⭐ Reviews & Ratings
- 🎁 Loyalty Program
- 📱 Real-time Notifications
- 👨‍💼 Admin Dashboard
- 📊 Performance Monitoring
- 🛡️ Security & Rate Limiting
- 📚 Comprehensive Documentation

## API Endpoints

### Authentication
- \`POST /api/auth/register\` - Register new user
- \`POST /api/auth/login\` - Login user
- \`POST /api/auth/refresh\` - Refresh JWT token
- \`POST /api/auth/logout\` - Logout user

### Restaurants
- \`GET /api/restaurants\` - List restaurants
- \`GET /api/restaurants/search\` - Search restaurants
- \`GET /api/restaurants/:id\` - Get restaurant details
- \`GET /api/restaurants/:id/availability\` - Check availability

### Reservations
- \`POST /api/reservations\` - Create reservation
- \`GET /api/reservations/user\` - Get user reservations
- \`PATCH /api/reservations/:id\` - Update reservation
- \`DELETE /api/reservations/:id\` - Cancel reservation

### Reviews
- \`POST /api/reviews\` - Create review
- \`GET /api/reviews/restaurant/:id\` - Get restaurant reviews
- \`GET /api/reviews/user\` - Get user reviews

### Payments
- \`POST /api/payments/create-payment-intent\` - Create payment intent
- \`GET /api/payments/user\` - Get user payments

## Monitoring

- **Health Check**: \`GET /api/monitoring/health\`
- **Metrics**: \`GET /api/monitoring/metrics\`
- **System Status**: \`GET /api/monitoring/system\`

## Environment Variables

See \`.env.example\` for required environment variables.

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

MIT License - see LICENSE file for details.
`;

    const readmePath = path.join(this.outputDir, 'README.md');
    fs.writeFileSync(readmePath, readme);
    console.log(`✓ README generated: ${readmePath}`);
  }

  // Generate all documentation
  generateAll() {
    console.log('🚀 Generating API documentation...\n');
    
    this.generateOpenApiSpec();
    this.generateOpenApiYaml();
    this.generatePostmanCollectionFile();
    this.generateSdkDocs();
    this.generateEndpointReference();
    this.generateChangelog();
    this.generateReadme();
    
    console.log('\n✅ All documentation generated successfully!');
    console.log(`📁 Output directory: ${this.outputDir}`);
  }
}

// Run if called directly
if (require.main === module) {
  const generator = new DocumentationGenerator();
  generator.generateAll();
}

export default DocumentationGenerator;