import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { AdminGuard } from '../auth/admin.guard';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CoursesService } from './courses.service';
import { CreateCourseSectionDto } from './dto/create-course-section.dto';
import { UpdateCourseSectionDto } from './dto/update-course-section.dto';

@ApiTags('Admin Course Sections')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, AdminGuard)
@Controller()
export class AdminCourseSectionsController {
  constructor(private readonly coursesService: CoursesService) {}

  @Post('admin/courses/:courseId/sections')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Admin: create a section for one course.' })
  @ApiCreatedResponse({ description: 'Course section created successfully.' })
  @ApiBadRequestResponse({ description: 'Invalid section data.' })
  @ApiNotFoundResponse({ description: 'Course not found.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  @ApiForbiddenResponse({ description: 'Admin access is required.' })
  create(
    @Param('courseId', ParseUUIDPipe) courseId: string,
    @Body() createDto: CreateCourseSectionDto,
  ) {
    return this.coursesService.adminCreateSection(courseId, createDto);
  }

  @Get('admin/courses/:courseId/sections')
  @ApiOperation({ summary: 'Admin: list sections for one course.' })
  @ApiOkResponse({ description: 'Course sections returned.' })
  @ApiNotFoundResponse({ description: 'Course not found.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  @ApiForbiddenResponse({ description: 'Admin access is required.' })
  findAll(@Param('courseId', ParseUUIDPipe) courseId: string) {
    return this.coursesService.adminFindSections(courseId);
  }

  @Patch('admin/sections/:id')
  @ApiOperation({ summary: 'Admin: update one course section.' })
  @ApiOkResponse({ description: 'Course section updated successfully.' })
  @ApiBadRequestResponse({ description: 'Invalid section data.' })
  @ApiNotFoundResponse({ description: 'Course section not found.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  @ApiForbiddenResponse({ description: 'Admin access is required.' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateDto: UpdateCourseSectionDto,
  ) {
    return this.coursesService.adminUpdateSection(id, updateDto);
  }

  @Delete('admin/sections/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Admin: hard delete one course section.' })
  @ApiOkResponse({ description: 'Course section deleted successfully.' })
  @ApiConflictResponse({ description: 'Section has assigned lessons.' })
  @ApiNotFoundResponse({ description: 'Course section not found.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  @ApiForbiddenResponse({ description: 'Admin access is required.' })
  delete(@Param('id', ParseUUIDPipe) id: string) {
    return this.coursesService.adminDeleteSection(id);
  }
}
