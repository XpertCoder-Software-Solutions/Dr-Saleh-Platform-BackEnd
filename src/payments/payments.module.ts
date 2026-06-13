import { Module } from '@nestjs/common';
import { PrismaModule } from '../database/prisma.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { ReferralsModule } from '../referrals/referrals.module';
import { PaypalPaymentsController } from './paypal-payments.controller';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';

@Module({
  imports: [PrismaModule, ReferralsModule, NotificationsModule],
  controllers: [PaymentsController, PaypalPaymentsController],
  providers: [PaymentsService],
})
export class PaymentsModule {}
