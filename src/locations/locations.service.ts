import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { CreateGovernorateDto } from './dto/create-governorate.dto';
import { LocationLanguage, LocationsQueryDto } from './dto/locations-query.dto';
import { UpdateGovernorateDto } from './dto/update-governorate.dto';

const governorateSelect = {
  id: true,
  nameAr: true,
  nameEn: true,
  shippingCost: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.GovernorateSelect;

type GovernorateRecord = Prisma.GovernorateGetPayload<{
  select: typeof governorateSelect;
}>;

@Injectable()
export class LocationsService {
  constructor(private readonly prisma: PrismaService) {}

  async findGovernorates(query: LocationsQueryDto) {
    const governorates = await this.prisma.governorate.findMany({
      where: { isActive: true },
      select: governorateSelect,
      orderBy: this.getLocalizedOrderBy(query.lang),
    });

    return {
      message: 'Governorates returned successfully',
      data: {
        governorates: governorates.map((governorate) =>
          this.toGovernorate(governorate, query.lang),
        ),
      },
    };
  }

  async adminFindGovernorates(query: LocationsQueryDto) {
    const governorates = await this.prisma.governorate.findMany({
      select: governorateSelect,
      orderBy: this.getLocalizedOrderBy(query.lang),
    });

    return {
      message: 'Governorates returned successfully',
      data: {
        governorates: governorates.map((governorate) =>
          this.toGovernorate(governorate, query.lang),
        ),
      },
    };
  }

  async adminFindGovernorate(id: string, query: LocationsQueryDto) {
    const governorate = await this.findGovernorateOrThrow(id);

    return {
      message: 'Governorate returned successfully',
      data: {
        governorate: this.toGovernorate(governorate, query.lang),
      },
    };
  }

  async adminCreateGovernorate(createGovernorateDto: CreateGovernorateDto) {
    const governorate = await this.prisma.governorate.create({
      data: {
        nameAr: createGovernorateDto.nameAr,
        nameEn: createGovernorateDto.nameEn,
        shippingCost: createGovernorateDto.shippingCost,
        isActive: createGovernorateDto.isActive ?? true,
      },
      select: governorateSelect,
    });

    return {
      message: 'Governorate created successfully',
      data: {
        governorate: this.toGovernorate(governorate),
      },
    };
  }

  async adminUpdateGovernorate(
    id: string,
    updateGovernorateDto: UpdateGovernorateDto,
  ) {
    if (!this.hasProvidedFields(updateGovernorateDto)) {
      throw new BadRequestException(
        'Provide at least one governorate field to update.',
      );
    }

    await this.findGovernorateOrThrow(id);

    const governorate = await this.prisma.governorate.update({
      where: { id },
      data: {
        nameAr: updateGovernorateDto.nameAr,
        nameEn: updateGovernorateDto.nameEn,
        shippingCost: updateGovernorateDto.shippingCost,
        isActive: updateGovernorateDto.isActive,
      },
      select: governorateSelect,
    });

    return {
      message: 'Governorate updated successfully',
      data: {
        governorate: this.toGovernorate(governorate),
      },
    };
  }

  async adminDeleteGovernorate(
    id: string,
  ): Promise<{ message: string; data: Record<string, never> }> {
    await this.findGovernorateOrThrow(id);

    await this.prisma.governorate.update({
      where: { id },
      data: { isActive: false },
      select: { id: true },
    });

    return {
      message: 'Governorate deleted successfully',
      data: {},
    };
  }

  async findCountries(query: LocationsQueryDto) {
    const countries = await this.prisma.country.findMany({
      where: { isActive: true },
      select: {
        id: true,
        nameAr: true,
        nameEn: true,
        isoCode: true,
        phoneCode: true,
        currencyCode: true,
      },
      orderBy: this.getLocalizedOrderBy(query.lang),
    });

    return countries.map((country) => ({
      id: country.id,
      name: this.getLocalizedName(country, query.lang),
      nameAr: country.nameAr,
      nameEn: country.nameEn,
      isoCode: country.isoCode,
      phoneCode: country.phoneCode,
      currencyCode: country.currencyCode,
    }));
  }

  async findCities(countryId: string, query: LocationsQueryDto) {
    const country = await this.prisma.country.findFirst({
      where: {
        id: countryId,
        isActive: true,
      },
      select: { id: true },
    });

    if (!country) {
      throw new NotFoundException('Country not found.');
    }

    const cities = await this.prisma.city.findMany({
      where: {
        countryId,
        isActive: true,
      },
      select: {
        id: true,
        nameAr: true,
        nameEn: true,
      },
      orderBy: this.getLocalizedOrderBy(query.lang),
    });

    return cities.map((city) => ({
      id: city.id,
      name: this.getLocalizedName(city, query.lang),
      nameAr: city.nameAr,
      nameEn: city.nameEn,
    }));
  }

  private getLocalizedName(
    record: { nameAr: string; nameEn: string },
    language?: LocationLanguage,
  ): string {
    return language === LocationLanguage.Arabic ? record.nameAr : record.nameEn;
  }

  private async findGovernorateOrThrow(id: string): Promise<GovernorateRecord> {
    const governorate = await this.prisma.governorate.findUnique({
      where: { id },
      select: governorateSelect,
    });

    if (!governorate) {
      throw new NotFoundException('Governorate not found.');
    }

    return governorate;
  }

  private toGovernorate(
    governorate: GovernorateRecord,
    language?: LocationLanguage,
  ) {
    return {
      id: governorate.id,
      nameAr: governorate.nameAr,
      nameEn: governorate.nameEn,
      name: this.getLocalizedName(governorate, language),
      shippingCost: this.toNumberFromDecimal(governorate.shippingCost),
      isActive: governorate.isActive,
      createdAt: governorate.createdAt,
      updatedAt: governorate.updatedAt,
    };
  }

  private getLocalizedOrderBy(language?: LocationLanguage) {
    return language === LocationLanguage.Arabic
      ? { nameAr: 'asc' as const }
      : { nameEn: 'asc' as const };
  }

  private toNumberFromDecimal(decimal: Prisma.Decimal): number {
    return Number(decimal.toString());
  }

  private hasProvidedFields(dto: object): boolean {
    return Object.values(dto).some((value) => value !== undefined);
  }
}
