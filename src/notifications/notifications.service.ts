import { InjectQueue } from '@nestjs/bullmq';
import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NotificationStatus, NotificationType, Prisma } from '@prisma/client';
import { Queue } from 'bullmq';
import { redactSensitiveText } from '../common/utils/safe-logging';
import { BrevoEmailService } from '../email/brevo-email.service';
import { PrismaService } from '../database/prisma.service';
import {
  NOTIFICATIONS_QUEUE,
  SEND_NOTIFICATION_JOB,
} from './notifications.constants';
import { NotificationJobData } from './notification-job.types';
import {
  BuiltNotificationEmail,
  buildNotificationEmailTemplate,
} from './templates/notification-email.template';

type NotificationDispatchOptions = {
  critical?: boolean;
};

type RecipientNotificationInput = {
  userId?: string | null;
  email: string;
  fullName?: string;
};

type OtpNotificationInput = RecipientNotificationInput & {
  otp: string;
};

type OrderNotificationInput = RecipientNotificationInput & {
  orderNumber: string;
  totalAmount: number | string;
  currency: string;
};

type PaymentNotificationInput = OrderNotificationInput & {
  failureReason?: string | null;
};

type CourseNotificationInput = RecipientNotificationInput & {
  courseTitleAr: string;
  courseTitleEn?: string | null;
};

type ConsultationNotificationInput = RecipientNotificationInput & {
  topic?: string | null;
};

type ContactNotificationInput = RecipientNotificationInput;

type NotificationTemplateInput = {
  subject: string;
  title: string;
  greeting?: string;
  bodyLines: string[];
  ctaLabel?: string;
  ctaUrl?: string;
  footerNote?: string;
};

