import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { LessonType } from '@prisma/client';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import {
  toOptionalBoolean,
  toOptionalNumber,
  trimOptionalString,
  trimString,
} from './dto-transformers';

export class CreateLessonDto {
  @ApiProperty({ example: 'فهم القلق' })
  @Transform(trimString)
  @IsString()
  @IsNotEmpty()
  titleAr: string;

  @ApiProperty({ example: 'Understanding Anxiety' })
  @Transform(trimString)
  @IsString()
  @IsNotEmpty()
  titleEn: string;

  @ApiProperty({
    enum: LessonType,
    enumName: 'LessonType',
    example: LessonType.VIDEO,
  })
  @IsEnum(LessonType)
  lessonType: LessonType;

  @ApiPropertyOptional({
    example: 'courses/videos/lesson-1.mp4',
    description: 'Required when lessonType is VIDEO.',
  })
  @Transform(trimOptionalString)
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  videoKey?: string;

  @ApiPropertyOptional({ example: 600 })
  @Transform(toOptionalNumber)
  @IsOptional()
  @IsInt()
  @Min(0)
  videoDurationSeconds?: number;

  @ApiPropertyOptional({
    example: 'courses/pdfs/lesson-1.pdf',
    description: 'Required when lessonType is PDF.',
  })
  @Transform(trimOptionalString)
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  pdfKey?: string;

  @ApiPropertyOptional({ example: false, default: false })
  @Transform(toOptionalBoolean)
  @IsOptional()
  @IsBoolean()
  isPreview?: boolean;

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
