import { validateEnv } from './env.validation';

describe('validateEnv', () => {
  it('applies defaults for optional infrastructure values', () => {
    const environment = validateEnv({
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
    });

    expect(environment.NODE_ENV).toBe('development');
    expect(environment.PORT).toBe('3000');
    expect(environment.API_PREFIX).toBe('api');
    expect(environment.CORS_ALLOWED_ORIGINS).toBe('*');
    expect(environment.REDIS_HOST).toBe('localhost');
    expect(environment.REDIS_PORT).toBe('6379');
    expect(environment.JWT_ACCESS_EXPIRES_IN).toBe('15m');
    expect(environment.JWT_REFRESH_EXPIRES_IN).toBe('7d');
  });

  it('rejects missing required infrastructure values', () => {
    expect(() => validateEnv({})).toThrow(
      /DATABASE_URL is required.*APP_PUBLIC_URL is required.*APP_PLATFORM_URL is required.*BRAND_LOGO_PATH is required.*BRAND_NAME is required.*SUPPORT_EMAIL is required.*BREVO_API_KEY is required.*BREVO_SENDER_NAME is required.*BREVO_SENDER_EMAIL is required.*JWT_REFRESH_SECRET is required.*JWT_ACCESS_SECRET is required/,
    );
  });

  it('rejects invalid Brevo sender email', () => {
    expect(() =>
      validateEnv({
        DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/app',
        APP_PUBLIC_URL: 'http://localhost:3000',
        APP_PLATFORM_URL: 'http://localhost:3000',
        BRAND_LOGO_PATH: '/brand/logo.png',
        BRAND_NAME: 'Dr. Saleh Platform',
        SUPPORT_EMAIL: 'support@drsaleh.com',
        BREVO_API_KEY: 'test-brevo-api-key',
        BREVO_SENDER_NAME: 'Dr. Saleh Platform',
        BREVO_SENDER_EMAIL: 'not-an-email',
        JWT_ACCESS_SECRET: 'test-access-secret-with-at-least-32-chars',
        JWT_REFRESH_SECRET: 'test-refresh-secret-with-at-least-32-chars',
      }),
    ).toThrow(/BREVO_SENDER_EMAIL must be a valid email address/);
  });

  it('rejects invalid brand email template values', () => {
    expect(() =>
      validateEnv({
        DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/app',
        APP_PUBLIC_URL: 'not-a-url',
        APP_PLATFORM_URL: 'ftp://localhost',
        BRAND_LOGO_PATH: 'public/brand/logo.png',
        BRAND_NAME: 'Dr. Saleh Platform',
        SUPPORT_EMAIL: 'support',
        BREVO_API_KEY: 'test-brevo-api-key',
        BREVO_SENDER_NAME: 'Dr. Saleh Platform',
        BREVO_SENDER_EMAIL: 'no-reply@example.com',
        JWT_ACCESS_SECRET: 'test-access-secret-with-at-least-32-chars',
        JWT_REFRESH_SECRET: 'test-refresh-secret-with-at-least-32-chars',
      }),
    ).toThrow(
      /APP_PUBLIC_URL must be a valid URL.*APP_PLATFORM_URL must be a valid URL.*BRAND_LOGO_PATH must start with "\/".*SUPPORT_EMAIL must be a valid email address/,
    );
  });
});
