import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsInt, IsOptional, Min } from 'class-validator';
import { toOptionalNumber } from './dto-transformers';

export class CreateBookImagesDto {
  @ApiPropertyOptional({
    example: 0,
    description: 'Starting display order for uploaded gallery images.',
  })
  @Transform(toOptionalNumber)
  @IsOptional()
  @IsInt()
  @Min(0)
  displayOrder?: number;
}
