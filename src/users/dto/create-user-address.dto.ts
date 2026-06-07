import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { trimString } from '../../auth/dto/dto-transformers';

export class CreateUserAddressDto {
  @ApiProperty({
    example: '7cb9f85b-420f-4f4e-9330-85ab0675df90',
    description: 'Country UUID.',
  })
  @Transform(trimString)
  @IsUUID()
  countryId: string;

  @ApiProperty({
    example: '45f51dd5-497c-4e70-b258-2120a6970d7d',
    description: 'City UUID.',
  })
  @Transform(trimString)
  @IsUUID()
  cityId: string;

  @ApiProperty({ example: 'Nasr City' })
  @Transform(trimString)
  @IsString()
  @IsNotEmpty()
  state: string;

  @ApiProperty({ example: 'Street 1, Building 10' })
  @Transform(trimString)
  @IsString()
  @IsNotEmpty()
  addressLine1: string;

  @ApiPropertyOptional({ example: 'Floor 3, Apartment 5' })
  @Transform(trimString)
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  addressLine2?: string;

  @ApiPropertyOptional({ example: '11765' })
  @Transform(trimString)
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  postalCode?: string;

  @ApiPropertyOptional({ example: 30.0444 })
  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  latitude?: number;

  @ApiPropertyOptional({ example: 31.2357 })
  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  longitude?: number;

  @ApiPropertyOptional({ example: 'Call before arrival' })
  @Transform(trimString)
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  notes?: string;
}
