import { ConfigType, registerAs } from '@nestjs/config';

const toNumber = (value: string | undefined, defaultValue: number): number =>
  Number(value ?? defaultValue);

const redisConfig = registerAs('redis', () => ({
  host: process.env.REDIS_HOST ?? 'localhost',
  port: toNumber(process.env.REDIS_PORT, 6379),
  username: process.env.REDIS_USERNAME,
  password: process.env.REDIS_PASSWORD,
  db: toNumber(process.env.REDIS_DB, 0),
  tls: process.env.REDIS_TLS === 'true',
}));

export type RedisConfig = ConfigType<typeof redisConfig>;

export default redisConfig;
