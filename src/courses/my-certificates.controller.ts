import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import {
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
import { CoursesService } from './courses.service';

@ApiTags('My Certificates')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('my-certificates')
export class MyCertificatesController {
  constructor(
    private readonly coursesService: CoursesService,
    private readonly cloudFrontService: CloudFrontService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List current user certificates.' })
  @ApiOkResponse({ description: 'Certificates returned.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  findAll(@CurrentUser('id') userId: string) {
    return this.coursesService.findMyCertificates(userId);
  }

  @Get(':courseId')
  @ApiOperation({ summary: 'Get current user certificate for one course.' })
  @ApiOkResponse({ description: 'Certificate returned.' })
  @ApiNotFoundResponse({ description: 'Certificate not found.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  findOne(
    @CurrentUser('id') userId: string,
    @Param('courseId', ParseUUIDPipe) courseId: string,
  ) {
    return this.coursesService.findMyCertificate(userId, courseId);
  }

  @Get(':courseId/signed-url')
  @ApiOperation({
    summary: 'Generate a signed CloudFront URL for a current user certificate.',
  })
  @ApiOkResponse({
    description: 'Signed certificate URL generated.',
    type: CloudFrontSignedUrlResponseDto,
  })
  @ApiForbiddenResponse({ description: 'Certificate ownership is required.' })
  @ApiNotFoundResponse({ description: 'Certificate not found.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  generateSignedUrl(
    @CurrentUser('id') userId: string,
    @Param('courseId', ParseUUIDPipe) courseId: string,
  ) {
    return this.cloudFrontService.generateSignedCertificateUrl(
      userId,
      courseId,
    );
  }
}
