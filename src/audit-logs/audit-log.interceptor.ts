import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { Observable, tap } from 'rxjs';
import type { AuthenticatedUser } from '../auth/jwt.strategy';
import {
  AUDIT_ACTION_METADATA_KEY,
  AuditActionOptions,
} from './audit-action.decorator';
import { AuditLogService } from './audit-log.service';

type MaybeAuthenticatedRequest = Request & {
  user?: AuthenticatedUser;
};

@Injectable()
export class AuditLogInterceptor implements NestInterceptor<unknown, unknown> {
  constructor(
    private readonly reflector: Reflector,
    private readonly auditLogService: AuditLogService,
  ) {}

  intercept(
    context: ExecutionContext,
    next: CallHandler<unknown>,
  ): Observable<unknown> {
    const options = this.reflector.get<AuditActionOptions>(
      AUDIT_ACTION_METADATA_KEY,
      context.getHandler(),
    );

    if (!options) {
      return next.handle();
    }

    const request = context
      .switchToHttp()
      .getRequest<MaybeAuthenticatedRequest>();
    const requestBody: unknown = request.body;

    return next.handle().pipe(
      tap((response) => {
        void this.auditLogService.logAction({
          actorUserId: request.user?.id,
          actorEmail: request.user?.email,
          actorRole: request.user?.role,
          action: options.action,
          entityType: options.entityType,
          entityId: this.resolveEntityId(options, request, response),
          description: options.description,
          ipAddress: this.getClientIp(request),
          userAgent: this.getHeaderValue(request.headers['user-agent']),
          metadata: {
            params: request.params,
            body: options.includeBody === false ? undefined : requestBody,
          },
        });
      }),
    );
  }

  private resolveEntityId(
    options: AuditActionOptions,
    request: MaybeAuthenticatedRequest,
    response: unknown,
  ): string | undefined {
    if (options.entityIdFromActor) {
      return request.user?.id;
    }

    if (options.entityIdParam) {
      return this.getHeaderValue(request.params[options.entityIdParam]);
    }

    if (options.entityIdResponsePath) {
      const value = this.getPathValue(response, options.entityIdResponsePath);

      return typeof value === 'string' ? value : undefined;
    }

    return undefined;
  }

  private getPathValue(value: unknown, path: string): unknown {
    return path.split('.').reduce<unknown>((currentValue, segment) => {
      if (
        typeof currentValue !== 'object' ||
        currentValue === null ||
        !(segment in currentValue)
      ) {
        return undefined;
      }

      return (currentValue as Record<string, unknown>)[segment];
    }, value);
  }

  private getClientIp(request: MaybeAuthenticatedRequest): string | undefined {
    const forwardedFor = this.getHeaderValue(
      request.headers['x-forwarded-for'],
    );

    if (forwardedFor) {
      return forwardedFor.split(',')[0]?.trim();
    }

    return request.ip;
  }

  private getHeaderValue(
    value: string | string[] | undefined,
  ): string | undefined {
    return Array.isArray(value) ? value[0] : value;
  }
}
