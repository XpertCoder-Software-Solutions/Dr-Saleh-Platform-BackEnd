import { Module } from '@nestjs/common';
import { CloudFrontModule } from '../common/cloudfront/cloudfront.module';
import { BookCategoriesController } from './book-categories.controller';
import { BookCategoriesService } from './book-categories.service';
import { BooksController } from './books.controller';
import { BooksService } from './books.service';
import { MyBooksController } from './my-books.controller';

@Module({
  imports: [CloudFrontModule],
  controllers: [BookCategoriesController, BooksController, MyBooksController],
  providers: [BookCategoriesService, BooksService],
})
export class BooksModule {}
