import { Controller, Get, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ArticlesService } from './articles.service';
import { LangQueryDto } from './dto/lang-query.dto';

@ApiTags('Article Tags')
@Controller('article-tags')
export class ArticleTagsController {
  constructor(private readonly articlesService: ArticlesService) {}

  @Get()
  @ApiOperation({
    summary: 'List article tags.',
    description: 'Use lang=ar or lang=en to choose the localized name field.',
  })
  @ApiOkResponse({ description: 'Article tags returned.' })
  findAll(@Query() query: LangQueryDto) {
    return this.articlesService.findTags(query);
  }
}
