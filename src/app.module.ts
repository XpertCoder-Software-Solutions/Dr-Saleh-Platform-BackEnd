import { Module, RequestMethod } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { JwtModule } from '@nestjs/jwt';
import { ServeStaticModule } from '@nestjs/serve-static';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { LoggerModule } from 'nestjs-pino';
import { join } from 'path';
import appConfig, { AppConfig } from './config/app.config';
import { ArticlesModule } from './articles/articles.module';
import { AuthModule } from './auth/auth.module';
import { BooksModule } from './books/books.module';
import { ConsultationsModule } from './consultations/consultations.module';
import { ContactUsModule } from './contact-us/contact-us.module';
import corsConfig from './config/cors.config';
import databaseConfig from './config/database.config';
import { validateEnv } from './config/env.validation';
import jwtConfig, { JwtConfig } from './config/jwt.config';
import redisConfig, { RedisConfig } from './config/redis.config';
import s3Config from './config/s3.config';
import { PrismaModule } from './database/prisma.module';
import { HealthModule } from './health/health.module';
import { LocationsModule } from './locations/locations.module';
import { ProductsModule } from './products/products.module';
import { UsersModule } from './users/users.module';
import { WishlistModule } from './wishlist/wishlist.module';

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
          redact: ['req.headers.authorization', 'req.headers.cookie'],
        },
        forRoutes: [{ path: '*path', method: RequestMethod.ALL }],
      }),
    }),
    ThrottlerModule.forRootAsync({
      inject: [appConfig.KEY],
      useFactory: (configuration: AppConfig) => [
        {
          ttl: configuration.throttle.ttl,
          limit: configuration.throttle.limit,
        },
      ],
    }),
    JwtModule.registerAsync({
      global: true,
      inject: [jwtConfig.KEY],
      useFactory: (configuration: JwtConfig) => ({
        secret: configuration.accessSecret,
        signOptions: {
          expiresIn: configuration.accessExpiresIn,
        },
      }),
    }),
    BullModule.forRootAsync({
      inject: [redisConfig.KEY],
      useFactory: (configuration: RedisConfig) => ({
        connection: {
          host: configuration.host,
          port: configuration.port,
          username: configuration.username,
          password: configuration.password,
          db: configuration.db,
          tls: configuration.tls ? {} : undefined,
        },
      }),
    }),
    PrismaModule,
    AuthModule,
    ArticlesModule,
    BooksModule,
    ConsultationsModule,
    ContactUsModule,
    ProductsModule,
    UsersModule,
    WishlistModule,
    LocationsModule,
    HealthModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
