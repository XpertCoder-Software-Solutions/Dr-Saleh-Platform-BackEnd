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
import { CreateProductDto } from './dto/create-product.dto';
import { AdminProductQueryDto } from './dto/product-query.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductsService } from './products.service';

const productCoversUploadDirectory = join(
  process.cwd(),
  'uploads',
  'products',
  'covers',
);
const allowedImageExtensions = new Set(['.jpg', '.jpeg', '.png', '.webp']);
const allowedImageMimeTypes = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
]);

@ApiTags('Admin Products')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, AdminGuard)
@Controller('admin/products')
export class AdminProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  @ApiOperation({
    summary: 'Admin: list all products.',
    description:
      'Supports pagination, active/inactive filtering, categoryId, search, isFeatured, and isHomeDisplay filters. Results are newest first.',
  })
  @ApiOkResponse({ description: 'Products returned.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  @ApiForbiddenResponse({ description: 'Admin access is required.' })
  findAll(@Query() query: AdminProductQueryDto) {
    return this.productsService.adminFindProducts(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Admin: get one product.' })
  @ApiOkResponse({ description: 'Product returned.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  @ApiForbiddenResponse({ description: 'Admin access is required.' })
  @ApiNotFoundResponse({ description: 'Product not found.' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.productsService.adminFindProduct(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @AuditAction({
    action: AuditActions.ProductCreated,
    entityType: AuditEntityTypes.Product,
    entityIdResponsePath: 'data.product.id',
    description: 'Admin created a product.',
  })
  @UseInterceptors(
    FileInterceptor('coverImage', {
      storage: imageDiskStorage(productCoversUploadDirectory),
      limits: { fileSize: 2 * 1024 * 1024 },
      fileFilter: imageFileFilter,
    }),
  )
  @ApiOperation({ summary: 'Admin: create a product with a cover image.' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: createProductMultipartSchema(true) })
  @ApiCreatedResponse({ description: 'Product created successfully.' })
  @ApiBadRequestResponse({ description: 'Invalid product data or image.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  @ApiForbiddenResponse({ description: 'Admin access is required.' })
  create(
    @Body() createProductDto: CreateProductDto,
    @UploadedFile() coverImage?: Express.Multer.File,
  ) {
    if (!coverImage) {
      throw new BadRequestException('coverImage is required.');
    }

    return this.productsService.adminCreateProduct(
      createProductDto,
      `/uploads/products/covers/${coverImage.filename}`,
    );
  }

  @Patch(':id')
  @AuditAction({
    action: AuditActions.ProductUpdated,
    entityType: AuditEntityTypes.Product,
    entityIdParam: 'id',
    description: 'Admin updated a product.',
  })
  @UseInterceptors(
    FileInterceptor('coverImage', {
      storage: imageDiskStorage(productCoversUploadDirectory),
      limits: { fileSize: 2 * 1024 * 1024 },
      fileFilter: imageFileFilter,
    }),
  )
  @ApiOperation({
    summary:
      'Admin: update a product. Existing cover remains when coverImage is omitted.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: createProductMultipartSchema(false) })
  @ApiOkResponse({ description: 'Product updated successfully.' })
  @ApiBadRequestResponse({ description: 'Invalid product data or image.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  @ApiForbiddenResponse({ description: 'Admin access is required.' })
  @ApiNotFoundResponse({ description: 'Product not found.' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateProductDto: UpdateProductDto,
    @UploadedFile() coverImage?: Express.Multer.File,
  ) {
    return this.productsService.adminUpdateProduct(
      id,
      updateProductDto,
      coverImage
        ? `/uploads/products/covers/${coverImage.filename}`
        : undefined,
    );
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @AuditAction({
    action: AuditActions.ProductDeleted,
    entityType: AuditEntityTypes.Product,
    entityIdParam: 'id',
    description: 'Admin deleted a product.',
  })
  @ApiOperation({ summary: 'Admin: hard delete one product.' })
  @ApiOkResponse({ description: 'Product deleted successfully.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  @ApiForbiddenResponse({ description: 'Admin access is required.' })
  @ApiNotFoundResponse({ description: 'Product not found.' })
  delete(@Param('id', ParseUUIDPipe) id: string) {
    return this.productsService.adminDeleteProduct(id);
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

function createProductMultipartSchema(isCreate: boolean) {
  return {
    type: 'object',
    properties: {
      categoryId: { type: 'string', format: 'uuid' },
      nameAr: { type: 'string' },
      nameEn: { type: 'string' },
      slug: {
        type: 'string',
        description: 'Optional. Generated from nameEn when omitted.',
      },
      descriptionAr: { type: 'string' },
      descriptionEn: { type: 'string' },
      priceEGP: { type: 'number' },
      discountPriceEGP: { type: 'number' },
      priceUSD: { type: 'number' },
      discountPriceUSD: { type: 'number' },
      stock: { type: 'number' },
      sku: { type: 'string' },
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
          'nameAr',
          'nameEn',
          'descriptionAr',
          'descriptionEn',
          'priceEGP',
          'priceUSD',
          'stock',
          'coverImage',
        ]
      : [],
  };
}
