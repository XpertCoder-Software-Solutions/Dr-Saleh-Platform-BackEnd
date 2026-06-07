import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';
import { trimString } from './dto-transformers';

export class CreateContactMessageDto {
  @ApiProperty({ example: 'Ahmed Mohamed' })
  @Transform(trimString)
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'user@example.com' })
  @Transform(trimString)
  @IsEmail()
  email: string;

  @ApiProperty({ example: '+201000000000' })
  @Transform(trimString)
  @IsString()
  @IsNotEmpty()
  phone: string;

  @ApiProperty({
    example: 'I need more information about your services.',
  })
  @Transform(trimString)
  @IsString()
  @IsNotEmpty()
  message: string;
}
