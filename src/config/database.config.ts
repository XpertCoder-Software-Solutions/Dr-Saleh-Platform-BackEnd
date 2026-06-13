import { ConfigType, registerAs } from '@nestjs/config';
import type { PoolConfig } from 'pg';

export const DEFAULT_DATABASE_TIMEOUT_SECONDS = 30;
export const DEFAULT_PRISMA_QUERY_TIMEOUT_MS = 30_000;
export const MIN_PRISMA_QUERY_TIMEOUT_MS = 30_000;

const databaseConfig = registerAs('database', () => {
  const queryTimeoutMs = resolvePrismaQueryTimeoutMs(
    process.env.PRISMA_QUERY_TIMEOUT_MS,
  );
  const url = resolveDatabaseUrl(
    process.env.DATABASE_URL as string,
    process.env.NODE_ENV ?? 'development',
    process.env.DATABASE_SSL_MODE,
    queryTimeoutMs,
  );

  return {
    url,
    datasource: getSafeDatasourceDetails(url),
    poolConfig: buildPrismaPgPoolConfig(url, queryTimeoutMs),
    queryTimeoutMs,
    connectionTimeoutMs: resolvePgConnectionTimeoutMs(url),
  };
});

export type DatabaseConfig = ConfigType<typeof databaseConfig>;

export default databaseConfig;

export function resolveDatabaseUrl(
  databaseUrl: string,
  nodeEnv: string,
  sslMode?: string,
  queryTimeoutMs = DEFAULT_PRISMA_QUERY_TIMEOUT_MS,
): string {
  if (!databaseUrl) {
    return databaseUrl;
  }

  try {
    const url = new URL(databaseUrl);

    if (url.searchParams.has('sslmode')) {
      normalizeQueryTimeoutParam(url, queryTimeoutMs);
      return url.toString();
    }

    const configuredSslMode = normalizeSslMode(sslMode);

    if (configuredSslMode) {
      url.searchParams.set('sslmode', configuredSslMode);
      normalizeQueryTimeoutParam(url, queryTimeoutMs);
      return url.toString();
    }

    if (nodeEnv === 'development' && isAwsRdsHost(url.hostname)) {
      url.searchParams.set('sslmode', 'no-verify');
      ensureDatabaseTimeoutParams(url);
      normalizeQueryTimeoutParam(url, queryTimeoutMs);
      return url.toString();
    }

    normalizeQueryTimeoutParam(url, queryTimeoutMs);
    return url.toString();
  } catch {
    return databaseUrl;
  }
}

export function buildPrismaPgPoolConfig(
  databaseUrl: string,
  queryTimeoutMs = DEFAULT_PRISMA_QUERY_TIMEOUT_MS,
): PoolConfig {
  return {
    connectionString: normalizePgConnectionString(databaseUrl, queryTimeoutMs),
    connectionTimeoutMillis: resolvePgConnectionTimeoutMs(databaseUrl),
    query_timeout: queryTimeoutMs,
  };
}

export function resolvePrismaQueryTimeoutMs(value: unknown): number {
  const rawValue =
    typeof value === 'string' && value.trim().length > 0
      ? Number(value.trim())
      : DEFAULT_PRISMA_QUERY_TIMEOUT_MS;

  if (
    !Number.isInteger(rawValue) ||
    rawValue < MIN_PRISMA_QUERY_TIMEOUT_MS ||
    rawValue > Number.MAX_SAFE_INTEGER
  ) {
    return DEFAULT_PRISMA_QUERY_TIMEOUT_MS;
  }

  return rawValue;
}

export function resolvePgConnectionTimeoutMs(databaseUrl: string): number {
  const timeoutSeconds = getDatabaseTimeoutSeconds(databaseUrl);

  return timeoutSeconds * 1000;
}

export type SafeDatasourceDetails = {
  database?: string;
  host?: string;
  port?: string;
  schema?: string;
  sslMode?: string;
  connectTimeoutSeconds?: string;
  poolTimeoutSeconds?: string;
};

export function getSafeDatasourceDetails(
  databaseUrl: string,
): SafeDatasourceDetails {
  try {
    const url = new URL(databaseUrl);

    return {
      host: url.hostname || undefined,
      port: url.port || undefined,
      database: url.pathname.replace(/^\//, '') || undefined,
      schema: url.searchParams.get('schema') ?? undefined,
      sslMode: url.searchParams.get('sslmode') ?? undefined,
      connectTimeoutSeconds:
        url.searchParams.get('connect_timeout') ?? undefined,
      poolTimeoutSeconds: url.searchParams.get('pool_timeout') ?? undefined,
    };
  } catch {
    return {};
  }
}

function normalizePgConnectionString(
  databaseUrl: string,
  queryTimeoutMs: number,
): string {
  try {
    const url = new URL(databaseUrl);

    normalizeQueryTimeoutParam(url, queryTimeoutMs);

    return url.toString();
  } catch {
    return databaseUrl;
  }
}

function normalizeQueryTimeoutParam(url: URL, queryTimeoutMs: number): void {
  if (url.searchParams.has('query_timeout')) {
    url.searchParams.set('query_timeout', String(queryTimeoutMs));
  }
}

function ensureDatabaseTimeoutParams(url: URL): void {
  if (!url.searchParams.has('connect_timeout')) {
    url.searchParams.set(
      'connect_timeout',
      String(DEFAULT_DATABASE_TIMEOUT_SECONDS),
    );
  }

  if (!url.searchParams.has('pool_timeout')) {
    url.searchParams.set(
      'pool_timeout',
      String(DEFAULT_DATABASE_TIMEOUT_SECONDS),
    );
  }
}

function getDatabaseTimeoutSeconds(databaseUrl: string): number {
  try {
    const url = new URL(databaseUrl);
    const connectTimeoutSeconds = parsePositiveIntegerSearchParam(
      url.searchParams.get('connect_timeout'),
    );
    const poolTimeoutSeconds = parsePositiveIntegerSearchParam(
      url.searchParams.get('pool_timeout'),
    );

    return Math.max(
      connectTimeoutSeconds ?? DEFAULT_DATABASE_TIMEOUT_SECONDS,
      poolTimeoutSeconds ?? DEFAULT_DATABASE_TIMEOUT_SECONDS,
    );
  } catch {
    return DEFAULT_DATABASE_TIMEOUT_SECONDS;
  }
}

function parsePositiveIntegerSearchParam(value: string | null): number | null {
  if (value === null || value.trim().length === 0) {
    return null;
  }

  const parsedValue = Number(value);

  return Number.isInteger(parsedValue) && parsedValue > 0 ? parsedValue : null;
}

function normalizeSslMode(value?: string): string | undefined {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return undefined;
  }

  const normalizedValue = value.trim();
  const allowedValues = new Set([
    'disable',
    'allow',
    'prefer',
    'require',
    'verify-ca',
    'verify-full',
    'no-verify',
  ]);

  return allowedValues.has(normalizedValue) ? normalizedValue : undefined;
}

function isAwsRdsHost(hostname: string): boolean {
  return hostname.toLowerCase().endsWith('.rds.amazonaws.com');
}
