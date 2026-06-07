import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, RoleName } from '@prisma/client';

const databaseUrl = process.env['DATABASE_URL'];

if (!databaseUrl) {
  throw new Error('DATABASE_URL is required to run Prisma seed.');
}

const prisma = new PrismaClient({
  adapter: new PrismaPg(databaseUrl),
});

const roles = [
  {
    name: RoleName.Admin,
    description: 'Platform administrator role.',
  },
  {
    name: RoleName.User,
    description: 'Standard platform user role.',
  },
] as const;

const countries = [
  {
    nameAr: 'مصر',
    nameEn: 'Egypt',
    isoCode: 'EG',
    phoneCode: '+20',
    currencyCode: 'EGP',
    cities: [
      { nameAr: 'القاهرة', nameEn: 'Cairo' },
      { nameAr: 'الجيزة', nameEn: 'Giza' },
      { nameAr: 'الإسكندرية', nameEn: 'Alexandria' },
    ],
  },
  {
    nameAr: 'السعودية',
    nameEn: 'Saudi Arabia',
    isoCode: 'SA',
    phoneCode: '+966',
    currencyCode: 'SAR',
    cities: [
      { nameAr: 'الرياض', nameEn: 'Riyadh' },
      { nameAr: 'جدة', nameEn: 'Jeddah' },
      { nameAr: 'الدمام', nameEn: 'Dammam' },
      { nameAr: 'المدينة', nameEn: 'Medina' },
    ],
  },
  {
    nameAr: 'الإمارات',
    nameEn: 'United Arab Emirates',
    isoCode: 'AE',
    phoneCode: '+971',
    currencyCode: 'AED',
    cities: [
      { nameAr: 'دبي', nameEn: 'Dubai' },
      { nameAr: 'أبوظبي', nameEn: 'Abu Dhabi' },
      { nameAr: 'الشارقة', nameEn: 'Sharjah' },
    ],
  },
  {
    nameAr: 'الكويت',
    nameEn: 'Kuwait',
    isoCode: 'KW',
    phoneCode: '+965',
    currencyCode: 'KWD',
    cities: [{ nameAr: 'مدينة الكويت', nameEn: 'Kuwait City' }],
  },
] as const;

async function seedRoles(): Promise<void> {
  await prisma.$transaction(
    roles.map((role) =>
      prisma.role.upsert({
        where: { name: role.name },
        update: {
          description: role.description,
        },
        create: {
          name: role.name,
          description: role.description,
        },
      }),
    ),
  );
}

async function seedCountriesAndCities(): Promise<void> {
  for (const countryData of countries) {
    const country = await prisma.country.upsert({
      where: { isoCode: countryData.isoCode },
      update: {
        nameAr: countryData.nameAr,
        nameEn: countryData.nameEn,
        phoneCode: countryData.phoneCode,
        currencyCode: countryData.currencyCode,
        isActive: true,
      },
      create: {
        nameAr: countryData.nameAr,
        nameEn: countryData.nameEn,
        isoCode: countryData.isoCode,
        phoneCode: countryData.phoneCode,
        currencyCode: countryData.currencyCode,
        isActive: true,
      },
    });

    await prisma.$transaction(
      countryData.cities.map((city) =>
        prisma.city.upsert({
          where: {
            countryId_nameEn: {
              countryId: country.id,
              nameEn: city.nameEn,
            },
          },
          update: {
            nameAr: city.nameAr,
            isActive: true,
          },
          create: {
            countryId: country.id,
            nameAr: city.nameAr,
            nameEn: city.nameEn,
            isActive: true,
          },
        }),
      ),
    );
  }
}

async function main(): Promise<void> {
  await seedRoles();
  await seedCountriesAndCities();
}

main()
  .catch((error: unknown) => {
    console.error('Failed to seed roles.', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
