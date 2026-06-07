import { ConfigType, registerAs } from '@nestjs/config';
import type { StringValue } from 'ms';

const jwtConfig = registerAs('jwt', () => ({
  accessSecret: (process.env.JWT_ACCESS_SECRET ??
    process.env.JWT_SECRET) as string,
  refreshSecret: process.env.JWT_REFRESH_SECRET as string,
  accessExpiresIn: (process.env.JWT_ACCESS_EXPIRES_IN ?? '15m') as StringValue,
  refreshExpiresIn: (process.env.JWT_REFRESH_EXPIRES_IN ?? '7d') as StringValue,
}));

export type JwtConfig = ConfigType<typeof jwtConfig>;

export default jwtConfig;
