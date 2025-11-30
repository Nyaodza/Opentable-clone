import { NestFactory } from '@nestjs/core';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import compression from 'compression';
import helmet from 'helmet';
import morgan from 'morgan';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug', 'verbose'],
  });

  const configService = app.get(ConfigService);
  const port = configService.get('PORT', 3001);

  // Security
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
        imgSrc: ["'self'", 'data:', 'https:'],
      },
    },
    crossOriginEmbedderPolicy: false,
  }));

  // Compression
  app.use(compression());

  // Logging
  if (configService.get('NODE_ENV') === 'development') {
    app.use(morgan('dev'));
  }

  // CORS
  app.enableCors({
    origin: configService.get('CORS_ORIGIN', '*').split(','),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  });

  // Validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    })
  );

  // API Versioning
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });

  // API Documentation
  if (configService.get('NODE_ENV') !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('OpenTable Clone API')
      .setDescription('Restaurant Reservation Platform API Documentation')
      .setVersion('1.0')
      .addBearerAuth()
      .addTag('Authentication', 'User authentication and authorization')
      .addTag('Restaurants', 'Restaurant management')
      .addTag('Reservations', 'Reservation management')
      .addTag('Reviews', 'Review system')
      .addTag('Search', 'Search and discovery')
      .addTag('Payments', 'Payment processing')
      .addTag('Loyalty', 'Loyalty and rewards')
      .addTag('Notifications', 'Notification system')
      .addTag('Dashboard', 'Restaurant dashboard')
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document, {
      swaggerOptions: {
        persistAuthorization: true,
        docExpansion: 'none',
        filter: true,
        showRequestDuration: true,
      },
    });
  }

  // Global prefix
  app.setGlobalPrefix('api', {
    exclude: ['health', 'metrics'],
  });

  // Graceful shutdown
  app.enableShutdownHooks();

  await app.listen(port, '0.0.0.0');

  console.log(`
    🚀 OpenTable Clone Backend is running!

    🌐 API:          http://localhost:${port}/api
    📚 Documentation: http://localhost:${port}/api/docs
    🏥 Health Check: http://localhost:${port}/health
    📊 Metrics:      http://localhost:${port}/metrics

    Environment: ${configService.get('NODE_ENV', 'development')}
  `);
}

bootstrap().catch((error) => {
  console.error('Failed to start application:', error);
  process.exit(1);
});