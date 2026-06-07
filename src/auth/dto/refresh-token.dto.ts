import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString } from 'class-validator';
import { trimString } from './dto-transformers';

export class RefreshTokenDto {
  @ApiProperty({
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    description: 'Refresh token returned from login or refresh-token.',
  })
  @Transform(trimString)
  @IsString()
  @IsNotEmpty()
  refreshToken: string;
}
