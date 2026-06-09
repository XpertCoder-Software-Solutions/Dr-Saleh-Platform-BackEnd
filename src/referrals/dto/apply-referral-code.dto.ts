import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsString, Matches, MaxLength } from 'class-validator';
import { toReferralCode } from './dto-transformers';

export class ApplyReferralCodeDto {
  @ApiProperty({
    example: 'ABC123',
    maxLength: 64,
    description: 'Referral code shared by another user.',
  })
  @Transform(toReferralCode)
  @IsString()
  @MaxLength(64)
  @Matches(/^[A-Z0-9_-]+$/)
  referralCode: string;
}
