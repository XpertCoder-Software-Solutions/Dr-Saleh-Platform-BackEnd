import { Module, RequestMethod } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { JwtModule } from '@nestjs/jwt';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { LoggerModule } from 'nestjs-pino';
import appConfig, { AppConfig } from './config/app.config';
import corsConfig from './config/cors.config';
import databaseConfig from './config/database.config';
import { validateEnv } from './config/env.validation';
import jwtConfig, { JwtConfig } from './config/jwt.config';
import redisConfig, { RedisConfig } from './config/redis.config';
import s3Config from './config/s3.config';
import { PrismaModule } from './database/prisma.module';
import { HealthModule } from './health/health.module';

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
        secret: configuration.secret,
        signOptions: {
          expiresIn: configuration.expiresIn,
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
