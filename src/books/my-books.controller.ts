import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CloudFrontService } from '../common/cloudfront/cloudfront.service';
import { CloudFrontSignedUrlResponseDto } from '../common/cloudfront/dto/cloudfront-signed-url-response.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { PrismaService } from '../database/prisma.service';

@ApiTags('My Books')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('my-books')
export class MyBooksController {
  constructor(
    private readonly cloudFrontService: CloudFrontService,
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'List the digital and audio book formats the user owns.',
  })
  @ApiOkResponse({ description: 'Owned book formats returned.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  async findMine(@CurrentUser('id') userId: string) {
    const owned = await this.prisma.userBook.findMany({
      where: { userId },
      orderBy: { purchasedAt: 'desc' },
      select: {
        id: true,
        purchasedAt: true,
        bookFormat: {
          select: {
            id: true,
            formatType: true,
            isActive: true,
            audioDuration: true,
            readerFile: true,
            audioFile: true,
            book: {
              select: {
                id: true,
                slug: true,
                titleAr: true,
                titleEn: true,
                coverImage: true,
                isActive: true,
              },
            },
          },
        },
      },
    });

    return {
      message: 'Owned books returned successfully',
      data: {
        items: owned.map(({ id, purchasedAt, bookFormat }) => ({
          id,
          purchasedAt,
          bookFormatId: bookFormat.id,
          formatType: bookFormat.formatType,
          audioDuration: bookFormat.audioDuration,
          hasFile: Boolean(bookFormat.readerFile ?? bookFormat.audioFile),
          isAvailable: bookFormat.isActive && bookFormat.book.isActive,
          book: bookFormat.book,
        })),
      },
    };
  }

  @Get(':bookFormatId/digital-url')
  @ApiOperation({
    summary: 'Generate a signed CloudFront URL for a purchased digital book.',
  })
  @ApiOkResponse({
    description: 'Signed digital book URL generated.',
    type: CloudFrontSignedUrlResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Book format is not digital.' })
  @ApiForbiddenResponse({ description: 'Book purchase is required.' })
  @ApiNotFoundResponse({ description: 'Book format or file not found.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  generateDigitalUrl(
    @CurrentUser('id') userId: string,
    @Param('bookFormatId', ParseUUIDPipe) bookFormatId: string,
  ) {
    return this.cloudFrontService.generateSignedDigitalBookUrl(
      userId,
      bookFormatId,
    );
  }

  @Get(':bookFormatId/audio-url')
  @ApiOperation({
    summary: 'Generate a signed CloudFront URL for a purchased audio book.',
  })
  @ApiOkResponse({
    description: 'Signed audio book URL generated.',
    type: CloudFrontSignedUrlResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Book format is not audio.' })
  @ApiForbiddenResponse({ description: 'Book purchase is required.' })
  @ApiNotFoundResponse({ description: 'Book format or file not found.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  generateAudioUrl(
    @CurrentUser('id') userId: string,
    @Param('bookFormatId', ParseUUIDPipe) bookFormatId: string,
  ) {
    return this.cloudFrontService.generateSignedAudioBookUrl(
      userId,
      bookFormatId,
    );
  }
}
