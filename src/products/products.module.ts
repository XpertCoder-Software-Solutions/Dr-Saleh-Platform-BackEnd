import { Module } from '@nestjs/common';
import { PrismaModule } from '../database/prisma.module';
import { AdminProductCategoriesController } from './admin-product-categories.controller';
import { AdminProductImagesController } from './admin-product-images.controller';
import { AdminProductsController } from './admin-products.controller';
import { ProductCategoriesController } from './product-categories.controller';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';

@Module({
  imports: [PrismaModule],
  controllers: [
    ProductCategoriesController,
    ProductsController,
    AdminProductCategoriesController,
    AdminProductsController,
    AdminProductImagesController,
  ],
  providers: [ProductsService],
})
export class ProductsModule {}
