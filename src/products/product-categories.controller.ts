import { Controller, Get, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { LangQueryDto } from './dto/lang-query.dto';
import { ProductsService } from './products.service';

@ApiTags('Product Categories')
@Controller('product-categories')
export class ProductCategoriesController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  @ApiOperation({
    summary: 'List active product categories.',
    description:
      'Returns active product categories only. Use lang=ar or lang=en to choose the localized name field.',
  })
  @ApiOkResponse({ description: 'Active product categories returned.' })
  findActive(@Query() query: LangQueryDto) {
    return this.productsService.findActiveCategories(query);
  }
}
