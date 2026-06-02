import { ConfigType, registerAs } from '@nestjs/config';
import type { StringValue } from 'ms';

const jwtConfig = registerAs('jwt', () => ({
  secret: process.env.JWT_SECRET as string,
  expiresIn: (process.env.JWT_EXPIRES_IN ?? '1d') as StringValue,
}));

export type JwtConfig = ConfigType<typeof jwtConfig>;

export default jwtConfig;
