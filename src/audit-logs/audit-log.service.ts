import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { redactSensitiveText } from '../common/utils/safe-logging';
import {
  buildPaginationMeta,
  getPaginationParams,
} from '../common/utils/pagination';
import { PrismaService } from '../database/prisma.service';
import { AuditLogQueryDto } from './dto/audit-log-query.dto';

export type AuditLogActionInput = {
  actorUserId?: string | null;
  actorEmail?: string | null;
  actorRole?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  description?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  metadata?: unknown;
};

const auditLogSelect = {
  id: true,
  actorUserId: true,
  actorEmail: true,
  actorRole: true,
  action: true,
  entityType: true,
  entityId: true,
  description: true,
  ipAddress: true,
  userAgent: true,
  metadata: true,
  createdAt: true,
} satisfies Prisma.AuditLogSelect;

const SENSITIVE_KEY_PATTERNS = [
  /authorization/i,
  /api[_-]?key/i,
  /card/i,
  /cvv/i,
  /jwt/i,
  /password/i,
  /payment.*secret/i,
  /refresh.*token/i,
  /secret/i,
  /token/i,
];

@Injectable()
export class AuditLogService {
  private readonly logger = new Logger(AuditLogService.name);

  constructor(private readonly prisma: PrismaService) {}

  async logAction(input: AuditLogActionInput): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          actorUserId: input.actorUserId ?? undefined,
          actorEmail: input.actorEmail ?? undefined,
          actorRole: input.actorRole ?? undefined,
          action: input.action,
          entityType: input.entityType,
          entityId: input.entityId ?? undefined,
          description: input.description ?? undefined,
          ipAddress: input.ipAddress ?? undefined,
          userAgent: input.userAgent
            ? redactSensitiveText(input.userAgent).slice(0, 1000)
            : undefined,
          metadata:
            input.metadata === undefined
              ? undefined
              : this.toPrismaJson(this.sanitizeMetadata(input.metadata)),
        },
      });
    } catch (error) {
      this.logger.error(
        [
          'Audit log write failed',
          `action=${input.action}`,
          `entityType=${input.entityType}`,
          `entityId=${input.entityId ?? 'none'}`,
          `message=${this.toSafeErrorMessage(error)}`,
        ].join(' '),
      );
    }
  }

  async findAll(query: AuditLogQueryDto) {
    const { page, limit, skip } = getPaginationParams(query);
    const where = this.buildWhere(query);
    const [total, logs] = await this.prisma.$transaction([
      this.prisma.auditLog.count({ where }),
      this.prisma.auditLog.findMany({
        where,
        select: auditLogSelect,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    return {
      message: 'Audit logs returned successfully',
      data: {
        logs,
        pagination: buildPaginationMeta(page, limit, total),
      },
    };
  }

  async findOne(id: string) {
    const auditLog = await this.prisma.auditLog.findUnique({
      where: { id },
      select: auditLogSelect,
    });

    if (!auditLog) {
      throw new NotFoundException('Audit log not found.');
    }

    return {
      message: 'Audit log returned successfully',
      data: {
        auditLog,
      },
    };
  }

  private buildWhere(query: AuditLogQueryDto): Prisma.AuditLogWhereInput {
    const where: Prisma.AuditLogWhereInput = {};

    if (query.actorUserId) {
      where.actorUserId = query.actorUserId;
    }

    if (query.action) {
      where.action = { equals: query.action, mode: 'insensitive' };
    }

    if (query.entityType) {
      where.entityType = { equals: query.entityType, mode: 'insensitive' };
    }

    if (query.entityId) {
      where.entityId = query.entityId;
    }

    if (query.dateFrom || query.dateTo) {
      where.createdAt = {
        ...(query.dateFrom ? { gte: new Date(query.dateFrom) } : {}),
        ...(query.dateTo ? { lte: new Date(query.dateTo) } : {}),
      };
    }

    return where;
  }

  private sanitizeMetadata(value: unknown, depth = 0): unknown {
    if (depth > 8) {
      return '[max-depth]';
    }

    if (value === null || value === undefined) {
      return value;
    }

    if (typeof value === 'string') {
      return redactSensitiveText(value).slice(0, 5000);
    }

    if (
      typeof value === 'number' ||
      typeof value === 'boolean' ||
      typeof value === 'bigint'
    ) {
      return typeof value === 'bigint' ? value.toString() : value;
    }

    if (value instanceof Date) {
      return value.toISOString();
    }

    if (Array.isArray(value)) {
      return value.map((item) => this.sanitizeMetadata(item, depth + 1));
    }

    if (typeof value === 'object') {
      return Object.fromEntries(
        Object.entries(value as Record<string, unknown>).map(([key, item]) => [
          key,
          this.isSensitiveKey(key)
            ? '[redacted]'
            : this.sanitizeMetadata(item, depth + 1),
        ]),
      );
    }

    if (typeof value === 'symbol') {
      return value.description ?? '[symbol]';
    }

    if (typeof value === 'function') {
      return '[function]';
    }

    return '[unsupported]';
  }

  private toPrismaJson(value: unknown): Prisma.InputJsonValue {
    return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
  }

  private isSensitiveKey(key: string): boolean {
    return SENSITIVE_KEY_PATTERNS.some((pattern) => pattern.test(key));
  }

  private toSafeErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return redactSensitiveText(error.message).slice(0, 1000);
    }

    return 'Unknown audit log error';
  }
}
