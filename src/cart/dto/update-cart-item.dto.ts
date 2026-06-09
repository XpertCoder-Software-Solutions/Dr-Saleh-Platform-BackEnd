import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsInt, Min } from 'class-validator';
import { toOptionalNumber } from './dto-transformers';

export class UpdateCartItemDto {
  @ApiProperty({
    example: 3,
    minimum: 1,
    description:
      'New quantity. Only products and physical books can be updated.',
  })
  @Transform(toOptionalNumber)
  @IsInt()
  @Min(1)
  quantity: number;
}
