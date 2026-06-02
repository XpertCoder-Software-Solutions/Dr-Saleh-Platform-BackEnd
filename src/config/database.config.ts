import { ConfigType, registerAs } from '@nestjs/config';

const databaseConfig = registerAs('database', () => ({
  url: process.env.DATABASE_URL as string,
}));

export type DatabaseConfig = ConfigType<typeof databaseConfig>;

export default databaseConfig;
