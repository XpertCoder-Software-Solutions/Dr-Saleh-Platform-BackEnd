import {
  Body,
  Controller,
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
import { AuditAction } from '../audit-logs/audit-action.decorator';
import {
  AuditActions,
  AuditEntityTypes,
} from '../audit-logs/audit-log.constants';
import { AdminGuard } from '../auth/admin.guard';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminStudentsService } from './admin-students.service';
import { AdminStudentQueryDto } from './dto/admin-student-query.dto';
import { CreateStudentDto } from './dto/create-student.dto';
import { GrantCoursesDto } from './dto/grant-courses.dto';
import { UpdateStudentDto } from './dto/update-student.dto';

@ApiTags('Admin Students')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
@ApiForbiddenResponse({ description: 'Admin access is required.' })
@UseGuards(JwtAuthGuard, AdminGuard)
@Controller('admin/students')
export class AdminStudentsController {
  constructor(private readonly studentsService: AdminStudentsService) {}

  @Get()
  @ApiOperation({ summary: 'Admin: list students with course/order counts.' })
  @ApiOkResponse({ description: 'Students returned.' })
  findAll(@Query() query: AdminStudentQueryDto) {
    return this.studentsService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Admin: one student with courses and recent orders.',
  })
  @ApiOkResponse({ description: 'Student returned.' })
  @ApiNotFoundResponse({ description: 'Student not found.' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.studentsService.findOne(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @AuditAction({
    action: AuditActions.StudentCreated,
    entityType: AuditEntityTypes.User,
    entityIdResponsePath: 'data.student.id',
    description: 'Admin created a student account.',
    includeBody: false,
  })
  @ApiOperation({
    summary: 'Admin: create a student account (verified, optional courses).',
    description:
      'Returns the temporary password once so it can be handed to the student.',
  })
  @ApiCreatedResponse({ description: 'Student created.' })
  @ApiConflictResponse({ description: 'Email or phone already registered.' })
  create(@Body() dto: CreateStudentDto) {
    return this.studentsService.create(dto);
  }

  @Patch(':id')
  @AuditAction({
    action: AuditActions.StudentUpdated,
    entityType: AuditEntityTypes.User,
    entityIdParam: 'id',
    description: 'Admin updated a student account.',
  })
  @ApiOperation({ summary: 'Admin: suspend or restore a student.' })
  @ApiOkResponse({ description: 'Student updated.' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateStudentDto,
  ) {
    return this.studentsService.update(id, dto);
  }

  @Post(':id/courses')
  @HttpCode(HttpStatus.OK)
  @AuditAction({
    action: AuditActions.StudentCoursesGranted,
    entityType: AuditEntityTypes.User,
    entityIdParam: 'id',
    description: 'Admin opened courses for a student.',
  })
  @ApiOperation({
    summary: 'Admin: open courses for a student without an order.',
  })
  @ApiOkResponse({ description: 'Courses granted.' })
  grantCourses(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: GrantCoursesDto,
  ) {
    return this.studentsService.grantCourses(id, dto.courseIds);
  }
}
