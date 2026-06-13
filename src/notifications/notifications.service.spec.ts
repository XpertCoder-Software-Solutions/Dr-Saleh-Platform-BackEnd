import { ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NotificationStatus, NotificationType } from '@prisma/client';
import { Queue } from 'bullmq';
import { PrismaService } from '../database/prisma.service';
import { BrevoEmailService } from '../email/brevo-email.service';
import { SEND_NOTIFICATION_JOB } from './notifications.constants';
import { NotificationJobData } from './notification-job.types';
import { NotificationsService } from './notifications.service';

type PrismaMock = {
  $transaction: jest.Mock;
  notificationLog: {
    count: jest.Mock;
    create: jest.Mock;
    findMany: jest.Mock;
    update: jest.Mock;
  };
};

describe('NotificationsService', () => {
  let prisma: PrismaMock;
  let queue: Pick<Queue<NotificationJobData>, 'add'>;
  let brevoEmailService: Pick<BrevoEmailService, 'sendTransactionalEmail'>;
  let service: NotificationsService;

  beforeEach(() => {
    prisma = createPrismaMock();
    queue = {
      add: jest.fn().mockResolvedValue(undefined),
    };
    brevoEmailService = {
      sendTransactionalEmail: jest.fn().mockResolvedValue(undefined),
    };
    service = new NotificationsService(
      prisma as unknown as PrismaService,
      brevoEmailService as BrevoEmailService,
      createConfigServiceMock() as ConfigService,
      queue as Queue<NotificationJobData>,
    );
  });

  it('creates a pending log and queues an order created notification', async () => {
    prisma.notificationLog.create.mockResolvedValue(createLog());

    await service.sendOrderCreated({
      userId: '1d5af593-a5ef-4b55-bb91-97ad29284f0f',
      email: 'Student@Example.com',
      fullName: 'Student Example',
      orderNumber: 'ORD-1001',
      totalAmount: 250,
      currency: 'EGP',
    });

    expect(prisma.notificationLog.create).toHaveBeenCalledWith({
      data: {
        email: 'student@example.com',
        status: NotificationStatus.PENDING,
        type: NotificationType.ORDER_CREATED,
        userId: '1d5af593-a5ef-4b55-bb91-97ad29284f0f',
      },
    });
    expect(queue.add).toHaveBeenCalledWith(
      SEND_NOTIFICATION_JOB,
      expect.objectContaining({
        email: 'student@example.com',
        logId: 'notification-log-id',
        subject: 'تم إنشاء الطلب ORD-1001',
        type: NotificationType.ORDER_CREATED,
      }),
      expect.objectContaining({
        attempts: 3,
      }),
    );
  });

  it('does not throw for non-critical enqueue failures and stores a safe error', async () => {
    prisma.notificationLog.create.mockResolvedValue(createLog());
    jest
      .mocked(queue.add)
      .mockRejectedValue(
        new Error('redis://user:pass@localhost token=super-secret failed'),
      );

    await expect(
      service.sendContactMessageReceived({
        email: 'visitor@example.com',
        fullName: 'Visitor',
      }),
    ).resolves.toEqual(expect.objectContaining({ id: 'notification-log-id' }));

    expect(prisma.notificationLog.update).toHaveBeenCalledWith({
      where: { id: 'notification-log-id' },
      data: {
        status: NotificationStatus.FAILED,
        errorMessage: 'redis://[redacted]@localhost token=[redacted] failed',
      },
    });
  });

  it('throws when a critical notification cannot be queued', async () => {
    prisma.notificationLog.create.mockResolvedValue(createLog());
    jest.mocked(queue.add).mockRejectedValue(new Error('queue unavailable'));

    await expect(
      service.sendEmailVerificationOtp(
        {
          email: 'student@example.com',
          fullName: 'Student Example',
          otp: '123456',
        },
        { critical: true },
      ),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('sends queued notifications and marks the log as sent', async () => {
    await service.sendQueuedNotification({
      email: 'student@example.com',
      htmlContent: '<p>Hello</p>',
      logId: 'notification-log-id',
      subject: 'Subject',
      textContent: 'Hello',
      toName: 'Student Example',
      type: NotificationType.PAYMENT_SUCCESS,
    });

    expect(brevoEmailService.sendTransactionalEmail).toHaveBeenCalledWith({
      htmlContent: '<p>Hello</p>',
      subject: 'Subject',
      textContent: 'Hello',
      toEmail: 'student@example.com',
      toName: 'Student Example',
    });
    expect(prisma.notificationLog.update).toHaveBeenCalledWith({
      where: { id: 'notification-log-id' },
      data: {
        errorMessage: null,
        sentAt: expect.any(Date) as Date,
        status: NotificationStatus.SENT,
      },
    });
  });

  it('filters admin logs by type, status, email, and dates', async () => {
    prisma.notificationLog.count.mockResolvedValue(0);
    prisma.notificationLog.findMany.mockResolvedValue([]);

    await service.findLogs({
      dateFrom: new Date('2026-06-01T00:00:00.000Z'),
      dateTo: new Date('2026-06-12T00:00:00.000Z'),
      email: 'STUDENT@example.com',
      status: NotificationStatus.FAILED,
      type: NotificationType.PAYMENT_FAILED,
    });

    expect(prisma.notificationLog.count).toHaveBeenCalledWith({
      where: {
        createdAt: {
          gte: new Date('2026-06-01T00:00:00.000Z'),
          lte: new Date('2026-06-12T00:00:00.000Z'),
        },
        email: {
          contains: 'student@example.com',
          mode: 'insensitive',
        },
        status: NotificationStatus.FAILED,
        type: NotificationType.PAYMENT_FAILED,
      },
    });
  });
});

function createPrismaMock(): PrismaMock {
  const prisma: PrismaMock = {
    $transaction: jest.fn(),
    notificationLog: {
      count: jest.fn(),
      create: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
  };

  prisma.$transaction.mockImplementation(
    async (operations: Array<Promise<unknown>>) => Promise.all(operations),
  );

  return prisma;
}

function createConfigServiceMock(): Pick<ConfigService, 'get' | 'getOrThrow'> {
  const values = new Map<string, string>([
    ['APP_PUBLIC_URL', 'https://api.example.com'],
    ['APP_PLATFORM_URL', 'https://app.example.com'],
    ['BRAND_LOGO_PATH', '/brand/logo.png'],
    ['BRAND_NAME', 'Dr. Saleh Platform'],
    ['SUPPORT_EMAIL', 'support@example.com'],
  ]);

  return {
    get: jest.fn((key: string) => values.get(key)),
    getOrThrow: jest.fn((key: string) => {
      const value = values.get(key);

      if (!value) {
        throw new Error(`Missing config ${key}`);
      }

      return value;
    }),
  };
}

function createLog() {
  return {
    createdAt: new Date('2026-06-12T00:00:00.000Z'),
    email: 'student@example.com',
    errorMessage: null,
    id: 'notification-log-id',
    sentAt: null,
    status: NotificationStatus.PENDING,
    type: NotificationType.ORDER_CREATED,
    updatedAt: new Date('2026-06-12T00:00:00.000Z'),
    userId: '1d5af593-a5ef-4b55-bb91-97ad29284f0f',
  };
}
