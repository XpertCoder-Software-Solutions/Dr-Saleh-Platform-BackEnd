import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString } from 'class-validator';
import { trimString } from './dto-transformers';

export class CreateArticleTagDto {
  @ApiProperty({ example: 'القلق' })
  @Transform(trimString)
  @IsString()
  @IsNotEmpty()
  nameAr: string;

  @ApiProperty({ example: 'Anxiety' })
  @Transform(trimString)
  @IsString()
  @IsNotEmpty()
  nameEn: string;
}
