import {
  buildPrismaPgPoolConfig,
  getSafeDatasourceDetails,
  resolveDatabaseUrl,
  resolvePgConnectionTimeoutMs,
  resolvePrismaQueryTimeoutMs,
} from './database.config';

describe('resolveDatabaseUrl', () => {
  it('keeps local database URLs unchanged when SSL mode is not configured', () => {
    expect(
      resolveDatabaseUrl(
        'postgresql://postgres:postgres@localhost:5432/app?schema=public',
        'development',
      ),
    ).toBe('postgresql://postgres:postgres@localhost:5432/app?schema=public');
  });

  it('adds no-verify SSL mode for development AWS RDS URLs without sslmode', () => {
    expect(
      resolveDatabaseUrl(
        'postgresql://postgres:postgres@example.rds.amazonaws.com:5432/app?schema=public',
        'development',
      ),
    ).toBe(
      'postgresql://postgres:postgres@example.rds.amazonaws.com:5432/app?schema=public&sslmode=no-verify&connect_timeout=30&pool_timeout=30',
    );
  });

  it('does not add no-verify SSL mode for production AWS RDS URLs', () => {
    expect(
      resolveDatabaseUrl(
        'postgresql://postgres:postgres@example.rds.amazonaws.com:5432/app?schema=public',
        'production',
      ),
    ).toBe(
      'postgresql://postgres:postgres@example.rds.amazonaws.com:5432/app?schema=public',
    );
  });

  it('prefers explicit DATABASE_SSL_MODE when provided', () => {
    expect(
      resolveDatabaseUrl(
        'postgresql://postgres:postgres@example.rds.amazonaws.com:5432/app?schema=public',
        'development',
        'verify-full',
      ),
    ).toBe(
      'postgresql://postgres:postgres@example.rds.amazonaws.com:5432/app?schema=public&sslmode=verify-full',
    );
  });

  it('keeps existing sslmode values unchanged', () => {
    expect(
      resolveDatabaseUrl(
        'postgresql://postgres:postgres@example.rds.amazonaws.com:5432/app?schema=public&sslmode=require',
        'development',
        'no-verify',
      ),
    ).toBe(
      'postgresql://postgres:postgres@example.rds.amazonaws.com:5432/app?schema=public&sslmode=require',
    );
  });

  it('keeps existing RDS timeout params when adding development SSL mode', () => {
    expect(
      resolveDatabaseUrl(
        'postgresql://postgres:postgres@example.rds.amazonaws.com:5432/app?schema=public&connect_timeout=45&pool_timeout=60',
        'development',
      ),
    ).toBe(
      'postgresql://postgres:postgres@example.rds.amazonaws.com:5432/app?schema=public&connect_timeout=45&pool_timeout=60&sslmode=no-verify',
    );
  });

  it('normalizes low query_timeout URL params to the configured Prisma query timeout', () => {
    expect(
      resolveDatabaseUrl(
        'postgresql://postgres:postgres@localhost:5432/app?schema=public&query_timeout=8000',
        'development',
        undefined,
        30_000,
      ),
    ).toBe(
      'postgresql://postgres:postgres@localhost:5432/app?schema=public&query_timeout=30000',
    );
  });
});

describe('buildPrismaPgPoolConfig', () => {
  it('maps DATABASE_URL connect_timeout and pool_timeout params to pg connection timeout milliseconds', () => {
    const config = buildPrismaPgPoolConfig(
      'postgresql://postgres:postgres@example.rds.amazonaws.com:5432/app?schema=public&connect_timeout=10&pool_timeout=30',
      30_000,
    );

    expect(config.connectionTimeoutMillis).toBe(30_000);
    expect(config.query_timeout).toBe(30_000);
  });

  it('uses a 30000ms pg connection timeout by default', () => {
    expect(
      resolvePgConnectionTimeoutMs(
        'postgresql://postgres:postgres@example.rds.amazonaws.com:5432/app?schema=public',
      ),
    ).toBe(30_000);
  });

  it('does not let query_timeout=8000 in DATABASE_URL override PRISMA_QUERY_TIMEOUT_MS', () => {
    const config = buildPrismaPgPoolConfig(
      'postgresql://postgres:postgres@localhost:5432/app?schema=public&query_timeout=8000',
      30_000,
    );

    expect(config.connectionString).toContain('query_timeout=30000');
    expect(config.query_timeout).toBe(30_000);
  });
});

describe('resolvePrismaQueryTimeoutMs', () => {
  it('defaults to 30000ms', () => {
    expect(resolvePrismaQueryTimeoutMs(undefined)).toBe(30_000);
  });

  it('rejects lower timeout values by falling back to 30000ms', () => {
    expect(resolvePrismaQueryTimeoutMs('8000')).toBe(30_000);
  });

  it('accepts higher configured timeout values', () => {
    expect(resolvePrismaQueryTimeoutMs('60000')).toBe(60_000);
  });
});

describe('getSafeDatasourceDetails', () => {
  it('returns datasource details without credentials', () => {
    const details = getSafeDatasourceDetails(
      'postgresql://postgres:secret@example.rds.amazonaws.com:5432/app?schema=public&sslmode=no-verify&connect_timeout=30&pool_timeout=30',
    );

    expect(details).toEqual({
      host: 'example.rds.amazonaws.com',
      port: '5432',
      database: 'app',
      schema: 'public',
      sslMode: 'no-verify',
      connectTimeoutSeconds: '30',
      poolTimeoutSeconds: '30',
    });
    expect(JSON.stringify(details)).not.toContain('secret');
  });
});
