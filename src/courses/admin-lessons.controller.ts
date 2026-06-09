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
import { CreateLessonDto } from './dto/create-lesson.dto';
import { UpdateLessonDto } from './dto/update-lesson.dto';

@ApiTags('Admin Lessons')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, AdminGuard)
@Controller()
export class AdminLessonsController {
  constructor(private readonly coursesService: CoursesService) {}

  @Post('admin/sections/:sectionId/lessons')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Admin: create a lesson for one section.',
    description: 'VIDEO lessons require videoKey. PDF lessons require pdfKey.',
  })
  @ApiCreatedResponse({ description: 'Lesson created successfully.' })
  @ApiBadRequestResponse({ description: 'Invalid lesson data.' })
  @ApiNotFoundResponse({ description: 'Course section not found.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  @ApiForbiddenResponse({ description: 'Admin access is required.' })
  create(
    @Param('sectionId', ParseUUIDPipe) sectionId: string,
    @Body() createDto: CreateLessonDto,
  ) {
    return this.coursesService.adminCreateLesson(sectionId, createDto);
  }

  @Get('admin/sections/:sectionId/lessons')
  @ApiOperation({ summary: 'Admin: list lessons for one section.' })
  @ApiOkResponse({ description: 'Lessons returned.' })
  @ApiNotFoundResponse({ description: 'Course section not found.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  @ApiForbiddenResponse({ description: 'Admin access is required.' })
  findAll(@Param('sectionId', ParseUUIDPipe) sectionId: string) {
    return this.coursesService.adminFindLessons(sectionId);
  }

  @Patch('admin/lessons/:id')
  @ApiOperation({
    summary: 'Admin: update one lesson.',
    description: 'VIDEO lessons require videoKey. PDF lessons require pdfKey.',
  })
  @ApiOkResponse({ description: 'Lesson updated successfully.' })
  @ApiBadRequestResponse({ description: 'Invalid lesson data.' })
  @ApiNotFoundResponse({ description: 'Lesson not found.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  @ApiForbiddenResponse({ description: 'Admin access is required.' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateDto: UpdateLessonDto,
  ) {
    return this.coursesService.adminUpdateLesson(id, updateDto);
  }

  @Delete('admin/lessons/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Admin: hard delete one lesson.' })
  @ApiOkResponse({ description: 'Lesson deleted successfully.' })
  @ApiConflictResponse({ description: 'Lesson has dependent records.' })
  @ApiNotFoundResponse({ description: 'Lesson not found.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  @ApiForbiddenResponse({ description: 'Admin access is required.' })
  delete(@Param('id', ParseUUIDPipe) id: string) {
    return this.coursesService.adminDeleteLesson(id);
  }
}
