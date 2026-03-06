import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory, Reflector } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { WideEventInterceptor } from './common/interceptors/wide-event.interceptor';
import { globalValidationPipe } from './common/pipes/validation.pipe';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);
  const logger = new Logger('Bootstrap');

  // Trust proxy (for correct client IP behind reverse proxy)
  app.getHttpAdapter().getInstance().set('trust proxy', 1);

  // Security headers
  app.use(helmet());

  // CORS
  app.enableCors({
    origin: config.get<string>('CORS_ORIGIN'),
    credentials: true,
  });

  // Global prefix
  app.setGlobalPrefix('api');

  // Global validation
  app.useGlobalPipes(globalValidationPipe);

  // Global interceptors
  app.useGlobalInterceptors(new WideEventInterceptor());

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

  const port = config.get<number>('PORT') ?? 8080;
  await app.listen(port);
  logger.log(`Application running on port ${port}`);
}

bootstrap();
