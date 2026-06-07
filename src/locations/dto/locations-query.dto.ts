import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';

export enum LocationLanguage {
  Arabic = 'ar',
  English = 'en',
}

export class LocationsQueryDto {
  @ApiPropertyOptional({
    enum: LocationLanguage,
    example: LocationLanguage.English,
  })
  @IsOptional()
  @IsEnum(LocationLanguage)
  lang?: LocationLanguage;
}
