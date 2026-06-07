import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { CreateBookCategoryDto } from './dto/create-book-category.dto';
import { UpdateBookCategoryDto } from './dto/update-book-category.dto';

const bookCategorySelect = {
  id: true,
  nameAr: true,
  nameEn: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.BookCategorySelect;

@Injectable()
export class BookCategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.bookCategory.findMany({
      select: bookCategorySelect,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const category = await this.prisma.bookCategory.findUnique({
      where: { id },
      select: bookCategorySelect,
    });

    if (!category) {
      throw new NotFoundException('Book category not found.');
    }

    return category;
  }

  async create(createBookCategoryDto: CreateBookCategoryDto) {
    const category = await this.prisma.bookCategory.create({
      data: {
        nameAr: createBookCategoryDto.nameAr,
        nameEn: createBookCategoryDto.nameEn,
        isActive: createBookCategoryDto.isActive ?? true,
      },
      select: bookCategorySelect,
    });

    return {
      message: 'Book category created successfully',
      data: { category },
    };
  }

  async update(id: string, updateBookCategoryDto: UpdateBookCategoryDto) {
    await this.findOne(id);

    const category = await this.prisma.bookCategory.update({
      where: { id },
      data: {
        nameAr: updateBookCategoryDto.nameAr,
        nameEn: updateBookCategoryDto.nameEn,
        isActive: updateBookCategoryDto.isActive,
      },
      select: bookCategorySelect,
    });

    return {
      message: 'Book category updated successfully',
      data: { category },
    };
  }

  async delete(id: string) {
    await this.findOne(id);

    try {
      await this.prisma.bookCategory.delete({
        where: { id },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2003'
      ) {
        throw new ConflictException(
          'Book category cannot be deleted while books are assigned to it.',
        );
      }

      throw error;
    }

    return {
      message: 'Book category deleted successfully',
      data: {},
    };
  }
}
