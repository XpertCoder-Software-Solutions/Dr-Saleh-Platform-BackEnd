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
import { LangQueryDto } from './lang-query.dto';
import {
  toOptionalBoolean,
  toOptionalNumber,
  trimString,
} from './dto-transformers';

export class ArticleQueryDto extends LangQueryDto {
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

  @ApiPropertyOptional({ example: '7cb9f85b-420f-4f4e-9330-85ab0675df90' })
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiPropertyOptional({ example: 'e75d1f63-784e-4834-9125-d73b4cbff5cf' })
  @IsOptional()
  @IsUUID()
  tagId?: string;

  @ApiPropertyOptional({
    example: 'anxiety',
    description:
      'Search in Arabic/English titles and Arabic/English short content.',
  })
  @Transform(trimString)
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ example: true })
  @Transform(toOptionalBoolean)
  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean;

  @ApiPropertyOptional({ example: true })
  @Transform(toOptionalBoolean)
  @IsOptional()
  @IsBoolean()
  isHomeDisplay?: boolean;
}

export class AdminArticleQueryDto extends ArticleQueryDto {
  @ApiPropertyOptional({ example: true })
  @Transform(toOptionalBoolean)
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
