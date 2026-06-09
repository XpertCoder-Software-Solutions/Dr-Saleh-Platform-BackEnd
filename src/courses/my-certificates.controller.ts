import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Request,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { Request as ExpressRequest } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { AuthenticatedUser } from '../auth/jwt.strategy';
import { CoursesService } from './courses.service';

type AuthenticatedRequest = ExpressRequest & {
  user: AuthenticatedUser;
};

@ApiTags('My Certificates')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('my-certificates')
export class MyCertificatesController {
  constructor(private readonly coursesService: CoursesService) {}

  @Get()
  @ApiOperation({ summary: 'List current user certificates.' })
  @ApiOkResponse({ description: 'Certificates returned.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  findAll(@Request() request: AuthenticatedRequest) {
    return this.coursesService.findMyCertificates(request.user.id);
  }

  @Get(':courseId')
  @ApiOperation({ summary: 'Get current user certificate for one course.' })
  @ApiOkResponse({ description: 'Certificate returned.' })
  @ApiNotFoundResponse({ description: 'Certificate not found.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  findOne(
    @Request() request: AuthenticatedRequest,
    @Param('courseId', ParseUUIDPipe) courseId: string,
  ) {
    return this.coursesService.findMyCertificate(request.user.id, courseId);
  }
}
