import { BookFormatType, Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { BooksService } from './books.service';

type MockPrismaClient = {
  book: {
    findUnique: jest.Mock;
  };
};

const bookId = 'be8e3a83-5349-4b64-899f-ad851758dfb4';
const bookFormatId = 'ad4179bd-b85c-4f2b-95f4-51cf0e72df98';

describe('BooksService protected file serialization', () => {
  let prisma: MockPrismaClient;
  let service: BooksService;

  beforeEach(() => {
    prisma = {
      book: {
        findUnique: jest.fn().mockResolvedValue(createBookRecord()),
      },
    };
    service = new BooksService(prisma as unknown as PrismaService);
  });

  it('does not expose raw reader or audio file paths', async () => {
    const book = await service.findOne(bookId);
    const [format] = book.formats;

    expect(format).not.toHaveProperty('readerFile');
    expect(format).not.toHaveProperty('audioFile');
    expect(format).toMatchObject({
      hasAudioFile: false,
      hasReaderFile: true,
      id: bookFormatId,
    });
  });
});

function createBookRecord() {
  const timestamp = new Date('2026-06-14T00:00:00.000Z');

  return {
    bookCategory: {
      createdAt: timestamp,
      id: '409cb778-7c59-47a4-81e6-fb3cf2b2d742',
      image: '/uploads/books/categories/category.webp',
      isActive: true,
      nameAr: 'تصنيف',
      nameEn: 'Category',
      updatedAt: timestamp,
    },
    bookCategoryId: '409cb778-7c59-47a4-81e6-fb3cf2b2d742',
    bookFormats: [
      {
        audioDuration: null,
        audioFile: null,
        bookId,
        createdAt: timestamp,
        discountPriceEgp: null,
        discountPriceUsd: null,
        formatType: BookFormatType.Digital,
        id: bookFormatId,
        isActive: true,
        priceEgp: null,
        priceUsd: null,
        readerFile: '/uploads/books/digital/private.pdf',
        sku: null,
        stock: null,
        updatedAt: timestamp,
        weight: null,
      },
    ],
    bookImages: [],
    coverImage: '/uploads/books/covers/book.webp',
    createdAt: timestamp,
    descriptionAr: 'وصف',
    descriptionEn: 'Description',
    discountPriceEgp: null,
    discountPriceUsd: null,
    id: bookId,
    isActive: true,
    isFeatured: false,
    isHomeDisplay: false,
    priceEgp: new Prisma.Decimal(100),
    priceUsd: new Prisma.Decimal(5),
    slug: 'test-book',
    titleAr: 'كتاب',
    titleEn: 'Book',
    updatedAt: timestamp,
  };
}
