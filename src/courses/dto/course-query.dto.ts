import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';
import {
  toOptionalBoolean,
  toOptionalNumber,
  trimOptionalString,
} from './dto-transformers';

export class CourseQueryDto {
  @ApiPropertyOptional({ example: 1, default: 1 })
  @Transform(toOptionalNumber)
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ example: 20, default: 20, maximum: 100 })
  @Transform(toOptionalNumber)
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({
    example: 'anxiety',
    description:
      'Search in Arabic/English titles and Arabic/English descriptions.',
  })
  @Transform(trimOptionalString)
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ example: '7cb9f85b-420f-4f4e-9330-85ab0675df90' })
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiPropertyOptional({ example: true })
  @Transform(toOptionalBoolean)
  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean;
}

export class AdminCourseQueryDto extends CourseQueryDto {
  @ApiPropertyOptional({ example: true })
  @Transform(toOptionalBoolean)
  @IsOptional()
  @IsBoolean()
  isHomeDisplay?: boolean;

  @ApiPropertyOptional({ example: true })
  @Transform(toOptionalBoolean)
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
