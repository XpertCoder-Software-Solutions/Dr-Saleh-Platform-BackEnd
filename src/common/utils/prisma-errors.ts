import { Prisma } from '@prisma/client';

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
