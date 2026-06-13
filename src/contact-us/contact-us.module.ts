import { Module } from '@nestjs/common';
import { AdminGuard } from '../auth/admin.guard';
import { NotificationsModule } from '../notifications/notifications.module';
import { AdminContactUsController } from './admin-contact-us.controller';
import { ContactUsController } from './contact-us.controller';
import { ContactUsService } from './contact-us.service';

@Module({
  imports: [NotificationsModule],
  controllers: [ContactUsController, AdminContactUsController],
  providers: [ContactUsService, AdminGuard],
})
export class ContactUsModule {}
