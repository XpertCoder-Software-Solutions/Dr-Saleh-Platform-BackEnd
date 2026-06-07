import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { CreateUserAddressDto } from './dto/create-user-address.dto';
import { UpdateUserAddressDto } from './dto/update-user-address.dto';

const addressSelect = {
  id: true,
  userId: true,
  countryId: true,
  cityId: true,
  state: true,
  addressLine1: true,
  addressLine2: true,
  postalCode: true,
  latitude: true,
  longitude: true,
  notes: true,
  createdAt: true,
  updatedAt: true,
  addressCountry: {
    select: {
      id: true,
      nameAr: true,
      nameEn: true,
      isoCode: true,
      phoneCode: true,
      currencyCode: true,
    },
  },
  addressCity: {
    select: {
      id: true,
      nameAr: true,
      nameEn: true,
    },
  },
} satisfies Prisma.UserAddressSelect;

type AddressRecord = Prisma.UserAddressGetPayload<{
  select: typeof addressSelect;
}>;

type LocationPair = {
  country: {
    id: string;
    nameAr: string;
    nameEn: string;
    isoCode: string;
  };
  city: {
    id: string;
    countryId: string;
    nameAr: string;
    nameEn: string;
  };
};

@Injectable()
export class UserAddressesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(userId: string): Promise<ReturnType<typeof this.toAddress>[]> {
    const addresses = await this.prisma.userAddress.findMany({
      where: { userId },
      select: addressSelect,
      orderBy: { createdAt: 'desc' },
    });

