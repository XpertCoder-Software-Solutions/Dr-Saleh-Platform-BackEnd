import { Module } from '@nestjs/common';
import { PasswordService } from '../auth/services/password.service';
import { AdminManagementController } from './admin-management.controller';
import { AdminManagementService } from './admin-management.service';

@Module({
  controllers: [AdminManagementController],
  providers: [AdminManagementService, PasswordService],
})
export class AdminManagementModule {}