type AdminNotificationQuery = {
  type?: NotificationType;
  status?: NotificationStatus;
  email?: string;
  dateFrom?: Date;
  dateTo?: Date;
  page?: number;
  limit?: number;
};

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private readonly brandName: string;
  private readonly logoUrl: string;
  private readonly platformUrl: string;
  private readonly supportEmail: string;
  private readonly adminNotificationEmail: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly brevoEmailService: BrevoEmailService,
    private readonly configService: ConfigService,
    @InjectQueue(NOTIFICATIONS_QUEUE)
    private readonly notificationsQueue: Queue<NotificationJobData>,
  ) {
    this.brandName = this.configService.getOrThrow<string>('BRAND_NAME');
    this.platformUrl =
      this.configService.getOrThrow<string>('APP_PLATFORM_URL');
    this.logoUrl = this.buildPublicUrl(
      this.configService.getOrThrow<string>('APP_PUBLIC_URL'),
      this.configService.getOrThrow<string>('BRAND_LOGO_PATH'),
    );
    this.supportEmail = this.normalizeEmail(
      this.configService.getOrThrow<string>('SUPPORT_EMAIL'),
    );
    this.adminNotificationEmail = this.normalizeEmail(
      this.configService.get<string>('ADMIN_NOTIFICATION_EMAIL') ||
        this.supportEmail,
    );
  }

  sendEmailVerificationOtp(
    input: OtpNotificationInput,
    options: NotificationDispatchOptions = {},
  ) {
    return this.dispatch(
      NotificationType.EMAIL_VERIFICATION_OTP,
      input,
      this.buildEmailVerificationOtp(input),
      options,
    );
  }

  sendPasswordResetOtp(
    input: OtpNotificationInput,
    options: NotificationDispatchOptions = {},
  ) {
    return this.dispatch(
      NotificationType.PASSWORD_RESET_OTP,
      input,
      this.buildPasswordResetOtp(input),
      options,
    );
  }

  sendPasswordChanged(input: RecipientNotificationInput) {
    return this.dispatch(
      NotificationType.PASSWORD_CHANGED,
      input,
      this.buildPasswordChanged(input),
    );
  }

  sendOrderCreated(input: OrderNotificationInput) {
    return this.dispatch(
      NotificationType.ORDER_CREATED,
      input,
      this.buildOrderCreated(input),
    );
  }

  sendPaymentSuccess(input: OrderNotificationInput) {
    return this.dispatch(
      NotificationType.PAYMENT_SUCCESS,
      input,
      this.buildPaymentSuccess(input),
    );
  }

  sendPaymentFailed(input: PaymentNotificationInput) {
    return this.dispatch(
      NotificationType.PAYMENT_FAILED,
      input,
      this.buildPaymentFailed(input),
    );
  }

  sendRefundProcessed(input: OrderNotificationInput) {
    return this.dispatch(
      NotificationType.REFUND_PROCESSED,
      input,
      this.buildRefundProcessed(input),
    );
  }

  sendCourseAccessGranted(input: CourseNotificationInput) {
    return this.dispatch(
      NotificationType.COURSE_ACCESS_GRANTED,
      input,
      this.buildCourseAccessGranted(input),
    );
  }

  sendCourseCompleted(input: CourseNotificationInput) {
    return this.dispatch(
      NotificationType.COURSE_COMPLETED,
      input,
      this.buildCourseCompleted(input),
    );
  }

  sendConsultationRequestSubmitted(input: ConsultationNotificationInput) {
    return this.dispatch(
      NotificationType.CONSULTATION_REQUEST_SUBMITTED,
      input,
      this.buildConsultationSubmitted(input),
    );
  }

  sendAdminConsultationRequestSubmitted(
    input: ConsultationNotificationInput & { requesterEmail: string },
  ) {
    return this.dispatch(
      NotificationType.CONSULTATION_REQUEST_ADMIN,
      {
        email: this.adminNotificationEmail,
        fullName: this.brandName,
      },
      this.buildAdminConsultationSubmitted(input),
    );
  }

  sendContactMessageReceived(input: ContactNotificationInput) {
    return this.dispatch(
      NotificationType.CONTACT_MESSAGE_RECEIVED,
      input,
      this.buildContactMessageReceived(input),
    );
  }

  async sendQueuedNotification(data: NotificationJobData): Promise<void> {
    try {
      await this.brevoEmailService.sendTransactionalEmail({
        toEmail: data.email,
        toName: data.toName,
        subject: data.subject,
        htmlContent: data.htmlContent,
        textContent: data.textContent,
      });

      await this.prisma.notificationLog.update({
        where: { id: data.logId },
        data: {
          status: NotificationStatus.SENT,
          errorMessage: null,
          sentAt: new Date(),
        },
      });
    } catch (error) {
      const safeMessage = this.toSafeErrorMessage(error);

      await this.safeMarkLogFailed(data.logId, safeMessage);
      this.logger.error(
        [
          'Notification delivery failed',
          `logId=${data.logId}`,
          `type=${data.type}`,
          `email=${this.maskEmail(data.email)}`,
          `message=${safeMessage}`,
        ].join(' '),
      );

      throw error;
    }
  }

  async findLogs(query: AdminNotificationQuery) {
    const where = this.buildLogWhere(query);
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const [total, logs] = await this.prisma.$transaction([
      this.prisma.notificationLog.count({ where }),
      this.prisma.notificationLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          userId: true,
          email: true,
          type: true,
          status: true,
          errorMessage: true,
          sentAt: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
    ]);

    return {
      message: 'Notification logs returned successfully',
      data: {
        items: logs,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    };
  }

  private async dispatch(
    type: NotificationType,
    recipient: RecipientNotificationInput,
    template: NotificationTemplateInput,
    options: NotificationDispatchOptions = {},
  ) {
    const email = this.normalizeEmail(recipient.email);
    const builtTemplate = this.buildEmail(template);
    const log = await this.createPendingLog({
      userId: recipient.userId,
      email,
      type,
      critical: options.critical,
    });

    if (!log) {
      return null;
    }

    try {
      await this.notificationsQueue.add(
        SEND_NOTIFICATION_JOB,
        {
          logId: log.id,
          type,
          email,
          toName: recipient.fullName,
          subject: template.subject,
          htmlContent: builtTemplate.htmlContent,
          textContent: builtTemplate.textContent,
        },
        {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 30_000,
          },
          removeOnComplete: 1000,
          removeOnFail: 1000,
        },
      );

      return log;
    } catch (error) {
      const safeMessage = this.toSafeErrorMessage(error);

      await this.safeMarkLogFailed(log.id, safeMessage);
      this.logger.warn(
        [
          'Notification enqueue failed',
          `logId=${log.id}`,
          `type=${type}`,
          `email=${this.maskEmail(email)}`,
          `message=${safeMessage}`,
        ].join(' '),
      );

      if (options.critical) {
        throw new ServiceUnavailableException(
          'Notification could not be queued. Please try again later.',
        );
      }

      return log;
    }
  }

  private async createPendingLog({
    userId,
    email,
    type,
    critical,
  }: {
    userId?: string | null;
    email: string;
    type: NotificationType;
    critical?: boolean;
  }) {
    try {
      return await this.prisma.notificationLog.create({
        data: {
          userId: userId ?? undefined,
          email,
          type,
          status: NotificationStatus.PENDING,
        },
      });
    } catch (error) {
      const safeMessage = this.toSafeErrorMessage(error);

      this.logger.warn(
        [
          'Notification log creation failed',
          `type=${type}`,
          `email=${this.maskEmail(email)}`,
          `message=${safeMessage}`,
        ].join(' '),
      );

      if (critical) {
        throw new ServiceUnavailableException(
          'Notification could not be logged. Please try again later.',
        );
      }

      return null;
    }
  }

  private async markLogFailed(logId: string, errorMessage: string) {
    await this.prisma.notificationLog.update({
      where: { id: logId },
      data: {
        status: NotificationStatus.FAILED,
        errorMessage,
      },
    });
  }

  private async safeMarkLogFailed(
    logId: string,
    errorMessage: string,
  ): Promise<void> {
    try {
      await this.markLogFailed(logId, errorMessage);
    } catch (error) {
      this.logger.warn(
        [
          'Notification failure status update failed',
          `logId=${logId}`,
          `message=${this.toSafeErrorMessage(error)}`,
        ].join(' '),
      );
    }
  }

  private buildEmail(input: NotificationTemplateInput): BuiltNotificationEmail {
    return buildNotificationEmailTemplate({
      brandName: this.brandName,
      logoUrl: this.logoUrl,
      platformUrl: this.platformUrl,
      supportEmail: this.supportEmail,
      title: input.title,
      greeting: input.greeting,
      bodyLines: input.bodyLines,
      ctaLabel: input.ctaLabel,
      ctaUrl: input.ctaUrl,
      footerNote: input.footerNote,
    });
  }

  private buildEmailVerificationOtp(
    input: OtpNotificationInput,
  ): NotificationTemplateInput {
    return {
      subject: 'رمز تفعيل البريد الإلكتروني',
      title: 'رمز تفعيل البريد الإلكتروني',
      greeting: this.buildArabicGreeting(input.fullName),
      bodyLines: [
        `رمز التفعيل الخاص بك هو: ${input.otp}`,
        'يرجى استخدام هذا الرمز لإكمال تفعيل حسابك.',
      ],
      footerNote: 'إذا لم تقم بإنشاء حساب على المنصة، يمكنك تجاهل هذه الرسالة.',
    };
  }

  private buildPasswordResetOtp(
    input: OtpNotificationInput,
  ): NotificationTemplateInput {
    return {
      subject: 'رمز إعادة تعيين كلمة المرور',
      title: 'إعادة تعيين كلمة المرور',
      greeting: this.buildArabicGreeting(input.fullName),
      bodyLines: [
        `رمز إعادة تعيين كلمة المرور هو: ${input.otp}`,
        'استخدم هذا الرمز لإكمال تغيير كلمة المرور.',
      ],
      footerNote:
        'إذا لم تطلب إعادة تعيين كلمة المرور، يمكنك تجاهل هذه الرسالة.',
    };
  }

  private buildPasswordChanged(
    input: RecipientNotificationInput,
  ): NotificationTemplateInput {
    return {
      subject: 'تم تغيير كلمة المرور بنجاح',
      title: 'تم تغيير كلمة المرور',
      greeting: this.buildArabicGreeting(input.fullName),
      bodyLines: [
        'تم تغيير كلمة مرور حسابك بنجاح.',
        'إذا لم تقم بهذا الإجراء، يرجى التواصل مع الدعم فوراً.',
      ],
    };
  }

  private buildOrderCreated(
    input: OrderNotificationInput,
  ): NotificationTemplateInput {
    return {
      subject: `تم إنشاء الطلب ${input.orderNumber}`,
      title: 'تم إنشاء طلبك بنجاح',
      greeting: this.buildArabicGreeting(input.fullName),
      bodyLines: [
        `رقم الطلب: ${input.orderNumber}`,
        `الإجمالي: ${this.formatAmount(input.totalAmount, input.currency)}`,
        'سنرسل لك تحديثاً عند اكتمال الدفع أو تغير حالة الطلب.',
      ],
      ctaLabel: 'عرض الطلبات',
      ctaUrl: `${this.platformUrl}/orders`,
    };
  }

  private buildPaymentSuccess(
    input: OrderNotificationInput,
  ): NotificationTemplateInput {
    return {
      subject: `تم الدفع بنجاح للطلب ${input.orderNumber}`,
      title: 'تم الدفع بنجاح',
      greeting: this.buildArabicGreeting(input.fullName),
      bodyLines: [
        `تم تأكيد الدفع للطلب رقم ${input.orderNumber}.`,
        `المبلغ: ${this.formatAmount(input.totalAmount, input.currency)}`,
        'تم تحديث طلبك وتفعيل المحتوى الرقمي المؤهل تلقائياً.',
      ],
      ctaLabel: 'الذهاب إلى حسابي',
      ctaUrl: `${this.platformUrl}/account`,
    };
  }

  private buildPaymentFailed(
    input: PaymentNotificationInput,
  ): NotificationTemplateInput {
    return {
      subject: `تعذر إتمام الدفع للطلب ${input.orderNumber}`,
      title: 'تعذر إتمام الدفع',
      greeting: this.buildArabicGreeting(input.fullName),
      bodyLines: [
        `لم يتم تأكيد الدفع للطلب رقم ${input.orderNumber}.`,
        input.failureReason
          ? `سبب الرفض: ${redactSensitiveText(input.failureReason)}`
          : 'يمكنك المحاولة مرة أخرى أو اختيار وسيلة دفع أخرى.',
      ],
      ctaLabel: 'إعادة المحاولة',
      ctaUrl: `${this.platformUrl}/orders`,
    };
  }

  private buildRefundProcessed(
    input: OrderNotificationInput,
  ): NotificationTemplateInput {
    return {
      subject: `تمت معالجة استرداد الطلب ${input.orderNumber}`,
      title: 'تمت معالجة الاسترداد',
      greeting: this.buildArabicGreeting(input.fullName),
      bodyLines: [
        `تمت معالجة استرداد المبلغ للطلب رقم ${input.orderNumber}.`,
        `المبلغ: ${this.formatAmount(input.totalAmount, input.currency)}`,
        'قد يختلف وقت ظهور المبلغ حسب مزود وسيلة الدفع.',
      ],
    };
  }

  private buildCourseAccessGranted(
    input: CourseNotificationInput,
  ): NotificationTemplateInput {
    return {
      subject: `تم تفعيل الوصول إلى دورة ${input.courseTitleAr}`,
      title: 'تم تفعيل الوصول إلى الدورة',
      greeting: this.buildArabicGreeting(input.fullName),
      bodyLines: [
        `أصبح بإمكانك الآن الوصول إلى دورة: ${input.courseTitleAr}.`,
        'نتمنى لك تجربة تعليمية موفقة.',
      ],
      ctaLabel: 'متابعة الدورة',
      ctaUrl: `${this.platformUrl}/my-courses`,
    };
  }

  private buildCourseCompleted(
    input: CourseNotificationInput,
  ): NotificationTemplateInput {
    return {
      subject: `تهانينا بإكمال دورة ${input.courseTitleAr}`,
      title: 'تهانينا بإكمال الدورة',
      greeting: this.buildArabicGreeting(input.fullName),
      bodyLines: [
        `أكملت دورة: ${input.courseTitleAr}.`,
        'تم حفظ حالة الإكمال في حسابك، وسيتم استخدام هذه الحالة لاحقاً عند تفعيل الشهادات.',
      ],
      ctaLabel: 'عرض دوراتي',
      ctaUrl: `${this.platformUrl}/my-courses`,
    };
  }

  private buildConsultationSubmitted(
    input: ConsultationNotificationInput,
  ): NotificationTemplateInput {
    return {
      subject: 'تم استلام طلب الاستشارة',
      title: 'تم استلام طلب الاستشارة',
      greeting: this.buildArabicGreeting(input.fullName),
      bodyLines: [
        'تم استلام طلب الاستشارة الخاص بكم بنجاح.',
        input.topic ? `موضوع الاستشارة: ${input.topic}` : '',
        'سيتم مراجعة الطلب والتواصل معكم في أقرب وقت ممكن.',
      ],
    };
  }

  private buildAdminConsultationSubmitted(
    input: ConsultationNotificationInput & { requesterEmail: string },
  ): NotificationTemplateInput {
    return {
      subject: 'طلب استشارة جديد',
      title: 'طلب استشارة جديد',
      bodyLines: [
        `تم استلام طلب استشارة جديد من: ${input.fullName ?? 'زائر المنصة'}.`,
        `البريد الإلكتروني: ${input.requesterEmail}`,
        input.topic ? `موضوع الاستشارة: ${input.topic}` : '',
      ],
      ctaLabel: 'فتح لوحة الإدارة',
      ctaUrl: `${this.platformUrl}/admin/consultations`,
    };
  }

  private buildContactMessageReceived(
    input: ContactNotificationInput,
  ): NotificationTemplateInput {
    return {
      subject: 'تم استلام رسالتكم',
      title: 'تم استلام رسالتكم',
      greeting: this.buildArabicGreeting(input.fullName),
      bodyLines: [
        'نشكر تواصلكم معنا.',
        'تم استلام رسالتكم بنجاح وسيتم مراجعتها من قبل فريقنا.',
      ],
    };
  }

  private buildLogWhere(
    query: AdminNotificationQuery,
  ): Prisma.NotificationLogWhereInput {
    const where: Prisma.NotificationLogWhereInput = {};

    if (query.type) {
      where.type = query.type;
    }

    if (query.status) {
      where.status = query.status;
    }

    if (query.email) {
      where.email = {
        contains: this.normalizeEmail(query.email),
        mode: 'insensitive',
      };
    }

    if (query.dateFrom || query.dateTo) {
      where.createdAt = {
        ...(query.dateFrom ? { gte: query.dateFrom } : {}),
        ...(query.dateTo ? { lte: query.dateTo } : {}),
      };
    }

    return where;
  }

  private buildArabicGreeting(fullName?: string): string | undefined {
    return fullName ? `مرحباً ${fullName}` : undefined;
  }

  private formatAmount(amount: number | string, currency: string): string {
    const numericAmount =
      typeof amount === 'number' ? amount : Number.parseFloat(amount);

    if (!Number.isFinite(numericAmount)) {
      return `${amount} ${currency}`;
    }

    return `${numericAmount.toFixed(2)} ${currency}`;
  }

  private normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }

  private maskEmail(email: string): string {
    const [localPart, domain] = email.split('@');

    if (!localPart || !domain) {
      return '[redacted-email]';
    }

    return `${localPart.slice(0, 2)}***@${domain}`;
  }

  private toSafeErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return redactSensitiveText(error.message).slice(0, 1000);
    }

    return 'Unknown notification error';
  }

  private buildPublicUrl(appPublicUrl: string, brandLogoPath: string): string {
    const normalizedPublicUrl = appPublicUrl.replace(/\/$/, '');
    const normalizedLogoPath = brandLogoPath.startsWith('/')
      ? brandLogoPath
      : `/${brandLogoPath}`;

    return `${normalizedPublicUrl}${normalizedLogoPath}`;
  }
}
