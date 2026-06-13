import { ApiProperty } from '@nestjs/swagger';

export class CloudFrontSignedUrlResponseDto {
  @ApiProperty({
    example:
      'https://d27i48p63zrtq4.cloudfront.net/courses/videos/lesson-1.mp4?Expires=...',
  })
  url: string;

  @ApiProperty({
    example: '2026-06-11T12:15:00.000Z',
    type: String,
    format: 'date-time',
  })
  expiresAt: Date;
}
