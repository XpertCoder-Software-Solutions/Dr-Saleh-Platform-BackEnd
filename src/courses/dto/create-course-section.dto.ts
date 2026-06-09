import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import {
  toOptionalBoolean,
  toOptionalNumber,
  trimString,
} from './dto-transformers';

export class CreateCourseSectionDto {
  @ApiProperty({ example: 'مقدمة الدورة' })
  @Transform(trimString)
  @IsString()
  @IsNotEmpty()
  titleAr: string;

  @ApiProperty({ example: 'Course Introduction' })
  @Transform(trimString)
  @IsString()
  @IsNotEmpty()
  titleEn: string;

  @ApiProperty({ example: 1 })
  @Transform(toOptionalNumber)
  @IsInt()
  @Min(0)
  displayOrder: number;

  @ApiPropertyOptional({ example: true, default: true })
  @Transform(toOptionalBoolean)
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
