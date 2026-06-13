import { Prisma } from '@prisma/client';
import { isPrismaDatabaseTimeoutError } from './prisma-errors';

describe('isPrismaDatabaseTimeoutError', () => {
  it('detects Prisma operation timeout errors', () => {
    const error = new Prisma.PrismaClientKnownRequestError(
      'Operation has timed out',
      {
        code: 'P1008',
        clientVersion: 'test',
      },
    );

    expect(isPrismaDatabaseTimeoutError(error)).toBe(true);
  });

  it('detects Prisma pool timeout errors', () => {
    const error = new Prisma.PrismaClientKnownRequestError(
      'Timed out fetching a new connection from the connection pool.',
      {
        code: 'P2024',
        clientVersion: 'test',
      },
    );

    expect(isPrismaDatabaseTimeoutError(error)).toBe(true);
  });

  it('does not treat unrelated Prisma errors as database timeouts', () => {
    const error = new Prisma.PrismaClientKnownRequestError(
      'Unique constraint failed',
      {
        code: 'P2002',
        clientVersion: 'test',
      },
    );

    expect(isPrismaDatabaseTimeoutError(error)).toBe(false);
  });
});
