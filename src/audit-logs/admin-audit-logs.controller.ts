import {
  BadRequestException,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Query,
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
import { AdminGuard } from '../auth/admin.guard';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AuditLogService } from './audit-log.service';
import { AuditLogQueryDto } from './dto/audit-log-query.dto';
import {
  AuditLogApiResponseDto,
  AuditLogListApiResponseDto,
} from './dto/audit-log-response.dto';

@ApiTags('Admin Audit Logs')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, AdminGuard)
@Controller('admin/audit-logs')
export class AdminAuditLogsController {
  constructor(private readonly auditLogService: AuditLogService) {}

  @Get()
  @ApiOperation({
    summary: 'Admin: list audit logs.',
    description:
      'Supports pagination plus actorUserId, action, entityType, entityId, and date filters.',
  })
  @ApiOkResponse({
    description: 'Audit logs returned successfully.',
    type: AuditLogListApiResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Invalid query filters.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  @ApiForbiddenResponse({ description: 'Admin access is required.' })
  findAll(@Query() query: AuditLogQueryDto) {
    if (
      query.dateFrom &&
      query.dateTo &&
      new Date(query.dateFrom) > new Date(query.dateTo)
    ) {
      throw new BadRequestException('dateFrom must be before dateTo.');
    }

    return this.auditLogService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Admin: get one audit log.' })
  @ApiOkResponse({
    description: 'Audit log returned successfully.',
    type: AuditLogApiResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  @ApiForbiddenResponse({ description: 'Admin access is required.' })
  @ApiNotFoundResponse({ description: 'Audit log not found.' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.auditLogService.findOne(id);
  }
}
