import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { Application } from 'express';

// Swagger configuration
const swaggerOptions: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'OpenTable Clone API',
      version: process.env.API_VERSION || '1.0.0',
      description: 'A comprehensive restaurant reservation platform API',
      contact: {
        name: 'API Support',
        email: 'support@opentableclone.com',
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT',
      },
    },
    servers: [
      {
        url: process.env.API_BASE_URL || 'http://localhost:3001/api',
        description: 'Development server',
      },
      {
        url: 'https://api.opentableclone.com/api',
        description: 'Production server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT token for authentication',
        },
        apiKey: {
          type: 'apiKey',
          in: 'header',
          name: 'X-API-Key',
          description: 'API key for external integrations',
        },
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false,
            },
            error: {
              type: 'string',
              description: 'Error message',
            },
            code: {
              type: 'string',
              description: 'Error code',
            },
            details: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  field: {
                    type: 'string',
                  },
                  message: {
                    type: 'string',
                  },
                },
              },
            },
          },
        },
        User: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
            },
            firstName: {
              type: 'string',
              example: 'John',
            },
            lastName: {
              type: 'string',
              example: 'Doe',
            },
            email: {
              type: 'string',
              format: 'email',
              example: 'john.doe@example.com',
            },
            phone: {
              type: 'string',
              example: '+1234567890',
            },
            role: {
              type: 'string',
              enum: ['customer', 'restaurant_owner', 'admin'],
              example: 'customer',
            },
            isActive: {
              type: 'boolean',
              example: true,
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
            },
          },
        },
        Restaurant: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
            },
            name: {
              type: 'string',
              example: 'The Great Restaurant',
            },
            description: {
              type: 'string',
              example: 'A wonderful dining experience',
            },
            cuisine: {
              type: 'string',
              example: 'Italian',
            },
            location: {
              type: 'string',
              example: 'New York, NY',
            },
            address: {
              type: 'string',
              example: '123 Main St, New York, NY 10001',
            },
            phone: {
              type: 'string',
              example: '+1234567890',
            },
            email: {
              type: 'string',
              format: 'email',
            },
            priceRange: {
              type: 'string',
              enum: ['$', '$$', '$$$', '$$$$'],
            },
            rating: {
              type: 'number',
              format: 'float',
              minimum: 0,
              maximum: 5,
            },
            photos: {
              type: 'array',
              items: {
                type: 'string',
                format: 'uri',
              },
            },
            amenities: {
              type: 'array',
              items: {
                type: 'string',
              },
            },
            isActive: {
              type: 'boolean',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
            },
          },
        },
        Reservation: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
            },
            userId: {
              type: 'string',
              format: 'uuid',
            },
            restaurantId: {
              type: 'string',
              format: 'uuid',
            },
            tableId: {
              type: 'string',
              format: 'uuid',
            },
            partySize: {
              type: 'integer',
              minimum: 1,
              maximum: 20,
            },
            reservationDate: {
              type: 'string',
              format: 'date',
            },
            reservationTime: {
              type: 'string',
              pattern: '^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$',
            },
            status: {
              type: 'string',
              enum: ['pending', 'confirmed', 'seated', 'completed', 'cancelled', 'no_show'],
            },
            specialRequests: {
              type: 'string',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
            },
          },
        },
        Review: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
            },
            userId: {
              type: 'string',
              format: 'uuid',
            },
            restaurantId: {
              type: 'string',
              format: 'uuid',
            },
            rating: {
              type: 'integer',
              minimum: 1,
              maximum: 5,
            },
            comment: {
              type: 'string',
            },
            photos: {
              type: 'array',
              items: {
                type: 'string',
                format: 'uri',
              },
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
            },
          },
        },
        Payment: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
            },
            reservationId: {
              type: 'string',
              format: 'uuid',
            },
            amount: {
              type: 'number',
              format: 'decimal',
            },
            currency: {
              type: 'string',
              example: 'USD',
            },
            status: {
              type: 'string',
              enum: ['pending', 'processing', 'completed', 'failed', 'refunded'],
            },
            paymentMethod: {
              type: 'string',
              enum: ['card', 'cash', 'digital_wallet'],
            },
            transactionId: {
              type: 'string',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
            },
          },
        },
      },
      responses: {
        Unauthorized: {
          description: 'Authentication required',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error',
              },
              example: {
                success: false,
                error: 'Authentication required',
                code: 'UNAUTHORIZED',
              },
            },
          },
        },
        Forbidden: {
          description: 'Access denied',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error',
              },
              example: {
                success: false,
                error: 'Access denied',
                code: 'FORBIDDEN',
              },
            },
          },
        },
        NotFound: {
          description: 'Resource not found',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error',
              },
              example: {
                success: false,
                error: 'Resource not found',
                code: 'NOT_FOUND',
              },
            },
          },
        },
        ValidationError: {
          description: 'Validation failed',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error',
              },
              example: {
                success: false,
                error: 'Validation failed',
                code: 'VALIDATION_ERROR',
                details: [
                  {
                    field: 'email',
                    message: 'Invalid email format',
                  },
                ],
              },
            },
          },
        },
        ServerError: {
          description: 'Internal server error',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error',
              },
              example: {
                success: false,
                error: 'Internal server error',
                code: 'INTERNAL_ERROR',
              },
            },
          },
        },
      },
      parameters: {
        PageParam: {
          name: 'page',
          in: 'query',
          description: 'Page number for pagination',
          schema: {
            type: 'integer',
            minimum: 1,
            default: 1,
          },
        },
        LimitParam: {
          name: 'limit',
          in: 'query',
          description: 'Number of items per page',
          schema: {
            type: 'integer',
            minimum: 1,
            maximum: 100,
            default: 20,
          },
        },
        SortParam: {
          name: 'sort',
          in: 'query',
          description: 'Sort field and direction (e.g., name:asc, createdAt:desc)',
          schema: {
            type: 'string',
            pattern: '^[a-zA-Z][a-zA-Z0-9_]*:(asc|desc)$',
          },
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
    tags: [
      {
        name: 'Authentication',
        description: 'User authentication and authorization',
      },
      {
        name: 'Users',
        description: 'User management',
      },
      {
        name: 'Restaurants',
        description: 'Restaurant management and discovery',
      },
      {
        name: 'Reservations',
        description: 'Reservation management',
      },
      {
        name: 'Reviews',
        description: 'Restaurant reviews and ratings',
      },
      {
        name: 'Payments',
        description: 'Payment processing',
      },
      {
        name: 'Loyalty',
        description: 'Loyalty program management',
      },
      {
        name: 'Waitlist',
        description: 'Restaurant waitlist management',
      },
      {
        name: 'Admin',
        description: 'Administrative functions',
      },
    ],
  },
  apis: [
    './src/routes/*.ts',
    './src/controllers/*.ts',
    './src/models/*.ts',
  ],
};

