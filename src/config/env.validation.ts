const nodeEnvironments = ['development', 'test', 'production'] as const;
const logLevels = ['fatal', 'error', 'warn', 'info', 'debug', 'trace'] as const;

type NodeEnv = (typeof nodeEnvironments)[number];
type LogLevel = (typeof logLevels)[number];

export type ValidatedEnvironment = {
  NODE_ENV: NodeEnv;
  PORT: string;
  API_PREFIX: string;
  LOG_LEVEL: LogLevel;
  DATABASE_URL: string;
  JWT_SECRET: string;
  JWT_EXPIRES_IN: string;
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
  S3_REGION?: string;
  S3_BUCKET?: string;
  S3_ACCESS_KEY_ID?: string;
  S3_SECRET_ACCESS_KEY?: string;
  S3_ENDPOINT?: string;
  S3_FORCE_PATH_STYLE?: string;
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
  const jwtSecret = requiredString('JWT_SECRET', config.JWT_SECRET, errors);
  const corsAllowedOrigins = optionalString(
    config.CORS_ALLOWED_ORIGINS,
    nodeEnv === 'production' ? '' : '*',
  );

  if (jwtSecret.length > 0 && jwtSecret.length < 32) {
    errors.push('JWT_SECRET must be at least 32 characters long.');
  }

  if (nodeEnv === 'production' && corsAllowedOrigins.length === 0) {
    errors.push('CORS_ALLOWED_ORIGINS is required in production.');
  }

  const validatedEnvironment: ValidatedEnvironment = {
    NODE_ENV: nodeEnv,
    PORT: toIntegerString('PORT', config.PORT, 3000, 1, 65_535, errors),
    API_PREFIX: optionalString(config.API_PREFIX, 'api'),
    LOG_LEVEL: logLevel,
    DATABASE_URL: databaseUrl,
    JWT_SECRET: jwtSecret,
    JWT_EXPIRES_IN: optionalString(config.JWT_EXPIRES_IN, '1d'),
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
    S3_REGION: optionalString(config.S3_REGION),
    S3_BUCKET: optionalString(config.S3_BUCKET),
    S3_ACCESS_KEY_ID: optionalString(config.S3_ACCESS_KEY_ID),
    S3_SECRET_ACCESS_KEY: optionalString(config.S3_SECRET_ACCESS_KEY),
    S3_ENDPOINT: optionalString(config.S3_ENDPOINT),
    S3_FORCE_PATH_STYLE: optionalString(config.S3_FORCE_PATH_STYLE),
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
