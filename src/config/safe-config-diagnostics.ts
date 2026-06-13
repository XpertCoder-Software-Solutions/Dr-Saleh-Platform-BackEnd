import { ConfigService } from '@nestjs/config';

export type SafeConfigDiagnostics = {
  databaseUrlConfigured: boolean;
  redisConfigured: boolean;
  jwtAccessSecretConfigured: boolean;
  jwtRefreshSecretConfigured: boolean;
  awsConfigured: boolean;
  cloudFrontConfigured: boolean;
};

export function buildSafeConfigDiagnostics(
  configService: ConfigService,
): SafeConfigDiagnostics {
  return {
    databaseUrlConfigured: hasConfig(configService, 'DATABASE_URL'),
    redisConfigured:
      hasConfig(configService, 'REDIS_HOST') &&
      hasConfig(configService, 'REDIS_PORT'),
    jwtAccessSecretConfigured:
      hasConfig(configService, 'JWT_ACCESS_SECRET') ||
      hasConfig(configService, 'JWT_SECRET'),
    jwtRefreshSecretConfigured: hasConfig(configService, 'JWT_REFRESH_SECRET'),
    awsConfigured:
      hasAnyConfig(configService, 'AWS_REGION', 'S3_REGION') &&
      hasAnyConfig(configService, 'AWS_S3_BUCKET_NAME', 'S3_BUCKET') &&
      hasAnyConfig(configService, 'AWS_ACCESS_KEY_ID', 'S3_ACCESS_KEY_ID') &&
      hasAnyConfig(
        configService,
        'AWS_SECRET_ACCESS_KEY',
        'S3_SECRET_ACCESS_KEY',
      ),
    cloudFrontConfigured:
      hasConfig(configService, 'CLOUDFRONT_DOMAIN') &&
      hasConfig(configService, 'CLOUDFRONT_KEY_PAIR_ID') &&
      hasConfig(configService, 'CLOUDFRONT_PRIVATE_KEY'),
  };
}

export function formatSafeConfigDiagnostics(
  diagnostics: SafeConfigDiagnostics,
): string {
  return Object.entries(diagnostics)
    .map(([key, value]) => `${key}=${value}`)
    .join(' ');
}

function hasAnyConfig(
  configService: ConfigService,
  ...keys: string[]
): boolean {
  return keys.some((key) => hasConfig(configService, key));
}

function hasConfig(configService: ConfigService, key: string): boolean {
  const value = configService.get<unknown>(key);

  return typeof value === 'string'
    ? value.trim().length > 0
    : value !== undefined && value !== null;
}
