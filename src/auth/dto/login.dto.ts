import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';
import { normalizeEmail } from './dto-transformers';

export class LoginDto {
  @ApiProperty({
    example: 'user@example.com',
    description: 'Registered email address.',
  })
  @Transform(normalizeEmail)
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    example: 'Password123',
    minLength: 8,
    description: 'User password.',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  password: string;
}
