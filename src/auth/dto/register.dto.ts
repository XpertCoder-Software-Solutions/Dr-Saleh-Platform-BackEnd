import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import {
  normalizeEmail,
  normalizeReferralCode,
  trimString,
} from './dto-transformers';

export class RegisterDto {
  @ApiProperty({
    example: 'Ahmed Saleh',
    description: 'User full name.',
  })
  @Transform(trimString)
  @IsString()
  @IsNotEmpty()
  fullName: string;

  @ApiProperty({
    example: 'ahmed@example.com',
    description: 'Unique user email address.',
  })
  @Transform(normalizeEmail)
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    example: '+201001234567',
    description: 'Unique user phone number.',
  })
  @Transform(trimString)
  @IsString()
  @IsNotEmpty()
  phoneNumber: string;

  @ApiProperty({
    example: 'StrongPass123',
    minLength: 8,
    description: 'User password. Must be at least 8 characters.',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  password: string;

  @ApiPropertyOptional({
    example: 'ABC123',
    maxLength: 64,
    description: 'Optional referral code shared by another user.',
  })
  @Transform(normalizeReferralCode)
  @IsOptional()
  @IsString()
  @MaxLength(64)
  @Matches(/^[A-Z0-9_-]+$/)
  referralCode?: string;
}
