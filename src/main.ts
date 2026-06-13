import { Logger as NestLogger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import type { Request, Response } from 'express';
import type { HelmetOptions } from 'helmet';
import { Logger as PinoLogger } from 'nestjs-pino';
import { join } from 'path';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { getSafeExceptionDetails } from './common/utils/safe-logging';
import appConfig, { AppConfig } from './config/app.config';
import corsConfig, { CorsConfig } from './config/cors.config';
import {
  buildSafeConfigDiagnostics,
  formatSafeConfigDiagnostics,
} from './config/safe-config-diagnostics';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
  });
  const appConfiguration = app.get<AppConfig>(appConfig.KEY);
  const corsConfiguration = app.get<CorsConfig>(corsConfig.KEY);
  const configService = app.get(ConfigService);
  const logger = app.get(PinoLogger);
  const swaggerEnabled =
    appConfiguration.nodeEnv !== 'production' &&
    appConfiguration.swaggerEnabled;

  app.useLogger(logger);
  logger.log(
    [
      'Config startup diagnostics.',
      `nodeEnv=${appConfiguration.nodeEnv}`,
      `apiPrefixConfigured=${Boolean(appConfiguration.apiPrefix)}`,
      `swaggerEnabled=${swaggerEnabled}`,
      `corsOriginsConfigured=${corsConfiguration.allowedOrigins.length > 0}`,
      `corsOriginCount=${corsConfiguration.allowedOrigins.length}`,
      `corsCredentials=${corsConfiguration.credentials}`,
      `throttleTtlConfigured=${Number.isFinite(appConfiguration.throttle.ttl)}`,
      `throttleLimitConfigured=${Number.isFinite(
        appConfiguration.throttle.limit,
      )}`,
      formatSafeConfigDiagnostics(buildSafeConfigDiagnostics(configService)),
    ].join(' '),
  );
  app.enableShutdownHooks();
  app.setGlobalPrefix(appConfiguration.apiPrefix);
  app.use('/uploads/books/digital', denyProtectedUploadAccess);
  app.use('/uploads/books/audio', denyProtectedUploadAccess);
  app.useStaticAssets(join(process.cwd(), 'uploads'), {
    prefix: '/uploads/',
  });
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
  logger.log(
    'Global layers configured. validationPipe=true exceptionFilter=true responseInterceptor=true helmet=true cors=true throttlerGuard=true',
  );

  if (swaggerEnabled) {
    logger.log('Swagger setup starting.');
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
    logger.log('Swagger setup completed.');
  } else {
    logger.log('Swagger setup skipped. swaggerEnabled=false');
  }

  logger.log('HTTP server listen starting.');
  await app.listen(appConfiguration.port, '0.0.0.0');
  logger.log(
    `Dr. Saleh Platform API is running on port ${appConfiguration.port}`,
  );
}

function denyProtectedUploadAccess(
  _request: Request,
  response: Response,
): void {
  response.sendStatus(404);
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

bootstrap().catch((error: unknown) => {
  const logger = new NestLogger('Bootstrap');
  const exceptionDetails = getSafeExceptionDetails(error);

  logger.error(
    [
      'Application bootstrap failed',
      `name=${exceptionDetails.name}`,
      `message=${exceptionDetails.message}`,
    ].join(' '),
    exceptionDetails.stack,
  );
  process.stderr.write(
    [
      'Application bootstrap failed',
      `name=${exceptionDetails.name}`,
      `message=${exceptionDetails.message}`,
      exceptionDetails.stack ?? '',
      '',
    ].join('\n'),
  );

  process.exit(1);
});
