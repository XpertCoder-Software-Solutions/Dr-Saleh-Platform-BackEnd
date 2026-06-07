import { Module } from '@nestjs/common';
import { PrismaModule } from '../database/prisma.module';
import { AdminArticleCategoriesController } from './admin-article-categories.controller';
import { AdminArticleTagsController } from './admin-article-tags.controller';
import { AdminArticlesController } from './admin-articles.controller';
import { ArticleCategoriesController } from './article-categories.controller';
import { ArticleTagsController } from './article-tags.controller';
import { ArticlesController } from './articles.controller';
import { ArticlesService } from './articles.service';

@Module({
  imports: [PrismaModule],
  controllers: [
    ArticleCategoriesController,
    ArticleTagsController,
    ArticlesController,
    AdminArticleCategoriesController,
    AdminArticleTagsController,
    AdminArticlesController,
  ],
  providers: [ArticlesService],
})
export class ArticlesModule {}