// Generate swagger specification
export const swaggerSpec = swaggerJsdoc(swaggerOptions);

// Custom CSS for Swagger UI
const customCss = `
  .swagger-ui .topbar { display: none; }
  .swagger-ui .info { margin: 20px 0; }
  .swagger-ui .info .title { color: #2c3e50; }
  .swagger-ui .scheme-container { background: #f8f9fa; padding: 10px; border-radius: 5px; }
  .swagger-ui .btn.authorize { background-color: #007bff; border-color: #007bff; }
  .swagger-ui .btn.authorize:hover { background-color: #0056b3; border-color: #004085; }
`;

// Swagger UI options
const swaggerUiOptions = {
  customCss,
  customSiteTitle: 'OpenTable Clone API Documentation',
  customfavIcon: '/favicon.ico',
  swaggerOptions: {
    persistAuthorization: true,
    displayRequestDuration: true,
    docExpansion: 'none',
    filter: true,
    showExtensions: true,
    showCommonExtensions: true,
    defaultModelsExpandDepth: 2,
    defaultModelExpandDepth: 2,
  },
};

// Setup Swagger documentation
export const setupSwagger = (app: Application) => {
  // Serve swagger documentation
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, swaggerUiOptions));
  
  // Serve swagger.json
  app.get('/api-docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  });

  console.log('📚 API Documentation available at: /api-docs');
  console.log('📄 OpenAPI Spec available at: /api-docs.json');
};

// Generate Postman collection
export const generatePostmanCollection = () => {
  const collection = {
    info: {
      name: 'OpenTable Clone API',
      description: 'API collection for OpenTable Clone',
      schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
    },
    auth: {
      type: 'bearer',
      bearer: [
        {
          key: 'token',
          value: '{{jwt_token}}',
          type: 'string',
        },
      ],
    },
    variable: [
      {
        key: 'base_url',
        value: process.env.API_BASE_URL || 'http://localhost:3001/api',
        type: 'string',
      },
      {
        key: 'jwt_token',
        value: '',
        type: 'string',
      },
    ],
    item: [
      {
        name: 'Authentication',
        item: [
          {
            name: 'Register',
            request: {
              method: 'POST',
              header: [
                {
                  key: 'Content-Type',
                  value: 'application/json',
                },
              ],
              body: {
                mode: 'raw',
                raw: JSON.stringify({
                  firstName: 'John',
                  lastName: 'Doe',
                  email: 'john.doe@example.com',
                  password: 'password123',
                  phone: '+1234567890',
                }),
              },
              url: {
                raw: '{{base_url}}/auth/register',
                host: ['{{base_url}}'],
                path: ['auth', 'register'],
              },
            },
          },
          {
            name: 'Login',
            request: {
              method: 'POST',
              header: [
                {
                  key: 'Content-Type',
                  value: 'application/json',
                },
              ],
              body: {
                mode: 'raw',
                raw: JSON.stringify({
                  email: 'john.doe@example.com',
                  password: 'password123',
                }),
              },
              url: {
                raw: '{{base_url}}/auth/login',
                host: ['{{base_url}}'],
                path: ['auth', 'login'],
              },
            },
            event: [
              {
                listen: 'test',
                script: {
                  exec: [
                    'if (pm.response.code === 200) {',
                    '    const response = pm.response.json();',
                    '    pm.collectionVariables.set("jwt_token", response.data.token);',
                    '}',
                  ],
                },
              },
            ],
          },
        ],
      },
      {
        name: 'Restaurants',
        item: [
          {
            name: 'Get All Restaurants',
            request: {
              method: 'GET',
              url: {
                raw: '{{base_url}}/restaurants?page=1&limit=20',
                host: ['{{base_url}}'],
                path: ['restaurants'],
                query: [
                  {
                    key: 'page',
                    value: '1',
                  },
                  {
                    key: 'limit',
                    value: '20',
                  },
                ],
              },
            },
          },
          {
            name: 'Search Restaurants',
            request: {
              method: 'GET',
              url: {
                raw: '{{base_url}}/restaurants/search?q=italian&location=new+york&cuisine=italian',
                host: ['{{base_url}}'],
                path: ['restaurants', 'search'],
                query: [
                  {
                    key: 'q',
                    value: 'italian',
                  },
                  {
                    key: 'location',
                    value: 'new york',
                  },
                  {
                    key: 'cuisine',
                    value: 'italian',
                  },
                ],
              },
            },
          },
        ],
      },
    ],
  };

  return collection;
};

export default {
  setupSwagger,
  swaggerSpec,
  generatePostmanCollection,
};