import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Request,
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
import type { Request as ExpressRequest } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { AuthenticatedUser } from '../auth/jwt.strategy';
import { CoursesService } from './courses.service';
import { UpdateLessonProgressDto } from './dto/update-lesson-progress.dto';

type AuthenticatedRequest = ExpressRequest & {
  user: AuthenticatedUser;
};

@ApiTags('My Courses')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('my-courses')
export class MyCoursesController {
  constructor(private readonly coursesService: CoursesService) {}

  @Get()
  @ApiOperation({ summary: 'List current user purchased courses.' })
  @ApiOkResponse({ description: 'Purchased courses returned.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  findAll(@Request() request: AuthenticatedRequest) {
    return this.coursesService.findMyCourses(request.user.id);
  }

  @Get(':courseId')
  @ApiOperation({
    summary:
      'Get one current user purchased course with sections and progress.',
  })
  @ApiOkResponse({ description: 'Purchased course returned.' })
  @ApiForbiddenResponse({ description: 'Course purchase is required.' })
  @ApiNotFoundResponse({ description: 'Course not found.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  findOne(
    @Request() request: AuthenticatedRequest,
    @Param('courseId', ParseUUIDPipe) courseId: string,
  ) {
    return this.coursesService.findMyCourse(request.user.id, courseId);
  }

  @Get(':courseId/lessons/:lessonId')
  @ApiOperation({
    summary: 'Get one lesson content for a purchased course.',
  })
  @ApiOkResponse({ description: 'Lesson returned.' })
  @ApiForbiddenResponse({ description: 'Course purchase is required.' })
  @ApiNotFoundResponse({ description: 'Lesson or course not found.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  findLesson(
    @Request() request: AuthenticatedRequest,
    @Param('courseId', ParseUUIDPipe) courseId: string,
    @Param('lessonId', ParseUUIDPipe) lessonId: string,
  ) {
    return this.coursesService.findMyCourseLesson(
      request.user.id,
      courseId,
      lessonId,
    );
  }

  @Patch('lessons/:lessonId/progress')
  @ApiOperation({ summary: 'Update current user lesson progress.' })
  @ApiOkResponse({ description: 'Lesson progress updated successfully.' })
  @ApiBadRequestResponse({ description: 'Invalid progress body.' })
  @ApiForbiddenResponse({ description: 'Course purchase is required.' })
  @ApiNotFoundResponse({ description: 'Lesson not found.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  updateProgress(
    @Request() request: AuthenticatedRequest,
    @Param('lessonId', ParseUUIDPipe) lessonId: string,
    @Body() updateDto: UpdateLessonProgressDto,
  ) {
    return this.coursesService.updateLessonProgress(
      request.user.id,
      lessonId,
      updateDto,
    );
  }
}
