import { Module } from '@nestjs/common';
import { PrismaModule } from '../database/prisma.module';
import { AdminReferralsController } from './admin-referrals.controller';
import { ReferralsController } from './referrals.controller';
import { ReferralsService } from './referrals.service';

@Module({
  imports: [PrismaModule],
  controllers: [AdminReferralsController, ReferralsController],
  providers: [ReferralsService],
  exports: [ReferralsService],
})
export class ReferralsModule {}