    return addresses.map((address) => this.toAddress(address));
  }

  async findOne(
    userId: string,
    addressId: string,
  ): Promise<ReturnType<typeof this.toAddress>> {
    const address = await this.findOwnedAddressOrThrow(userId, addressId);

    return this.toAddress(address);
  }

  async create(
    userId: string,
    createUserAddressDto: CreateUserAddressDto,
  ): Promise<{
    message: string;
    data: { address: ReturnType<typeof this.toAddress> };
  }> {
    const [user, location] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          fullName: true,
          phoneNumber: true,
        },
      }),
      this.validateLocationPair(
        createUserAddressDto.countryId,
        createUserAddressDto.cityId,
      ),
    ]);

    if (!user) {
      throw new NotFoundException('User not found.');
    }

    const address = await this.prisma.userAddress.create({
      data: {
        userId,
        countryId: location.country.id,
        cityId: location.city.id,
        state: createUserAddressDto.state,
        addressLine1: createUserAddressDto.addressLine1,
        addressLine2: createUserAddressDto.addressLine2,
        postalCode: createUserAddressDto.postalCode,
        latitude: createUserAddressDto.latitude,
        longitude: createUserAddressDto.longitude,
        notes: createUserAddressDto.notes,
        fullName: user.fullName,
        phoneNumber: user.phoneNumber,
        city: location.city.nameEn,
        country: location.country.isoCode,
      },
      select: addressSelect,
    });

    return {
      message: 'Address created successfully',
      data: {
        address: this.toAddress(address),
      },
    };
  }

  async update(
    userId: string,
    addressId: string,
    updateUserAddressDto: UpdateUserAddressDto,
  ): Promise<{
    message: string;
    data: { address: ReturnType<typeof this.toAddress> };
  }> {
    const existingAddress = await this.prisma.userAddress.findFirst({
      where: {
        id: addressId,
        userId,
      },
      select: {
        id: true,
        countryId: true,
        cityId: true,
      },
    });

    if (!existingAddress) {
      throw new NotFoundException('Address not found.');
    }

    const countryId =
      updateUserAddressDto.countryId ?? existingAddress.countryId;
    const cityId = updateUserAddressDto.cityId ?? existingAddress.cityId;
    const shouldValidateLocation =
      updateUserAddressDto.countryId !== undefined ||
      updateUserAddressDto.cityId !== undefined;
    const location = shouldValidateLocation
      ? await this.validateLocationPair(countryId, cityId)
      : null;
    const data: Prisma.UserAddressUpdateInput = {};

    if (location) {
      data.addressCountry = { connect: { id: location.country.id } };
      data.addressCity = { connect: { id: location.city.id } };
      data.country = location.country.isoCode;
      data.city = location.city.nameEn;
    }

    if (updateUserAddressDto.state !== undefined) {
      data.state = updateUserAddressDto.state;
    }

    if (updateUserAddressDto.addressLine1 !== undefined) {
      data.addressLine1 = updateUserAddressDto.addressLine1;
    }

    if (updateUserAddressDto.addressLine2 !== undefined) {
      data.addressLine2 = updateUserAddressDto.addressLine2;
    }

    if (updateUserAddressDto.postalCode !== undefined) {
      data.postalCode = updateUserAddressDto.postalCode;
    }

    if (updateUserAddressDto.latitude !== undefined) {
      data.latitude = updateUserAddressDto.latitude;
    }

    if (updateUserAddressDto.longitude !== undefined) {
      data.longitude = updateUserAddressDto.longitude;
    }

    if (updateUserAddressDto.notes !== undefined) {
      data.notes = updateUserAddressDto.notes;
    }

    const address = await this.prisma.userAddress.update({
      where: { id: addressId },
      data,
      select: addressSelect,
    });

    return {
      message: 'Address updated successfully',
      data: {
        address: this.toAddress(address),
      },
    };
  }

  async delete(
    userId: string,
    addressId: string,
  ): Promise<{ message: string; data: Record<string, never> }> {
    const existingAddress = await this.prisma.userAddress.findFirst({
      where: {
        id: addressId,
        userId,
      },
      select: { id: true },
    });

    if (!existingAddress) {
      throw new NotFoundException('Address not found.');
    }

    await this.prisma.userAddress.delete({
      where: { id: addressId },
    });

    return {
      message: 'Address deleted successfully',
      data: {},
    };
  }

  private async findOwnedAddressOrThrow(
    userId: string,
    addressId: string,
  ): Promise<AddressRecord> {
    const address = await this.prisma.userAddress.findFirst({
      where: {
        id: addressId,
        userId,
      },
      select: addressSelect,
    });

    if (!address) {
      throw new NotFoundException('Address not found.');
    }

    return address;
  }

  private async validateLocationPair(
    countryId: string,
    cityId: string,
  ): Promise<LocationPair> {
    const country = await this.prisma.country.findFirst({
      where: {
        id: countryId,
        isActive: true,
      },
      select: {
        id: true,
        nameAr: true,
        nameEn: true,
        isoCode: true,
      },
    });

    if (!country) {
      throw new BadRequestException('Country does not exist or is inactive.');
    }

    const city = await this.prisma.city.findFirst({
      where: {
        id: cityId,
        isActive: true,
      },
      select: {
        id: true,
        countryId: true,
        nameAr: true,
        nameEn: true,
      },
    });

    if (!city) {
      throw new BadRequestException('City does not exist or is inactive.');
    }

    if (city.countryId !== country.id) {
      throw new BadRequestException(
        'City does not belong to the selected country.',
      );
    }

    return { country, city };
  }

  private toAddress(address: AddressRecord) {
    return {
      id: address.id,
      userId: address.userId,
      countryId: address.countryId,
      cityId: address.cityId,
      state: address.state,
      addressLine1: address.addressLine1,
      addressLine2: address.addressLine2,
      postalCode: address.postalCode,
      latitude:
        address.latitude === null ? null : Number(address.latitude.toString()),
      longitude:
        address.longitude === null
          ? null
          : Number(address.longitude.toString()),
      notes: address.notes,
      country: address.addressCountry,
      city: address.addressCity,
      createdAt: address.createdAt,
      updatedAt: address.updatedAt,
    };
  }
}
