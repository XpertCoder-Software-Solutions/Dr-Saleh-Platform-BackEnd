import { ConfigType, registerAs } from '@nestjs/config';

const toOrigins = (value: string | undefined): string[] =>
  (value ?? '*')
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);

const corsConfig = registerAs('cors', () => ({
  allowedOrigins: toOrigins(process.env.CORS_ALLOWED_ORIGINS),
  credentials: process.env.CORS_CREDENTIALS === 'true',
}));

export type CorsConfig = ConfigType<typeof corsConfig>;

export default corsConfig;
