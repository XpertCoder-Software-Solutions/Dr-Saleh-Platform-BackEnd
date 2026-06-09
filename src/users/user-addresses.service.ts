import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { CreateUserAddressDto } from './dto/create-user-address.dto';
import { UpdateUserAddressDto } from './dto/update-user-address.dto';

const addressGovernorateSelect = {
  id: true,
  nameAr: true,
  nameEn: true,
  shippingCost: true,
  isActive: true,
} satisfies Prisma.GovernorateSelect;

const addressSelect = {
  id: true,
  userId: true,
  fullName: true,
  phoneNumber: true,
  governorateId: true,
  city: true,
  street: true,
  buildingNumber: true,
  floor: true,
  apartment: true,
  landmark: true,
  notes: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
  governorate: {
    select: addressGovernorateSelect,
  },
} satisfies Prisma.UserAddressSelect;

type AddressRecord = Prisma.UserAddressGetPayload<{
  select: typeof addressSelect;
}>;

type GovernorateRecord = Prisma.GovernorateGetPayload<{
  select: typeof addressGovernorateSelect;
}>;

@Injectable()
export class UserAddressesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(userId: string) {
    const addresses = await this.prisma.userAddress.findMany({
      where: {
        userId,
        isActive: true,
      },
      select: addressSelect,
      orderBy: { createdAt: 'desc' },
    });

    return {
      message: 'Addresses returned successfully',
      data: {
        addresses: addresses.map((address) => this.toAddress(address)),
      },
    };
  }

  async findOne(userId: string, addressId: string) {
    const address = await this.findOwnedActiveAddressOrThrow(userId, addressId);

    return {
      message: 'Address returned successfully',
      data: {
        address: this.toAddress(address),
      },
    };
  }

  async create(userId: string, createUserAddressDto: CreateUserAddressDto) {
    const governorate = await this.validateGovernorate(
      createUserAddressDto.governorateId,
    );

    const address = await this.prisma.userAddress.create({
      data: {
        userId,
        fullName: createUserAddressDto.fullName,
        phoneNumber: createUserAddressDto.phoneNumber,
        governorateId: governorate.id,
        city: createUserAddressDto.city,
        street: createUserAddressDto.street,
        buildingNumber: createUserAddressDto.buildingNumber,
        floor: createUserAddressDto.floor,
        apartment: createUserAddressDto.apartment,
        landmark: createUserAddressDto.landmark,
        notes: createUserAddressDto.notes,
        isActive: createUserAddressDto.isActive ?? true,
        state: createUserAddressDto.city,
        addressLine1: createUserAddressDto.street,
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
  ) {
    if (!this.hasProvidedFields(updateUserAddressDto)) {
      throw new BadRequestException(
        'Provide at least one address field to update.',
      );
    }

    await this.findOwnedActiveAddressOrThrow(userId, addressId);

    const data: Prisma.UserAddressUpdateInput = {};

    if (updateUserAddressDto.governorateId !== undefined) {
      const governorate = await this.validateGovernorate(
        updateUserAddressDto.governorateId,
      );

      data.governorate = { connect: { id: governorate.id } };
    }

    if (updateUserAddressDto.fullName !== undefined) {
      data.fullName = updateUserAddressDto.fullName;
    }

    if (updateUserAddressDto.phoneNumber !== undefined) {
      data.phoneNumber = updateUserAddressDto.phoneNumber;
    }

    if (updateUserAddressDto.city !== undefined) {
      data.city = updateUserAddressDto.city;
      data.state = updateUserAddressDto.city;
    }

    if (updateUserAddressDto.street !== undefined) {
      data.street = updateUserAddressDto.street;
      data.addressLine1 = updateUserAddressDto.street;
    }

    if (updateUserAddressDto.buildingNumber !== undefined) {
      data.buildingNumber = updateUserAddressDto.buildingNumber;
    }

    if (updateUserAddressDto.floor !== undefined) {
      data.floor = updateUserAddressDto.floor;
    }

    if (updateUserAddressDto.apartment !== undefined) {
      data.apartment = updateUserAddressDto.apartment;
    }

    if (updateUserAddressDto.landmark !== undefined) {
      data.landmark = updateUserAddressDto.landmark;
    }

    if (updateUserAddressDto.notes !== undefined) {
      data.notes = updateUserAddressDto.notes;
    }

    if (updateUserAddressDto.isActive !== undefined) {
      data.isActive = updateUserAddressDto.isActive;
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
    const existingAddress = await this.findOwnedActiveAddressOrThrow(
      userId,
      addressId,
    );

    await this.prisma.userAddress.update({
      where: { id: existingAddress.id },
      data: { isActive: false },
      select: { id: true },
    });

    return {
      message: 'Address deleted successfully',
      data: {},
    };
  }

  private async findOwnedActiveAddressOrThrow(
    userId: string,
    addressId: string,
  ): Promise<AddressRecord> {
    const address = await this.prisma.userAddress.findFirst({
      where: {
        id: addressId,
        userId,
        isActive: true,
      },
      select: addressSelect,
    });

    if (!address) {
      throw new NotFoundException('Address not found.');
    }

    return address;
  }

  private async validateGovernorate(id: string): Promise<GovernorateRecord> {
    const governorate = await this.prisma.governorate.findFirst({
      where: {
        id,
        isActive: true,
      },
      select: addressGovernorateSelect,
    });

    if (!governorate) {
      throw new BadRequestException(
        'Governorate does not exist or is inactive.',
      );
    }

    return governorate;
  }

  private toAddress(address: AddressRecord) {
    return {
      id: address.id,
      userId: address.userId,
      fullName: address.fullName,
      phoneNumber: address.phoneNumber,
      governorateId: address.governorateId,
      city: address.city,
      street: address.street,
      buildingNumber: address.buildingNumber,
      floor: address.floor,
      apartment: address.apartment,
      landmark: address.landmark,
      notes: address.notes,
      isActive: address.isActive,
      governorate:
        address.governorate === null
          ? null
          : {
              id: address.governorate.id,
              nameAr: address.governorate.nameAr,
              nameEn: address.governorate.nameEn,
              shippingCost: this.toNumberFromDecimal(
                address.governorate.shippingCost,
              ),
              isActive: address.governorate.isActive,
            },
      createdAt: address.createdAt,
      updatedAt: address.updatedAt,
    };
  }

  private toNumberFromDecimal(decimal: Prisma.Decimal): number {
    return Number(decimal.toString());
  }

  private hasProvidedFields(dto: object): boolean {
    return Object.values(dto).some((value) => value !== undefined);
  }
}
