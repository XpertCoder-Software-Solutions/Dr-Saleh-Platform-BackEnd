import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean } from 'class-validator';
import { toOptionalBoolean } from './dto-transformers';

export class UpdateReviewStatusDto {
  @ApiProperty({ example: false, description: 'false hides the review.' })
  @Transform(toOptionalBoolean)
  @IsBoolean()
  isActive: boolean;
}
