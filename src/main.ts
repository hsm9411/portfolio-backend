import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { WinstonModule } from 'nest-winston';
import { winstonConfig } from './config/logger.config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: WinstonModule.createLogger(winstonConfig),
    rawBody: true, // GitHub Webhook HMAC 서명 검증용
  });

  // Security Headers
  app.use(helmet());

  // Trust Proxy (Cloudflare 환경 필수)
  const expressApp = app.getHttpAdapter().getInstance();
  expressApp.set('trust proxy', true);

  // CORS 설정
  const corsOrigins = process.env.CORS_ORIGINS;

  if (corsOrigins === '*') {
    app.enableCors({
      origin: true,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    });
  } else {
    const allowedOrigins = corsOrigins?.split(',') || [
      'http://localhost:5173',
      'http://localhost:3000',
    ];

    app.enableCors({
      origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        if (allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          callback(new Error('Not allowed by CORS'));
        }
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    });
  }

  // Global Validation Pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Swagger 설정
  const config = new DocumentBuilder()
    .setTitle('Portfolio Backend API')
    .setDescription('Portfolio + Tech Blog API Documentation')
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('auth', 'Authentication (OAuth + JWT)')
    .addTag('projects', 'Project Portfolio')
    .addTag('project-updates', 'Project Changelog / Update Timeline')
    .addTag('posts', 'Blog Posts')
    .addTag('comments', 'Comments & Replies')
    .addTag('likes', 'Likes')
    .addTag('webhooks', 'External Webhooks (GitHub)')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  const port = process.env.PORT || 3000;
  await app.listen(port);

  const logger = new Logger('Bootstrap');
  logger.log(`Portfolio Backend running on http://localhost:${port}`);
  logger.log(`Swagger API Docs: http://localhost:${port}/api`);
}

bootstrap();
