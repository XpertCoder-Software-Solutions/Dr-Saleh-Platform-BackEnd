import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateStudentDto {
  @ApiPropertyOptional({
    example: false,
    description: 'Suspend or restore the account.',
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
