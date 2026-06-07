import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';

export enum ConsultationLanguage {
  Arabic = 'ar',
  English = 'en',
}

export class ConsultationCategoryQueryDto {
  @ApiPropertyOptional({
    enum: ConsultationLanguage,
    example: ConsultationLanguage.English,
  })
  @IsOptional()
  @IsEnum(ConsultationLanguage)
  lang?: ConsultationLanguage;
}
