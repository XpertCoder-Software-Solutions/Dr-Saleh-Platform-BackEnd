import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { NotificationJobData } from './notification-job.types';
import {
  NOTIFICATIONS_QUEUE,
  SEND_NOTIFICATION_JOB,
} from './notifications.constants';
import { NotificationsService } from './notifications.service';

@Processor(NOTIFICATIONS_QUEUE)
export class NotificationsProcessor extends WorkerHost {
  constructor(private readonly notificationsService: NotificationsService) {
    super();
  }

  async process(job: Job<NotificationJobData>): Promise<void> {
    if (job.name !== SEND_NOTIFICATION_JOB) {
      return;
    }

    await this.notificationsService.sendQueuedNotification(job.data);
  }
}
