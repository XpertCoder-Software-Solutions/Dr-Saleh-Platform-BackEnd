import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
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
import { CreateProductImageDto } from './dto/create-product-image.dto';
import { UpdateProductImageDto } from './dto/update-product-image.dto';
import { ProductsService } from './products.service';

const productGalleryUploadDirectory = join(
  process.cwd(),
  'uploads',
  'products',
  'gallery',
);
const allowedImageExtensions = new Set(['.jpg', '.jpeg', '.png', '.webp']);
const allowedImageMimeTypes = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
]);

@ApiTags('Product Images')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, AdminGuard)
@Controller('admin/products')
export class AdminProductImagesController {
  constructor(private readonly productsService: ProductsService) {}

  @Post(':id/images')
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(
    FileInterceptor('image', {
      storage: imageDiskStorage(productGalleryUploadDirectory),
      limits: { fileSize: 2 * 1024 * 1024 },
      fileFilter: imageFileFilter,
    }),
  )
  @ApiOperation({ summary: 'Admin: add one product gallery image.' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: createProductImageMultipartSchema(true) })
  @ApiCreatedResponse({ description: 'Product image added successfully.' })
  @ApiBadRequestResponse({ description: 'Invalid product image data.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  @ApiForbiddenResponse({ description: 'Admin access is required.' })
  @ApiNotFoundResponse({ description: 'Product not found.' })
  addImage(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() createProductImageDto: CreateProductImageDto,
    @UploadedFile() image?: Express.Multer.File,
  ) {
    if (!image) {
      throw new BadRequestException('image is required.');
    }

    return this.productsService.adminAddImage(
      id,
      createProductImageDto,
      `/uploads/products/gallery/${image.filename}`,
    );
  }

  @Patch('images/:imageId')
  @UseInterceptors(
    FileInterceptor('image', {
      storage: imageDiskStorage(productGalleryUploadDirectory),
      limits: { fileSize: 2 * 1024 * 1024 },
      fileFilter: imageFileFilter,
    }),
  )
  @ApiOperation({
    summary:
      'Admin: update product gallery display order and optionally replace image.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: createProductImageMultipartSchema(false) })
  @ApiOkResponse({ description: 'Product image updated successfully.' })
  @ApiBadRequestResponse({ description: 'Invalid product image data.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  @ApiForbiddenResponse({ description: 'Admin access is required.' })
  @ApiNotFoundResponse({ description: 'Product image not found.' })
  updateImage(
    @Param('imageId', ParseUUIDPipe) imageId: string,
    @Body() updateProductImageDto: UpdateProductImageDto,
    @UploadedFile() image?: Express.Multer.File,
  ) {
    return this.productsService.adminUpdateImage(
      imageId,
      updateProductImageDto,
      image ? `/uploads/products/gallery/${image.filename}` : undefined,
    );
  }

  @Delete('images/:imageId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Admin: hard delete one product gallery image.' })
  @ApiOkResponse({ description: 'Product image deleted successfully.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  @ApiForbiddenResponse({ description: 'Admin access is required.' })
  @ApiNotFoundResponse({ description: 'Product image not found.' })
  deleteImage(@Param('imageId', ParseUUIDPipe) imageId: string) {
    return this.productsService.adminDeleteImage(imageId);
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

function createProductImageMultipartSchema(isCreate: boolean) {
  return {
    type: 'object',
    properties: {
      displayOrder: { type: 'number', minimum: 1 },
      image: {
        type: 'string',
        format: 'binary',
      },
    },
    required: isCreate ? ['displayOrder', 'image'] : [],
  };
}
