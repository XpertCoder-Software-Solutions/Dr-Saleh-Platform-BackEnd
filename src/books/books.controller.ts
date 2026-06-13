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
  UploadedFile,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  FileFieldsInterceptor,
  FileInterceptor,
  FilesInterceptor,
} from '@nestjs/platform-express';
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
import { extname, join } from 'path';
import { diskStorage } from 'multer';
import { AdminGuard } from '../auth/admin.guard';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AuditAction } from '../audit-logs/audit-action.decorator';
import {
  AuditActions,
  AuditEntityTypes,
} from '../audit-logs/audit-log.constants';
import { BooksService } from './books.service';
import { CreateBookDto } from './dto/create-book.dto';
import { CreateBookFormatDto } from './dto/create-book-format.dto';
import { CreateBookImagesDto } from './dto/create-book-images.dto';
import { UpdateBookDto } from './dto/update-book.dto';
import { UpdateBookFormatDto } from './dto/update-book-format.dto';
import { UpdateBookImageDto } from './dto/update-book-image.dto';

const bookCoversUploadDirectory = join(
  process.cwd(),
  'uploads',
  'books',
  'covers',
);
const bookImagesUploadDirectory = join(
  process.cwd(),
  'uploads',
  'books',
  'images',
);
const bookDigitalUploadDirectory = join(
  process.cwd(),
  'uploads',
  'books',
  'digital',
);
const bookAudioUploadDirectory = join(
  process.cwd(),
  'uploads',
  'books',
  'audio',
);
const formatFileMaxSizeBytes = 100 * 1024 * 1024;
const allowedImageExtensions = new Set(['.jpg', '.jpeg', '.png', '.webp']);
const allowedImageMimeTypes = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
]);
const allowedReaderExtensions = new Set(['.pdf']);
const allowedReaderMimeTypes = new Set(['application/pdf']);
const allowedAudioExtensions = new Set(['.mp3', '.wav', '.m4a']);
const allowedAudioMimeTypes = new Set([
  'audio/mpeg',
  'audio/mp3',
  'audio/wav',
  'audio/x-wav',
  'audio/mp4',
  'audio/x-m4a',
]);

type BookFormatUploadFiles = {
  readerFile?: Express.Multer.File[];
  audioFile?: Express.Multer.File[];
};

@ApiTags('Books')
@Controller('books')
export class BooksController {
  constructor(private readonly booksService: BooksService) {}

  @Get()
  @ApiOperation({ summary: 'List books.' })
  @ApiOkResponse({ description: 'Books returned.' })
  findAll() {
    return this.booksService.findAll();
  }

