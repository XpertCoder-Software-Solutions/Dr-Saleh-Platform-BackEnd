import { applyDecorators, SetMetadata, UseInterceptors } from '@nestjs/common';
import { AuditLogInterceptor } from './audit-log.interceptor';

export const AUDIT_ACTION_METADATA_KEY = 'auditAction';

export type AuditActionOptions = {
  action: string;
  entityType: string;
  description?: string;
  entityIdParam?: string;
  entityIdResponsePath?: string;
  entityIdFromActor?: boolean;
  includeBody?: boolean;
};

export function AuditAction(options: AuditActionOptions) {
  return applyDecorators(
    SetMetadata(AUDIT_ACTION_METADATA_KEY, options),
    UseInterceptors(AuditLogInterceptor),
  );
}
