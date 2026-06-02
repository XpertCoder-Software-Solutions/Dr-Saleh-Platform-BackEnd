import { Controller, Get } from '@nestjs/common';
import {
  DiskHealthIndicator,
  HealthCheck,
  HealthIndicatorService,
  HealthCheckService,
  MemoryHealthIndicator,
} from '@nestjs/terminus';
import { PrismaService } from '../database/prisma.service';

const DATABASE_HEALTH_TIMEOUT_MS = 5000;

@Controller('health')
export class HealthController {
  constructor(
    private readonly healthCheckService: HealthCheckService,
    private readonly healthIndicatorService: HealthIndicatorService,
    private readonly memoryHealthIndicator: MemoryHealthIndicator,
    private readonly diskHealthIndicator: DiskHealthIndicator,
    private readonly prismaService: PrismaService,
  ) {}

  @Get()
  @HealthCheck()
  check() {
    return this.healthCheckService.check([
      () => Promise.resolve({ app: { status: 'up' } }),
      () => this.checkDatabase(),
      () =>
        this.memoryHealthIndicator.checkHeap('memory_heap', 300 * 1024 * 1024),
      () =>
        this.diskHealthIndicator.checkStorage('storage', {
          path: '/',
          thresholdPercent: 0.9,
        }),
    ]);
  }

  private async checkDatabase() {
    const check = this.healthIndicatorService.check('database');

    try {
      await this.withTimeout(
        this.prismaService.$queryRaw`SELECT 1`,
        DATABASE_HEALTH_TIMEOUT_MS,
      );

      return check.up();
    } catch {
      return check.down(
        `Database did not respond within ${DATABASE_HEALTH_TIMEOUT_MS}ms`,
      );
    }
  }

  private async withTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number,
  ): Promise<T> {
    let timeout: NodeJS.Timeout;

    const timeoutPromise = new Promise<never>((_resolve, reject) => {
      timeout = setTimeout(() => {
        reject(new Error(`Operation timed out after ${timeoutMs}ms`));
      }, timeoutMs);
    });

    try {
      return await Promise.race([promise, timeoutPromise]);
    } finally {
      clearTimeout(timeout!);
    }
  }
}
