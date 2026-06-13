import { Prisma } from '@prisma/client';

const PRISMA_DATABASE_TIMEOUT_CODES = new Set(['P1002', 'P1008', 'P2024']);
const PRISMA_TIMEOUT_MESSAGE_PATTERN =
  /\b(operation has timed out|timed out|timeout|pool timeout|query read timeout|connection timeout|timeout exceeded when trying to connect)\b/i;

export function isPrismaUniqueConstraintError(
  error: unknown,
): error is Prisma.PrismaClientKnownRequestError {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2002'
  );
}

export function getPrismaUniqueConstraintFields(error: unknown): string[] {
  if (!isPrismaUniqueConstraintError(error)) {
    return [];
  }

  return Array.isArray(error.meta?.target) ? error.meta.target.map(String) : [];
}

export function isPrismaDatabaseTimeoutError(error: unknown): boolean {
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    PRISMA_DATABASE_TIMEOUT_CODES.has(error.code)
  ) {
    return true;
  }

  if (!(error instanceof Error) || !error.name.includes('PrismaClient')) {
    return false;
  }

  return PRISMA_TIMEOUT_MESSAGE_PATTERN.test(error.message);
}
