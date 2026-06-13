import {
  BadRequestException,
  Controller,
  Get,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { AdminGuard } from '../auth/admin.guard';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminNotificationLogsQueryDto } from './dto/admin-notification-logs-query.dto';
import { NotificationLogsApiResponseDto } from './dto/notification-log-response.dto';
import { NotificationsService } from './notifications.service';

@ApiTags('Admin Notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, AdminGuard)
@Controller('admin/notifications')
export class AdminNotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get('logs')
  @ApiOperation({
    summary: 'Admin: list notification delivery logs.',
    description:
      'Supports pagination plus type, status, email, and created date filters.',
  })
  @ApiOkResponse({
    description: 'Notification logs returned successfully.',
    type: NotificationLogsApiResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Invalid query filters.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  @ApiForbiddenResponse({ description: 'Admin access is required.' })
  findLogs(@Query() query: AdminNotificationLogsQueryDto) {
    const dateFrom = query.dateFrom ? new Date(query.dateFrom) : undefined;
    const dateTo = query.dateTo ? new Date(query.dateTo) : undefined;

    if (dateFrom && dateTo && dateFrom > dateTo) {
      throw new BadRequestException('dateFrom must be before dateTo.');
    }

    return this.notificationsService.findLogs({
      ...query,
      dateFrom,
      dateTo,
    });
  }
}
