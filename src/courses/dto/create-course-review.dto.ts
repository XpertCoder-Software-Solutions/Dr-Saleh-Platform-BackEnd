import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { toOptionalNumber, trimOptionalString } from './dto-transformers';

export class CreateCourseReviewDto {
  @ApiProperty({ example: 5, minimum: 1, maximum: 5 })
  @Transform(toOptionalNumber)
  @IsInt()
  @Min(1)
  @Max(5)
  rating: number;

  @ApiPropertyOptional({ example: 'Excellent course' })
  @Transform(trimOptionalString)
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  title?: string;

  @ApiPropertyOptional({ example: 'The lessons were clear and practical.' })
  @Transform(trimOptionalString)
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  comment?: string;
}
