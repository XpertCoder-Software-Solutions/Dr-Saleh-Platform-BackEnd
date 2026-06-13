import { HttpException } from '@nestjs/common';
import type { Request } from 'express';

const SENSITIVE_QUERY_KEYS = [
  'access_token',
  'accesstoken',
  'api_key',
  'apikey',
  'authorization',
  'cookie',
  'jwt',
  'key',
  'password',
  'refresh_token',
  'refreshtoken',
  'secret',
  'token',
];

export type SafeExceptionDetails = {
  message: string;
  name: string;
  stack?: string;
};

export function getSafeRequestDetails(request: Request): {
  method: string;
  url: string;
} {
  return {
    method: request.method,
    url: sanitizeUrl(request.originalUrl ?? request.url),
  };
}

export function sanitizeUrl(value: string): string {
  try {
    const parsedUrl = new URL(value, 'http://local.diagnostic');

    for (const key of [...parsedUrl.searchParams.keys()]) {
      if (isSensitiveKey(key)) {
        parsedUrl.searchParams.set(key, '[redacted]');
      }
    }

    return `${parsedUrl.pathname}${parsedUrl.search}`;
  } catch {
    return value.split('?')[0] ?? value;
  }
}

export function getExceptionStatusCode(exception: unknown): number {
  if (exception instanceof HttpException) {
    return exception.getStatus();
  }

  return 500;
}

export function getSafeExceptionDetails(
  exception: unknown,
): SafeExceptionDetails {
  if (exception instanceof Error) {
    return {
      name: exception.name,
      message: redactSensitiveText(exception.message),
      stack:
        typeof exception.stack === 'string'
          ? redactSensitiveText(exception.stack)
          : undefined,
    };
  }

  return {
    name: typeof exception,
    message: 'Non-Error exception thrown',
  };
}

export function redactSensitiveText(value: string): string {
  return value
    .replace(
      /\b((?:postgres(?:ql)?|mysql|redis|mongodb(?:\+srv)?):\/\/)([^@\s]+)@/gi,
      '$1[redacted]@',
    )
    .replace(
      /\b(authorization|cookie|password|secret|token|api[_-]?key)=([^&\s]+)/gi,
      '$1=[redacted]',
    )
    .replace(/\bBearer\s+[A-Za-z0-9._~+/-]+=*/gi, 'Bearer [redacted]');
}

function isSensitiveKey(key: string): boolean {
  const normalizedKey = key.toLowerCase().replace(/[-_\s]/g, '');

  return SENSITIVE_QUERY_KEYS.some(
    (sensitiveKey) =>
      normalizedKey === sensitiveKey.replace(/[-_\s]/g, '') ||
      normalizedKey.includes(sensitiveKey.replace(/[-_\s]/g, '')),
  );
}
