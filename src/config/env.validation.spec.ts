import { validateEnv } from './env.validation';

const baseEnvironment = {
  DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/app',
  APP_PUBLIC_URL: 'http://localhost:3000',
  APP_PLATFORM_URL: 'http://localhost:3000',
  BRAND_LOGO_PATH: '/brand/logo.png',
  BRAND_NAME: 'Dr. Saleh Platform',
  SUPPORT_EMAIL: 'support@drsaleh.com',
  BREVO_API_KEY: 'test-brevo-api-key',
  BREVO_SENDER_NAME: 'Dr. Saleh Platform',
  BREVO_SENDER_EMAIL: 'no-reply@example.com',
  JWT_ACCESS_SECRET: 'test-access-secret-with-at-least-32-chars',
  JWT_REFRESH_SECRET: 'test-refresh-secret-with-at-least-32-chars',
  CLOUDFRONT_DOMAIN: 'd27i48p63zrtq4.cloudfront.net',
  CLOUDFRONT_KEY_PAIR_ID: 'K123456789ABCDEFG',
  CLOUDFRONT_PRIVATE_KEY:
    '-----BEGIN PRIVATE KEY-----\\ntest\\n-----END PRIVATE KEY-----',
};

describe('validateEnv', () => {
  it('applies defaults for optional infrastructure values', () => {
    const environment = validateEnv(baseEnvironment);

    expect(environment.NODE_ENV).toBe('development');
    expect(environment.PORT).toBe('3000');
    expect(environment.API_PREFIX).toBe('api');
    expect(environment.CORS_ALLOWED_ORIGINS).toBe('*');
    expect(environment.SWAGGER_ENABLED).toBe('true');
    expect(environment.REDIS_HOST).toBe('localhost');
    expect(environment.REDIS_PORT).toBe('6379');
    expect(environment.JWT_ACCESS_EXPIRES_IN).toBe('15m');
    expect(environment.JWT_REFRESH_EXPIRES_IN).toBe('7d');
    expect(environment.PRISMA_QUERY_TIMEOUT_MS).toBe('30000');
  });

  it('rejects missing required infrastructure values', () => {
    expect(() => validateEnv({})).toThrow(
      /DATABASE_URL is required.*APP_PUBLIC_URL is required.*APP_PLATFORM_URL is required.*BRAND_LOGO_PATH is required.*BRAND_NAME is required.*SUPPORT_EMAIL is required.*BREVO_API_KEY is required.*BREVO_SENDER_NAME is required.*BREVO_SENDER_EMAIL is required.*JWT_REFRESH_SECRET is required.*JWT_ACCESS_SECRET is required/,
    );
  });

  it('accepts optional database SSL mode values', () => {
    const environment = validateEnv({
      ...baseEnvironment,
      DATABASE_SSL_MODE: 'no-verify',
    });

    expect(environment.DATABASE_SSL_MODE).toBe('no-verify');
  });

  it('rejects invalid database SSL mode values', () => {
    expect(() =>
      validateEnv({
        ...baseEnvironment,
        DATABASE_SSL_MODE: 'sometimes',
      }),
    ).toThrow(/DATABASE_SSL_MODE must be one of:/);
  });

  it('rejects wildcard CORS origins in production', () => {
    expect(() =>
      validateEnv({
        ...baseEnvironment,
        NODE_ENV: 'production',
        CORS_ALLOWED_ORIGINS: '*',
      }),
    ).toThrow(/CORS_ALLOWED_ORIGINS cannot include "\*" in production/);
  });

  it('disables Swagger by default in production', () => {
    const environment = validateEnv({
      ...baseEnvironment,
      NODE_ENV: 'production',
      CORS_ALLOWED_ORIGINS: 'https://app.example.com',
    });

    expect(environment.SWAGGER_ENABLED).toBe('false');
  });

  it('keeps Swagger disabled in production even when explicitly enabled', () => {
    const environment = validateEnv({
      ...baseEnvironment,
      NODE_ENV: 'production',
      CORS_ALLOWED_ORIGINS: 'https://app.example.com',
      SWAGGER_ENABLED: 'true',
    });

    expect(environment.SWAGGER_ENABLED).toBe('false');
  });

  it('accepts Prisma query timeout values of at least 30000ms', () => {
    const environment = validateEnv({
      ...baseEnvironment,
      PRISMA_QUERY_TIMEOUT_MS: '60000',
    });

    expect(environment.PRISMA_QUERY_TIMEOUT_MS).toBe('60000');
  });

  it('rejects Prisma query timeout values below 30000ms', () => {
    expect(() =>
      validateEnv({
        ...baseEnvironment,
        PRISMA_QUERY_TIMEOUT_MS: '8000',
      }),
    ).toThrow(/PRISMA_QUERY_TIMEOUT_MS must be an integer between 30000/);
  });

  it('allows missing CloudFront config outside production', () => {
    const environment = validateEnv({
      ...baseEnvironment,
      CLOUDFRONT_DOMAIN: '',
      CLOUDFRONT_KEY_PAIR_ID: '',
      CLOUDFRONT_PRIVATE_KEY: '',
    });

    expect(environment.CLOUDFRONT_DOMAIN).toBe('');
    expect(environment.CLOUDFRONT_KEY_PAIR_ID).toBe('');
    expect(environment.CLOUDFRONT_PRIVATE_KEY).toBe('');
  });

  it('allows invalid CloudFront config outside production', () => {
    const environment = validateEnv({
      ...baseEnvironment,
      CLOUDFRONT_DOMAIN: 'not a domain',
      CLOUDFRONT_PRIVATE_KEY: 'not-a-private-key',
    });

    expect(environment.CLOUDFRONT_DOMAIN).toBe('not a domain');
    expect(environment.CLOUDFRONT_PRIVATE_KEY).toBe('not-a-private-key');
  });

  it('requires CloudFront config in production', () => {
    expect(() =>
      validateEnv({
        ...baseEnvironment,
        NODE_ENV: 'production',
        CORS_ALLOWED_ORIGINS: 'https://app.example.com',
        CLOUDFRONT_DOMAIN: '',
        CLOUDFRONT_KEY_PAIR_ID: '',
        CLOUDFRONT_PRIVATE_KEY: '',
      }),
    ).toThrow(
      /CLOUDFRONT_DOMAIN is required.*CLOUDFRONT_KEY_PAIR_ID is required.*CLOUDFRONT_PRIVATE_KEY is required/,
    );
  });

  it('rejects invalid CloudFront private key headers in production', () => {
    expect(() =>
      validateEnv({
        ...baseEnvironment,
        NODE_ENV: 'production',
        CORS_ALLOWED_ORIGINS: 'https://app.example.com',
        CLOUDFRONT_PRIVATE_KEY: 'not-a-private-key',
      }),
    ).toThrow(/CLOUDFRONT_PRIVATE_KEY must include BEGIN RSA PRIVATE KEY/);
  });

  it('rejects invalid Brevo sender email', () => {
    expect(() =>
      validateEnv({
        ...baseEnvironment,
        BREVO_SENDER_EMAIL: 'not-an-email',
      }),
    ).toThrow(/BREVO_SENDER_EMAIL must be a valid email address/);
  });

  it('rejects invalid brand email template values', () => {
    expect(() =>
      validateEnv({
        ...baseEnvironment,
        APP_PUBLIC_URL: 'not-a-url',
        APP_PLATFORM_URL: 'ftp://localhost',
        BRAND_LOGO_PATH: 'public/brand/logo.png',
        SUPPORT_EMAIL: 'support',
      }),
    ).toThrow(
      /APP_PUBLIC_URL must be a valid URL.*APP_PLATFORM_URL must be a valid URL.*BRAND_LOGO_PATH must start with "\/".*SUPPORT_EMAIL must be a valid email address/,
    );
  });

  it('rejects invalid CloudFront domain values in production', () => {
    expect(() =>
      validateEnv({
        ...baseEnvironment,
        NODE_ENV: 'production',
        CORS_ALLOWED_ORIGINS: 'https://app.example.com',
        CLOUDFRONT_DOMAIN: 'not a domain',
      }),
    ).toThrow(/CLOUDFRONT_DOMAIN must be a valid domain/);
  });
});
