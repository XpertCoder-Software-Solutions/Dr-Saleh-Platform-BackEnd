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
import { AuditAction } from '../audit-logs/audit-action.decorator';
import {
  AuditActions,
  AuditEntityTypes,
} from '../audit-logs/audit-log.constants';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AdminManagementService } from './admin-management.service';
import { AdminQueryDto } from './dto/admin-query.dto';
import {
  AdminApiResponseDto,
  AdminListApiResponseDto,
} from './dto/admin-response.dto';
import { CreateAdminDto } from './dto/create-admin.dto';
import { UpdateAdminDto } from './dto/update-admin.dto';

@ApiTags('Admin Management')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, AdminGuard)
@Controller('admin/admins')
export class AdminManagementController {
  constructor(
    private readonly adminManagementService: AdminManagementService,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'Admin: list admins.',
    description:
      'Only authenticated admins can list admins. Supports pagination, search, and isActive filtering.',
  })
  @ApiOkResponse({
    description: 'Admins returned successfully.',
    type: AdminListApiResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Invalid query filters.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  @ApiForbiddenResponse({ description: 'Admin access is required.' })
  findAll(@Query() query: AdminQueryDto) {
    return this.adminManagementService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Admin: get one admin.' })
  @ApiOkResponse({
    description: 'Admin returned successfully.',
    type: AdminApiResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  @ApiForbiddenResponse({ description: 'Admin access is required.' })
  @ApiNotFoundResponse({ description: 'Admin not found.' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminManagementService.findOne(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @AuditAction({
    action: AuditActions.AdminCreated,
    entityType: AuditEntityTypes.Admin,
    entityIdResponsePath: 'data.admin.id',
    description: 'Admin created another admin.',
    includeBody: false,
  })
  @ApiOperation({
    summary: 'Admin: create another admin.',
    description:
      'There is no public create-admin API. The first admin must be created by the database seed.',
  })
  @ApiCreatedResponse({
    description: 'Admin created successfully.',
    type: AdminApiResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Invalid admin payload.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  @ApiForbiddenResponse({ description: 'Admin access is required.' })
  @ApiConflictResponse({
    description: 'Email or phone number is already registered.',
  })
  create(@Body() createAdminDto: CreateAdminDto) {
    return this.adminManagementService.create(createAdminDto);
  }

  @Patch(':id')
  @AuditAction({
    action: AuditActions.AdminUpdated,
    entityType: AuditEntityTypes.Admin,
    entityIdParam: 'id',
    description: 'Admin updated an admin.',
    includeBody: false,
  })
  @ApiOperation({
    summary: 'Admin: update one admin.',
    description:
      'All fields are optional. Role cannot be changed. isActive=false deactivates an admin, but admins cannot deactivate themselves or the last active admin.',
  })
  @ApiOkResponse({
    description: 'Admin updated successfully.',
    type: AdminApiResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Invalid admin payload or no fields provided.',
  })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  @ApiForbiddenResponse({ description: 'Admin access is required.' })
  @ApiNotFoundResponse({ description: 'Admin not found.' })
  @ApiConflictResponse({
    description:
      'Cannot deactivate self, cannot deactivate last active admin, or phone is already registered.',
  })
  update(
    @CurrentUser('id') actingAdminId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateAdminDto: UpdateAdminDto,
  ) {
    return this.adminManagementService.update(
      actingAdminId,
      id,
      updateAdminDto,
    );
  }
}
