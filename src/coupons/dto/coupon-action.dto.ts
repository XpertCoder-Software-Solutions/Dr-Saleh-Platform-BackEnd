import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsString, IsUUID, Matches, MaxLength } from 'class-validator';
import { toCouponCode } from './dto-transformers';

export class CouponActionDto {
  @ApiProperty({ example: 'WELCOME10', maxLength: 50 })
  @Transform(toCouponCode)
  @IsString()
  @MaxLength(50)
  @Matches(/^[A-Z0-9_-]+$/)
  code: string;

  @ApiProperty({ example: 'd60c84b5-470b-4dde-a0a4-d0be057e8922' })
  @IsUUID()
  orderId: string;
}
