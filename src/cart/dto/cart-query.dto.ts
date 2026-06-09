import { ApiPropertyOptional } from '@nestjs/swagger';
import { Currency } from '@prisma/client';
import { IsEnum, IsOptional } from 'class-validator';

export class CartQueryDto {
  @ApiPropertyOptional({
    enum: Currency,
    enumName: 'Currency',
    example: Currency.EGP,
    default: Currency.EGP,
    description:
      'Currency used to calculate cart totals. Defaults to EGP until a user currency preference exists.',
  })
  @IsOptional()
  @IsEnum(Currency)
  currency?: Currency;
}
