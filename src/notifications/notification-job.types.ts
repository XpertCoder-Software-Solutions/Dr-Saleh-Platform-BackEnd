import { NotificationType } from '@prisma/client';

export type NotificationJobData = {
  logId: string;
  type: NotificationType;
  email: string;
  toName?: string;
  subject: string;
  htmlContent: string;
  textContent: string;
};
