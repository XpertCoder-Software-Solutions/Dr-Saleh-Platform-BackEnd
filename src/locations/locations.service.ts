import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { LocationLanguage, LocationsQueryDto } from './dto/locations-query.dto';

@Injectable()
export class LocationsService {
  constructor(private readonly prisma: PrismaService) {}

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

  private getLocalizedOrderBy(language?: LocationLanguage) {
    return language === LocationLanguage.Arabic
      ? { nameAr: 'asc' as const }
      : { nameEn: 'asc' as const };
  }
}
