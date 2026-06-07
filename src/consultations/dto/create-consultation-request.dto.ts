import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ConsultationGender } from '@prisma/client';
import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';
import {
  toConsultationGender,
  toOptionalNumber,
  trimString,
} from './dto-transformers';

export class CreateConsultationRequestDto {
  @ApiProperty({ example: '6f893ec2-5c3a-4d39-bb89-66dd3d9ad179' })
  @IsUUID()
  categoryId: string;

  @ApiProperty({ example: 'Ahmed Mohamed' })
  @Transform(trimString)
  @IsString()
  @IsNotEmpty()
  fullName: string;

  @ApiProperty({ example: 30 })
  @Transform(toOptionalNumber)
  @IsInt()
  @Min(1)
  age: number;

  @ApiProperty({ enum: ConsultationGender, example: ConsultationGender.Male })
  @Transform(toConsultationGender)
  @IsEnum(ConsultationGender)
  gender: ConsultationGender;

  @ApiProperty({ example: 'Saudi Arabia' })
  @Transform(trimString)
  @IsString()
  @IsNotEmpty()
  country: string;

  @ApiProperty({ example: '+9665xxxxxxxx' })
  @Transform(trimString)
  @IsString()
  @IsNotEmpty()
  phone: string;

  @ApiProperty({ example: '+9665xxxxxxxx' })
  @Transform(trimString)
  @IsString()
  @IsNotEmpty()
  whatsApp: string;

  @ApiProperty({ example: 'user@example.com' })
  @Transform(trimString)
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'استشارة أسرية' })
  @Transform(trimString)
  @IsString()
  @IsNotEmpty()
  consultationTopic: string;

  @ApiPropertyOptional({ example: 'تفاصيل الطلب...' })
  @Transform(trimString)
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  notes?: string;
}
