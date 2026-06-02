import { validateEnv } from './env.validation';

describe('validateEnv', () => {
  it('applies defaults for optional infrastructure values', () => {
    const environment = validateEnv({
      DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/app',
      JWT_SECRET: 'test-secret-with-at-least-32-chars',
    });

    expect(environment.NODE_ENV).toBe('development');
    expect(environment.PORT).toBe('3000');
    expect(environment.API_PREFIX).toBe('api');
    expect(environment.CORS_ALLOWED_ORIGINS).toBe('*');
    expect(environment.REDIS_HOST).toBe('localhost');
    expect(environment.REDIS_PORT).toBe('6379');
  });

  it('rejects missing required infrastructure values', () => {
    expect(() => validateEnv({})).toThrow(
      /DATABASE_URL is required.*JWT_SECRET is required/,
    );
  });
});
