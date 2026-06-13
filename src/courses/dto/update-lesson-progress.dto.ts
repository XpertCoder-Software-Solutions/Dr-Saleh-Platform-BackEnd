import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  Max,
  Min,
} from 'class-validator';
import { toOptionalBoolean, toOptionalNumber } from './dto-transformers';

export class UpdateLessonProgressDto {
  @ApiPropertyOptional({
    example: 120,
    description: 'Watched seconds for VIDEO lessons.',
  })
  @Transform(toOptionalNumber)
  @IsOptional()
  @IsInt()
  @Min(0)
  watchedSeconds?: number;

  @ApiProperty({
    example: 50,
    minimum: 0,
    maximum: 100,
    description: 'Lesson completion percentage from 0 to 100.',
  })
  @Transform(toOptionalNumber)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  completionPercentage: number;

  @ApiPropertyOptional({
    example: true,
    description:
      'For PDF lessons, true marks the lesson complete and sets completionPercentage to 100.',
  })
  @Transform(toOptionalBoolean)
  @IsOptional()
  @IsBoolean()
  isCompleted?: boolean;
}
