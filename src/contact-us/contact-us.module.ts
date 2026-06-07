import { Module } from '@nestjs/common';
import { AdminGuard } from '../auth/admin.guard';
import { EmailModule } from '../email/email.module';
import { AdminContactUsController } from './admin-contact-us.controller';
import { ContactUsController } from './contact-us.controller';
import { ContactUsService } from './contact-us.service';

@Module({
  imports: [EmailModule],
  controllers: [ContactUsController, AdminContactUsController],
  providers: [ContactUsService, AdminGuard],
})
export class ContactUsModule {}
