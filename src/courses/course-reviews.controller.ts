import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
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
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CoursesService } from './courses.service';
import { CreateCourseReviewDto } from './dto/create-course-review.dto';
import { ReviewQueryDto } from './dto/review-query.dto';

@ApiTags('Course Reviews')
@Controller('courses/:courseId/reviews')
export class CourseReviewsController {
  constructor(private readonly coursesService: CoursesService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Create a review for a purchased course.',
    description:
      'User must own the course. One review per user per course. Rating must be between 1 and 5.',
  })
  @ApiCreatedResponse({ description: 'Course review created successfully.' })
  @ApiBadRequestResponse({ description: 'Invalid rating or body.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  @ApiForbiddenResponse({ description: 'Course purchase is required.' })
  @ApiConflictResponse({ description: 'User already reviewed this course.' })
  @ApiNotFoundResponse({ description: 'Course not found.' })
  create(
    @CurrentUser('id') userId: string,
    @Param('courseId', ParseUUIDPipe) courseId: string,
    @Body() createDto: CreateCourseReviewDto,
  ) {
    return this.coursesService.createReview(userId, courseId, createDto);
  }

  @Get()
  @ApiOperation({ summary: 'List active reviews for one course.' })
  @ApiOkResponse({ description: 'Course reviews returned.' })
  @ApiNotFoundResponse({ description: 'Course not found.' })
  findAll(
    @Param('courseId', ParseUUIDPipe) courseId: string,
    @Query() query: ReviewQueryDto,
  ) {
    return this.coursesService.findReviews(
      courseId,
      query.page ?? 1,
      query.limit ?? 20,
    );
  }
}
