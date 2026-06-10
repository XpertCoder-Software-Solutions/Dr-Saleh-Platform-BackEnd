import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { unlink } from 'fs/promises';
import { resolve } from 'path';
import {
  buildPaginationMeta,
  getPaginationParams,
} from '../common/utils/pagination';
import { isPrismaUniqueConstraintError } from '../common/utils/prisma-errors';
import { PrismaService } from '../database/prisma.service';
import { AdminArticleQueryDto, ArticleQueryDto } from './dto/article-query.dto';
import { CreateArticleCategoryDto } from './dto/create-article-category.dto';
import { CreateArticleTagDto } from './dto/create-article-tag.dto';
import { CreateArticleDto } from './dto/create-article.dto';
import { ArticleLanguage, LangQueryDto } from './dto/lang-query.dto';
import { UpdateArticleCategoryDto } from './dto/update-article-category.dto';
import { UpdateArticleTagDto } from './dto/update-article-tag.dto';
import { UpdateArticleDto } from './dto/update-article.dto';

const articleCategorySelect = {
  id: true,
  nameAr: true,
  nameEn: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.ArticleCategorySelect;

const articleTagSelect = {
  id: true,
  nameAr: true,
  nameEn: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.ArticleTagSelect;

const articleSelect = {
  id: true,
  categoryId: true,
  titleAr: true,
  titleEn: true,
  slug: true,
  shortContentAr: true,
  shortContentEn: true,
  contentAr: true,
  contentEn: true,
  coverImage: true,
  viewsCount: true,
  isFeatured: true,
  isHomeDisplay: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
  category: {
    select: articleCategorySelect,
  },
  tagRelations: {
    select: {
      tag: {
        select: articleTagSelect,
      },
    },
  },
} satisfies Prisma.ArticleSelect;

type ArticleCategoryRecord = Prisma.ArticleCategoryGetPayload<{
  select: typeof articleCategorySelect;
}>;

type ArticleTagRecord = Prisma.ArticleTagGetPayload<{
  select: typeof articleTagSelect;
}>;

type ArticleRecord = Prisma.ArticleGetPayload<{ select: typeof articleSelect }>;
type EmptyData = Record<string, never>;

@Injectable()
export class ArticlesService {
  private readonly uploadsRoot = resolve(process.cwd(), 'uploads');

  constructor(private readonly prisma: PrismaService) {}

  async findActiveCategories(query: LangQueryDto) {
    const categories = await this.prisma.articleCategory.findMany({
      where: { isActive: true },
      select: articleCategorySelect,
      orderBy: this.getLocalizedOrderBy(query.lang),
    });

    return categories.map((category) =>
      this.toPublicCategory(category, query.lang),
    );
  }

  adminFindCategories() {
    return this.prisma.articleCategory.findMany({
      select: articleCategorySelect,
      orderBy: { createdAt: 'desc' },
    });
  }

  async adminFindCategory(id: string) {
    return this.findCategoryOrThrow(id);
  }

  async adminCreateCategory(
    createArticleCategoryDto: CreateArticleCategoryDto,
  ) {
    const category = await this.prisma.articleCategory.create({
      data: {
        nameAr: createArticleCategoryDto.nameAr,
        nameEn: createArticleCategoryDto.nameEn,
        isActive: createArticleCategoryDto.isActive ?? true,
      },
      select: articleCategorySelect,
    });

    return {
      message: 'Article category created successfully',
      data: { category },
    };
  }

  async adminUpdateCategory(
    id: string,
    updateArticleCategoryDto: UpdateArticleCategoryDto,
  ) {
    await this.findCategoryOrThrow(id);

    const category = await this.prisma.articleCategory.update({
      where: { id },
      data: {
        nameAr: updateArticleCategoryDto.nameAr,
        nameEn: updateArticleCategoryDto.nameEn,
        isActive: updateArticleCategoryDto.isActive,
      },
      select: articleCategorySelect,
    });

    return {
      message: 'Article category updated successfully',
      data: { category },
    };
  }

  async adminDeleteCategory(
    id: string,
  ): Promise<{ message: string; data: EmptyData }> {
    await this.findCategoryOrThrow(id);

    const articlesCount = await this.prisma.article.count({
      where: { categoryId: id },
    });

    if (articlesCount > 0) {
      throw new ConflictException(
        'Article category cannot be deleted while articles are assigned to it. Set isActive to false instead.',
      );
    }

    await this.prisma.articleCategory.delete({ where: { id } });

    return {
      message: 'Article category deleted successfully',
      data: {},
    };
  }

  async findTags(query: LangQueryDto) {
    const tags = await this.prisma.articleTag.findMany({
      select: articleTagSelect,
      orderBy: this.getLocalizedOrderBy(query.lang),
    });

    return tags.map((tag) => this.toPublicTag(tag, query.lang));
  }

  adminFindTags() {
    return this.prisma.articleTag.findMany({
      select: articleTagSelect,
      orderBy: { createdAt: 'desc' },
    });
  }

  async adminFindTag(id: string) {
    return this.findTagOrThrow(id);
  }

  async adminCreateTag(createArticleTagDto: CreateArticleTagDto) {
    const tag = await this.prisma.articleTag.create({
      data: {
        nameAr: createArticleTagDto.nameAr,
        nameEn: createArticleTagDto.nameEn,
      },
      select: articleTagSelect,
    });

    return {
      message: 'Article tag created successfully',
      data: { tag },
    };
  }

  async adminUpdateTag(id: string, updateArticleTagDto: UpdateArticleTagDto) {
    await this.findTagOrThrow(id);

    const tag = await this.prisma.articleTag.update({
      where: { id },
      data: {
        nameAr: updateArticleTagDto.nameAr,
        nameEn: updateArticleTagDto.nameEn,
      },
      select: articleTagSelect,
    });

    return {
      message: 'Article tag updated successfully',
      data: { tag },
    };
  }

  async adminDeleteTag(
    id: string,
  ): Promise<{ message: string; data: EmptyData }> {
    await this.findTagOrThrow(id);

    const articlesCount = await this.prisma.articleTagRelation.count({
      where: { tagId: id },
    });

    if (articlesCount > 0) {
      throw new ConflictException(
        'Article tag cannot be deleted while articles are using it.',
      );
    }

    await this.prisma.articleTag.delete({ where: { id } });

    return {
      message: 'Article tag deleted successfully',
      data: {},
    };
  }

  async findArticles(query: ArticleQueryDto) {
    const { page, limit, skip } = getPaginationParams(query);
    const where = this.buildPublicArticlesWhere(query);

    const [total, articles] = await this.prisma.$transaction([
      this.prisma.article.count({ where }),
      this.prisma.article.findMany({
        where,
        select: articleSelect,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    return {
      message: 'Articles returned successfully',
      data: {
        articles: articles.map((article) =>
          this.toPublicArticle(article, query.lang),
        ),
        meta: buildPaginationMeta(page, limit, total),
      },
    };
  }

  async findArticleById(id: string, query: LangQueryDto) {
    const article = await this.incrementViewsAndFindPublicArticle({
      id,
    });

    return this.toPublicArticle(article, query.lang);
  }

  async findArticleBySlug(slug: string, query: LangQueryDto) {
    const article = await this.incrementViewsAndFindPublicArticle({
      slug,
    });

    return this.toPublicArticle(article, query.lang);
  }

  async adminFindArticles(query: AdminArticleQueryDto) {
    const { page, limit, skip } = getPaginationParams(query);
    const where = this.buildAdminArticlesWhere(query);

    const [total, articles] = await this.prisma.$transaction([
      this.prisma.article.count({ where }),
      this.prisma.article.findMany({
        where,
        select: articleSelect,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    return {
      message: 'Articles returned successfully',
      data: {
        articles: articles.map((article) => this.toArticle(article)),
        meta: buildPaginationMeta(page, limit, total),
      },
    };
  }

  async adminFindArticle(id: string) {
    const article = await this.findArticleOrThrow(id);

    return this.toArticle(article);
  }

  async adminCreateArticle(
    createArticleDto: CreateArticleDto,
    coverImagePath: string,
  ) {
    try {
      await this.ensureCategoryExists(createArticleDto.categoryId);
      const tagIds = await this.validateTagIds(createArticleDto.tagIds);
      const slug = await this.generateUniqueSlug(
        createArticleDto.slug ?? createArticleDto.titleEn,
      );

      const article = await this.prisma.$transaction(async (tx) => {
        const createdArticle = await tx.article.create({
          data: {
            categoryId: createArticleDto.categoryId,
            titleAr: createArticleDto.titleAr,
            titleEn: createArticleDto.titleEn,
            slug,
            shortContentAr: createArticleDto.shortContentAr,
            shortContentEn: createArticleDto.shortContentEn,
            contentAr: createArticleDto.contentAr,
            contentEn: createArticleDto.contentEn,
            coverImage: coverImagePath,
            isFeatured: createArticleDto.isFeatured ?? false,
            isHomeDisplay: createArticleDto.isHomeDisplay ?? false,
            isActive: createArticleDto.isActive ?? true,
          },
          select: { id: true },
        });

        if (tagIds.length > 0) {
          await tx.articleTagRelation.createMany({
            data: tagIds.map((tagId) => ({
              articleId: createdArticle.id,
              tagId,
            })),
          });
        }

        return tx.article.findUniqueOrThrow({
          where: { id: createdArticle.id },
          select: articleSelect,
        });
      });

      return {
        message: 'Article created successfully',
        data: {
          article: this.toArticle(article),
        },
      };
    } catch (error) {
      await this.deleteLocalUpload(coverImagePath);
      this.handleUniqueConstraintError(error);
    }
  }

  async adminUpdateArticle(
    id: string,
    updateArticleDto: UpdateArticleDto,
    coverImagePath?: string,
  ) {
    const currentArticle = await this.prisma.article.findUnique({
      where: { id },
      select: {
        id: true,
        coverImage: true,
      },
    });

    if (!currentArticle) {
      await this.deleteLocalUpload(coverImagePath);
      throw new NotFoundException('Article not found.');
    }

    try {
      if (updateArticleDto.categoryId !== undefined) {
        await this.ensureCategoryExists(updateArticleDto.categoryId);
      }

      const tagIds =
        updateArticleDto.tagIds === undefined
          ? undefined
          : await this.validateTagIds(updateArticleDto.tagIds);
      const data: Prisma.ArticleUpdateInput = {};

      if (updateArticleDto.categoryId !== undefined) {
        data.category = { connect: { id: updateArticleDto.categoryId } };
      }

      if (updateArticleDto.titleAr !== undefined) {
        data.titleAr = updateArticleDto.titleAr;
      }

      if (updateArticleDto.titleEn !== undefined) {
        data.titleEn = updateArticleDto.titleEn;
      }

      if (updateArticleDto.slug !== undefined) {
        data.slug = await this.generateUniqueSlug(updateArticleDto.slug, id);
      }

      if (updateArticleDto.shortContentAr !== undefined) {
        data.shortContentAr = updateArticleDto.shortContentAr;
      }

      if (updateArticleDto.shortContentEn !== undefined) {
        data.shortContentEn = updateArticleDto.shortContentEn;
      }

      if (updateArticleDto.contentAr !== undefined) {
        data.contentAr = updateArticleDto.contentAr;
      }

      if (updateArticleDto.contentEn !== undefined) {
        data.contentEn = updateArticleDto.contentEn;
      }

      if (coverImagePath) {
        data.coverImage = coverImagePath;
      }

      if (updateArticleDto.isFeatured !== undefined) {
        data.isFeatured = updateArticleDto.isFeatured;
      }

      if (updateArticleDto.isHomeDisplay !== undefined) {
        data.isHomeDisplay = updateArticleDto.isHomeDisplay;
      }

      if (updateArticleDto.isActive !== undefined) {
        data.isActive = updateArticleDto.isActive;
      }

      const article = await this.prisma.$transaction(async (tx) => {
        await tx.article.update({
          where: { id },
          data,
          select: { id: true },
        });

        if (tagIds !== undefined) {
          await tx.articleTagRelation.deleteMany({
            where: { articleId: id },
          });

          if (tagIds.length > 0) {
            await tx.articleTagRelation.createMany({
              data: tagIds.map((tagId) => ({
                articleId: id,
                tagId,
              })),
            });
          }
        }

        return tx.article.findUniqueOrThrow({
          where: { id },
          select: articleSelect,
        });
      });

      if (coverImagePath) {
        await this.deleteLocalUpload(currentArticle.coverImage);
      }

      return {
        message: 'Article updated successfully',
        data: {
          article: this.toArticle(article),
        },
      };
    } catch (error) {
      await this.deleteLocalUpload(coverImagePath);
      this.handleUniqueConstraintError(error);
    }
  }

  async adminDeleteArticle(
    id: string,
  ): Promise<{ message: string; data: EmptyData }> {
    const article = await this.prisma.article.findUnique({
      where: { id },
      select: {
        id: true,
        coverImage: true,
      },
    });

    if (!article) {
      throw new NotFoundException('Article not found.');
    }

    await this.prisma.$transaction([
      this.prisma.articleTagRelation.deleteMany({ where: { articleId: id } }),
      this.prisma.article.delete({ where: { id } }),
    ]);

    await this.deleteLocalUpload(article.coverImage);

    return {
      message: 'Article deleted successfully',
      data: {},
    };
  }

  private async incrementViewsAndFindPublicArticle(where: {
    id?: string;
    slug?: string;
  }): Promise<ArticleRecord> {
    const article = await this.prisma.article.findFirst({
      where: {
        ...where,
        isActive: true,
      },
      select: { id: true },
    });

    if (!article) {
      throw new NotFoundException('Article not found.');
    }

    return this.prisma.article.update({
      where: { id: article.id },
      data: {
        viewsCount: {
          increment: 1,
        },
      },
      select: articleSelect,
    });
  }

  private async findCategoryOrThrow(
    id: string,
  ): Promise<ArticleCategoryRecord> {
    const category = await this.prisma.articleCategory.findUnique({
      where: { id },
      select: articleCategorySelect,
    });

    if (!category) {
      throw new NotFoundException('Article category not found.');
    }

    return category;
  }

  private async findTagOrThrow(id: string): Promise<ArticleTagRecord> {
    const tag = await this.prisma.articleTag.findUnique({
      where: { id },
      select: articleTagSelect,
    });

    if (!tag) {
      throw new NotFoundException('Article tag not found.');
    }

    return tag;
  }

  private async findArticleOrThrow(id: string): Promise<ArticleRecord> {
    const article = await this.prisma.article.findUnique({
      where: { id },
      select: articleSelect,
    });

    if (!article) {
      throw new NotFoundException('Article not found.');
    }

    return article;
  }

  private async ensureCategoryExists(categoryId: string): Promise<void> {
    const category = await this.prisma.articleCategory.findUnique({
      where: { id: categoryId },
      select: { id: true },
    });

    if (!category) {
      throw new BadRequestException('Article category does not exist.');
    }
  }

  private async validateTagIds(tagIds?: string[]): Promise<string[]> {
    const uniqueTagIds = this.getUniqueValues(tagIds ?? []);

    if (uniqueTagIds.length === 0) {
      return [];
    }

    const tags = await this.prisma.articleTag.findMany({
      where: {
        id: {
          in: uniqueTagIds,
        },
      },
      select: { id: true },
    });

    if (tags.length !== uniqueTagIds.length) {
      throw new BadRequestException('One or more article tags do not exist.');
    }

    return uniqueTagIds;
  }

  private buildPublicArticlesWhere(
    query: ArticleQueryDto,
  ): Prisma.ArticleWhereInput {
    return {
      ...this.buildBaseArticlesWhere(query),
      isActive: true,
    };
  }

  private buildAdminArticlesWhere(
    query: AdminArticleQueryDto,
  ): Prisma.ArticleWhereInput {
    const where = this.buildBaseArticlesWhere(query);

    if (query.isActive !== undefined) {
      where.isActive = query.isActive;
    }

    return where;
  }

  private buildBaseArticlesWhere(
    query: ArticleQueryDto,
  ): Prisma.ArticleWhereInput {
    const where: Prisma.ArticleWhereInput = {};
    const search = query.search?.trim();

    if (query.categoryId) {
      where.categoryId = query.categoryId;
    }

    if (query.tagId) {
      where.tagRelations = {
        some: {
          tagId: query.tagId,
        },
      };
    }

    if (query.isFeatured !== undefined) {
      where.isFeatured = query.isFeatured;
    }

    if (query.isHomeDisplay !== undefined) {
      where.isHomeDisplay = query.isHomeDisplay;
    }

    if (search) {
      where.OR = [
        { titleAr: { contains: search, mode: 'insensitive' } },
        { titleEn: { contains: search, mode: 'insensitive' } },
        { shortContentAr: { contains: search, mode: 'insensitive' } },
        { shortContentEn: { contains: search, mode: 'insensitive' } },
      ];
    }

    return where;
  }

  private async generateUniqueSlug(
    source: string,
    excludedArticleId?: string,
  ): Promise<string> {
    const baseSlug = this.slugify(source);
    let slug = baseSlug;
    let suffix = 2;

    while (await this.articleSlugExists(slug, excludedArticleId)) {
      slug = `${baseSlug}-${suffix}`;
      suffix += 1;
    }

    return slug;
  }

  private articleSlugExists(
    slug: string,
    excludedArticleId?: string,
  ): Promise<{ id: string } | null> {
    return this.prisma.article.findFirst({
      where: {
        slug,
        ...(excludedArticleId ? { id: { not: excludedArticleId } } : {}),
      },
      select: { id: true },
    });
  }

  private slugify(value: string): string {
    const slug = value
      .trim()
      .toLowerCase()
      .replace(/['"]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    return slug || 'article';
  }

  private toArticle(article: ArticleRecord) {
    return {
      id: article.id,
      categoryId: article.categoryId,
      titleAr: article.titleAr,
      titleEn: article.titleEn,
      slug: article.slug,
      shortContentAr: article.shortContentAr,
      shortContentEn: article.shortContentEn,
      contentAr: article.contentAr,
      contentEn: article.contentEn,
      coverImage: article.coverImage,
      viewsCount: article.viewsCount,
      isFeatured: article.isFeatured,
      isHomeDisplay: article.isHomeDisplay,
      isActive: article.isActive,
      createdAt: article.createdAt,
      updatedAt: article.updatedAt,
      category: article.category,
      tags: article.tagRelations.map((relation) => relation.tag),
    };
  }

  private toPublicArticle(article: ArticleRecord, language?: ArticleLanguage) {
    return {
      id: article.id,
      title: this.getLocalizedValue(
        {
          ar: article.titleAr,
          en: article.titleEn,
        },
        language,
      ),
      shortContent: this.getLocalizedValue(
        {
          ar: article.shortContentAr,
          en: article.shortContentEn,
        },
        language,
      ),
      content: this.getLocalizedValue(
        {
          ar: article.contentAr,
          en: article.contentEn,
        },
        language,
      ),
      coverImage: article.coverImage,
      slug: article.slug,
      viewsCount: article.viewsCount,
      isFeatured: article.isFeatured,
      isHomeDisplay: article.isHomeDisplay,
      category: this.toPublicCategory(article.category, language),
      tags: article.tagRelations.map((relation) =>
        this.toPublicTag(relation.tag, language),
      ),
      createdAt: article.createdAt,
    };
  }

  private toPublicCategory(
    category: ArticleCategoryRecord,
    language?: ArticleLanguage,
  ) {
    return {
      id: category.id,
      name: this.getLocalizedName(category, language),
      nameAr: category.nameAr,
      nameEn: category.nameEn,
    };
  }

  private toPublicTag(tag: ArticleTagRecord, language?: ArticleLanguage) {
    return {
      id: tag.id,
      name: this.getLocalizedName(tag, language),
      nameAr: tag.nameAr,
      nameEn: tag.nameEn,
    };
  }

  private getLocalizedName(
    record: { nameAr: string; nameEn: string },
    language?: ArticleLanguage,
  ): string {
    return language === ArticleLanguage.Arabic ? record.nameAr : record.nameEn;
  }

  private getLocalizedValue(
    record: { ar: string; en: string },
    language?: ArticleLanguage,
  ): string {
    return language === ArticleLanguage.Arabic ? record.ar : record.en;
  }

  private getLocalizedOrderBy(language?: ArticleLanguage) {
    return language === ArticleLanguage.Arabic
      ? { nameAr: 'asc' as const }
      : { nameEn: 'asc' as const };
  }

  private getUniqueValues(values: string[]): string[] {
    return Array.from(new Set(values));
  }

  private async deleteLocalUpload(relativePath?: string | null): Promise<void> {
    if (!relativePath?.startsWith('/uploads/')) {
      return;
    }

    const absolutePath = resolve(
      process.cwd(),
      relativePath.replace(/^\//, ''),
    );

    if (!absolutePath.startsWith(this.uploadsRoot)) {
      return;
    }

    try {
      await unlink(absolutePath);
    } catch {
      return;
    }
  }

  private handleUniqueConstraintError(error: unknown): never {
    if (isPrismaUniqueConstraintError(error)) {
      throw new ConflictException('Article slug already exists.');
    }

    throw error;
  }
}