  @Get('slug/:slug')
  @ApiOperation({ summary: 'Get one book by slug.' })
  @ApiOkResponse({ description: 'Book returned.' })
  @ApiNotFoundResponse({ description: 'Book not found.' })
  findBySlug(@Param('slug') slug: string) {
    return this.booksService.findBySlug(slug);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get one book by id.' })
  @ApiOkResponse({ description: 'Book returned.' })
  @ApiNotFoundResponse({ description: 'Book not found.' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.booksService.findOne(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(JwtAuthGuard, AdminGuard)
  @AuditAction({
    action: AuditActions.BookCreated,
    entityType: AuditEntityTypes.Book,
    entityIdResponsePath: 'data.book.id',
    description: 'Admin created a book.',
  })
  @UseInterceptors(
    FileInterceptor('coverImage', {
      storage: imageDiskStorage(bookCoversUploadDirectory),
      limits: { fileSize: 2 * 1024 * 1024 },
      fileFilter: imageFileFilter,
    }),
  )
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a book with a required cover image.' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: createBookMultipartSchema(true) })
  @ApiCreatedResponse({ description: 'Book created successfully.' })
  @ApiBadRequestResponse({ description: 'Invalid book data or cover image.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  @ApiForbiddenResponse({ description: 'Admin access is required.' })
  create(
    @Body() createBookDto: CreateBookDto,
    @UploadedFile() coverImage?: Express.Multer.File,
  ) {
    if (!coverImage) {
      throw new BadRequestException('coverImage is required.');
    }

    return this.booksService.create(
      createBookDto,
      `/uploads/books/covers/${coverImage.filename}`,
    );
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @AuditAction({
    action: AuditActions.BookUpdated,
    entityType: AuditEntityTypes.Book,
    entityIdParam: 'id',
    description: 'Admin updated a book.',
  })
  @UseInterceptors(
    FileInterceptor('coverImage', {
      storage: imageDiskStorage(bookCoversUploadDirectory),
      limits: { fileSize: 2 * 1024 * 1024 },
      fileFilter: imageFileFilter,
    }),
  )
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Update a book. Existing cover remains when coverImage is omitted.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: createBookMultipartSchema(false) })
  @ApiOkResponse({ description: 'Book updated successfully.' })
  @ApiBadRequestResponse({ description: 'Invalid book data or cover image.' })
  @ApiNotFoundResponse({ description: 'Book not found.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  @ApiForbiddenResponse({ description: 'Admin access is required.' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateBookDto: UpdateBookDto,
    @UploadedFile() coverImage?: Express.Multer.File,
  ) {
    return this.booksService.update(
      id,
      updateBookDto,
      coverImage ? `/uploads/books/covers/${coverImage.filename}` : undefined,
    );
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, AdminGuard)
  @AuditAction({
    action: AuditActions.BookDeleted,
    entityType: AuditEntityTypes.Book,
    entityIdParam: 'id',
    description: 'Admin deleted a book.',
  })
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Hard delete one book.' })
  @ApiOkResponse({ description: 'Book deleted successfully.' })
  @ApiNotFoundResponse({ description: 'Book not found.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  @ApiForbiddenResponse({ description: 'Admin access is required.' })
  delete(@Param('id', ParseUUIDPipe) id: string) {
    return this.booksService.delete(id);
  }

  @Post(':id/images')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(JwtAuthGuard, AdminGuard)
  @UseInterceptors(
    FilesInterceptor('images', 20, {
      storage: imageDiskStorage(bookImagesUploadDirectory),
      limits: { fileSize: 2 * 1024 * 1024 },
      fileFilter: imageFileFilter,
    }),
  )
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Upload gallery images for one book.' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        displayOrder: {
          type: 'number',
          example: 0,
        },
        images: {
          type: 'array',
          items: {
            type: 'string',
            format: 'binary',
          },
        },
      },
      required: ['images'],
    },
  })
  @ApiCreatedResponse({ description: 'Book images uploaded successfully.' })
  @ApiBadRequestResponse({ description: 'Invalid image upload.' })
  @ApiNotFoundResponse({ description: 'Book not found.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  @ApiForbiddenResponse({ description: 'Admin access is required.' })
  addImages(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() createBookImagesDto: CreateBookImagesDto,
    @UploadedFiles() images?: Express.Multer.File[],
  ) {
    if (!images || images.length === 0) {
      throw new BadRequestException('At least one image is required.');
    }

    return this.booksService.addImages(
      id,
      images.map((image) => `/uploads/books/images/${image.filename}`),
      createBookImagesDto.displayOrder,
    );
  }

  @Patch('images/:imageId')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update one book gallery image display order.' })
  @ApiOkResponse({ description: 'Book image updated successfully.' })
  @ApiNotFoundResponse({ description: 'Book image not found.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  @ApiForbiddenResponse({ description: 'Admin access is required.' })
  updateImage(
    @Param('imageId', ParseUUIDPipe) imageId: string,
    @Body() updateBookImageDto: UpdateBookImageDto,
  ) {
    return this.booksService.updateImage(imageId, updateBookImageDto);
  }

  @Delete('images/:imageId')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete one book gallery image.' })
  @ApiOkResponse({ description: 'Book image deleted successfully.' })
  @ApiNotFoundResponse({ description: 'Book image not found.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  @ApiForbiddenResponse({ description: 'Admin access is required.' })
  deleteImage(@Param('imageId', ParseUUIDPipe) imageId: string) {
    return this.booksService.deleteImage(imageId);
  }

  @Post(':id/formats')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(JwtAuthGuard, AdminGuard)
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'readerFile', maxCount: 1 },
        { name: 'audioFile', maxCount: 1 },
      ],
      {
        storage: bookFormatFileDiskStorage(),
        limits: { fileSize: formatFileMaxSizeBytes },
        fileFilter: bookFormatFileFilter,
      },
    ),
  )
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a book format.' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: createBookFormatMultipartSchema(true) })
  @ApiCreatedResponse({ description: 'Book format created successfully.' })
  @ApiBadRequestResponse({ description: 'Invalid book format data.' })
  @ApiNotFoundResponse({ description: 'Book not found.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  @ApiForbiddenResponse({ description: 'Admin access is required.' })
  createFormat(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() createBookFormatDto: CreateBookFormatDto,
    @UploadedFiles() files?: BookFormatUploadFiles,
  ) {
    return this.booksService.createFormat(
      id,
      createBookFormatDto,
      getFormatFilePaths(files),
    );
  }

  @Patch('formats/:formatId')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'readerFile', maxCount: 1 },
        { name: 'audioFile', maxCount: 1 },
      ],
      {
        storage: bookFormatFileDiskStorage(),
        limits: { fileSize: formatFileMaxSizeBytes },
        fileFilter: bookFormatFileFilter,
      },
    ),
  )
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a book format.' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: createBookFormatMultipartSchema(false) })
  @ApiOkResponse({ description: 'Book format updated successfully.' })
  @ApiBadRequestResponse({ description: 'Invalid book format data.' })
  @ApiNotFoundResponse({ description: 'Book format not found.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  @ApiForbiddenResponse({ description: 'Admin access is required.' })
  updateFormat(
    @Param('formatId', ParseUUIDPipe) formatId: string,
    @Body() updateBookFormatDto: UpdateBookFormatDto,
    @UploadedFiles() files?: BookFormatUploadFiles,
  ) {
    return this.booksService.updateFormat(
      formatId,
      updateBookFormatDto,
      getFormatFilePaths(files),
    );
  }

  @Delete('formats/:formatId')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete one book format.' })
  @ApiOkResponse({ description: 'Book format deleted successfully.' })
  @ApiNotFoundResponse({ description: 'Book format not found.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  @ApiForbiddenResponse({ description: 'Admin access is required.' })
  deleteFormat(@Param('formatId', ParseUUIDPipe) formatId: string) {
    return this.booksService.deleteFormat(formatId);
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

function bookFormatFileDiskStorage() {
  return diskStorage({
    destination: (_request, file, callback) => {
      const destination =
        file.fieldname === 'readerFile'
          ? bookDigitalUploadDirectory
          : bookAudioUploadDirectory;

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

function bookFormatFileFilter(
  _request: unknown,
  file: Express.Multer.File,
  callback: (error: Error | null, acceptFile: boolean) => void,
): void {
  const extension = extname(file.originalname).toLowerCase();

  if (
    file.fieldname === 'readerFile' &&
    allowedReaderExtensions.has(extension) &&
    allowedReaderMimeTypes.has(file.mimetype)
  ) {
    callback(null, true);
    return;
  }

  if (
    file.fieldname === 'audioFile' &&
    allowedAudioExtensions.has(extension) &&
    allowedAudioMimeTypes.has(file.mimetype)
  ) {
    callback(null, true);
    return;
  }

  callback(
    new BadRequestException(
      'readerFile must be a PDF. audioFile must be mp3, wav, or m4a.',
    ),
    false,
  );
}

function getFormatFilePaths(files?: BookFormatUploadFiles): {
  readerFilePath?: string;
  audioFilePath?: string;
} {
  const readerFile = files?.readerFile?.[0];
  const audioFile = files?.audioFile?.[0];

  return {
    readerFilePath: readerFile
      ? `/uploads/books/digital/${readerFile.filename}`
      : undefined,
    audioFilePath: audioFile
      ? `/uploads/books/audio/${audioFile.filename}`
      : undefined,
  };
}

function createBookMultipartSchema(isCreate: boolean) {
  return {
    type: 'object',
    properties: {
      categoryId: { type: 'string', format: 'uuid' },
      titleAr: { type: 'string' },
      titleEn: { type: 'string' },
      slug: { type: 'string' },
      descriptionAr: { type: 'string' },
      descriptionEn: { type: 'string' },
      priceEGP: { type: 'number' },
      discountPriceEGP: { type: 'number' },
      priceUSD: { type: 'number' },
      discountPriceUSD: { type: 'number' },
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
          'slug',
          'descriptionAr',
          'descriptionEn',
          'priceEGP',
          'priceUSD',
          'coverImage',
        ]
      : [],
  };
}

function createBookFormatMultipartSchema(isCreate: boolean) {
  return {
    type: 'object',
    description:
      'Physical: formatType, stock required, optional sku/weight/prices. Digital: formatType, readerFile required on create, optional prices. Audio: formatType, audioFile and audioDuration required on create, optional prices.',
    properties: {
      formatType: {
        type: 'string',
        enum: ['Physical', 'Digital', 'Audio'],
        example: 'Digital',
      },
      stock: {
        type: 'number',
        description: 'Physical only. Required on create for Physical.',
      },
      sku: {
        type: 'string',
        description: 'Physical only.',
      },
      weight: {
        type: 'number',
        description: 'Physical only.',
      },
      priceEGP: { type: 'number' },
      discountPriceEGP: { type: 'number' },
      priceUSD: { type: 'number' },
      discountPriceUSD: { type: 'number' },
      audioDuration: {
        type: 'number',
        description: 'Audio only. Required on create for Audio.',
      },
      readerFile: {
        type: 'string',
        format: 'binary',
        description:
          'Digital only. PDF. Required on create; optional on update to keep old file.',
      },
      audioFile: {
        type: 'string',
        format: 'binary',
        description:
          'Audio only. mp3, wav, or m4a. Required on create; optional on update to keep old file.',
      },
    },
    required: isCreate ? ['formatType'] : [],
  };
}
