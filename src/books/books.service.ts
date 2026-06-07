import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { BookFormatType, Prisma } from '@prisma/client';
import { unlink } from 'fs/promises';
import { resolve } from 'path';
import { PrismaService } from '../database/prisma.service';
import { CreateBookDto } from './dto/create-book.dto';
import { CreateBookFormatDto } from './dto/create-book-format.dto';
import { UpdateBookDto } from './dto/update-book.dto';
import { UpdateBookFormatDto } from './dto/update-book-format.dto';
import { UpdateBookImageDto } from './dto/update-book-image.dto';

const bookCategorySelect = {
  id: true,
  nameAr: true,
  nameEn: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.BookCategorySelect;

const bookSelect = {
  id: true,
  bookCategoryId: true,
  titleAr: true,
  titleEn: true,
  slug: true,
  descriptionAr: true,
  descriptionEn: true,
  coverImage: true,
  priceEgp: true,
  discountPriceEgp: true,
  priceUsd: true,
  discountPriceUsd: true,
  isFeatured: true,
  isHomeDisplay: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
  bookCategory: {
    select: bookCategorySelect,
  },
  bookImages: {
    select: {
      id: true,
      bookId: true,
      imageUrl: true,
      displayOrder: true,
      createdAt: true,
    },
    orderBy: {
      displayOrder: 'asc' as const,
    },
  },
  bookFormats: {
    select: {
      id: true,
      bookId: true,
      formatType: true,
      sku: true,
      stock: true,
      weight: true,
      priceEgp: true,
      discountPriceEgp: true,
      priceUsd: true,
      discountPriceUsd: true,
      readerFile: true,
      audioFile: true,
      audioDuration: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: {
      createdAt: 'asc' as const,
    },
  },
} satisfies Prisma.BookSelect;

type BookRecord = Prisma.BookGetPayload<{ select: typeof bookSelect }>;

const bookFormatSelect = {
  id: true,
  bookId: true,
  formatType: true,
  sku: true,
  stock: true,
  weight: true,
  priceEgp: true,
  discountPriceEgp: true,
  priceUsd: true,
  discountPriceUsd: true,
  readerFile: true,
  audioFile: true,
  audioDuration: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.BookFormatSelect;

type BookFormatRecord = Prisma.BookFormatGetPayload<{
  select: typeof bookFormatSelect;
}>;

@Injectable()
export class BooksService {
  private readonly uploadsRoot = resolve(process.cwd(), 'uploads');

  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    const books = await this.prisma.book.findMany({
      select: bookSelect,
      orderBy: { createdAt: 'desc' },
    });

    return books.map((book) => this.toBook(book));
  }

  async findOne(id: string) {
    const book = await this.findBookOrThrow(id);

    return this.toBook(book);
  }

  async findBySlug(slug: string) {
    const book = await this.prisma.book.findUnique({
      where: { slug },
      select: bookSelect,
    });

    if (!book) {
      throw new NotFoundException('Book not found.');
    }

    return this.toBook(book);
  }

  async create(
    createBookDto: CreateBookDto,
    coverImagePath: string,
  ): Promise<{
    message: string;
    data: { book: ReturnType<typeof this.toBook> };
  }> {
    try {
      await this.ensureActiveCategoryExists(createBookDto.categoryId);
      this.validateDiscountPrices({
        priceEGP: createBookDto.priceEGP,
        discountPriceEGP: createBookDto.discountPriceEGP,
        priceUSD: createBookDto.priceUSD,
        discountPriceUSD: createBookDto.discountPriceUSD,
      });

      const book = await this.prisma.book.create({
        data: {
          bookCategoryId: createBookDto.categoryId,
          titleAr: createBookDto.titleAr,
          titleEn: createBookDto.titleEn,
          slug: createBookDto.slug,
          descriptionAr: createBookDto.descriptionAr,
          descriptionEn: createBookDto.descriptionEn,
          coverImage: coverImagePath,
          priceEgp: createBookDto.priceEGP,
          discountPriceEgp: createBookDto.discountPriceEGP,
          priceUsd: createBookDto.priceUSD,
          discountPriceUsd: createBookDto.discountPriceUSD,
          isFeatured: createBookDto.isFeatured ?? false,
          isHomeDisplay: createBookDto.isHomeDisplay ?? false,
          isActive: createBookDto.isActive ?? true,
        },
        select: bookSelect,
      });

      return {
        message: 'Book created successfully',
        data: {
          book: this.toBook(book),
        },
      };
    } catch (error) {
      await this.deleteLocalUpload(coverImagePath);
      this.handleUniqueConstraintError(error);
    }
  }

  async update(
    id: string,
    updateBookDto: UpdateBookDto,
    coverImagePath?: string,
  ): Promise<{
    message: string;
    data: { book: ReturnType<typeof this.toBook> };
  }> {
    const currentBook = await this.prisma.book.findUnique({
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

    if (!currentBook) {
      await this.deleteLocalUpload(coverImagePath);
      throw new NotFoundException('Book not found.');
    }

    try {
      if (updateBookDto.categoryId !== undefined) {
        await this.ensureActiveCategoryExists(updateBookDto.categoryId);
      }

      const nextPriceEGP =
        updateBookDto.priceEGP ?? Number(currentBook.priceEgp.toString());
      const nextPriceUSD =
        updateBookDto.priceUSD ?? Number(currentBook.priceUsd.toString());
      const nextDiscountPriceEGP =
        updateBookDto.discountPriceEGP ??
        (currentBook.discountPriceEgp === null
          ? undefined
          : Number(currentBook.discountPriceEgp.toString()));
      const nextDiscountPriceUSD =
        updateBookDto.discountPriceUSD ??
        (currentBook.discountPriceUsd === null
          ? undefined
          : Number(currentBook.discountPriceUsd.toString()));

      this.validateDiscountPrices({
        priceEGP: nextPriceEGP,
        discountPriceEGP: nextDiscountPriceEGP,
        priceUSD: nextPriceUSD,
        discountPriceUSD: nextDiscountPriceUSD,
      });

      const data: Prisma.BookUpdateInput = {};

      if (updateBookDto.categoryId !== undefined) {
        data.bookCategory = { connect: { id: updateBookDto.categoryId } };
      }

      if (updateBookDto.titleAr !== undefined) {
        data.titleAr = updateBookDto.titleAr;
      }

      if (updateBookDto.titleEn !== undefined) {
        data.titleEn = updateBookDto.titleEn;
      }

      if (updateBookDto.slug !== undefined) {
        data.slug = updateBookDto.slug;
      }

      if (updateBookDto.descriptionAr !== undefined) {
        data.descriptionAr = updateBookDto.descriptionAr;
      }

      if (updateBookDto.descriptionEn !== undefined) {
        data.descriptionEn = updateBookDto.descriptionEn;
      }

      if (coverImagePath) {
        data.coverImage = coverImagePath;
      }

      if (updateBookDto.priceEGP !== undefined) {
        data.priceEgp = updateBookDto.priceEGP;
      }

      if (updateBookDto.discountPriceEGP !== undefined) {
        data.discountPriceEgp = updateBookDto.discountPriceEGP;
      }

      if (updateBookDto.priceUSD !== undefined) {
        data.priceUsd = updateBookDto.priceUSD;
      }

      if (updateBookDto.discountPriceUSD !== undefined) {
        data.discountPriceUsd = updateBookDto.discountPriceUSD;
      }

      if (updateBookDto.isFeatured !== undefined) {
        data.isFeatured = updateBookDto.isFeatured;
      }

      if (updateBookDto.isHomeDisplay !== undefined) {
        data.isHomeDisplay = updateBookDto.isHomeDisplay;
      }

      if (updateBookDto.isActive !== undefined) {
        data.isActive = updateBookDto.isActive;
      }

      const book = await this.prisma.book.update({
        where: { id },
        data,
        select: bookSelect,
      });

      if (coverImagePath) {
        await this.deleteLocalUpload(currentBook.coverImage);
      }

      return {
        message: 'Book updated successfully',
        data: {
          book: this.toBook(book),
        },
      };
    } catch (error) {
      await this.deleteLocalUpload(coverImagePath);
      this.handleUniqueConstraintError(error);
    }
  }

  async delete(
    id: string,
  ): Promise<{ message: string; data: Record<string, never> }> {
    const book = await this.prisma.book.findUnique({
      where: { id },
      select: bookSelect,
    });

    if (!book) {
      throw new NotFoundException('Book not found.');
    }

    await this.prisma.$transaction([
      this.prisma.bookImage.deleteMany({ where: { bookId: id } }),
      this.prisma.bookFormat.deleteMany({ where: { bookId: id } }),
      this.prisma.book.delete({ where: { id } }),
    ]);

    await Promise.all([
      this.deleteLocalUpload(book.coverImage),
      ...book.bookImages.map((image) => this.deleteLocalUpload(image.imageUrl)),
      ...book.bookFormats.flatMap((format) => [
        this.deleteLocalUpload(format.readerFile),
        this.deleteLocalUpload(format.audioFile),
      ]),
    ]);

    return {
      message: 'Book deleted successfully',
      data: {},
    };
  }

  async addImages(
    bookId: string,
    imagePaths: string[],
    displayOrder?: number,
  ): Promise<{
    message: string;
    data: { images: ReturnType<typeof this.toBookImage>[] };
  }> {
    const book = await this.prisma.book.findUnique({
      where: { id: bookId },
      select: { id: true },
    });

    if (!book) {
      await Promise.all(
        imagePaths.map((imagePath) => this.deleteLocalUpload(imagePath)),
      );
      throw new NotFoundException('Book not found.');
    }

    const highestOrder = await this.prisma.bookImage.aggregate({
      where: { bookId },
      _max: { displayOrder: true },
    });
    const startingDisplayOrder =
      displayOrder ?? (highestOrder._max.displayOrder ?? -1) + 1;

    const images = await this.prisma.$transaction(
      imagePaths.map((imagePath, index) =>
        this.prisma.bookImage.create({
          data: {
            bookId,
            imageUrl: imagePath,
            displayOrder: startingDisplayOrder + index,
          },
          select: {
            id: true,
            bookId: true,
            imageUrl: true,
            displayOrder: true,
            createdAt: true,
          },
        }),
      ),
    );

    return {
      message: 'Book images uploaded successfully',
      data: {
        images: images.map((image) => this.toBookImage(image)),
      },
    };
  }

  async updateImage(
    imageId: string,
    updateBookImageDto: UpdateBookImageDto,
  ): Promise<{
    message: string;
    data: { image: ReturnType<typeof this.toBookImage> };
  }> {
    const image = await this.prisma.bookImage.findUnique({
      where: { id: imageId },
      select: { id: true },
    });

    if (!image) {
      throw new NotFoundException('Book image not found.');
    }

    const updatedImage = await this.prisma.bookImage.update({
      where: { id: imageId },
      data: {
        displayOrder: updateBookImageDto.displayOrder,
      },
      select: {
        id: true,
        bookId: true,
        imageUrl: true,
        displayOrder: true,
        createdAt: true,
      },
    });

    return {
      message: 'Book image updated successfully',
      data: {
        image: this.toBookImage(updatedImage),
      },
    };
  }

  async deleteImage(
    imageId: string,
  ): Promise<{ message: string; data: Record<string, never> }> {
    const image = await this.prisma.bookImage.findUnique({
      where: { id: imageId },
      select: {
        id: true,
        imageUrl: true,
      },
    });

    if (!image) {
      throw new NotFoundException('Book image not found.');
    }

    await this.prisma.bookImage.delete({ where: { id: imageId } });
    await this.deleteLocalUpload(image.imageUrl);

    return {
      message: 'Book image deleted successfully',
      data: {},
    };
  }

  async createFormat(
    bookId: string,
    createBookFormatDto: CreateBookFormatDto,
    files: { readerFilePath?: string; audioFilePath?: string },
  ): Promise<{
    message: string;
    data: { format: ReturnType<typeof this.toBookFormat> };
  }> {
    const book = await this.prisma.book.findUnique({
      where: { id: bookId },
      select: { id: true },
    });

    if (!book) {
      await this.deleteFormatUploadFiles(files);
      throw new NotFoundException('Book not found.');
    }

    try {
      this.validateCreateFormatRules(createBookFormatDto, files);
      this.validateFormatDiscountPrices({
        priceEGP: createBookFormatDto.priceEGP,
        discountPriceEGP: createBookFormatDto.discountPriceEGP,
        priceUSD: createBookFormatDto.priceUSD,
        discountPriceUSD: createBookFormatDto.discountPriceUSD,
      });

      const format = await this.prisma.bookFormat.create({
        data: {
          bookId,
          formatType: createBookFormatDto.formatType,
          sku:
            createBookFormatDto.formatType === BookFormatType.Physical
              ? createBookFormatDto.sku
              : null,
          stock:
            createBookFormatDto.formatType === BookFormatType.Physical
              ? createBookFormatDto.stock
              : null,
          weight:
            createBookFormatDto.formatType === BookFormatType.Physical
              ? createBookFormatDto.weight
              : null,
          priceEgp: createBookFormatDto.priceEGP,
          discountPriceEgp: createBookFormatDto.discountPriceEGP,
          priceUsd: createBookFormatDto.priceUSD,
          discountPriceUsd: createBookFormatDto.discountPriceUSD,
          readerFile:
            createBookFormatDto.formatType === BookFormatType.Digital
              ? files.readerFilePath
              : null,
          audioFile:
            createBookFormatDto.formatType === BookFormatType.Audio
              ? files.audioFilePath
              : null,
          audioDuration:
            createBookFormatDto.formatType === BookFormatType.Audio
              ? createBookFormatDto.audioDuration
              : null,
        },
        select: bookFormatSelect,
      });

      return {
        message: 'Book format created successfully',
        data: {
          format: this.toBookFormat(format),
        },
      };
    } catch (error) {
      await this.deleteFormatUploadFiles(files);
      this.handleUniqueConstraintError(error);
    }
  }

  async updateFormat(
    formatId: string,
    updateBookFormatDto: UpdateBookFormatDto,
    files: { readerFilePath?: string; audioFilePath?: string },
  ): Promise<{
    message: string;
    data: { format: ReturnType<typeof this.toBookFormat> };
  }> {
    const currentFormat = await this.prisma.bookFormat.findUnique({
      where: { id: formatId },
      select: {
        id: true,
        formatType: true,
        sku: true,
        stock: true,
        weight: true,
        priceEgp: true,
        discountPriceEgp: true,
        priceUsd: true,
        discountPriceUsd: true,
        readerFile: true,
        audioFile: true,
        audioDuration: true,
      },
    });

    if (!currentFormat) {
      await this.deleteFormatUploadFiles(files);
      throw new NotFoundException('Book format not found.');
    }

    const nextFormatType =
      updateBookFormatDto.formatType ?? currentFormat.formatType;

    try {
      this.validateUpdateFormatRules(
        currentFormat,
        nextFormatType,
        updateBookFormatDto,
        files,
      );
      this.validateFormatDiscountPrices({
        priceEGP:
          updateBookFormatDto.priceEGP ??
          this.toOptionalNumberFromDecimal(currentFormat.priceEgp),
        discountPriceEGP:
          updateBookFormatDto.discountPriceEGP ??
          this.toOptionalNumberFromDecimal(currentFormat.discountPriceEgp),
        priceUSD:
          updateBookFormatDto.priceUSD ??
          this.toOptionalNumberFromDecimal(currentFormat.priceUsd),
        discountPriceUSD:
          updateBookFormatDto.discountPriceUSD ??
          this.toOptionalNumberFromDecimal(currentFormat.discountPriceUsd),
      });

      const data: Prisma.BookFormatUpdateInput = {
        formatType: updateBookFormatDto.formatType,
      };

      if (nextFormatType === BookFormatType.Physical) {
        data.readerFile = null;
        data.audioFile = null;
        data.audioDuration = null;

        if (updateBookFormatDto.sku !== undefined) {
          data.sku = updateBookFormatDto.sku;
        }

        if (updateBookFormatDto.stock !== undefined) {
          data.stock = updateBookFormatDto.stock;
        }

        if (updateBookFormatDto.weight !== undefined) {
          data.weight = updateBookFormatDto.weight;
        }
      }

      if (nextFormatType === BookFormatType.Digital) {
        data.sku = null;
        data.stock = null;
        data.weight = null;
        data.audioFile = null;
        data.audioDuration = null;

        if (files.readerFilePath) {
          data.readerFile = files.readerFilePath;
        }
      }

      if (nextFormatType === BookFormatType.Audio) {
        data.sku = null;
        data.stock = null;
        data.weight = null;
        data.readerFile = null;

        if (files.audioFilePath) {
          data.audioFile = files.audioFilePath;
        }

        if (updateBookFormatDto.audioDuration !== undefined) {
          data.audioDuration = updateBookFormatDto.audioDuration;
        }
      }

      if (updateBookFormatDto.priceEGP !== undefined) {
        data.priceEgp = updateBookFormatDto.priceEGP;
      }

      if (updateBookFormatDto.discountPriceEGP !== undefined) {
        data.discountPriceEgp = updateBookFormatDto.discountPriceEGP;
      }

      if (updateBookFormatDto.priceUSD !== undefined) {
        data.priceUsd = updateBookFormatDto.priceUSD;
      }

      if (updateBookFormatDto.discountPriceUSD !== undefined) {
        data.discountPriceUsd = updateBookFormatDto.discountPriceUSD;
      }

      const format = await this.prisma.bookFormat.update({
        where: { id: formatId },
        data,
        select: bookFormatSelect,
      });

      await this.deleteReplacedFormatFiles(
        currentFormat,
        nextFormatType,
        files,
      );

      return {
        message: 'Book format updated successfully',
        data: {
          format: this.toBookFormat(format),
        },
      };
    } catch (error) {
      await this.deleteFormatUploadFiles(files);
      this.handleUniqueConstraintError(error);
    }
  }

  async deleteFormat(
    formatId: string,
  ): Promise<{ message: string; data: Record<string, never> }> {
    const format = await this.prisma.bookFormat.findUnique({
      where: { id: formatId },
      select: {
        id: true,
        readerFile: true,
        audioFile: true,
      },
    });

    if (!format) {
      throw new NotFoundException('Book format not found.');
    }

    await this.prisma.bookFormat.delete({ where: { id: formatId } });
    await Promise.all([
      this.deleteLocalUpload(format.readerFile),
      this.deleteLocalUpload(format.audioFile),
    ]);

    return {
      message: 'Book format deleted successfully',
      data: {},
    };
  }

  private async findBookOrThrow(id: string): Promise<BookRecord> {
    const book = await this.prisma.book.findUnique({
      where: { id },
      select: bookSelect,
    });

    if (!book) {
      throw new NotFoundException('Book not found.');
    }

    return book;
  }

  private async ensureActiveCategoryExists(categoryId: string): Promise<void> {
    const category = await this.prisma.bookCategory.findFirst({
      where: {
        id: categoryId,
        isActive: true,
      },
      select: { id: true },
    });

    if (!category) {
      throw new BadRequestException(
        'Book category does not exist or is inactive.',
      );
    }
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

  private validateCreateFormatRules(
    formatDto: CreateBookFormatDto,
    files: { readerFilePath?: string; audioFilePath?: string },
  ): void {
    this.validateAllowedFormatFields(formatDto.formatType, formatDto, files);

    if (
      formatDto.formatType === BookFormatType.Physical &&
      formatDto.stock === undefined
    ) {
      throw new BadRequestException('stock is required for Physical formats.');
    }

    if (
      formatDto.formatType === BookFormatType.Digital &&
      !files.readerFilePath
    ) {
      throw new BadRequestException(
        'readerFile is required for Digital formats.',
      );
    }

    if (formatDto.formatType === BookFormatType.Audio) {
      if (!files.audioFilePath) {
        throw new BadRequestException(
          'audioFile is required for Audio formats.',
        );
      }

      if (formatDto.audioDuration === undefined) {
        throw new BadRequestException(
          'audioDuration is required for Audio formats.',
        );
      }
    }
  }

  private validateUpdateFormatRules(
    currentFormat: {
      formatType: BookFormatType;
      stock: number | null;
      readerFile: string | null;
      audioFile: string | null;
      audioDuration: number | null;
    },
    nextFormatType: BookFormatType,
    formatDto: UpdateBookFormatDto,
    files: { readerFilePath?: string; audioFilePath?: string },
  ): void {
    this.validateAllowedFormatFields(nextFormatType, formatDto, files);

    if (
      nextFormatType === BookFormatType.Physical &&
      formatDto.stock === undefined &&
      currentFormat.stock === null
    ) {
      throw new BadRequestException('stock is required for Physical formats.');
    }

    if (
      nextFormatType === BookFormatType.Digital &&
      !files.readerFilePath &&
      currentFormat.readerFile === null
    ) {
      throw new BadRequestException(
        'readerFile is required for Digital formats.',
      );
    }

    if (nextFormatType === BookFormatType.Audio) {
      if (!files.audioFilePath && currentFormat.audioFile === null) {
        throw new BadRequestException(
          'audioFile is required for Audio formats.',
        );
      }

      if (
        formatDto.audioDuration === undefined &&
        currentFormat.audioDuration === null
      ) {
        throw new BadRequestException(
          'audioDuration is required for Audio formats.',
        );
      }
    }
  }

  private validateAllowedFormatFields(
    formatType: BookFormatType,
    formatDto: Partial<CreateBookFormatDto>,
    files: { readerFilePath?: string; audioFilePath?: string },
  ): void {
    if (formatType === BookFormatType.Physical) {
      if (files.readerFilePath || files.audioFilePath) {
        throw new BadRequestException(
          'Physical formats must not have readerFile or audioFile.',
        );
      }

      if (formatDto.audioDuration !== undefined) {
        throw new BadRequestException(
          'Physical formats must not have audioDuration.',
        );
      }

      return;
    }

    if (formatDto.stock !== undefined) {
      throw new BadRequestException(
        'Digital and audio formats must not have stock.',
      );
    }

    if (formatDto.sku !== undefined) {
      throw new BadRequestException(
        'Digital and audio formats must not have sku.',
      );
    }

    if (formatDto.weight !== undefined) {
      throw new BadRequestException(
        'Digital and audio formats must not have weight.',
      );
    }

    if (formatType === BookFormatType.Digital) {
      if (files.audioFilePath) {
        throw new BadRequestException(
          'Digital formats must not have audioFile.',
        );
      }

      if (formatDto.audioDuration !== undefined) {
        throw new BadRequestException(
          'Digital formats must not have audioDuration.',
        );
      }
    }

    if (formatType === BookFormatType.Audio && files.readerFilePath) {
      throw new BadRequestException('Audio formats must not have readerFile.');
    }
  }

  private validateFormatDiscountPrices({
    priceEGP,
    discountPriceEGP,
    priceUSD,
    discountPriceUSD,
  }: {
    priceEGP?: number;
    discountPriceEGP?: number;
    priceUSD?: number;
    discountPriceUSD?: number;
  }): void {
    if (discountPriceEGP !== undefined) {
      if (priceEGP === undefined) {
        throw new BadRequestException(
          'priceEGP is required when discountPriceEGP is provided.',
        );
      }

      if (discountPriceEGP >= priceEGP) {
        throw new BadRequestException(
          'discountPriceEGP must be less than priceEGP.',
        );
      }
    }

    if (discountPriceUSD !== undefined) {
      if (priceUSD === undefined) {
        throw new BadRequestException(
          'priceUSD is required when discountPriceUSD is provided.',
        );
      }

      if (discountPriceUSD >= priceUSD) {
        throw new BadRequestException(
          'discountPriceUSD must be less than priceUSD.',
        );
      }
    }
  }

  private toOptionalNumberFromDecimal(
    decimal: Prisma.Decimal | null,
  ): number | undefined {
    return decimal === null ? undefined : Number(decimal.toString());
  }

  private async deleteFormatUploadFiles(files: {
    readerFilePath?: string;
    audioFilePath?: string;
  }): Promise<void> {
    await Promise.all([
      this.deleteLocalUpload(files.readerFilePath),
      this.deleteLocalUpload(files.audioFilePath),
    ]);
  }

  private async deleteReplacedFormatFiles(
    currentFormat: {
      readerFile: string | null;
      audioFile: string | null;
    },
    nextFormatType: BookFormatType,
    files: { readerFilePath?: string; audioFilePath?: string },
  ): Promise<void> {
    const filesToDelete: Array<string | null | undefined> = [];

    if (files.readerFilePath || nextFormatType !== BookFormatType.Digital) {
      filesToDelete.push(currentFormat.readerFile);
    }

    if (files.audioFilePath || nextFormatType !== BookFormatType.Audio) {
      filesToDelete.push(currentFormat.audioFile);
    }

    await Promise.all(
      filesToDelete.map((file) => this.deleteLocalUpload(file)),
    );
  }

  private toBook(book: BookRecord) {
    return {
      id: book.id,
      categoryId: book.bookCategoryId,
      titleAr: book.titleAr,
      titleEn: book.titleEn,
      slug: book.slug,
      descriptionAr: book.descriptionAr,
      descriptionEn: book.descriptionEn,
      coverImage: book.coverImage,
      priceEGP: Number(book.priceEgp.toString()),
      discountPriceEGP:
        book.discountPriceEgp === null
          ? null
          : Number(book.discountPriceEgp.toString()),
      priceUSD: Number(book.priceUsd.toString()),
      discountPriceUSD:
        book.discountPriceUsd === null
          ? null
          : Number(book.discountPriceUsd.toString()),
      isFeatured: book.isFeatured,
      isHomeDisplay: book.isHomeDisplay,
      isActive: book.isActive,
      createdAt: book.createdAt,
      updatedAt: book.updatedAt,
      category: book.bookCategory,
      images: book.bookImages.map((image) => this.toBookImage(image)),
      formats: book.bookFormats.map((format) => this.toBookFormat(format)),
    };
  }

  private toBookImage(image: {
    id: string;
    bookId: string;
    imageUrl: string;
    displayOrder: number;
    createdAt: Date;
  }) {
    return {
      id: image.id,
      bookId: image.bookId,
      imageUrl: image.imageUrl,
      displayOrder: image.displayOrder,
      createdAt: image.createdAt,
    };
  }

  private toBookFormat(format: BookFormatRecord) {
    return {
      id: format.id,
      bookId: format.bookId,
      formatType: format.formatType,
      sku: format.sku,
      stock: format.stock,
      weight: format.weight === null ? null : Number(format.weight.toString()),
      priceEGP:
        format.priceEgp === null ? null : Number(format.priceEgp.toString()),
      discountPriceEGP:
        format.discountPriceEgp === null
          ? null
          : Number(format.discountPriceEgp.toString()),
      priceUSD:
        format.priceUsd === null ? null : Number(format.priceUsd.toString()),
      discountPriceUSD:
        format.discountPriceUsd === null
          ? null
          : Number(format.discountPriceUsd.toString()),
      readerFile: format.readerFile,
      audioFile: format.audioFile,
      audioDuration: format.audioDuration,
      isActive: format.isActive,
      createdAt: format.createdAt,
      updatedAt: format.updatedAt,
    };
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
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new ConflictException('Book slug, SKU, or format already exists.');
    }

    throw error;
  }
}
