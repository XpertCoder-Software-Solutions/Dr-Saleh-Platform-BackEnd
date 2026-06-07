import { Module } from '@nestjs/common';
import { BookCategoriesController } from './book-categories.controller';
import { BookCategoriesService } from './book-categories.service';
import { BooksController } from './books.controller';
import { BooksService } from './books.service';

@Module({
  controllers: [BookCategoriesController, BooksController],
  providers: [BookCategoriesService, BooksService],
})
export class BooksModule {}
