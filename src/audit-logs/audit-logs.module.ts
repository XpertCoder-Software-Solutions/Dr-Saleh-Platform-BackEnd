import { Global, Module } from '@nestjs/common';
import { PrismaModule } from '../database/prisma.module';
import { AdminAuditLogsController } from './admin-audit-logs.controller';
import { AuditLogInterceptor } from './audit-log.interceptor';
import { AuditLogService } from './audit-log.service';

@Global()
@Module({
  imports: [PrismaModule],
  controllers: [AdminAuditLogsController],
  providers: [AuditLogService, AuditLogInterceptor],
  exports: [AuditLogService, AuditLogInterceptor],
})
export class AuditLogsModule {}
