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
import { ArticlesService } from './articles.service';
import { CreateArticleTagDto } from './dto/create-article-tag.dto';
import { UpdateArticleTagDto } from './dto/update-article-tag.dto';

@ApiTags('Admin Article Tags')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, AdminGuard)
@Controller('admin/article-tags')
export class AdminArticleTagsController {
  constructor(private readonly articlesService: ArticlesService) {}

  @Get()
  @ApiOperation({ summary: 'Admin: list all article tags.' })
  @ApiOkResponse({ description: 'Article tags returned.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  @ApiForbiddenResponse({ description: 'Admin access is required.' })
  findAll() {
    return this.articlesService.adminFindTags();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Admin: get one article tag.' })
  @ApiOkResponse({ description: 'Article tag returned.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  @ApiForbiddenResponse({ description: 'Admin access is required.' })
  @ApiNotFoundResponse({ description: 'Article tag not found.' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.articlesService.adminFindTag(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Admin: create an article tag.' })
  @ApiCreatedResponse({ description: 'Article tag created successfully.' })
  @ApiBadRequestResponse({ description: 'Invalid request body.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  @ApiForbiddenResponse({ description: 'Admin access is required.' })
  create(@Body() createArticleTagDto: CreateArticleTagDto) {
    return this.articlesService.adminCreateTag(createArticleTagDto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Admin: update one article tag.' })
  @ApiOkResponse({ description: 'Article tag updated successfully.' })
  @ApiBadRequestResponse({ description: 'Invalid request body.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  @ApiForbiddenResponse({ description: 'Admin access is required.' })
  @ApiNotFoundResponse({ description: 'Article tag not found.' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateArticleTagDto: UpdateArticleTagDto,
  ) {
    return this.articlesService.adminUpdateTag(id, updateArticleTagDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Admin: hard delete an unused article tag.' })
  @ApiOkResponse({ description: 'Article tag deleted successfully.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  @ApiForbiddenResponse({ description: 'Admin access is required.' })
  @ApiNotFoundResponse({ description: 'Article tag not found.' })
  @ApiConflictResponse({
    description: 'Tag is used by articles.',
  })
  delete(@Param('id', ParseUUIDPipe) id: string) {
    return this.articlesService.adminDeleteTag(id);
  }
}
