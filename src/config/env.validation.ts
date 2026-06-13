import {
  DEFAULT_PRISMA_QUERY_TIMEOUT_MS,
  MIN_PRISMA_QUERY_TIMEOUT_MS,
} from './database.config';

const nodeEnvironments = ['development', 'test', 'production'] as const;
const logLevels = ['fatal', 'error', 'warn', 'info', 'debug', 'trace'] as const;
const referralRewardTypes = ['PERCENTAGE', 'FIXED_AMOUNT'] as const;
const databaseSslModes = [
  'disable',
  'allow',
  'prefer',
  'require',
  'verify-ca',
  'verify-full',
  'no-verify',
] as const;

type NodeEnv = (typeof nodeEnvironments)[number];
type LogLevel = (typeof logLevels)[number];
type ReferralRewardType = (typeof referralRewardTypes)[number];
type DatabaseSslMode = (typeof databaseSslModes)[number];

export type ValidatedEnvironment = {
  NODE_ENV: NodeEnv;
  PORT: string;
  API_PREFIX: string;
  LOG_LEVEL: LogLevel;
  SWAGGER_ENABLED: string;
  DATABASE_URL: string;
  DATABASE_SSL_MODE?: DatabaseSslMode | '';
  PRISMA_QUERY_TIMEOUT_MS: string;
  APP_PUBLIC_URL: string;
  APP_PLATFORM_URL: string;
  BRAND_LOGO_PATH: string;
  BRAND_NAME: string;
  SUPPORT_EMAIL: string;
  ADMIN_NOTIFICATION_EMAIL?: string;
  BREVO_API_KEY: string;
  BREVO_SENDER_NAME: string;
  BREVO_SENDER_EMAIL: string;
  JWT_ACCESS_SECRET: string;
  JWT_REFRESH_SECRET: string;
  JWT_ACCESS_EXPIRES_IN: string;
  JWT_REFRESH_EXPIRES_IN: string;
  CORS_ALLOWED_ORIGINS: string;
  CORS_CREDENTIALS: string;
  THROTTLE_TTL: string;
  THROTTLE_LIMIT: string;
  REDIS_HOST: string;
  REDIS_PORT: string;
  REDIS_DB: string;
  REDIS_TLS: string;
  REDIS_USERNAME?: string;
  REDIS_PASSWORD?: string;
  AWS_REGION?: string;
  AWS_S3_BUCKET_NAME?: string;
  AWS_ACCESS_KEY_ID?: string;
  AWS_SECRET_ACCESS_KEY?: string;
  AWS_SESSION_TOKEN?: string;
  AWS_S3_ENDPOINT?: string;
  AWS_S3_FORCE_PATH_STYLE?: string;
  CLOUDFRONT_DOMAIN?: string;
  CLOUDFRONT_KEY_PAIR_ID?: string;
  CLOUDFRONT_PRIVATE_KEY?: string;
  FAWRY_BASE_URL?: string;
  FAWRY_MERCHANT_CODE?: string;
  FAWRY_SECURITY_KEY?: string;
  FAWRY_RETURN_URL?: string;
  FAWRY_NOTIFICATION_URL?: string;
  PAYPAL_CLIENT_ID?: string;
  PAYPAL_CLIENT_SECRET?: string;
  PAYPAL_BASE_URL?: string;
  PAYPAL_WEBHOOK_ID?: string;
  REFERRAL_REWARD_TYPE: ReferralRewardType;
  REFERRAL_REWARD_VALUE: string;
  REFERRAL_COUPON_EXPIRES_DAYS: string;
};

