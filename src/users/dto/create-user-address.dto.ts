import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { toOptionalBoolean, trimString } from './dto-transformers';

export class CreateUserAddressDto {
  @ApiProperty({ example: 'Ahmed Saleh', maxLength: 150 })
  @Transform(trimString)
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  fullName: string;

  @ApiProperty({ example: '+201001234567', maxLength: 32 })
  @Transform(trimString)
  @IsString()
  @IsNotEmpty()
  @MaxLength(32)
  phoneNumber: string;

  @ApiProperty({
    example: '8f5a18d9-fc08-4c25-b181-2c48108a5332',
    description: 'Active governorate UUID used to calculate shipping cost.',
  })
  @Transform(trimString)
  @IsUUID()
  governorateId: string;

  @ApiProperty({ example: 'Nasr City', maxLength: 120 })
  @Transform(trimString)
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  city: string;

  @ApiProperty({ example: 'Makram Ebeid Street', maxLength: 200 })
  @Transform(trimString)
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  street: string;

  @ApiProperty({ example: '12B', maxLength: 50 })
  @Transform(trimString)
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  buildingNumber: string;

  @ApiPropertyOptional({ example: '3', maxLength: 50 })
  @Transform(trimString)
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  floor?: string;

  @ApiPropertyOptional({ example: '8', maxLength: 50 })
  @Transform(trimString)
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  apartment?: string;

  @ApiPropertyOptional({
    example: 'Near the main pharmacy',
    maxLength: 250,
  })
  @Transform(trimString)
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(250)
  landmark?: string;

  @ApiPropertyOptional({ example: 'Call before arrival', maxLength: 1000 })
  @Transform(trimString)
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  notes?: string;

  @ApiPropertyOptional({ example: true, default: true })
  @Transform(toOptionalBoolean)
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
