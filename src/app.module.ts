import { Logger, Module, RequestMethod } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { JwtModule } from '@nestjs/jwt';
import { ServeStaticModule } from '@nestjs/serve-static';
import { ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { LoggerModule } from 'nestjs-pino';
import { join } from 'path';
import { AdminDashboardModule } from './admin-dashboard/admin-dashboard.module';
import appConfig, { AppConfig } from './config/app.config';
import { AdminManagementModule } from './admin-management/admin-management.module';
import { ArticlesModule } from './articles/articles.module';
import { AuthModule } from './auth/auth.module';
import { AuditLogsModule } from './audit-logs/audit-logs.module';
import { BooksModule } from './books/books.module';
import { CartModule } from './cart/cart.module';
import { ConsultationsModule } from './consultations/consultations.module';
import { ContactUsModule } from './contact-us/contact-us.module';
import { CouponsModule } from './coupons/coupons.module';
import { CoursesModule } from './courses/courses.module';
import corsConfig from './config/cors.config';
import cloudFrontConfig from './config/cloudfront.config';
import databaseConfig from './config/database.config';
import { validateEnv } from './config/env.validation';
import fawryConfig from './config/fawry.config';
import jwtConfig, { JwtConfig } from './config/jwt.config';
import paypalConfig from './config/paypal.config';
import referralConfig from './config/referral.config';
import redisConfig, { RedisConfig } from './config/redis.config';
import s3Config from './config/s3.config';
import { DiagnosticThrottlerGuard } from './common/guards/diagnostic-throttler.guard';
import { sanitizeUrl } from './common/utils/safe-logging';
import { PrismaModule } from './database/prisma.module';
import { HealthModule } from './health/health.module';
import { LocationsModule } from './locations/locations.module';
import { NotificationsModule } from './notifications/notifications.module';
import { OrdersModule } from './orders/orders.module';
import { PaymentsModule } from './payments/payments.module';
import { ProductsModule } from './products/products.module';
import { ReferralsModule } from './referrals/referrals.module';
import { UsersModule } from './users/users.module';
import { WishlistModule } from './wishlist/wishlist.module';

type PinoRequestLogInput = {
  id?: unknown;
  method?: unknown;
  remoteAddress?: unknown;
  remotePort?: unknown;
  url?: unknown;
};

function toOptionalString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

function toOptionalStringOrNumber(value: unknown): string | number | undefined {
  return typeof value === 'string' || typeof value === 'number'
    ? value
    : undefined;
}

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      expandVariables: true,
      load: [
        appConfig,
        databaseConfig,
        jwtConfig,
        corsConfig,
        redisConfig,
        s3Config,
        cloudFrontConfig,
        fawryConfig,
        paypalConfig,
        referralConfig,
      ],
      validate: validateEnv,
    }),
    ServeStaticModule.forRoot({
      rootPath: join(process.cwd(), 'public'),
      serveRoot: '/',
    }),
    LoggerModule.forRootAsync({
      inject: [appConfig.KEY],
      useFactory: (configuration: AppConfig) => ({
        pinoHttp: {
          level: configuration.logLevel,
          redact: [
            'req.headers.authorization',
            'req.headers.cookie',
            'req.headers.x-api-key',
            'req.headers.x-amz-security-token',
          ],
          serializers: {
            req(request: PinoRequestLogInput) {
              const url = toOptionalString(request.url);

              return {
                id: toOptionalStringOrNumber(request.id),
                method: toOptionalString(request.method),
                url: url ? sanitizeUrl(url) : undefined,
                remoteAddress: toOptionalString(request.remoteAddress),
                remotePort: toOptionalStringOrNumber(request.remotePort),
              };
            },
          },
        },
        forRoutes: [{ path: '*path', method: RequestMethod.ALL }],
      }),
    }),
    ThrottlerModule.forRootAsync({
      inject: [appConfig.KEY],
      useFactory: (configuration: AppConfig) => {
        const logger = new Logger('ThrottlerConfig');

        logger.log(
          [
            'Throttler configured.',
            `ttlConfigured=${Number.isFinite(configuration.throttle.ttl)}`,
            `limitConfigured=${Number.isFinite(configuration.throttle.limit)}`,
          ].join(' '),
        );

        return [
          {
            ttl: configuration.throttle.ttl,
            limit: configuration.throttle.limit,
          },
        ];
      },
    }),
    JwtModule.registerAsync({
      global: true,
      inject: [jwtConfig.KEY],
      useFactory: (configuration: JwtConfig) => {
        const logger = new Logger('JwtConfig');

        logger.log(
          [
            'JWT configured.',
            `accessSecretConfigured=${Boolean(configuration.accessSecret)}`,
            `refreshSecretConfigured=${Boolean(configuration.refreshSecret)}`,
            `accessExpiresInConfigured=${Boolean(
              configuration.accessExpiresIn,
            )}`,
            `refreshExpiresInConfigured=${Boolean(
              configuration.refreshExpiresIn,
            )}`,
          ].join(' '),
        );

        return {
          secret: configuration.accessSecret,
          signOptions: {
            expiresIn: configuration.accessExpiresIn,
          },
        };
      },
    }),
    BullModule.forRootAsync({
      inject: [redisConfig.KEY],
      useFactory: (configuration: RedisConfig) => {
        const logger = new Logger('RedisProvider');

        logger.log(
          [
            'Redis/Bull configured.',
            `redisConfigured=${Boolean(configuration.host) && Number.isFinite(configuration.port)}`,
            `usernameConfigured=${Boolean(configuration.username)}`,
            `passwordConfigured=${Boolean(configuration.password)}`,
            `dbConfigured=${Number.isFinite(configuration.db)}`,
            `tlsEnabled=${configuration.tls}`,
          ].join(' '),
        );

        return {
          connection: {
            host: configuration.host,
            port: configuration.port,
            username: configuration.username,
            password: configuration.password,
            db: configuration.db,
            tls: configuration.tls ? {} : undefined,
          },
        };
      },
    }),
    PrismaModule,
    AdminDashboardModule,
    AdminManagementModule,
    AuthModule,
    AuditLogsModule,
    ArticlesModule,
    BooksModule,
    CartModule,
    ConsultationsModule,
    ContactUsModule,
    CouponsModule,
    CoursesModule,
    ProductsModule,
    UsersModule,
    WishlistModule,
    LocationsModule,
    NotificationsModule,
    OrdersModule,
    PaymentsModule,
    ReferralsModule,
    HealthModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: DiagnosticThrottlerGuard,
    },
  ],
})
export class AppModule {}
