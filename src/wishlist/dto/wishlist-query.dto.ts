import { ApiPropertyOptional } from '@nestjs/swagger';
import { WishlistItemType } from '@prisma/client';
import { Transform } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';
import { toOptionalNumber } from './dto-transformers';

export class WishlistQueryDto {
  @ApiPropertyOptional({ example: 1, default: 1 })
  @Transform(toOptionalNumber)
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ example: 20, default: 20, maximum: 100 })
  @Transform(toOptionalNumber)
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({
    enum: WishlistItemType,
    enumName: 'WishlistItemType',
    example: WishlistItemType.BOOK,
  })
  @IsOptional()
  @IsEnum(WishlistItemType)
  itemType?: WishlistItemType;
}
