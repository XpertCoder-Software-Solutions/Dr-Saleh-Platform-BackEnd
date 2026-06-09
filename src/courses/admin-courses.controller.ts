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
import { AdminGuard } from '../auth/admin.guard';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CoursesService } from './courses.service';
import { AdminCourseQueryDto } from './dto/course-query.dto';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';

@ApiTags('Admin Courses')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, AdminGuard)
@Controller('admin/courses')
export class AdminCoursesController {
  constructor(private readonly coursesService: CoursesService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Admin: create a course.' })
  @ApiCreatedResponse({ description: 'Course created successfully.' })
  @ApiBadRequestResponse({ description: 'Invalid course data.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  @ApiForbiddenResponse({ description: 'Admin access is required.' })
  create(@Body() createDto: CreateCourseDto) {
    return this.coursesService.adminCreateCourse(createDto);
  }

  @Get()
  @ApiOperation({
    summary: 'Admin: list courses.',
    description:
      'Supports pagination, search, categoryId, isFeatured, isHomeDisplay, and isActive filters.',
  })
  @ApiOkResponse({ description: 'Courses returned.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  @ApiForbiddenResponse({ description: 'Admin access is required.' })
  findAll(@Query() query: AdminCourseQueryDto) {
    return this.coursesService.adminFindCourses(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Admin: get one course with sections and lessons.' })
  @ApiOkResponse({ description: 'Course returned.' })
  @ApiNotFoundResponse({ description: 'Course not found.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  @ApiForbiddenResponse({ description: 'Admin access is required.' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.coursesService.adminFindCourse(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Admin: update one course.' })
  @ApiOkResponse({ description: 'Course updated successfully.' })
  @ApiBadRequestResponse({ description: 'Invalid course data.' })
  @ApiNotFoundResponse({ description: 'Course not found.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  @ApiForbiddenResponse({ description: 'Admin access is required.' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateDto: UpdateCourseDto,
  ) {
    return this.coursesService.adminUpdateCourse(id, updateDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Admin: hard delete one course.' })
  @ApiOkResponse({ description: 'Course deleted successfully.' })
  @ApiConflictResponse({ description: 'Course has dependent records.' })
  @ApiNotFoundResponse({ description: 'Course not found.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  @ApiForbiddenResponse({ description: 'Admin access is required.' })
  delete(@Param('id', ParseUUIDPipe) id: string) {
    return this.coursesService.adminDeleteCourse(id);
  }
}
