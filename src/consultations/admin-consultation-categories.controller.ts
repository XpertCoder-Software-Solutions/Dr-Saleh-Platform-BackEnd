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
import { ConsultationsService } from './consultations.service';
import { CreateConsultationCategoryDto } from './dto/create-consultation-category.dto';
import { UpdateConsultationCategoryDto } from './dto/update-consultation-category.dto';

@ApiTags('Admin Consultations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, AdminGuard)
@Controller('admin/consultation-categories')
export class AdminConsultationCategoriesController {
  constructor(private readonly consultationsService: ConsultationsService) {}

  @Get()
  @ApiOperation({ summary: 'Admin: list all consultation categories.' })
  @ApiOkResponse({ description: 'Consultation categories returned.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  @ApiForbiddenResponse({ description: 'Admin access is required.' })
  findAll() {
    return this.consultationsService.adminFindCategories();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Admin: get one consultation category.' })
  @ApiOkResponse({ description: 'Consultation category returned.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  @ApiForbiddenResponse({ description: 'Admin access is required.' })
  @ApiNotFoundResponse({ description: 'Consultation category not found.' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.consultationsService.adminFindCategory(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Admin: create a consultation category.' })
  @ApiCreatedResponse({
    description: 'Consultation category created successfully.',
  })
  @ApiBadRequestResponse({ description: 'Invalid request body.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  @ApiForbiddenResponse({ description: 'Admin access is required.' })
  create(@Body() createConsultationCategoryDto: CreateConsultationCategoryDto) {
    return this.consultationsService.adminCreateCategory(
      createConsultationCategoryDto,
    );
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Admin: update one consultation category.' })
  @ApiOkResponse({
    description: 'Consultation category updated successfully.',
  })
  @ApiBadRequestResponse({ description: 'Invalid request body.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  @ApiForbiddenResponse({ description: 'Admin access is required.' })
  @ApiNotFoundResponse({ description: 'Consultation category not found.' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateConsultationCategoryDto: UpdateConsultationCategoryDto,
  ) {
    return this.consultationsService.adminUpdateCategory(
      id,
      updateConsultationCategoryDto,
    );
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Admin: hard delete a consultation category without requests.',
  })
  @ApiOkResponse({
    description: 'Consultation category deleted successfully.',
  })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  @ApiForbiddenResponse({ description: 'Admin access is required.' })
  @ApiNotFoundResponse({ description: 'Consultation category not found.' })
  @ApiConflictResponse({
    description: 'Category has related requests. Set isActive=false instead.',
  })
  delete(@Param('id', ParseUUIDPipe) id: string) {
    return this.consultationsService.adminDeleteCategory(id);
  }
}
