import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { Application } from 'express';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'OpenTable Clone API',
      version: '1.0.0',
      description: 'Comprehensive restaurant reservation platform API with blockchain loyalty, VR experiences, and AI concierge',
      contact: {
        name: 'API Support',
        email: 'api@opentableclone.com',
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT',
      },
    },
    servers: [
      {
        url: 'http://localhost:3001/api',
        description: 'Development server',
      },
      {
        url: 'https://staging.opentableclone.com/api',
        description: 'Staging server',
      },
      {
        url: 'https://api.opentableclone.com/api',
        description: 'Production server',
      },
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
        CsrfToken: {
          type: 'apiKey',
          in: 'header',
          name: 'X-CSRF-Token',
        },
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            email: { type: 'string', format: 'email' },
            name: { type: 'string' },
            phoneNumber: { type: 'string' },
            role: { type: 'string', enum: ['user', 'restaurant_owner', 'admin'] },
            isActive: { type: 'boolean' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        Restaurant: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            name: { type: 'string' },
            description: { type: 'string' },
            cuisineType: { type: 'string' },
            address: { type: 'string' },
            city: { type: 'string' },
            state: { type: 'string' },
            zipCode: { type: 'string' },
            phoneNumber: { type: 'string' },
            email: { type: 'string', format: 'email' },
            website: { type: 'string', format: 'uri' },
            priceRange: { type: 'string', enum: ['$', '$$', '$$$', '$$$$'] },
            rating: { type: 'number', minimum: 0, maximum: 5 },
            isActive: { type: 'boolean' },
            features: { type: 'array', items: { type: 'string' } },
          },
        },
        Reservation: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            userId: { type: 'string', format: 'uuid' },
            restaurantId: { type: 'string', format: 'uuid' },
            dateTime: { type: 'string', format: 'date-time' },
            partySize: { type: 'integer', minimum: 1 },
            status: {
              type: 'string',
              enum: ['pending', 'confirmed', 'seated', 'completed', 'cancelled', 'no_show'],
            },
            specialRequests: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        Error: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            error: { type: 'string' },
            message: { type: 'string' },
            details: { type: 'array', items: { type: 'string' } },
          },
        },
        PaginatedResponse: {
          type: 'object',
          properties: {
            data: { type: 'array', items: { type: 'object' } },
            pagination: {
              type: 'object',
              properties: {
                page: { type: 'integer' },
                limit: { type: 'integer' },
                total: { type: 'integer' },
                totalPages: { type: 'integer' },
                hasNext: { type: 'boolean' },
                hasPrev: { type: 'boolean' },
              },
            },
          },
        },
      },
      responses: {
        Unauthorized: {
          description: 'Authentication required',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' },
            },
          },
        },
        Forbidden: {
          description: 'Insufficient permissions',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' },
            },
          },
        },
        NotFound: {
          description: 'Resource not found',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' },
            },
          },
        },
        ValidationError: {
          description: 'Validation failed',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' },
            },
          },
        },
      },
    },
    security: [
      {
        BearerAuth: [],
      },
    ],
    tags: [
      { name: 'Authentication', description: 'User authentication and authorization' },
      { name: 'Restaurants', description: 'Restaurant management' },
      { name: 'Reservations', description: 'Reservation management' },
      { name: 'Reviews', description: 'Restaurant reviews and ratings' },
      { name: 'Users', description: 'User profile management' },
      { name: 'Waitlist', description: 'Waitlist management' },
      { name: 'Loyalty', description: 'Loyalty points and rewards' },
      { name: 'Blockchain', description: 'Blockchain loyalty system' },
      { name: 'Payments', description: 'Payment processing' },
      { name: 'Admin', description: 'Administrative operations' },
    ],
  },
  apis: ['./src/routes/*.ts', './src/controllers/*.ts'],
};

const swaggerSpec = swaggerJsdoc(options);

export const setupSwaggerDocs = (app: Application): void => {
  // Swagger UI
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'OpenTable Clone API Documentation',
  }));

  // JSON spec
  app.get('/api-docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  });

  console.log('✓ API documentation available at /api-docs');
};

export default setupSwaggerDocs;
