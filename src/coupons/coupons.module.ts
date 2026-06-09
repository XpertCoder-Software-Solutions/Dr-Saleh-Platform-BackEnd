import { Module } from '@nestjs/common';
import { PrismaModule } from '../database/prisma.module';
import { AdminCouponsController } from './admin-coupons.controller';
import { CouponsController } from './coupons.controller';
import { CouponsService } from './coupons.service';

@Module({
  imports: [PrismaModule],
  controllers: [AdminCouponsController, CouponsController],
  providers: [CouponsService],
})
export class CouponsModule {}
