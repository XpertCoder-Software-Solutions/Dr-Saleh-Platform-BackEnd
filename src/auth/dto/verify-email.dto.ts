import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsNotEmpty, IsString, Matches } from 'class-validator';
import { normalizeEmail, trimString } from './dto-transformers';

export class VerifyEmailDto {
  @ApiProperty({
    example: 'user@example.com',
    description: 'Registered email address.',
  })
  @Transform(normalizeEmail)
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    example: '123456',
    description: 'Six-digit email verification OTP.',
  })
  @Transform(trimString)
  @IsString()
  @Matches(/^\d{6}$/, { message: 'otp must be exactly 6 digits' })
  otp: string;
}
