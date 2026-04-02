import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory, Reflector } from '@nestjs/core';
import * as cookieParser from 'cookie-parser';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { LoggerInterceptor } from './common/interceptors/wide-event.interceptor';
import { globalValidationPipe } from './common/pipes/validation.pipe';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);
  const logger = new Logger('Bootstrap');

  // Cookie parsing
  app.use(cookieParser());

  // Trust proxy (for correct client IP behind reverse proxy)
  app.getHttpAdapter().getInstance().set('trust proxy', 1);

  // Security headers
  app.use(helmet());

  // CORS — supports comma-separated origins: "https://a.com,https://b.com"
  const rawOrigin = config.get<string>('CORS_ORIGIN') ?? '';
  const corsOrigin = rawOrigin.includes(',')
    ? rawOrigin.split(',').map((o) => o.trim())
    : rawOrigin;
  app.enableCors({ origin: corsOrigin, credentials: true });

  // Global prefix
  app.setGlobalPrefix('api');

  // Global validation
  app.useGlobalPipes(globalValidationPipe);

  // Global interceptors
  app.useGlobalInterceptors(new LoggerInterceptor());

  // Global guards
  const reflector = app.get(Reflector);
  app.useGlobalGuards(new JwtAuthGuard(reflector), new RolesGuard(reflector));

  // Swagger
  if (config.get<string>('NODE_ENV') !== 'production') {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('Oliveto API')
      .setDescription('REST API for Oliveto accounting firm')
      .setVersion('1.0')
      .addBearerAuth()
      .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api/docs', app, document);
    logger.log('Swagger available at /api/docs');
  }

  // Graceful shutdown — triggers OnModuleDestroy lifecycle hooks on SIGTERM/SIGINT
  app.enableShutdownHooks();

  const port = config.get<number>('PORT');
  await app.listen(port);
  logger.log(`Application running on port ${port}`);
}

bootstrap();
