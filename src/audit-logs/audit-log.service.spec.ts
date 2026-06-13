import { NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { AuditActions, AuditEntityTypes } from './audit-log.constants';
import { AuditLogService } from './audit-log.service';

type PrismaMock = {
  $transaction: jest.Mock;
  auditLog: {
    count: jest.Mock;
    create: jest.Mock;
    findMany: jest.Mock;
    findUnique: jest.Mock;
  };
};

describe('AuditLogService', () => {
  let prisma: PrismaMock;
  let service: AuditLogService;

  beforeEach(() => {
    prisma = createPrismaMock();
    service = new AuditLogService(prisma as unknown as PrismaService);
  });

  it('writes a sanitized audit log without sensitive metadata', async () => {
    prisma.auditLog.create.mockResolvedValue(undefined);

    await service.logAction({
      actorUserId: '5cf7f76c-6c23-4b68-b48e-083e84d87105',
      actorEmail: 'admin@example.com',
      actorRole: 'Admin',
      action: AuditActions.CourseCreated,
      entityType: AuditEntityTypes.Course,
      entityId: 'de85ad71-84f8-49db-a631-23aa64d94f4a',
      ipAddress: '203.0.113.10',
      userAgent: 'Bearer secret.jwt.token token=raw-secret',
      metadata: {
        password: 'plain-text',
        nested: {
          refreshToken: 'refresh-token',
          safeValue: 'visible',
        },
        message: 'postgres://user:pass@example.com/db token=abc',
      },
    });

    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: {
        action: AuditActions.CourseCreated,
        actorEmail: 'admin@example.com',
        actorRole: 'Admin',
        actorUserId: '5cf7f76c-6c23-4b68-b48e-083e84d87105',
        description: undefined,
        entityId: 'de85ad71-84f8-49db-a631-23aa64d94f4a',
        entityType: AuditEntityTypes.Course,
        ipAddress: '203.0.113.10',
        metadata: {
          password: '[redacted]',
          nested: {
            refreshToken: '[redacted]',
            safeValue: 'visible',
          },
          message: 'postgres://[redacted]@example.com/db token=[redacted]',
        },
        userAgent: 'Bearer [redacted] token=[redacted]',
      },
    });
  });

  it('does not throw when audit persistence fails', async () => {
    prisma.auditLog.create.mockRejectedValue(new Error('database unavailable'));

    await expect(
      service.logAction({
        action: AuditActions.UserLogin,
        entityType: AuditEntityTypes.User,
      }),
    ).resolves.toBeUndefined();
  });

  it('filters and paginates audit logs', async () => {
    prisma.auditLog.count.mockResolvedValue(1);
    prisma.auditLog.findMany.mockResolvedValue([createAuditLog()]);

    const result = await service.findAll({
      action: 'COURSE_CREATED',
      actorUserId: '5cf7f76c-6c23-4b68-b48e-083e84d87105',
      dateFrom: '2026-06-01T00:00:00.000Z',
      dateTo: '2026-06-13T00:00:00.000Z',
      entityId: 'de85ad71-84f8-49db-a631-23aa64d94f4a',
      entityType: 'Course',
      limit: 10,
      page: 2,
    });

    expect(prisma.auditLog.count).toHaveBeenCalledWith({
      where: {
        action: { equals: 'COURSE_CREATED', mode: 'insensitive' },
        actorUserId: '5cf7f76c-6c23-4b68-b48e-083e84d87105',
        createdAt: {
          gte: new Date('2026-06-01T00:00:00.000Z'),
          lte: new Date('2026-06-13T00:00:00.000Z'),
        },
        entityId: 'de85ad71-84f8-49db-a631-23aa64d94f4a',
        entityType: { equals: 'Course', mode: 'insensitive' },
      },
    });
    expect(prisma.auditLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 10,
        take: 10,
      }),
    );
    expect(result.data.pagination).toEqual({
      limit: 10,
      page: 2,
      total: 1,
      totalPages: 1,
    });
  });

  it('returns one audit log by id', async () => {
    prisma.auditLog.findUnique.mockResolvedValue(createAuditLog());

    await expect(service.findOne('audit-log-id')).resolves.toEqual({
      message: 'Audit log returned successfully',
      data: {
        auditLog: createAuditLog(),
      },
    });
  });

  it('throws not found when an audit log does not exist', async () => {
    prisma.auditLog.findUnique.mockResolvedValue(null);

    await expect(service.findOne('missing-id')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});

function createPrismaMock(): PrismaMock {
  const prisma: PrismaMock = {
    $transaction: jest.fn(),
    auditLog: {
      count: jest.fn(),
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
  };

  prisma.$transaction.mockImplementation(
    async (operations: Array<Promise<unknown>>) => Promise.all(operations),
  );

  return prisma;
}

function createAuditLog() {
  return {
    action: AuditActions.CourseCreated,
    actorEmail: 'admin@example.com',
    actorRole: 'Admin',
    actorUserId: '5cf7f76c-6c23-4b68-b48e-083e84d87105',
    createdAt: new Date('2026-06-13T00:00:00.000Z'),
    description: 'Admin created a course.',
    entityId: 'de85ad71-84f8-49db-a631-23aa64d94f4a',
    entityType: AuditEntityTypes.Course,
    id: 'audit-log-id',
    ipAddress: '203.0.113.10',
    metadata: null,
    userAgent: 'Mozilla/5.0',
  };
}
