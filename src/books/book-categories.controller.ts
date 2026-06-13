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
  ApiBearerAuth,
  ApiBadRequestResponse,
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
import { BookCategoriesService } from './book-categories.service';
import { CreateBookCategoryDto } from './dto/create-book-category.dto';
import { UpdateBookCategoryDto } from './dto/update-book-category.dto';

@ApiTags('Book Categories')
@Controller('book-categories')
export class BookCategoriesController {
  constructor(private readonly bookCategoriesService: BookCategoriesService) {}

  @Get()
  @ApiOperation({ summary: 'List book categories.' })
  @ApiOkResponse({ description: 'Book categories returned.' })
  findAll() {
    return this.bookCategoriesService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get one book category.' })
  @ApiOkResponse({ description: 'Book category returned.' })
  @ApiNotFoundResponse({ description: 'Book category not found.' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.bookCategoriesService.findOne(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a book category without image.' })
  @ApiCreatedResponse({ description: 'Book category created successfully.' })
  @ApiBadRequestResponse({ description: 'Invalid request body.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  @ApiForbiddenResponse({ description: 'Admin access is required.' })
  create(@Body() createBookCategoryDto: CreateBookCategoryDto) {
    return this.bookCategoriesService.create(createBookCategoryDto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update one book category.' })
  @ApiOkResponse({ description: 'Book category updated successfully.' })
  @ApiBadRequestResponse({ description: 'Invalid request body.' })
  @ApiNotFoundResponse({ description: 'Book category not found.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  @ApiForbiddenResponse({ description: 'Admin access is required.' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateBookCategoryDto: UpdateBookCategoryDto,
  ) {
    return this.bookCategoriesService.update(id, updateBookCategoryDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Hard delete one book category.' })
  @ApiOkResponse({ description: 'Book category deleted successfully.' })
  @ApiNotFoundResponse({ description: 'Book category not found.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  @ApiForbiddenResponse({ description: 'Admin access is required.' })
  @ApiConflictResponse({
    description: 'Book category has books assigned to it.',
  })
  delete(@Param('id', ParseUUIDPipe) id: string) {
    return this.bookCategoriesService.delete(id);
  }
}
