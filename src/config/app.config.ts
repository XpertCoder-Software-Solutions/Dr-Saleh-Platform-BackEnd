import { ConfigType, registerAs } from '@nestjs/config';

export type NodeEnv = 'development' | 'test' | 'production';
export type LogLevel = 'fatal' | 'error' | 'warn' | 'info' | 'debug' | 'trace';

const toNumber = (value: string | undefined, defaultValue: number): number =>
  Number(value ?? defaultValue);

const appConfig = registerAs('app', () => ({
  nodeEnv: (process.env.NODE_ENV ?? 'development') as NodeEnv,
  port: toNumber(process.env.PORT, 3000),
  apiPrefix: process.env.API_PREFIX ?? 'api',
  logLevel: (process.env.LOG_LEVEL ?? 'info') as LogLevel,
  throttle: {
    ttl: toNumber(process.env.THROTTLE_TTL, 60_000),
    limit: toNumber(process.env.THROTTLE_LIMIT, 100),
  },
}));

export type AppConfig = ConfigType<typeof appConfig>;

export default appConfig;
