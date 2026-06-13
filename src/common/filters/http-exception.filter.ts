import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ApiErrorResponse } from '../responses/api-response.interface';
import {
  getSafeExceptionDetails,
  getSafeRequestDetails,
} from '../utils/safe-logging';
import { isPrismaDatabaseTimeoutError } from '../utils/prisma-errors';

type NormalizedException = {
  statusCode: number;
  message: string;
  errors: unknown[];
};

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const response = context.getResponse<Response>();
    const request = context.getRequest<Request>();
    const normalizedException = this.normalizeException(exception);
    const exceptionDetails = getSafeExceptionDetails(exception);
    const requestDetails = getSafeRequestDetails(request);

    this.logger.error(
      [
        'HTTP exception captured',
        `name=${exceptionDetails.name}`,
        `message=${exceptionDetails.message}`,
        `method=${requestDetails.method}`,
        `url=${requestDetails.url}`,
        `statusCode=${normalizedException.statusCode}`,
      ].join(' '),
      exceptionDetails.stack,
    );

    const body: ApiErrorResponse = {
      success: false,
      message: normalizedException.message,
      statusCode: normalizedException.statusCode,
      timestamp: new Date().toISOString(),
      path: requestDetails.url,
      errors: normalizedException.errors,
    };

    response.status(normalizedException.statusCode).json(body);
  }

  private normalizeException(exception: unknown): NormalizedException {
    if (isPrismaDatabaseTimeoutError(exception)) {
      return {
        statusCode: HttpStatus.SERVICE_UNAVAILABLE,
        message: 'Database request timed out',
        errors: [],
      };
    }

    if (exception instanceof HttpException) {
      return this.normalizeHttpException(exception);
    }

    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Internal server error',
      errors: [],
    };
  }

  private normalizeHttpException(
    exception: HttpException,
  ): NormalizedException {
    const statusCode = exception.getStatus();
    const exceptionResponse = exception.getResponse();

    if (typeof exceptionResponse === 'string') {
      return {
        statusCode,
        message: exceptionResponse,
        errors: [],
      };
    }

    if (!this.isRecord(exceptionResponse)) {
      return {
        statusCode,
        message: exception.message,
        errors: [],
      };
    }

    const responseMessage = exceptionResponse.message;
    const responseErrors = exceptionResponse.errors;

    return {
      statusCode,
      message: Array.isArray(responseMessage)
        ? 'Validation failed'
        : this.toMessage(responseMessage, exception.message),
      errors: this.toErrors(responseMessage, responseErrors),
    };
  }

  private toMessage(value: unknown, fallback: string): string {
    return typeof value === 'string' && value.length > 0 ? value : fallback;
  }

  private toErrors(message: unknown, errors: unknown): unknown[] {
    if (Array.isArray(errors)) {
      return errors;
    }

    if (Array.isArray(message)) {
      return message;
    }

    return [];
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
  }
}
