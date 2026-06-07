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
import { CreateProductCategoryDto } from './dto/create-product-category.dto';
import { UpdateProductCategoryDto } from './dto/update-product-category.dto';
import { ProductsService } from './products.service';

@ApiTags('Admin Product Categories')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, AdminGuard)
@Controller('admin/product-categories')
export class AdminProductCategoriesController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  @ApiOperation({ summary: 'Admin: list all product categories.' })
  @ApiOkResponse({ description: 'Product categories returned.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  @ApiForbiddenResponse({ description: 'Admin access is required.' })
  findAll() {
    return this.productsService.adminFindCategories();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Admin: get one product category.' })
  @ApiOkResponse({ description: 'Product category returned.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  @ApiForbiddenResponse({ description: 'Admin access is required.' })
  @ApiNotFoundResponse({ description: 'Product category not found.' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.productsService.adminFindCategory(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Admin: create a product category.' })
  @ApiCreatedResponse({ description: 'Product category created successfully.' })
  @ApiBadRequestResponse({ description: 'Invalid request body.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  @ApiForbiddenResponse({ description: 'Admin access is required.' })
  create(@Body() createProductCategoryDto: CreateProductCategoryDto) {
    return this.productsService.adminCreateCategory(createProductCategoryDto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Admin: update one product category.' })
  @ApiOkResponse({ description: 'Product category updated successfully.' })
  @ApiBadRequestResponse({ description: 'Invalid request body.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  @ApiForbiddenResponse({ description: 'Admin access is required.' })
  @ApiNotFoundResponse({ description: 'Product category not found.' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateProductCategoryDto: UpdateProductCategoryDto,
  ) {
    return this.productsService.adminUpdateCategory(
      id,
      updateProductCategoryDto,
    );
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Admin: hard delete a product category without products.',
  })
  @ApiOkResponse({ description: 'Product category deleted successfully.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  @ApiForbiddenResponse({ description: 'Admin access is required.' })
  @ApiNotFoundResponse({ description: 'Product category not found.' })
  @ApiConflictResponse({
    description: 'Category has related products. Set isActive=false instead.',
  })
  delete(@Param('id', ParseUUIDPipe) id: string) {
    return this.productsService.adminDeleteCategory(id);
  }
}
