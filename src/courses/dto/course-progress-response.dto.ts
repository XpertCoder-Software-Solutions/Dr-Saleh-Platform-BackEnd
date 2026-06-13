import { ApiProperty } from '@nestjs/swagger';

export class CourseProgressResponseDto {
  @ApiProperty({ example: 'd0cd9afd-23d6-4c2d-b7c9-4328756da109' })
  courseId: string;

  @ApiProperty({ example: 10 })
  totalLessons: number;

  @ApiProperty({ example: 7 })
  completedLessons: number;

  @ApiProperty({ example: 70, minimum: 0, maximum: 100 })
  completionPercentage: number;

  @ApiProperty({ example: false })
  isCompleted: boolean;
}
