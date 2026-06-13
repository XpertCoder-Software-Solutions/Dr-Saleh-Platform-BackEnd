import { CreateGovernorateDto } from './dto/create-governorate.dto';
import { LocationsQueryDto } from './dto/locations-query.dto';
import { UpdateGovernorateDto } from './dto/update-governorate.dto';
import { LocationsService } from './locations.service';
export declare class AdminGovernoratesController {
    private readonly locationsService;
    constructor(locationsService: LocationsService);
    create(createGovernorateDto: CreateGovernorateDto): Promise<{
        message: string;
        data: {
            governorate: {
                id: string;
                nameAr: string;
                nameEn: string;
                name: string;
                shippingCost: number;
                isActive: boolean;
                createdAt: Date;
                updatedAt: Date;
            };
        };
    }>;
    findAll(query: LocationsQueryDto): Promise<{
        message: string;
        data: {
            governorates: {
                id: string;
                nameAr: string;
                nameEn: string;
                name: string;
                shippingCost: number;
                isActive: boolean;
                createdAt: Date;
                updatedAt: Date;
            }[];
        };
    }>;
    findOne(id: string, query: LocationsQueryDto): Promise<{
        message: string;
        data: {
            governorate: {
                id: string;
                nameAr: string;
                nameEn: string;
                name: string;
                shippingCost: number;
                isActive: boolean;
                createdAt: Date;
                updatedAt: Date;
            };
        };
    }>;
    update(id: string, updateGovernorateDto: UpdateGovernorateDto): Promise<{
        message: string;
        data: {
            governorate: {
                id: string;
                nameAr: string;
                nameEn: string;
                name: string;
                shippingCost: number;
                isActive: boolean;
                createdAt: Date;
                updatedAt: Date;
            };
        };
    }>;
    delete(id: string): Promise<{
        message: string;
        data: Record<string, never>;
    }>;
}
