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
import { CreateProductCategoryDto } from './dto/create-product-category.dto';
import { CreateProductImageDto } from './dto/create-product-image.dto';
import { CreateProductDto } from './dto/create-product.dto';
import { LangQueryDto, ProductLanguage } from './dto/lang-query.dto';
import { AdminProductQueryDto, ProductQueryDto } from './dto/product-query.dto';
import { UpdateProductCategoryDto } from './dto/update-product-category.dto';
import { UpdateProductImageDto } from './dto/update-product-image.dto';
import { UpdateProductDto } from './dto/update-product.dto';

const productCategorySelect = {
  id: true,
  nameAr: true,
  nameEn: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.ProductCategorySelect;

const productImageSelect = {
  id: true,
  productId: true,
  imageUrl: true,
  displayOrder: true,
  createdAt: true,
} satisfies Prisma.ProductImageSelect;

const productSelect = {
  id: true,
  categoryId: true,
  nameAr: true,
  nameEn: true,
  slug: true,
  descriptionAr: true,
  descriptionEn: true,
  coverImage: true,
  priceEgp: true,
  discountPriceEgp: true,
  priceUsd: true,
  discountPriceUsd: true,
  stock: true,
  sku: true,
  isFeatured: true,
  isHomeDisplay: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
  category: {
    select: productCategorySelect,
  },
  images: {
    select: productImageSelect,
    orderBy: {
      displayOrder: 'asc' as const,
    },
  },
} satisfies Prisma.ProductSelect;

type ProductCategoryRecord = Prisma.ProductCategoryGetPayload<{
  select: typeof productCategorySelect;
}>;

type ProductImageRecord = Prisma.ProductImageGetPayload<{
  select: typeof productImageSelect;
}>;

type ProductRecord = Prisma.ProductGetPayload<{ select: typeof productSelect }>;
type EmptyData = Record<string, never>;

@Injectable()
export class ProductsService {
  private readonly uploadsRoot = resolve(process.cwd(), 'uploads');

  constructor(private readonly prisma: PrismaService) {}

  async findActiveCategories(query: LangQueryDto) {
    const categories = await this.prisma.productCategory.findMany({
      where: { isActive: true },
      select: productCategorySelect,
      orderBy: this.getLocalizedOrderBy(query.lang),
    });

    return categories.map((category) =>
      this.toPublicCategory(category, query.lang),
    );
  }

  adminFindCategories() {
    return this.prisma.productCategory.findMany({
      select: productCategorySelect,
      orderBy: { createdAt: 'desc' },
    });
  }

  async adminFindCategory(id: string) {
    return this.findCategoryOrThrow(id);
  }

  async adminCreateCategory(
    createProductCategoryDto: CreateProductCategoryDto,
  ) {
    const category = await this.prisma.productCategory.create({
      data: {
        nameAr: createProductCategoryDto.nameAr,
        nameEn: createProductCategoryDto.nameEn,
        isActive: createProductCategoryDto.isActive ?? true,
      },
      select: productCategorySelect,
    });

    return {
      message: 'Product category created successfully',
      data: { category },
    };
  }

  async adminUpdateCategory(
    id: string,
    updateProductCategoryDto: UpdateProductCategoryDto,
  ) {
    await this.findCategoryOrThrow(id);

    const category = await this.prisma.productCategory.update({
      where: { id },
      data: {
        nameAr: updateProductCategoryDto.nameAr,
        nameEn: updateProductCategoryDto.nameEn,
        isActive: updateProductCategoryDto.isActive,
      },
      select: productCategorySelect,
    });

    return {
      message: 'Product category updated successfully',
      data: { category },
    };
  }

  async adminDeleteCategory(
    id: string,
  ): Promise<{ message: string; data: EmptyData }> {
    await this.findCategoryOrThrow(id);

    const productsCount = await this.prisma.product.count({
      where: { categoryId: id },
    });

    if (productsCount > 0) {
      throw new ConflictException(
        'Product category cannot be deleted while products are assigned to it. Set isActive to false instead.',
      );
    }

    await this.prisma.productCategory.delete({ where: { id } });

    return {
      message: 'Product category deleted successfully',
      data: {},
    };
  }

  async findProducts(query: ProductQueryDto) {
    const { page, limit, skip } = getPaginationParams(query);
    const where = this.buildPublicProductsWhere(query);

    const [total, products] = await this.prisma.$transaction([
      this.prisma.product.count({ where }),
      this.prisma.product.findMany({
        where,
        select: productSelect,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    return {
      message: 'Products returned successfully',
      data: {
        products: products.map((product) =>
          this.toPublicProduct(product, query.lang),
        ),
        meta: buildPaginationMeta(page, limit, total),
      },
    };
  }

  async findProductById(id: string, query: LangQueryDto) {
    const product = await this.prisma.product.findFirst({
      where: {
        id,
        isActive: true,
      },
      select: productSelect,
    });

    if (!product) {
      throw new NotFoundException('Product not found.');
    }

    return this.toPublicProduct(product, query.lang);
  }

  async findProductBySlug(slug: string, query: LangQueryDto) {
    const product = await this.prisma.product.findFirst({
      where: {
        slug,
        isActive: true,
      },
      select: productSelect,
    });

    if (!product) {
      throw new NotFoundException('Product not found.');
    }

    return this.toPublicProduct(product, query.lang);
  }

  async adminFindProducts(query: AdminProductQueryDto) {
    const { page, limit, skip } = getPaginationParams(query);
    const where = this.buildAdminProductsWhere(query);

    const [total, products] = await this.prisma.$transaction([
      this.prisma.product.count({ where }),
      this.prisma.product.findMany({
        where,
        select: productSelect,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    return {
      message: 'Products returned successfully',
      data: {
        products: products.map((product) => this.toProduct(product)),
        meta: buildPaginationMeta(page, limit, total),
      },
    };
  }

  async adminFindProduct(id: string) {
    const product = await this.findProductOrThrow(id);

    return this.toProduct(product);
  }

  async adminCreateProduct(
    createProductDto: CreateProductDto,
    coverImagePath: string,
  ) {
    try {
      await this.ensureCategoryExists(createProductDto.categoryId);
      this.validateDiscountPrices({
        priceEGP: createProductDto.priceEGP,
        discountPriceEGP: createProductDto.discountPriceEGP,
        priceUSD: createProductDto.priceUSD,
        discountPriceUSD: createProductDto.discountPriceUSD,
      });

      const slug = await this.generateUniqueSlug(
        createProductDto.slug ?? createProductDto.nameEn,
      );

      const product = await this.prisma.product.create({
        data: {
          categoryId: createProductDto.categoryId,
          nameAr: createProductDto.nameAr,
          nameEn: createProductDto.nameEn,
          slug,
          descriptionAr: createProductDto.descriptionAr,
          descriptionEn: createProductDto.descriptionEn,
          coverImage: coverImagePath,
          priceEgp: createProductDto.priceEGP,
          discountPriceEgp: createProductDto.discountPriceEGP,
          priceUsd: createProductDto.priceUSD,
          discountPriceUsd: createProductDto.discountPriceUSD,
          stock: createProductDto.stock,
          sku: createProductDto.sku,
          isFeatured: createProductDto.isFeatured ?? false,
          isHomeDisplay: createProductDto.isHomeDisplay ?? false,
          isActive: createProductDto.isActive ?? true,
        },
        select: productSelect,
      });

      return {
        message: 'Product created successfully',
        data: {
          product: this.toProduct(product),
        },
      };
    } catch (error) {
      await this.deleteLocalUpload(coverImagePath);
      this.handleUniqueConstraintError(error);
    }
  }

  async adminUpdateProduct(
    id: string,
    updateProductDto: UpdateProductDto,
    coverImagePath?: string,
  ) {
    const currentProduct = await this.prisma.product.findUnique({
      where: { id },
      select: {
        id: true,
        coverImage: true,
        priceEgp: true,
        discountPriceEgp: true,
        priceUsd: true,
        discountPriceUsd: true,
      },
    });

    if (!currentProduct) {
      await this.deleteLocalUpload(coverImagePath);
      throw new NotFoundException('Product not found.');
    }

    try {
      if (updateProductDto.categoryId !== undefined) {
        await this.ensureCategoryExists(updateProductDto.categoryId);
      }

      this.validateDiscountPrices({
        priceEGP:
          updateProductDto.priceEGP ??
          this.toNumberFromDecimal(currentProduct.priceEgp),
        discountPriceEGP:
          updateProductDto.discountPriceEGP ??
          this.toOptionalNumberFromDecimal(currentProduct.discountPriceEgp),
        priceUSD:
          updateProductDto.priceUSD ??
          this.toNumberFromDecimal(currentProduct.priceUsd),
        discountPriceUSD:
          updateProductDto.discountPriceUSD ??
          this.toOptionalNumberFromDecimal(currentProduct.discountPriceUsd),
      });

      const data: Prisma.ProductUpdateInput = {};

      if (updateProductDto.categoryId !== undefined) {
        data.category = { connect: { id: updateProductDto.categoryId } };
      }

      if (updateProductDto.nameAr !== undefined) {
        data.nameAr = updateProductDto.nameAr;
      }

      if (updateProductDto.nameEn !== undefined) {
        data.nameEn = updateProductDto.nameEn;
      }

      if (updateProductDto.slug !== undefined) {
        data.slug = await this.generateUniqueSlug(updateProductDto.slug, id);
      }

      if (updateProductDto.descriptionAr !== undefined) {
        data.descriptionAr = updateProductDto.descriptionAr;
      }

      if (updateProductDto.descriptionEn !== undefined) {
        data.descriptionEn = updateProductDto.descriptionEn;
      }

      if (coverImagePath) {
        data.coverImage = coverImagePath;
      }

      if (updateProductDto.priceEGP !== undefined) {
        data.priceEgp = updateProductDto.priceEGP;
      }

      if (updateProductDto.discountPriceEGP !== undefined) {
        data.discountPriceEgp = updateProductDto.discountPriceEGP;
      }

      if (updateProductDto.priceUSD !== undefined) {
        data.priceUsd = updateProductDto.priceUSD;
      }

      if (updateProductDto.discountPriceUSD !== undefined) {
        data.discountPriceUsd = updateProductDto.discountPriceUSD;
      }

      if (updateProductDto.stock !== undefined) {
        data.stock = updateProductDto.stock;
      }

      if (updateProductDto.sku !== undefined) {
        data.sku = updateProductDto.sku;
      }

      if (updateProductDto.isFeatured !== undefined) {
        data.isFeatured = updateProductDto.isFeatured;
      }

      if (updateProductDto.isHomeDisplay !== undefined) {
        data.isHomeDisplay = updateProductDto.isHomeDisplay;
      }

      if (updateProductDto.isActive !== undefined) {
        data.isActive = updateProductDto.isActive;
      }

      const product = await this.prisma.product.update({
        where: { id },
        data,
        select: productSelect,
      });

      if (coverImagePath) {
        await this.deleteLocalUpload(currentProduct.coverImage);
      }

      return {
        message: 'Product updated successfully',
        data: {
          product: this.toProduct(product),
        },
      };
    } catch (error) {
      await this.deleteLocalUpload(coverImagePath);
      this.handleUniqueConstraintError(error);
    }
  }

  async adminDeleteProduct(
    id: string,
  ): Promise<{ message: string; data: EmptyData }> {
    const product = await this.prisma.product.findUnique({
      where: { id },
      select: {
        id: true,
        coverImage: true,
        images: {
          select: productImageSelect,
        },
      },
    });

    if (!product) {
      throw new NotFoundException('Product not found.');
    }

    await this.prisma.$transaction([
      this.prisma.productImage.deleteMany({ where: { productId: id } }),
      this.prisma.product.delete({ where: { id } }),
    ]);

    await Promise.all([
      this.deleteLocalUpload(product.coverImage),
      ...product.images.map((image) => this.deleteLocalUpload(image.imageUrl)),
    ]);

    return {
      message: 'Product deleted successfully',
      data: {},
    };
  }

  async adminAddImage(
    productId: string,
    createProductImageDto: CreateProductImageDto,
    imagePath: string,
  ) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      select: { id: true },
    });

    if (!product) {
      await this.deleteLocalUpload(imagePath);
      throw new NotFoundException('Product not found.');
    }

    const image = await this.prisma.productImage.create({
      data: {
        productId,
        imageUrl: imagePath,
        displayOrder: createProductImageDto.displayOrder,
      },
      select: productImageSelect,
    });

    return {
      message: 'Product image added successfully',
      data: {
        image: this.toProductImage(image),
      },
    };
  }

  async adminUpdateImage(
    imageId: string,
    updateProductImageDto: UpdateProductImageDto,
    imagePath?: string,
  ) {
    const currentImage = await this.prisma.productImage.findUnique({
      where: { id: imageId },
      select: productImageSelect,
    });

    if (!currentImage) {
      await this.deleteLocalUpload(imagePath);
      throw new NotFoundException('Product image not found.');
    }

    if (
      updateProductImageDto.displayOrder === undefined &&
      imagePath === undefined
    ) {
      throw new BadRequestException(
        'Provide image or displayOrder to update a product image.',
      );
    }

    try {
      const image = await this.prisma.productImage.update({
        where: { id: imageId },
        data: {
          imageUrl: imagePath,
          displayOrder: updateProductImageDto.displayOrder,
        },
        select: productImageSelect,
      });

      if (imagePath) {
        await this.deleteLocalUpload(currentImage.imageUrl);
      }

      return {
        message: 'Product image updated successfully',
        data: {
          image: this.toProductImage(image),
        },
      };
    } catch (error) {
      await this.deleteLocalUpload(imagePath);
      throw error;
    }
  }

  async adminDeleteImage(
    imageId: string,
  ): Promise<{ message: string; data: EmptyData }> {
    const image = await this.prisma.productImage.findUnique({
      where: { id: imageId },
      select: productImageSelect,
    });

    if (!image) {
      throw new NotFoundException('Product image not found.');
    }

    await this.prisma.productImage.delete({ where: { id: imageId } });
    await this.deleteLocalUpload(image.imageUrl);

    return {
      message: 'Product image deleted successfully',
      data: {},
    };
  }

  private async findCategoryOrThrow(
    id: string,
  ): Promise<ProductCategoryRecord> {
    const category = await this.prisma.productCategory.findUnique({
      where: { id },
      select: productCategorySelect,
    });

    if (!category) {
      throw new NotFoundException('Product category not found.');
    }

    return category;
  }

  private async findProductOrThrow(id: string): Promise<ProductRecord> {
    const product = await this.prisma.product.findUnique({
      where: { id },
      select: productSelect,
    });

    if (!product) {
      throw new NotFoundException('Product not found.');
    }

    return product;
  }

  private async ensureCategoryExists(categoryId: string): Promise<void> {
    const category = await this.prisma.productCategory.findUnique({
      where: { id: categoryId },
      select: { id: true },
    });

    if (!category) {
      throw new BadRequestException('Product category does not exist.');
    }
  }

  private buildPublicProductsWhere(
    query: ProductQueryDto,
  ): Prisma.ProductWhereInput {
    return {
      ...this.buildBaseProductsWhere(query),
      isActive: true,
    };
  }

  private buildAdminProductsWhere(
    query: AdminProductQueryDto,
  ): Prisma.ProductWhereInput {
    const where = this.buildBaseProductsWhere(query);

    if (query.isActive !== undefined) {
      where.isActive = query.isActive;
    }

    return where;
  }

  private buildBaseProductsWhere(
    query: ProductQueryDto,
  ): Prisma.ProductWhereInput {
    const where: Prisma.ProductWhereInput = {};
    const search = query.search?.trim();

    if (query.categoryId) {
      where.categoryId = query.categoryId;
    }

    if (query.isFeatured !== undefined) {
      where.isFeatured = query.isFeatured;
    }

    if (query.isHomeDisplay !== undefined) {
      where.isHomeDisplay = query.isHomeDisplay;
    }

    if (search) {
      where.OR = [
        { nameAr: { contains: search, mode: 'insensitive' } },
        { nameEn: { contains: search, mode: 'insensitive' } },
        { descriptionAr: { contains: search, mode: 'insensitive' } },
        { descriptionEn: { contains: search, mode: 'insensitive' } },
      ];
    }

    return where;
  }

  private validateDiscountPrices({
    priceEGP,
    discountPriceEGP,
    priceUSD,
    discountPriceUSD,
  }: {
    priceEGP: number;
    discountPriceEGP?: number;
    priceUSD: number;
    discountPriceUSD?: number;
  }): void {
    if (discountPriceEGP !== undefined && discountPriceEGP >= priceEGP) {
      throw new BadRequestException(
        'discountPriceEGP must be less than priceEGP.',
      );
    }

    if (discountPriceUSD !== undefined && discountPriceUSD >= priceUSD) {
      throw new BadRequestException(
        'discountPriceUSD must be less than priceUSD.',
      );
    }
  }

  private async generateUniqueSlug(
    source: string,
    excludedProductId?: string,
  ): Promise<string> {
    const baseSlug = this.slugify(source);
    let slug = baseSlug;
    let suffix = 2;

    while (await this.productSlugExists(slug, excludedProductId)) {
      slug = `${baseSlug}-${suffix}`;
      suffix += 1;
    }

    return slug;
  }

  private productSlugExists(
    slug: string,
    excludedProductId?: string,
  ): Promise<{ id: string } | null> {
    return this.prisma.product.findFirst({
      where: {
        slug,
        ...(excludedProductId ? { id: { not: excludedProductId } } : {}),
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

    return slug || 'product';
  }

  private toProduct(product: ProductRecord) {
    return {
      id: product.id,
      categoryId: product.categoryId,
      nameAr: product.nameAr,
      nameEn: product.nameEn,
      slug: product.slug,
      descriptionAr: product.descriptionAr,
      descriptionEn: product.descriptionEn,
      coverImage: product.coverImage,
      priceEGP: this.toNumberFromDecimal(product.priceEgp),
      discountPriceEGP: this.toOptionalNumberOrNull(product.discountPriceEgp),
      priceUSD: this.toNumberFromDecimal(product.priceUsd),
      discountPriceUSD: this.toOptionalNumberOrNull(product.discountPriceUsd),
      stock: product.stock,
      sku: product.sku,
      isFeatured: product.isFeatured,
      isHomeDisplay: product.isHomeDisplay,
      isActive: product.isActive,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
      category: product.category,
      images: product.images.map((image) => this.toProductImage(image)),
    };
  }

  private toPublicProduct(product: ProductRecord, language?: ProductLanguage) {
    return {
      id: product.id,
      name: this.getLocalizedValue(
        {
          ar: product.nameAr,
          en: product.nameEn,
        },
        language,
      ),
      description: this.getLocalizedValue(
        {
          ar: product.descriptionAr,
          en: product.descriptionEn,
        },
        language,
      ),
      slug: product.slug,
      coverImage: product.coverImage,
      priceEGP: this.toNumberFromDecimal(product.priceEgp),
      discountPriceEGP: this.toOptionalNumberOrNull(product.discountPriceEgp),
      priceUSD: this.toNumberFromDecimal(product.priceUsd),
      discountPriceUSD: this.toOptionalNumberOrNull(product.discountPriceUsd),
      stock: product.stock,
      sku: product.sku,
      isFeatured: product.isFeatured,
      isHomeDisplay: product.isHomeDisplay,
      category: this.toPublicCategory(product.category, language),
      images: product.images.map((image) => this.toProductImage(image)),
      createdAt: product.createdAt,
    };
  }

  private toPublicCategory(
    category: ProductCategoryRecord,
    language?: ProductLanguage,
  ) {
    return {
      id: category.id,
      name: this.getLocalizedName(category, language),
      nameAr: category.nameAr,
      nameEn: category.nameEn,
    };
  }

  private toProductImage(image: ProductImageRecord) {
    return {
      id: image.id,
      productId: image.productId,
      imageUrl: image.imageUrl,
      displayOrder: image.displayOrder,
      createdAt: image.createdAt,
    };
  }

  private getLocalizedName(
    record: { nameAr: string; nameEn: string },
    language?: ProductLanguage,
  ): string {
    return language === ProductLanguage.Arabic ? record.nameAr : record.nameEn;
  }

  private getLocalizedValue(
    record: { ar: string; en: string },
    language?: ProductLanguage,
  ): string {
    return language === ProductLanguage.Arabic ? record.ar : record.en;
  }

  private getLocalizedOrderBy(language?: ProductLanguage) {
    return language === ProductLanguage.Arabic
      ? { nameAr: 'asc' as const }
      : { nameEn: 'asc' as const };
  }

  private toNumberFromDecimal(decimal: Prisma.Decimal): number {
    return Number(decimal.toString());
  }

  private toOptionalNumberFromDecimal(
    decimal: Prisma.Decimal | null,
  ): number | undefined {
    return decimal === null ? undefined : this.toNumberFromDecimal(decimal);
  }

  private toOptionalNumberOrNull(
    decimal: Prisma.Decimal | null,
  ): number | null {
    return decimal === null ? null : this.toNumberFromDecimal(decimal);
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
      throw new ConflictException('Product slug or SKU already exists.');
    }

    throw error;
  }
}