export function validateEnv(
  config: Record<string, unknown>,
): ValidatedEnvironment {
  const errors: string[] = [];
  const nodeEnv = toEnum(
    'NODE_ENV',
    config.NODE_ENV,
    nodeEnvironments,
    'development',
    errors,
  );
  const logLevel = toEnum(
    'LOG_LEVEL',
    config.LOG_LEVEL,
    logLevels,
    'info',
    errors,
  );
  const databaseUrl = requiredString(
    'DATABASE_URL',
    config.DATABASE_URL,
    errors,
  );
  const databaseSslMode = toOptionalEnum(
    'DATABASE_SSL_MODE',
    config.DATABASE_SSL_MODE,
    databaseSslModes,
    errors,
  );
  const prismaQueryTimeoutMs = toIntegerString(
    'PRISMA_QUERY_TIMEOUT_MS',
    config.PRISMA_QUERY_TIMEOUT_MS,
    DEFAULT_PRISMA_QUERY_TIMEOUT_MS,
    MIN_PRISMA_QUERY_TIMEOUT_MS,
    Number.MAX_SAFE_INTEGER,
    errors,
  );
  const appPublicUrl = requiredString(
    'APP_PUBLIC_URL',
    config.APP_PUBLIC_URL,
    errors,
  );
  const appPlatformUrl = requiredString(
    'APP_PLATFORM_URL',
    config.APP_PLATFORM_URL,
    errors,
  );
  const brandLogoPath = requiredString(
    'BRAND_LOGO_PATH',
    config.BRAND_LOGO_PATH,
    errors,
  );
  const brandName = requiredString('BRAND_NAME', config.BRAND_NAME, errors);
  const supportEmail = requiredString(
    'SUPPORT_EMAIL',
    config.SUPPORT_EMAIL,
    errors,
  );
  const adminNotificationEmail = optionalString(
    config.ADMIN_NOTIFICATION_EMAIL,
  );
  const brevoApiKey = requiredString(
    'BREVO_API_KEY',
    config.BREVO_API_KEY,
    errors,
  );
  const brevoSenderName = requiredString(
    'BREVO_SENDER_NAME',
    config.BREVO_SENDER_NAME,
    errors,
  );
  const brevoSenderEmail = requiredString(
    'BREVO_SENDER_EMAIL',
    config.BREVO_SENDER_EMAIL,
    errors,
  );
  const jwtAccessSecret = optionalString(
    config.JWT_ACCESS_SECRET,
    optionalString(config.JWT_SECRET),
  );
  const jwtRefreshSecret = requiredString(
    'JWT_REFRESH_SECRET',
    config.JWT_REFRESH_SECRET,
    errors,
  );
  const corsAllowedOrigins = optionalString(
    config.CORS_ALLOWED_ORIGINS,
    nodeEnv === 'production' ? '' : '*',
  );

  if (jwtAccessSecret.length === 0) {
    errors.push('JWT_ACCESS_SECRET is required.');
  }

  if (jwtAccessSecret.length > 0 && jwtAccessSecret.length < 32) {
    errors.push('JWT_ACCESS_SECRET must be at least 32 characters long.');
  }

  if (jwtRefreshSecret.length > 0 && jwtRefreshSecret.length < 32) {
    errors.push('JWT_REFRESH_SECRET must be at least 32 characters long.');
  }

  if (appPublicUrl.length > 0 && !isUrlLike(appPublicUrl)) {
    errors.push('APP_PUBLIC_URL must be a valid URL.');
  }

  if (appPlatformUrl.length > 0 && !isUrlLike(appPlatformUrl)) {
    errors.push('APP_PLATFORM_URL must be a valid URL.');
  }

  if (brandLogoPath.length > 0 && !brandLogoPath.startsWith('/')) {
    errors.push('BRAND_LOGO_PATH must start with "/".');
  }

  if (supportEmail.length > 0 && !isEmailLike(supportEmail)) {
    errors.push('SUPPORT_EMAIL must be a valid email address.');
  }

  if (
    adminNotificationEmail.length > 0 &&
    !isEmailLike(adminNotificationEmail)
  ) {
    errors.push('ADMIN_NOTIFICATION_EMAIL must be a valid email address.');
  }

  if (brevoSenderEmail.length > 0 && !isEmailLike(brevoSenderEmail)) {
    errors.push('BREVO_SENDER_EMAIL must be a valid email address.');
  }

  if (nodeEnv === 'production' && corsAllowedOrigins.length === 0) {
    errors.push('CORS_ALLOWED_ORIGINS is required in production.');
  }

  if (
    nodeEnv === 'production' &&
    parseCommaSeparatedValues(corsAllowedOrigins).includes('*')
  ) {
    errors.push('CORS_ALLOWED_ORIGINS cannot include "*" in production.');
  }

  const cloudFrontDomain = optionalString(config.CLOUDFRONT_DOMAIN);
  const cloudFrontKeyPairId = optionalString(config.CLOUDFRONT_KEY_PAIR_ID);
  const cloudFrontPrivateKey = optionalString(config.CLOUDFRONT_PRIVATE_KEY);

  if (nodeEnv === 'production') {
    if (cloudFrontDomain.length === 0) {
      errors.push('CLOUDFRONT_DOMAIN is required.');
    }

    if (
      cloudFrontDomain.length > 0 &&
      !isCloudFrontDomainLike(cloudFrontDomain)
    ) {
      errors.push('CLOUDFRONT_DOMAIN must be a valid domain.');
    }

    if (cloudFrontKeyPairId.length === 0) {
      errors.push('CLOUDFRONT_KEY_PAIR_ID is required.');
    }

    if (cloudFrontPrivateKey.length === 0) {
      errors.push('CLOUDFRONT_PRIVATE_KEY is required.');
    }

    if (
      cloudFrontPrivateKey.length > 0 &&
      !isPrivateKeyHeaderLike(cloudFrontPrivateKey)
    ) {
      errors.push(
        'CLOUDFRONT_PRIVATE_KEY must include BEGIN RSA PRIVATE KEY or BEGIN PRIVATE KEY.',
      );
    }
  }

  const fawryBaseUrl = optionalString(config.FAWRY_BASE_URL);
  const fawryReturnUrl = optionalString(config.FAWRY_RETURN_URL);
  const fawryNotificationUrl = optionalString(config.FAWRY_NOTIFICATION_URL);

  if (fawryBaseUrl.length > 0 && !isUrlLike(fawryBaseUrl)) {
    errors.push('FAWRY_BASE_URL must be a valid URL.');
  }

  if (fawryReturnUrl.length > 0 && !isUrlLike(fawryReturnUrl)) {
    errors.push('FAWRY_RETURN_URL must be a valid URL.');
  }

  if (fawryNotificationUrl.length > 0 && !isUrlLike(fawryNotificationUrl)) {
    errors.push('FAWRY_NOTIFICATION_URL must be a valid URL.');
  }

  const paypalBaseUrl = optionalString(config.PAYPAL_BASE_URL);

  if (paypalBaseUrl.length > 0 && !isUrlLike(paypalBaseUrl)) {
    errors.push('PAYPAL_BASE_URL must be a valid URL.');
  }

  const referralRewardType = toEnum(
    'REFERRAL_REWARD_TYPE',
    config.REFERRAL_REWARD_TYPE,
    referralRewardTypes,
    'PERCENTAGE',
    errors,
  );
  const referralRewardValue = positiveDecimalString(
    'REFERRAL_REWARD_VALUE',
    config.REFERRAL_REWARD_VALUE,
    10,
    errors,
  );

  if (
    referralRewardType === 'PERCENTAGE' &&
    Number(referralRewardValue) > 100
  ) {
    errors.push('REFERRAL_REWARD_VALUE must be at most 100 for PERCENTAGE.');
  }

  const validatedEnvironment: ValidatedEnvironment = {
    NODE_ENV: nodeEnv,
    PORT: toIntegerString('PORT', config.PORT, 3000, 1, 65_535, errors),
    API_PREFIX: optionalString(config.API_PREFIX, 'api'),
    LOG_LEVEL: logLevel,
    SWAGGER_ENABLED:
      nodeEnv === 'production'
        ? 'false'
        : toBooleanString(config.SWAGGER_ENABLED, true, errors),
    DATABASE_URL: databaseUrl,
    DATABASE_SSL_MODE: databaseSslMode,
    PRISMA_QUERY_TIMEOUT_MS: prismaQueryTimeoutMs,
    APP_PUBLIC_URL: appPublicUrl,
    APP_PLATFORM_URL: appPlatformUrl,
    BRAND_LOGO_PATH: brandLogoPath,
    BRAND_NAME: brandName,
    SUPPORT_EMAIL: supportEmail,
    ADMIN_NOTIFICATION_EMAIL: adminNotificationEmail,
    BREVO_API_KEY: brevoApiKey,
    BREVO_SENDER_NAME: brevoSenderName,
    BREVO_SENDER_EMAIL: brevoSenderEmail,
    JWT_ACCESS_SECRET: jwtAccessSecret,
    JWT_REFRESH_SECRET: jwtRefreshSecret,
    JWT_ACCESS_EXPIRES_IN: optionalString(config.JWT_ACCESS_EXPIRES_IN, '15m'),
    JWT_REFRESH_EXPIRES_IN: optionalString(config.JWT_REFRESH_EXPIRES_IN, '7d'),
    CORS_ALLOWED_ORIGINS: corsAllowedOrigins,
    CORS_CREDENTIALS: toBooleanString(config.CORS_CREDENTIALS, false, errors),
    THROTTLE_TTL: toIntegerString(
      'THROTTLE_TTL',
      config.THROTTLE_TTL,
      60_000,
      1,
      Number.MAX_SAFE_INTEGER,
      errors,
    ),
    THROTTLE_LIMIT: toIntegerString(
      'THROTTLE_LIMIT',
      config.THROTTLE_LIMIT,
      100,
      1,
      Number.MAX_SAFE_INTEGER,
      errors,
    ),
    REDIS_HOST: optionalString(config.REDIS_HOST, 'localhost'),
    REDIS_PORT: toIntegerString(
      'REDIS_PORT',
      config.REDIS_PORT,
      6379,
      1,
      65_535,
      errors,
    ),
    REDIS_DB: toIntegerString(
      'REDIS_DB',
      config.REDIS_DB,
      0,
      0,
      Number.MAX_SAFE_INTEGER,
      errors,
    ),
    REDIS_TLS: toBooleanString(config.REDIS_TLS, false, errors),
    REDIS_USERNAME: optionalString(config.REDIS_USERNAME),
    REDIS_PASSWORD: optionalString(config.REDIS_PASSWORD),
    AWS_REGION: optionalString(config.AWS_REGION),
    AWS_S3_BUCKET_NAME: optionalString(config.AWS_S3_BUCKET_NAME),
    AWS_ACCESS_KEY_ID: optionalString(config.AWS_ACCESS_KEY_ID),
    AWS_SECRET_ACCESS_KEY: optionalString(config.AWS_SECRET_ACCESS_KEY),
    AWS_SESSION_TOKEN: optionalString(config.AWS_SESSION_TOKEN),
    AWS_S3_ENDPOINT: optionalString(config.AWS_S3_ENDPOINT),
    AWS_S3_FORCE_PATH_STYLE: toBooleanString(
      config.AWS_S3_FORCE_PATH_STYLE,
      false,
      errors,
    ),
    CLOUDFRONT_DOMAIN: cloudFrontDomain,
    CLOUDFRONT_KEY_PAIR_ID: cloudFrontKeyPairId,
    CLOUDFRONT_PRIVATE_KEY: cloudFrontPrivateKey,
    FAWRY_BASE_URL: fawryBaseUrl,
    FAWRY_MERCHANT_CODE: optionalString(config.FAWRY_MERCHANT_CODE),
    FAWRY_SECURITY_KEY: optionalString(config.FAWRY_SECURITY_KEY),
    FAWRY_RETURN_URL: fawryReturnUrl,
    FAWRY_NOTIFICATION_URL: fawryNotificationUrl,
    PAYPAL_CLIENT_ID: optionalString(config.PAYPAL_CLIENT_ID),
    PAYPAL_CLIENT_SECRET: optionalString(config.PAYPAL_CLIENT_SECRET),
    PAYPAL_BASE_URL: paypalBaseUrl,
    PAYPAL_WEBHOOK_ID: optionalString(config.PAYPAL_WEBHOOK_ID),
    REFERRAL_REWARD_TYPE: referralRewardType,
    REFERRAL_REWARD_VALUE: referralRewardValue,
    REFERRAL_COUPON_EXPIRES_DAYS: toIntegerString(
      'REFERRAL_COUPON_EXPIRES_DAYS',
      config.REFERRAL_COUPON_EXPIRES_DAYS,
      30,
      1,
      3650,
      errors,
    ),
  };

  if (errors.length > 0) {
    throw new Error(`Environment validation failed: ${errors.join(' ')}`);
  }

  return validatedEnvironment;
}

