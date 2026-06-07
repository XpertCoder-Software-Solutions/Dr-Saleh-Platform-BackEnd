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
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
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
  @ApiOperation({ summary: 'Create a book category without image.' })
  @ApiCreatedResponse({ description: 'Book category created successfully.' })
  @ApiBadRequestResponse({ description: 'Invalid request body.' })
  create(@Body() createBookCategoryDto: CreateBookCategoryDto) {
    return this.bookCategoriesService.create(createBookCategoryDto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update one book category.' })
  @ApiOkResponse({ description: 'Book category updated successfully.' })
  @ApiBadRequestResponse({ description: 'Invalid request body.' })
  @ApiNotFoundResponse({ description: 'Book category not found.' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateBookCategoryDto: UpdateBookCategoryDto,
  ) {
    return this.bookCategoriesService.update(id, updateBookCategoryDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Hard delete one book category.' })
  @ApiOkResponse({ description: 'Book category deleted successfully.' })
  @ApiNotFoundResponse({ description: 'Book category not found.' })
  @ApiConflictResponse({
    description: 'Book category has books assigned to it.',
  })
  delete(@Param('id', ParseUUIDPipe) id: string) {
    return this.bookCategoriesService.delete(id);
  }
}
