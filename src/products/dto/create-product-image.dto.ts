import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsInt, Min } from 'class-validator';
import { toOptionalNumber } from './dto-transformers';

export class CreateProductImageDto {
  @ApiProperty({ example: 1 })
  @Transform(toOptionalNumber)
  @IsInt()
  @Min(1)
  displayOrder: number;
}
