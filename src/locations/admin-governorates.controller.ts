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
import { CreateGovernorateDto } from './dto/create-governorate.dto';
import {
  GovernorateApiResponseDto,
  GovernorateDeleteApiResponseDto,
  GovernorateListApiResponseDto,
} from './dto/governorate-response.dto';
import { LocationsQueryDto } from './dto/locations-query.dto';
import { UpdateGovernorateDto } from './dto/update-governorate.dto';
import { LocationsService } from './locations.service';

@ApiTags('Admin Governorates')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, AdminGuard)
@Controller('admin/governorates')
export class AdminGovernoratesController {
  constructor(private readonly locationsService: LocationsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Admin: create a governorate.' })
  @ApiCreatedResponse({
    description: 'Governorate created successfully.',
    type: GovernorateApiResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Invalid request body.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  @ApiForbiddenResponse({ description: 'Admin access is required.' })
  create(@Body() createGovernorateDto: CreateGovernorateDto) {
    return this.locationsService.adminCreateGovernorate(createGovernorateDto);
  }

  @Get()
  @ApiOperation({ summary: 'Admin: list governorates.' })
  @ApiOkResponse({
    description: 'Governorates returned successfully.',
    type: GovernorateListApiResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  @ApiForbiddenResponse({ description: 'Admin access is required.' })
  findAll(@Query() query: LocationsQueryDto) {
    return this.locationsService.adminFindGovernorates(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Admin: get one governorate.' })
  @ApiOkResponse({
    description: 'Governorate returned successfully.',
    type: GovernorateApiResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  @ApiForbiddenResponse({ description: 'Admin access is required.' })
  @ApiNotFoundResponse({ description: 'Governorate not found.' })
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: LocationsQueryDto,
  ) {
    return this.locationsService.adminFindGovernorate(id, query);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Admin: update one governorate.' })
  @ApiOkResponse({
    description: 'Governorate updated successfully.',
    type: GovernorateApiResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Invalid body or no update fields provided.',
  })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  @ApiForbiddenResponse({ description: 'Admin access is required.' })
  @ApiNotFoundResponse({ description: 'Governorate not found.' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateGovernorateDto: UpdateGovernorateDto,
  ) {
    return this.locationsService.adminUpdateGovernorate(
      id,
      updateGovernorateDto,
    );
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Admin: delete one governorate.',
    description:
      'Soft deletes by setting isActive=false so existing addresses and orders remain readable.',
  })
  @ApiOkResponse({
    description: 'Governorate deleted successfully.',
    type: GovernorateDeleteApiResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  @ApiForbiddenResponse({ description: 'Admin access is required.' })
  @ApiNotFoundResponse({ description: 'Governorate not found.' })
  delete(@Param('id', ParseUUIDPipe) id: string) {
    return this.locationsService.adminDeleteGovernorate(id);
  }
}
