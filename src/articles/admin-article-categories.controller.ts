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
import { CreateArticleCategoryDto } from './dto/create-article-category.dto';
import { UpdateArticleCategoryDto } from './dto/update-article-category.dto';

@ApiTags('Admin Article Categories')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, AdminGuard)
@Controller('admin/article-categories')
export class AdminArticleCategoriesController {
  constructor(private readonly articlesService: ArticlesService) {}

  @Get()
  @ApiOperation({ summary: 'Admin: list all article categories.' })
  @ApiOkResponse({ description: 'Article categories returned.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  @ApiForbiddenResponse({ description: 'Admin access is required.' })
  findAll() {
    return this.articlesService.adminFindCategories();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Admin: get one article category.' })
  @ApiOkResponse({ description: 'Article category returned.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  @ApiForbiddenResponse({ description: 'Admin access is required.' })
  @ApiNotFoundResponse({ description: 'Article category not found.' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.articlesService.adminFindCategory(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Admin: create an article category.' })
  @ApiCreatedResponse({ description: 'Article category created successfully.' })
  @ApiBadRequestResponse({ description: 'Invalid request body.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  @ApiForbiddenResponse({ description: 'Admin access is required.' })
  create(@Body() createArticleCategoryDto: CreateArticleCategoryDto) {
    return this.articlesService.adminCreateCategory(createArticleCategoryDto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Admin: update one article category.' })
  @ApiOkResponse({ description: 'Article category updated successfully.' })
  @ApiBadRequestResponse({ description: 'Invalid request body.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  @ApiForbiddenResponse({ description: 'Admin access is required.' })
  @ApiNotFoundResponse({ description: 'Article category not found.' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateArticleCategoryDto: UpdateArticleCategoryDto,
  ) {
    return this.articlesService.adminUpdateCategory(
      id,
      updateArticleCategoryDto,
    );
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Admin: hard delete an article category without articles.',
  })
  @ApiOkResponse({ description: 'Article category deleted successfully.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  @ApiForbiddenResponse({ description: 'Admin access is required.' })
  @ApiNotFoundResponse({ description: 'Article category not found.' })
  @ApiConflictResponse({
    description: 'Category has related articles. Set isActive=false instead.',
  })
  delete(@Param('id', ParseUUIDPipe) id: string) {
    return this.articlesService.adminDeleteCategory(id);
  }
}
