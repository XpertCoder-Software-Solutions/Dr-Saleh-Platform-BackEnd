import { CreateProductCategoryDto } from './dto/create-product-category.dto';
import { UpdateProductCategoryDto } from './dto/update-product-category.dto';
import { ProductsService } from './products.service';
export declare class AdminProductCategoriesController {
    private readonly productsService;
    constructor(productsService: ProductsService);
    findAll(): import("@prisma/client").Prisma.PrismaPromise<{
        id: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        nameAr: string;
        nameEn: string;
    }[]>;
    findOne(id: string): Promise<{
        id: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        nameAr: string;
        nameEn: string;
    }>;
    create(createProductCategoryDto: CreateProductCategoryDto): Promise<{
        message: string;
        data: {
            category: {
                id: string;
                isActive: boolean;
                createdAt: Date;
                updatedAt: Date;
                nameAr: string;
                nameEn: string;
            };
        };
    }>;
    update(id: string, updateProductCategoryDto: UpdateProductCategoryDto): Promise<{
        message: string;
        data: {
            category: {
                id: string;
                isActive: boolean;
                createdAt: Date;
                updatedAt: Date;
                nameAr: string;
                nameEn: string;
            };
        };
    }>;
    delete(id: string): Promise<{
        message: string;
        data: {
            [x: string]: never;
        };
    }>;
}
