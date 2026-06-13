import {
  Inject,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { Prisma, PrismaClient } from '@prisma/client';
import databaseConfig from '../config/database.config';
import type { DatabaseConfig } from '../config/database.config';
import {
  getSafeExceptionDetails,
  redactSensitiveText,
} from '../common/utils/safe-logging';

const prismaLogOptions: Prisma.LogDefinition[] = [
  { emit: 'event', level: 'warn' },
  { emit: 'event', level: 'error' },
];

type PrismaServiceClientOptions = Prisma.PrismaClientOptions & {
  log: Prisma.LogDefinition[];
};

@Injectable()
export class PrismaService
  extends PrismaClient<PrismaServiceClientOptions>
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  constructor(
    @Inject(databaseConfig.KEY) databaseConfiguration: DatabaseConfig,
  ) {
    super({
      adapter: new PrismaPg(databaseConfiguration.poolConfig),
      log: prismaLogOptions,
      transactionOptions: {
        maxWait: databaseConfiguration.connectionTimeoutMs,
        timeout: databaseConfiguration.queryTimeoutMs,
      },
    });

    this.logger.log(
      [
        'PrismaService initialized.',
        `databaseUrlConfigured=${Boolean(databaseConfiguration.url)}`,
        `datasourceHost=${databaseConfiguration.datasource.host ?? 'unknown'}`,
        `datasourcePort=${databaseConfiguration.datasource.port ?? 'default'}`,
        `datasourceDatabase=${
          databaseConfiguration.datasource.database ?? 'unknown'
        }`,
        `datasourceSchema=${
          databaseConfiguration.datasource.schema ?? 'default'
        }`,
        `sslMode=${databaseConfiguration.datasource.sslMode ?? 'default'}`,
        `connectTimeoutSeconds=${
          databaseConfiguration.datasource.connectTimeoutSeconds ?? 'default'
        }`,
        `poolTimeoutSeconds=${
          databaseConfiguration.datasource.poolTimeoutSeconds ?? 'default'
        }`,
        `pgConnectionTimeoutMs=${databaseConfiguration.connectionTimeoutMs}`,
        `prismaQueryTimeoutMs=${databaseConfiguration.queryTimeoutMs}`,
      ].join(' '),
    );

    this.$on('warn', (event) => {
      this.logger.warn(`Prisma warning: ${redactSensitiveText(event.message)}`);
    });

    this.$on('error', (event) => {
      this.logger.error(`Prisma error: ${redactSensitiveText(event.message)}`);
    });
  }

  async onModuleInit(): Promise<void> {
    this.logger.log('PrismaService connecting to database.');

    try {
      await this.$connect();
      this.logger.log('PrismaService database connection established.');
      await this.$queryRaw`SELECT 1`;
      this.logger.log('PrismaService startup database check passed.');
    } catch (error) {
      const exceptionDetails = getSafeExceptionDetails(error);

      this.logger.error(
        [
          'PrismaService database connection failed',
          `name=${exceptionDetails.name}`,
          `message=${exceptionDetails.message}`,
        ].join(' '),
        exceptionDetails.stack,
      );

      throw error;
    }
  }

  async onModuleDestroy(): Promise<void> {
    this.logger.log('PrismaService disconnecting from database.');

    await this.$disconnect();
  }
}
