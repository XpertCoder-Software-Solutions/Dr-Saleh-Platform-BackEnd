import { LangQueryDto } from './dto/lang-query.dto';
import { ProductQueryDto } from './dto/product-query.dto';
import { ProductsService } from './products.service';
export declare class ProductsController {
    private readonly productsService;
    constructor(productsService: ProductsService);
    findAll(query: ProductQueryDto): Promise<{
        message: string;
        data: {
            products: {
                id: string;
                name: string;
                description: string;
                slug: string;
                coverImage: string;
                priceEGP: number;
                discountPriceEGP: number | null;
                priceUSD: number;
                discountPriceUSD: number | null;
                stock: number;
                sku: string | null;
                isFeatured: boolean;
                isHomeDisplay: boolean;
                category: {
                    id: string;
                    name: string;
                    nameAr: string;
                    nameEn: string;
                };
                images: {
                    id: string;
                    productId: string;
                    imageUrl: string;
                    displayOrder: number;
                    createdAt: Date;
                }[];
                createdAt: Date;
            }[];
            meta: import("../common/utils/pagination").PaginationMeta;
        };
    }>;
    findBySlug(slug: string, query: LangQueryDto): Promise<{
        id: string;
        name: string;
        description: string;
        slug: string;
        coverImage: string;
        priceEGP: number;
        discountPriceEGP: number | null;
        priceUSD: number;
        discountPriceUSD: number | null;
        stock: number;
        sku: string | null;
        isFeatured: boolean;
        isHomeDisplay: boolean;
        category: {
            id: string;
            name: string;
            nameAr: string;
            nameEn: string;
        };
        images: {
            id: string;
            productId: string;
            imageUrl: string;
            displayOrder: number;
            createdAt: Date;
        }[];
        createdAt: Date;
    }>;
    findOne(id: string, query: LangQueryDto): Promise<{
        id: string;
        name: string;
        description: string;
        slug: string;
        coverImage: string;
        priceEGP: number;
        discountPriceEGP: number | null;
        priceUSD: number;
        discountPriceUSD: number | null;
        stock: number;
        sku: string | null;
        isFeatured: boolean;
        isHomeDisplay: boolean;
        category: {
            id: string;
            name: string;
            nameAr: string;
            nameEn: string;
        };
        images: {
            id: string;
            productId: string;
            imageUrl: string;
            displayOrder: number;
            createdAt: Date;
        }[];
        createdAt: Date;
    }>;
}
