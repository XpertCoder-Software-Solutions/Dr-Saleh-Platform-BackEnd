import { Controller, Get, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ArticlesService } from './articles.service';
import { LangQueryDto } from './dto/lang-query.dto';

@ApiTags('Article Categories')
@Controller('article-categories')
export class ArticleCategoriesController {
  constructor(private readonly articlesService: ArticlesService) {}

  @Get()
  @ApiOperation({
    summary: 'List active article categories.',
    description:
      'Returns active article categories only. Use lang=ar or lang=en to choose the localized name field.',
  })
  @ApiOkResponse({ description: 'Active article categories returned.' })
  findActive(@Query() query: LangQueryDto) {
    return this.articlesService.findActiveCategories(query);
  }
}
