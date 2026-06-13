import { ApiProperty } from '@nestjs/swagger';
import { LessonType } from '@prisma/client';

export class ContinueLessonResponseDto {
  @ApiProperty({ example: 'd0cd9afd-23d6-4c2d-b7c9-4328756da109' })
  lessonId: string;

  @ApiProperty({ example: '8f0c392c-53de-41f5-9b35-b3331fe3e863' })
  sectionId: string;

  @ApiProperty({
    enum: LessonType,
    enumName: 'LessonType',
    example: LessonType.VIDEO,
  })
  lessonType: LessonType;

  @ApiProperty({ example: 'مقدمة الدورة' })
  titleAr: string;

  @ApiProperty({ example: 'Course Introduction' })
  titleEn: string;

  @ApiProperty({ example: 40, minimum: 0, maximum: 100 })
  completionPercentage: number;
}
