import { ExecutionContext, Injectable, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  InjectThrottlerOptions,
  InjectThrottlerStorage,
  ThrottlerGuard,
} from '@nestjs/throttler';
import type {
  ThrottlerLimitDetail,
  ThrottlerModuleOptions,
  ThrottlerStorage,
} from '@nestjs/throttler';
import type { Request } from 'express';
import {
  getSafeExceptionDetails,
  getSafeRequestDetails,
} from '../utils/safe-logging';

@Injectable()
export class DiagnosticThrottlerGuard extends ThrottlerGuard {
  private readonly logger = new Logger(DiagnosticThrottlerGuard.name);

  constructor(
    @InjectThrottlerOptions()
    options: ThrottlerModuleOptions,
    @InjectThrottlerStorage()
    storageService: ThrottlerStorage,
    reflector: Reflector,
  ) {
    super(options, storageService, reflector);
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requestDetails = this.getRequestDetails(context);

    try {
      const allowed = await super.canActivate(context);

      this.logger.debug(
        [
          'Throttler guard completed',
          `method=${requestDetails.method}`,
          `url=${requestDetails.url}`,
          `allowed=${allowed}`,
        ].join(' '),
      );

      return allowed;
    } catch (error) {
      const exceptionDetails = getSafeExceptionDetails(error);

      this.logger.error(
        [
          'Throttler guard failed',
          `name=${exceptionDetails.name}`,
          `message=${exceptionDetails.message}`,
          `method=${requestDetails.method}`,
          `url=${requestDetails.url}`,
        ].join(' '),
        exceptionDetails.stack,
      );

      throw error;
    }
  }

  protected override async throwThrottlingException(
    context: ExecutionContext,
    throttlerLimitDetail: ThrottlerLimitDetail,
  ): Promise<void> {
    const requestDetails = this.getRequestDetails(context);

    this.logger.warn(
      [
        'Throttler limit exceeded',
        `method=${requestDetails.method}`,
        `url=${requestDetails.url}`,
        `limit=${throttlerLimitDetail.limit}`,
        `ttl=${throttlerLimitDetail.ttl}`,
        `totalHits=${throttlerLimitDetail.totalHits}`,
      ].join(' '),
    );

    return super.throwThrottlingException(context, throttlerLimitDetail);
  }

  private getRequestDetails(context: ExecutionContext): {
    method: string;
    url: string;
  } {
    try {
      const request = context.switchToHttp().getRequest<Request>();

      return getSafeRequestDetails(request);
    } catch {
      return {
        method: 'unknown',
        url: 'unknown',
      };
    }
  }
}
