import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import {
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { LangQueryDto } from './dto/lang-query.dto';
import { ProductQueryDto } from './dto/product-query.dto';
import { ProductsService } from './products.service';

@ApiTags('Products')
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  @ApiOperation({
    summary: 'List active products.',
    description:
      'Supports pagination, lang, categoryId, search, isFeatured, and isHomeDisplay filters. Results are newest first.',
  })
  @ApiOkResponse({ description: 'Products returned.' })
  findAll(@Query() query: ProductQueryDto) {
    return this.productsService.findProducts(query);
  }

  @Get('slug/:slug')
  @ApiOperation({ summary: 'Get one active product by slug.' })
  @ApiOkResponse({ description: 'Product returned.' })
  @ApiNotFoundResponse({ description: 'Product not found.' })
  findBySlug(@Param('slug') slug: string, @Query() query: LangQueryDto) {
    return this.productsService.findProductBySlug(slug, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get one active product by id.' })
  @ApiOkResponse({ description: 'Product returned.' })
  @ApiNotFoundResponse({ description: 'Product not found.' })
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: LangQueryDto,
  ) {
    return this.productsService.findProductById(id, query);
  }
}