function requiredString(
  name: string,
  value: unknown,
  errors: string[],
): string {
  const resolvedValue = optionalString(value);

  if (resolvedValue.length === 0) {
    errors.push(`${name} is required.`);
  }

  return resolvedValue;
}

function optionalString(value: unknown, defaultValue = ''): string {
  return typeof value === 'string' && value.length > 0 ? value : defaultValue;
}

function parseCommaSeparatedValues(value: string): string[] {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

function isEmailLike(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function isUrlLike(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

function isCloudFrontDomainLike(value: string): boolean {
  let hostname = value.trim();

  if (/^https?:\/\//i.test(hostname)) {
    try {
      const url = new URL(hostname);

      if (
        url.pathname !== '/' ||
        url.search.length > 0 ||
        url.hash.length > 0
      ) {
        return false;
      }

      hostname = url.hostname;
    } catch {
      return false;
    }
  }

  const labels = hostname.split('.');

  return (
    labels.length > 1 &&
    labels.every((label) =>
      /^[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?$/.test(label),
    )
  );
}

function isPrivateKeyHeaderLike(value: string): boolean {
  return (
    value.includes('BEGIN RSA PRIVATE KEY') ||
    value.includes('BEGIN PRIVATE KEY')
  );
}

function toIntegerString(
  name: string,
  value: unknown,
  defaultValue: number,
  min: number,
  max: number,
  errors: string[],
): string {
  const rawValue = optionalString(value, String(defaultValue));
  const numberValue = Number(rawValue);

  if (
    !Number.isInteger(numberValue) ||
    numberValue < min ||
    numberValue > max
  ) {
    errors.push(`${name} must be an integer between ${min} and ${max}.`);
    return String(defaultValue);
  }

  return String(numberValue);
}

function positiveDecimalString(
  name: string,
  value: unknown,
  defaultValue: number,
  errors: string[],
): string {
  const rawValue = optionalString(value, String(defaultValue));
  const numberValue = Number(rawValue);

  if (!Number.isFinite(numberValue) || numberValue <= 0) {
    errors.push(`${name} must be a positive number.`);
    return String(defaultValue);
  }

  return String(numberValue);
}

function toBooleanString(
  value: unknown,
  defaultValue: boolean,
  errors: string[],
): string {
  const rawValue = optionalString(value, String(defaultValue));

  if (rawValue !== 'true' && rawValue !== 'false') {
    errors.push('Boolean environment variables must be "true" or "false".');
    return String(defaultValue);
  }

  return rawValue;
}

function toEnum<T extends readonly string[]>(
  name: string,
  value: unknown,
  allowedValues: T,
  defaultValue: T[number],
  errors: string[],
): T[number] {
  const rawValue = optionalString(value, defaultValue);

  if (!allowedValues.includes(rawValue)) {
    errors.push(`${name} must be one of: ${allowedValues.join(', ')}.`);
    return defaultValue;
  }

  return rawValue;
}

function toOptionalEnum<T extends readonly string[]>(
  name: string,
  value: unknown,
  allowedValues: T,
  errors: string[],
): T[number] | '' {
  const rawValue = optionalString(value);

  if (rawValue.length === 0) {
    return '';
  }

  if (!allowedValues.includes(rawValue)) {
    errors.push(`${name} must be one of: ${allowedValues.join(', ')}.`);
    return '';
  }

  return rawValue;
}
