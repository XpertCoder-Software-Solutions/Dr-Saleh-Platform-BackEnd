import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, map } from 'rxjs';
import { ApiResponse } from '../responses/api-response.interface';

@Injectable()
export class ResponseInterceptor implements NestInterceptor<
  unknown,
  ApiResponse<unknown>
> {
  intercept(
    _context: ExecutionContext,
    next: CallHandler<unknown>,
  ): Observable<ApiResponse<unknown>> {
    return next.handle().pipe(
      map((data) => ({
        success: true,
        message: this.getMessage(data),
        data: this.getData(data),
      })),
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
}
