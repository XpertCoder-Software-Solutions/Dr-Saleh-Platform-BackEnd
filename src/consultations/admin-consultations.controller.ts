import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Body,
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
import { ConsultationsService } from './consultations.service';
import { AdminConsultationQueryDto } from './dto/admin-consultation-query.dto';
import { UpdateConsultationRequestDto } from './dto/update-consultation-request.dto';

@ApiTags('Admin Consultations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, AdminGuard)
@Controller('admin/consultations')
export class AdminConsultationsController {
  constructor(private readonly consultationsService: ConsultationsService) {}

  @Get()
  @ApiOperation({
    summary: 'Admin: list consultation requests.',
    description:
      'Supports pagination, search by submitted contact/topic fields, categoryId filtering, and newest-first sorting.',
  })
  @ApiOkResponse({ description: 'Consultation requests returned.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  @ApiForbiddenResponse({ description: 'Admin access is required.' })
  findAll(@Query() query: AdminConsultationQueryDto) {
    return this.consultationsService.adminFindRequests(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Admin: get one consultation request.' })
  @ApiOkResponse({ description: 'Consultation request returned.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  @ApiForbiddenResponse({ description: 'Admin access is required.' })
  @ApiNotFoundResponse({ description: 'Consultation request not found.' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.consultationsService.adminFindRequest(id);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Admin: update follow-up on a consultation request.',
    description:
      'Set status (NEW, CONTACTED, SCHEDULED, COMPLETED, CANCELLED), the agreed session date, and internal notes.',
  })
  @ApiOkResponse({ description: 'Consultation request updated.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  @ApiForbiddenResponse({ description: 'Admin access is required.' })
  @ApiNotFoundResponse({ description: 'Consultation request not found.' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateDto: UpdateConsultationRequestDto,
  ) {
    return this.consultationsService.adminUpdateRequest(id, updateDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Admin: hard delete one consultation request.' })
  @ApiOkResponse({
    description: 'Consultation request deleted successfully.',
  })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  @ApiForbiddenResponse({ description: 'Admin access is required.' })
  @ApiNotFoundResponse({ description: 'Consultation request not found.' })
  delete(@Param('id', ParseUUIDPipe) id: string) {
    return this.consultationsService.adminDeleteRequest(id);
  }
}
