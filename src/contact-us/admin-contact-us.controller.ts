import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
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
import { ContactUsService } from './contact-us.service';
import { AdminContactQueryDto } from './dto/admin-contact-query.dto';

@ApiTags('Admin Contact Us')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, AdminGuard)
@Controller('admin/contact-us')
export class AdminContactUsController {
  constructor(private readonly contactUsService: ContactUsService) {}

  @Get()
  @ApiOperation({
    summary: 'Admin: list contact messages.',
    description:
      'Supports pagination, search by name, email, phone, or message, and newest-first sorting.',
  })
  @ApiOkResponse({ description: 'Contact messages returned.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  @ApiForbiddenResponse({ description: 'Admin access is required.' })
  findAll(@Query() query: AdminContactQueryDto) {
    return this.contactUsService.adminFindAll(query);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Admin: get one contact message and mark it opened.',
  })
  @ApiOkResponse({ description: 'Contact message returned.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  @ApiForbiddenResponse({ description: 'Admin access is required.' })
  @ApiNotFoundResponse({ description: 'Contact message not found.' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.contactUsService.adminFindOne(id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Admin: hard delete one contact message.' })
  @ApiOkResponse({ description: 'Contact message deleted successfully.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  @ApiForbiddenResponse({ description: 'Admin access is required.' })
  @ApiNotFoundResponse({ description: 'Contact message not found.' })
  delete(@Param('id', ParseUUIDPipe) id: string) {
    return this.contactUsService.adminDelete(id);
  }
}
