import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsInt, IsNumber, Max, Min } from 'class-validator';
import { toOptionalNumber } from './dto-transformers';

export class UpdateLessonProgressDto {
  @ApiProperty({ example: 120 })
  @Transform(toOptionalNumber)
  @IsInt()
  @Min(0)
  watchedSeconds: number;

  @ApiProperty({ example: 50, minimum: 0, maximum: 100 })
  @Transform(toOptionalNumber)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  completionPercentage: number;
}
