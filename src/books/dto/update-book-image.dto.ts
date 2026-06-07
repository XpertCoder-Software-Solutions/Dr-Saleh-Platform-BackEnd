import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsInt, IsOptional, Min } from 'class-validator';
import { toOptionalNumber } from './dto-transformers';

export class UpdateBookImageDto {
  @ApiPropertyOptional({ example: 1 })
  @Transform(toOptionalNumber)
  @IsOptional()
  @IsInt()
  @Min(0)
  displayOrder?: number;
}
