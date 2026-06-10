import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
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
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CoursesService } from './courses.service';
import { UpdateLessonProgressDto } from './dto/update-lesson-progress.dto';

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
  findAll(@CurrentUser('id') userId: string) {
    return this.coursesService.findMyCourses(userId);
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
    @CurrentUser('id') userId: string,
    @Param('courseId', ParseUUIDPipe) courseId: string,
  ) {
    return this.coursesService.findMyCourse(userId, courseId);
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
    @CurrentUser('id') userId: string,
    @Param('courseId', ParseUUIDPipe) courseId: string,
    @Param('lessonId', ParseUUIDPipe) lessonId: string,
  ) {
    return this.coursesService.findMyCourseLesson(userId, courseId, lessonId);
  }

  @Patch('lessons/:lessonId/progress')
  @ApiOperation({ summary: 'Update current user lesson progress.' })
  @ApiOkResponse({ description: 'Lesson progress updated successfully.' })
  @ApiBadRequestResponse({ description: 'Invalid progress body.' })
  @ApiForbiddenResponse({ description: 'Course purchase is required.' })
  @ApiNotFoundResponse({ description: 'Lesson not found.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  updateProgress(
    @CurrentUser('id') userId: string,
    @Param('lessonId', ParseUUIDPipe) lessonId: string,
    @Body() updateDto: UpdateLessonProgressDto,
  ) {
    return this.coursesService.updateLessonProgress(
      userId,
      lessonId,
      updateDto,
    );
  }
}
