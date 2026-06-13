import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Request } from 'express';
import { Observable, catchError, map, throwError } from 'rxjs';
import {
  getSafeExceptionDetails,
  getSafeRequestDetails,
} from '../utils/safe-logging';

@Injectable()
export class ResponseInterceptor implements NestInterceptor<unknown, unknown> {
  private readonly logger = new Logger(ResponseInterceptor.name);

  intercept(
    context: ExecutionContext,
    next: CallHandler<unknown>,
  ): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request>();
    const requestDetails = getSafeRequestDetails(request);

    return next.handle().pipe(
      map((data) => {
        this.logger.debug(
          [
            'Response transform',
            `method=${requestDetails.method}`,
            `url=${requestDetails.url}`,
            `dataType=${this.getDataType(data)}`,
          ].join(' '),
        );

        return {
          success: true,
          message: this.getMessage(data),
          data: this.getData(data),
        };
      }),
      catchError((error: unknown) => {
        const exceptionDetails = getSafeExceptionDetails(error);

        this.logger.error(
          [
            'Response pipeline error',
            `name=${exceptionDetails.name}`,
            `message=${exceptionDetails.message}`,
            `method=${requestDetails.method}`,
            `url=${requestDetails.url}`,
          ].join(' '),
          exceptionDetails.stack,
        );

        return throwError(() => error);
      }),
    );
  }

  private getMessage(data: unknown): string {
    if (this.isRecord(data) && typeof data.message === 'string') {
      return data.message;
    }

    return 'Request successful';
  }

  private getData(data: unknown): unknown {
    if (this.isRecord(data) && 'data' in data && 'message' in data) {
      return data.data;
    }

    return data ?? {};
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
  }

  private getDataType(data: unknown): string {
    if (Array.isArray(data)) {
      return 'array';
    }

    if (data === null) {
      return 'null';
    }

    return typeof data;
  }
}
