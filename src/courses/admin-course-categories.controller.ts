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
import { CreateCourseCategoryDto } from './dto/create-course-category.dto';
import { UpdateCourseCategoryDto } from './dto/update-course-category.dto';

@ApiTags('Admin Course Categories')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, AdminGuard)
@Controller('admin/course-categories')
export class AdminCourseCategoriesController {
  constructor(private readonly coursesService: CoursesService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Admin: create a course category.' })
  @ApiCreatedResponse({ description: 'Course category created successfully.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  @ApiForbiddenResponse({ description: 'Admin access is required.' })
  create(@Body() createDto: CreateCourseCategoryDto) {
    return this.coursesService.adminCreateCategory(createDto);
  }

  @Get()
  @ApiOperation({ summary: 'Admin: list course categories.' })
  @ApiOkResponse({ description: 'Course categories returned.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  @ApiForbiddenResponse({ description: 'Admin access is required.' })
  findAll() {
    return this.coursesService.adminFindCategories();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Admin: get one course category.' })
  @ApiOkResponse({ description: 'Course category returned.' })
  @ApiNotFoundResponse({ description: 'Course category not found.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  @ApiForbiddenResponse({ description: 'Admin access is required.' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.coursesService.adminFindCategory(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Admin: update one course category.' })
  @ApiOkResponse({ description: 'Course category updated successfully.' })
  @ApiNotFoundResponse({ description: 'Course category not found.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  @ApiForbiddenResponse({ description: 'Admin access is required.' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateDto: UpdateCourseCategoryDto,
  ) {
    return this.coursesService.adminUpdateCategory(id, updateDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Admin: hard delete one course category.' })
  @ApiOkResponse({ description: 'Course category deleted successfully.' })
  @ApiConflictResponse({
    description: 'Course category has assigned courses.',
  })
  @ApiNotFoundResponse({ description: 'Course category not found.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  @ApiForbiddenResponse({ description: 'Admin access is required.' })
  delete(@Param('id', ParseUUIDPipe) id: string) {
    return this.coursesService.adminDeleteCategory(id);
  }
}
