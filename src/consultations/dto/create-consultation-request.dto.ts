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
  MaxLength,
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

  @ApiPropertyOptional({ example: 30 })
  @Transform(toOptionalNumber)
  @IsOptional()
  @IsInt()
  @Min(1)
  age?: number;

  @ApiPropertyOptional({
    enum: ConsultationGender,
    example: ConsultationGender.Male,
  })
  @Transform(toConsultationGender)
  @IsOptional()
  @IsEnum(ConsultationGender)
  gender?: ConsultationGender;

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

  @ApiPropertyOptional({ example: '7-10', description: 'Child age range.' })
  @Transform(trimString)
  @IsOptional()
  @IsString()
  @MaxLength(50)
  childAge?: string;

  @ApiPropertyOptional({ example: 'أم', description: 'Relation to the child.' })
  @Transform(trimString)
  @IsOptional()
  @IsString()
  @MaxLength(50)
  relation?: string;

  @ApiPropertyOptional({
    example: 'video',
    description: 'Preferred session type.',
  })
  @Transform(trimString)
  @IsOptional()
  @IsString()
  @MaxLength(50)
  sessionType?: string;

  @ApiPropertyOptional({
    example: 'evening',
    description: 'Best time to call.',
  })
  @Transform(trimString)
  @IsOptional()
  @IsString()
  @MaxLength(50)
  preferredTime?: string;
}
