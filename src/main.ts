import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import type { HelmetOptions } from 'helmet';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import appConfig, { AppConfig } from './config/app.config';
import corsConfig, { CorsConfig } from './config/cors.config';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  const appConfiguration = app.get<AppConfig>(appConfig.KEY);
  const corsConfiguration = app.get<CorsConfig>(corsConfig.KEY);
  const logger = app.get(Logger);

  app.useLogger(logger);
  app.enableShutdownHooks();
  app.setGlobalPrefix(appConfiguration.apiPrefix);
  app.use(helmet(getHelmetOptions(appConfiguration)));
  app.enableCors({
    origin: corsConfiguration.allowedOrigins.includes('*')
      ? true
      : corsConfiguration.allowedOrigins,
    credentials: corsConfiguration.credentials,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new ResponseInterceptor());

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Dr. Saleh Platform API')
    .setDescription('Production backend APIs for Dr. Saleh Platform')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, swaggerDocument, {
    useGlobalPrefix: true,
    jsonDocumentUrl: 'docs-json',
    customSiteTitle: 'Dr. Saleh Platform API Docs',
  });

  await app.listen(appConfiguration.port, '0.0.0.0');
  logger.log(
    `Dr. Saleh Platform API is running on port ${appConfiguration.port}`,
  );
}

function getHelmetOptions(appConfiguration: AppConfig): HelmetOptions {
  if (appConfiguration.nodeEnv !== 'development') {
    return {};
  }

  return {
    contentSecurityPolicy: {
      directives: {
        ...helmet.contentSecurityPolicy.getDefaultDirectives(),
        'script-src': ["'self'", "'unsafe-inline'"],
        'style-src': ["'self'", 'https:', "'unsafe-inline'"],
        'img-src': ["'self'", 'data:'],
        'font-src': ["'self'", 'https:', 'data:'],
        'upgrade-insecure-requests': null,
      },
    },
  };
}

void bootstrap();
