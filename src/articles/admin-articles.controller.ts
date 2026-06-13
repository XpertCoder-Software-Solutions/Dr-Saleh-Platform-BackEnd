import {
  BadRequestException,
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
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { randomUUID } from 'crypto';
import { mkdirSync } from 'fs';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { AdminGuard } from '../auth/admin.guard';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AuditAction } from '../audit-logs/audit-action.decorator';
import {
  AuditActions,
  AuditEntityTypes,
} from '../audit-logs/audit-log.constants';
import { ArticlesService } from './articles.service';
import { AdminArticleQueryDto } from './dto/article-query.dto';
import { CreateArticleDto } from './dto/create-article.dto';
import { UpdateArticleDto } from './dto/update-article.dto';

const articleCoversUploadDirectory = join(
  process.cwd(),
  'uploads',
  'articles',
  'covers',
);
const allowedImageExtensions = new Set(['.jpg', '.jpeg', '.png', '.webp']);
const allowedImageMimeTypes = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
]);

@ApiTags('Admin Articles')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, AdminGuard)
@Controller('admin/articles')
export class AdminArticlesController {
  constructor(private readonly articlesService: ArticlesService) {}

  @Get()
  @ApiOperation({
    summary: 'Admin: list all articles.',
    description:
      'Supports pagination, active/inactive filtering, categoryId, tagId, search, isFeatured, and isHomeDisplay filters. Results are newest first.',
  })
  @ApiOkResponse({ description: 'Articles returned.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  @ApiForbiddenResponse({ description: 'Admin access is required.' })
  findAll(@Query() query: AdminArticleQueryDto) {
    return this.articlesService.adminFindArticles(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Admin: get one article.' })
  @ApiOkResponse({ description: 'Article returned.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  @ApiForbiddenResponse({ description: 'Admin access is required.' })
  @ApiNotFoundResponse({ description: 'Article not found.' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.articlesService.adminFindArticle(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @AuditAction({
    action: AuditActions.ArticleCreated,
    entityType: AuditEntityTypes.Article,
    entityIdResponsePath: 'data.article.id',
    description: 'Admin created an article.',
  })
  @UseInterceptors(
    FileInterceptor('coverImage', {
      storage: imageDiskStorage(articleCoversUploadDirectory),
      limits: { fileSize: 2 * 1024 * 1024 },
      fileFilter: imageFileFilter,
    }),
  )
  @ApiOperation({ summary: 'Admin: create an article with a cover image.' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: createArticleMultipartSchema(true) })
  @ApiCreatedResponse({ description: 'Article created successfully.' })
  @ApiBadRequestResponse({ description: 'Invalid article data or image.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  @ApiForbiddenResponse({ description: 'Admin access is required.' })
  create(
    @Body() createArticleDto: CreateArticleDto,
    @UploadedFile() coverImage?: Express.Multer.File,
  ) {
    if (!coverImage) {
      throw new BadRequestException('coverImage is required.');
    }

    return this.articlesService.adminCreateArticle(
      createArticleDto,
      `/uploads/articles/covers/${coverImage.filename}`,
    );
  }

  @Patch(':id')
  @AuditAction({
    action: AuditActions.ArticleUpdated,
    entityType: AuditEntityTypes.Article,
    entityIdParam: 'id',
    description: 'Admin updated an article.',
  })
  @UseInterceptors(
    FileInterceptor('coverImage', {
      storage: imageDiskStorage(articleCoversUploadDirectory),
      limits: { fileSize: 2 * 1024 * 1024 },
      fileFilter: imageFileFilter,
    }),
  )
  @ApiOperation({
    summary:
      'Admin: update an article. Existing cover remains when coverImage is omitted.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: createArticleMultipartSchema(false) })
  @ApiOkResponse({ description: 'Article updated successfully.' })
  @ApiBadRequestResponse({ description: 'Invalid article data or image.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  @ApiForbiddenResponse({ description: 'Admin access is required.' })
  @ApiNotFoundResponse({ description: 'Article not found.' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateArticleDto: UpdateArticleDto,
    @UploadedFile() coverImage?: Express.Multer.File,
  ) {
    return this.articlesService.adminUpdateArticle(
      id,
      updateArticleDto,
      coverImage
        ? `/uploads/articles/covers/${coverImage.filename}`
        : undefined,
    );
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @AuditAction({
    action: AuditActions.ArticleDeleted,
    entityType: AuditEntityTypes.Article,
    entityIdParam: 'id',
    description: 'Admin deleted an article.',
  })
  @ApiOperation({ summary: 'Admin: hard delete one article.' })
  @ApiOkResponse({ description: 'Article deleted successfully.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  @ApiForbiddenResponse({ description: 'Admin access is required.' })
  @ApiNotFoundResponse({ description: 'Article not found.' })
  delete(@Param('id', ParseUUIDPipe) id: string) {
    return this.articlesService.adminDeleteArticle(id);
  }
}

function imageDiskStorage(destination: string) {
  return diskStorage({
    destination: (_request, _file, callback) => {
      mkdirSync(destination, { recursive: true });
      callback(null, destination);
    },
    filename: (_request, file, callback) => {
      const extension = extname(file.originalname).toLowerCase();
      callback(null, `${randomUUID()}${extension}`);
    },
  });
}

function imageFileFilter(
  _request: unknown,
  file: Express.Multer.File,
  callback: (error: Error | null, acceptFile: boolean) => void,
): void {
  const extension = extname(file.originalname).toLowerCase();

  if (
    !allowedImageExtensions.has(extension) ||
    !allowedImageMimeTypes.has(file.mimetype)
  ) {
    callback(
      new BadRequestException('Image must be a jpg, jpeg, png, or webp file.'),
      false,
    );
    return;
  }

  callback(null, true);
}

function createArticleMultipartSchema(isCreate: boolean) {
  return {
    type: 'object',
    properties: {
      categoryId: { type: 'string', format: 'uuid' },
      titleAr: { type: 'string' },
      titleEn: { type: 'string' },
      slug: {
        type: 'string',
        description: 'Optional. Generated from titleEn when omitted.',
      },
      shortContentAr: { type: 'string' },
      shortContentEn: { type: 'string' },
      contentAr: { type: 'string' },
      contentEn: { type: 'string' },
      tagIds: {
        oneOf: [
          {
            type: 'array',
            items: { type: 'string', format: 'uuid' },
          },
          {
            type: 'string',
            example: '["e75d1f63-784e-4834-9125-d73b4cbff5cf"]',
          },
        ],
        description: 'Optional array or JSON string array of article tag IDs.',
      },
      isFeatured: { type: 'boolean' },
      isHomeDisplay: { type: 'boolean' },
      isActive: { type: 'boolean' },
      coverImage: {
        type: 'string',
        format: 'binary',
      },
    },
    required: isCreate
      ? [
          'categoryId',
          'titleAr',
          'titleEn',
          'shortContentAr',
          'shortContentEn',
          'contentAr',
          'contentEn',
          'coverImage',
        ]
      : [],
  };
}
