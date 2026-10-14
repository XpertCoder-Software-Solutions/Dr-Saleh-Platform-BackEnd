import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { AdminGuard } from '../auth/admin.guard';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AuditAction } from '../audit-logs/audit-action.decorator';
import {
  AuditActions,
  AuditEntityTypes,
} from '../audit-logs/audit-log.constants';
import { CoursesService } from './courses.service';
import { AdminReviewQueryDto } from './dto/admin-review-query.dto';
import { UpdateReviewStatusDto } from './dto/update-review-status.dto';

@ApiTags('Admin Course Reviews')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, AdminGuard)
@Controller('admin/course-reviews')
export class AdminCourseReviewsController {
  constructor(private readonly coursesService: CoursesService) {}

  @Get()
  @ApiOperation({
    summary: 'Admin: list course reviews (shown and hidden).',
    description: 'Filters: courseId, isActive, rating.',
  })
  @ApiOkResponse({ description: 'Reviews returned.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  @ApiForbiddenResponse({ description: 'Admin access is required.' })
  findAll(@Query() query: AdminReviewQueryDto) {
    return this.coursesService.adminFindReviews(query);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Admin: show or hide a course review.' })
  @ApiOkResponse({ description: 'Review updated.' })
  @ApiNotFoundResponse({ description: 'Review not found.' })
  @AuditAction({
    action: AuditActions.CourseReviewUpdated,
    entityType: AuditEntityTypes.CourseReview,
    entityIdParam: 'id',
    description: 'Admin showed or hid a course review.',
  })
  updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateReviewStatusDto,
  ) {
    return this.coursesService.adminSetReviewActive(id, dto.isActive);
  }
}
