import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';

export enum ProductLanguage {
  Arabic = 'ar',
  English = 'en',
}

export class LangQueryDto {
  @ApiPropertyOptional({
    enum: ProductLanguage,
    example: ProductLanguage.English,
  })
  @IsOptional()
  @IsEnum(ProductLanguage)
  lang?: ProductLanguage;
}
