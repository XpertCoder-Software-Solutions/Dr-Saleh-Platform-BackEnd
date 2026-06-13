import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { EmailModule } from '../email/email.module';
import { PrismaModule } from '../database/prisma.module';
import { AdminNotificationsController } from './admin-notifications.controller';
import { NOTIFICATIONS_QUEUE } from './notifications.constants';
import { NotificationsProcessor } from './notifications.processor';
import { NotificationsService } from './notifications.service';

@Module({
  imports: [
    PrismaModule,
    EmailModule,
    BullModule.registerQueue({
      name: NOTIFICATIONS_QUEUE,
    }),
  ],
  controllers: [AdminNotificationsController],
  providers: [NotificationsService, NotificationsProcessor],
  exports: [NotificationsService],
})
export class NotificationsModule {}
