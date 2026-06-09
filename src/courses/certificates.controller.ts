import { Controller, Get, Param } from '@nestjs/common';
import {
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CoursesService } from './courses.service';

@ApiTags('Certificates')
@Controller('certificates')
export class CertificatesController {
  constructor(private readonly coursesService: CoursesService) {}

  @Get('verify/:certificateNumber')
  @ApiOperation({ summary: 'Verify a certificate by certificate number.' })
  @ApiOkResponse({ description: 'Certificate returned.' })
  @ApiNotFoundResponse({ description: 'Certificate not found.' })
  verify(@Param('certificateNumber') certificateNumber: string) {
    return this.coursesService.verifyCertificate(certificateNumber);
  }
}
