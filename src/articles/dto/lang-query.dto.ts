import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';

export enum ArticleLanguage {
  Arabic = 'ar',
  English = 'en',
}

export class LangQueryDto {
  @ApiPropertyOptional({
    enum: ArticleLanguage,
    example: ArticleLanguage.English,
  })
  @IsOptional()
  @IsEnum(ArticleLanguage)
  lang?: ArticleLanguage;
}
