import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsNotEmpty } from 'class-validator';
import { normalizeEmail } from './dto-transformers';

export class ResendEmailVerificationDto {
  @ApiProperty({
    example: 'user@example.com',
    description: 'Registered email address.',
  })
  @Transform(normalizeEmail)
  @IsEmail()
  @IsNotEmpty()
  email: string;
}
