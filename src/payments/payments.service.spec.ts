import {
  Currency,
  OrderItemType,
  OrderStatus,
  PaymentMethod,
  PaymentProvider,
  PaymentStatus,
  Prisma,
} from '@prisma/client';
import { AuditLogService } from '../audit-logs/audit-log.service';
import type { FawryConfig } from '../config/fawry.config';
import type { PaypalConfig } from '../config/paypal.config';
import { PrismaService } from '../database/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { ReferralsService } from '../referrals/referrals.service';
import { PaymentsService } from './payments.service';

type TestablePaymentsService = {
  applyFawryStatusUpdate(
    payment: ReturnType<typeof createPendingPayment>,
    fawryPayload: Record<string, unknown>,
  ): Promise<ReturnType<typeof createPendingPayment>>;
};

type MockPrismaClient = {
  $transaction: jest.Mock;
  bookFormat: {
    findMany: jest.Mock;
  };
  order: {
    findUnique: jest.Mock;
    update: jest.Mock;
  };
  orderItem: {
    findMany: jest.Mock;
  };
  payment: {
    update: jest.Mock;
  };
  paymentTransaction: {
    upsert: jest.Mock;
  };
  userBook: {
    upsert: jest.Mock;
  };
  userCourse: {
    upsert: jest.Mock;
  };
};

const userId = 'd0b74385-98df-4ec5-985c-2c980d517a4d';
const orderId = '7276a8ca-ef5d-46f4-8539-5291d49d8ae4';
const paymentId = 'af6f1f58-2e57-44cc-b933-8c76399d195b';
const courseId = '87221848-4c30-44f5-bf03-aa5cfcae6741';

describe('PaymentsService verified payment flow', () => {
  let prisma: MockPrismaClient;
  let service: PaymentsService;

  beforeEach(() => {
    prisma = createPrismaMock();
    const referralsService = {
      rewardReferralAfterFirstPaidOrder: jest.fn(),
    };
    const notificationsService = {
      sendCourseAccessGranted: jest.fn(),
      sendPaymentFailed: jest.fn(),
      sendPaymentSuccess: jest.fn(),
    };
    const auditLogService = {
      logAction: jest.fn(),
    };

    service = new PaymentsService(
      prisma as unknown as PrismaService,
      {} as FawryConfig,
      {} as PaypalConfig,
      referralsService as unknown as ReferralsService,
      notificationsService as unknown as NotificationsService,
      auditLogService as unknown as AuditLogService,
    );
  });

  it('keeps verified provider PAID flow granting course access', async () => {
    const pendingPayment = createPendingPayment();
    const paidPayment = {
      ...pendingPayment,
      paidAt: new Date('2026-06-14T00:00:00.000Z'),
      providerReferenceNumber: '987654321',
      providerStatus: 'PAID',
      status: PaymentStatus.PAID,
    };
    prisma.payment.update.mockResolvedValue(paidPayment);
    prisma.orderItem.findMany.mockResolvedValue([
      {
        itemId: courseId,
        itemType: OrderItemType.COURSE,
      },
    ]);
    prisma.bookFormat.findMany.mockResolvedValue([]);
    prisma.order.findUnique.mockResolvedValue(createNotificationOrder());

    await (
      service as unknown as TestablePaymentsService
    ).applyFawryStatusUpdate(pendingPayment, {
      fawryRefNumber: '987654321',
      merchantRefNumber: 'DS-2026-000001',
      orderStatus: 'PAID',
      paymentTime: '2026-06-14T00:00:00.000Z',
    });

    expect(prisma.order.update).toHaveBeenCalledWith({
      where: { id: orderId },
      data: {
        status: OrderStatus.PAID,
        paymentStatus: PaymentStatus.PAID,
        paidAt: paidPayment.paidAt,
      },
    });
    expect(prisma.paymentTransaction.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { transactionReference: 'DS-2026-000001' },
      }),
    );
    expect(prisma.userCourse.upsert).toHaveBeenCalledWith({
      where: {
        userId_courseId: {
          courseId,
          userId,
        },
      },
      update: {},
      create: {
        courseId,
        userId,
      },
    });
  });
});

function createPrismaMock(): MockPrismaClient {
  const prisma: MockPrismaClient = {
    $transaction: jest.fn(),
    bookFormat: {
      findMany: jest.fn(),
    },
    order: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    orderItem: {
      findMany: jest.fn(),
    },
    payment: {
      update: jest.fn(),
    },
    paymentTransaction: {
      upsert: jest.fn(),
    },
    userBook: {
      upsert: jest.fn(),
    },
    userCourse: {
      upsert: jest.fn(),
    },
  };

  prisma.$transaction.mockImplementation(
    async (
      callback: (transactionClient: MockPrismaClient) => Promise<unknown>,
    ) => callback(prisma),
  );

  return prisma;
}

function createPendingPayment() {
  const timestamp = new Date('2026-06-14T00:00:00.000Z');

  return {
    amount: new Prisma.Decimal(500),
    cancelledAt: null,
    createdAt: timestamp,
    currency: Currency.EGP,
    failureReason: null,
    id: paymentId,
    merchantRefNumber: 'DS-2026-000001',
    method: PaymentMethod.FAWRY_REFERENCE,
    orderId,
    paidAt: null,
    paypalOrderId: null,
    provider: PaymentProvider.FAWRY,
    providerPaymentReference: null,
    providerReferenceNumber: null,
    providerResponse: Prisma.JsonNull,
    providerStatus: 'NEW',
    status: PaymentStatus.PENDING,
    updatedAt: timestamp,
    userId,
  };
}

function createNotificationOrder() {
  return {
    currency: Currency.EGP,
    id: orderId,
    items: [
      {
        itemType: OrderItemType.COURSE,
        titleAr: 'دورة اختبار',
        titleEn: 'Test Course',
      },
    ],
    orderNumber: 'DS-2026-000001',
    totalAmount: new Prisma.Decimal(500),
    user: {
      email: 'student@example.com',
      fullName: 'Student Example',
      id: userId,
    },
  };
}
