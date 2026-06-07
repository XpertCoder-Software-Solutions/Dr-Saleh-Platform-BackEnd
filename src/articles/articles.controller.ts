import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import {
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { ArticlesService } from './articles.service';
import { ArticleQueryDto } from './dto/article-query.dto';
import { LangQueryDto } from './dto/lang-query.dto';

@ApiTags('Articles')
@Controller('articles')
export class ArticlesController {
  constructor(private readonly articlesService: ArticlesService) {}

  @Get()
  @ApiOperation({
    summary: 'List active articles.',
    description:
      'Supports pagination, lang, categoryId, tagId, search, isFeatured, and isHomeDisplay filters. Results are newest first.',
  })
  @ApiOkResponse({ description: 'Articles returned.' })
  findAll(@Query() query: ArticleQueryDto) {
    return this.articlesService.findArticles(query);
  }

  @Get('slug/:slug')
  @ApiOperation({
    summary: 'Get one active article by slug and increment viewsCount.',
  })
  @ApiOkResponse({ description: 'Article returned.' })
  @ApiNotFoundResponse({ description: 'Article not found.' })
  findBySlug(@Param('slug') slug: string, @Query() query: LangQueryDto) {
    return this.articlesService.findArticleBySlug(slug, query);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get one active article by id and increment viewsCount.',
  })
  @ApiOkResponse({ description: 'Article returned.' })
  @ApiNotFoundResponse({ description: 'Article not found.' })
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: LangQueryDto,
  ) {
    return this.articlesService.findArticleById(id, query);
  }
}
