import { ApiPropertyOptional } from '@nestjs/swagger';
import { Currency } from '@prisma/client';
import { IsEnum, IsOptional } from 'class-validator';

export enum DashboardRevenuePeriod {
  Daily = 'daily',
  Weekly = 'weekly',
  Monthly = 'monthly',
  Yearly = 'yearly',
}

export class DashboardRevenueQueryDto {
  @ApiPropertyOptional({
    enum: DashboardRevenuePeriod,
    enumName: 'DashboardRevenuePeriod',
    default: DashboardRevenuePeriod.Daily,
    example: DashboardRevenuePeriod.Monthly,
  })
  @IsOptional()
  @IsEnum(DashboardRevenuePeriod)
  period?: DashboardRevenuePeriod;

  @ApiPropertyOptional({
    enum: Currency,
    enumName: 'Currency',
    default: Currency.EGP,
    example: Currency.EGP,
  })
  @IsOptional()
  @IsEnum(Currency)
  currency?: Currency;
}
