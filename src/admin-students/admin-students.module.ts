import { Module } from '@nestjs/common';
import { AdminGuard } from '../auth/admin.guard';
import { PasswordService } from '../auth/services/password.service';
import { AdminStudentsController } from './admin-students.controller';
import { AdminStudentsService } from './admin-students.service';

@Module({
  controllers: [AdminStudentsController],
  providers: [AdminStudentsService, PasswordService, AdminGuard],
})
export class AdminStudentsModule {}
