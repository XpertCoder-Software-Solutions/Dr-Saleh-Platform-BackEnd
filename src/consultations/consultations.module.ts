import { Module } from '@nestjs/common';
import { AdminGuard } from '../auth/admin.guard';
import { NotificationsModule } from '../notifications/notifications.module';
import { AdminConsultationCategoriesController } from './admin-consultation-categories.controller';
import { AdminConsultationsController } from './admin-consultations.controller';
import { ConsultationCategoriesController } from './consultation-categories.controller';
import { ConsultationsController } from './consultations.controller';
import { ConsultationsService } from './consultations.service';

@Module({
  imports: [NotificationsModule],
  controllers: [
    ConsultationCategoriesController,
    ConsultationsController,
    AdminConsultationCategoriesController,
    AdminConsultationsController,
  ],
  providers: [ConsultationsService, AdminGuard],
})
export class ConsultationsModule {}
