import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, RoleName } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { PasswordService } from '../auth/services/password.service';
import {
  buildPaginationMeta,
  getPaginationParams,
} from '../common/utils/pagination';
import {
  getPrismaUniqueConstraintFields,
  isPrismaUniqueConstraintError,
} from '../common/utils/prisma-errors';
import { AdminQueryDto } from './dto/admin-query.dto';
import { CreateAdminDto } from './dto/create-admin.dto';
import { UpdateAdminDto } from './dto/update-admin.dto';

const adminSelect = {
  id: true,
  firstName: true,
  lastName: true,
  fullName: true,
  email: true,
  phoneNumber: true,
  isEmailVerified: true,
  emailVerifiedAt: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
  role: {
    select: {
      name: true,
    },
  },
} satisfies Prisma.UserSelect;

type AdminRecord = Prisma.UserGetPayload<{ select: typeof adminSelect }>;

@Injectable()
export class AdminManagementService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly passwordService: PasswordService,
  ) {}

  async findAll(query: AdminQueryDto) {
    const { page, limit, skip } = getPaginationParams(query);
    const where = this.buildAdminWhere(query);

    const [total, admins] = await this.prisma.$transaction([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({
        where,
        select: adminSelect,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    return {
      message: 'Admins returned successfully',
      data: {
        admins: admins.map((admin) => this.toAdmin(admin)),
        pagination: buildPaginationMeta(page, limit, total),
      },
    };
  }

  async findOne(id: string) {
    const admin = await this.findAdminOrThrow(id);

    return {
      message: 'Admin returned successfully',
      data: {
        admin: this.toAdmin(admin),
      },
    };
  }

  async create(createAdminDto: CreateAdminDto) {
    const fullName = createAdminDto.fullName.trim();
    const { firstName, lastName } = this.splitFullName(fullName);
    const email = createAdminDto.email.trim().toLowerCase();
    const phoneNumber = createAdminDto.phoneNumber.trim();
    const adminRole = await this.prisma.role.findUnique({
      where: { name: RoleName.Admin },
      select: { id: true },
    });

    if (!adminRole) {
      throw new InternalServerErrorException(
        'Admin role is not configured. Please run the roles seed.',
      );
    }

    await this.ensureEmailAndPhoneAreUnique(email, phoneNumber);

    const passwordHash = await this.passwordService.hashPassword(
      createAdminDto.password,
    );

    try {
      const admin = await this.prisma.user.create({
        data: {
          roleId: adminRole.id,
          firstName,
          lastName,
          fullName,
          email,
          phoneNumber,
          passwordHash,
          isEmailVerified: true,
          emailVerifiedAt: new Date(),
          isActive: true,
        },
        select: adminSelect,
      });

      return {
        message: 'Admin created successfully',
        data: {
          admin: this.toAdmin(admin),
        },
      };
    } catch (error) {
      this.handleUniqueConstraintError(error);
      throw error;
    }
  }

  async update(
    actingAdminId: string,
    adminId: string,
    updateAdminDto: UpdateAdminDto,
  ) {
    if (!this.hasProvidedFields(updateAdminDto)) {
      throw new BadRequestException(
        'Provide at least one admin field to update.',
      );
    }

    const existingAdmin = await this.findAdminOrThrow(adminId);

    if (updateAdminDto.isActive === false) {
      if (actingAdminId === adminId) {
        throw new ConflictException('Admins cannot deactivate themselves.');
      }
    }

    if (
      updateAdminDto.phoneNumber !== undefined &&
      updateAdminDto.phoneNumber !== existingAdmin.phoneNumber
    ) {
      await this.ensurePhoneIsUnique(updateAdminDto.phoneNumber, adminId);
    }

    const data = await this.buildUpdateData(existingAdmin, updateAdminDto);

    try {
      const admin = await this.prisma.$transaction(
        async (tx) => {
          if (updateAdminDto.isActive === false && existingAdmin.isActive) {
            const activeAdminsCount = await tx.user.count({
              where: {
                isActive: true,
                role: { name: RoleName.Admin },
              },
            });

            if (activeAdminsCount <= 1) {
              throw new ConflictException(
                'Cannot deactivate the last active admin.',
              );
            }
          }

          return tx.user.update({
            where: { id: adminId },
            data,
            select: adminSelect,
          });
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );

      return {
        message: 'Admin updated successfully',
        data: {
          admin: this.toAdmin(admin),
        },
      };
    } catch (error) {
      this.handleUniqueConstraintError(error);
      throw error;
    }
  }

  private buildAdminWhere(query: AdminQueryDto): Prisma.UserWhereInput {
    const search = query.search?.trim();

    return {
      role: { name: RoleName.Admin },
      ...(query.isActive !== undefined ? { isActive: query.isActive } : {}),
      ...(search
        ? {
            OR: [
              { fullName: { contains: search, mode: 'insensitive' } },
              { email: { contains: search, mode: 'insensitive' } },
              { phoneNumber: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
  }

  private async findAdminOrThrow(id: string): Promise<AdminRecord> {
    const admin = await this.prisma.user.findFirst({
      where: {
        id,
        role: { name: RoleName.Admin },
      },
      select: adminSelect,
    });

    if (!admin) {
      throw new NotFoundException('Admin not found.');
    }

    return admin;
  }

  private async buildUpdateData(
    existingAdmin: AdminRecord,
    updateAdminDto: UpdateAdminDto,
  ): Promise<Prisma.UserUpdateInput> {
    const data: Prisma.UserUpdateInput = {};

    if (updateAdminDto.fullName !== undefined) {
      const fullName = updateAdminDto.fullName.trim();
      const { firstName, lastName } = this.splitFullName(fullName);

      data.fullName = fullName;
      data.firstName = firstName;
      data.lastName = lastName;
    }

    if (updateAdminDto.phoneNumber !== undefined) {
      data.phoneNumber = updateAdminDto.phoneNumber.trim();
    }

    if (updateAdminDto.isActive !== undefined) {
      data.isActive = updateAdminDto.isActive;
    }

    if (updateAdminDto.password !== undefined) {
      const adminCredentials = await this.prisma.user.findUnique({
        where: { id: existingAdmin.id },
        select: { passwordHash: true },
      });

      if (!adminCredentials) {
        throw new NotFoundException('Admin not found.');
      }

      data.passwordHash = await this.passwordService.hashPassword(
        updateAdminDto.password,
      );
      data.hashedRefreshToken = null;
    }

    return data;
  }

  private async ensureEmailAndPhoneAreUnique(
    email: string,
    phoneNumber: string,
  ): Promise<void> {
    const existingUser = await this.prisma.user.findFirst({
      where: {
        OR: [{ email }, { phoneNumber }],
      },
      select: {
        email: true,
        phoneNumber: true,
      },
    });

    if (!existingUser) {
      return;
    }

    if (existingUser.email === email) {
      throw new ConflictException('Email is already registered.');
    }

    throw new ConflictException('Phone number is already registered.');
  }

  private async ensurePhoneIsUnique(
    phoneNumber: string,
    userId: string,
  ): Promise<void> {
    const existingUser = await this.prisma.user.findUnique({
      where: { phoneNumber },
      select: { id: true },
    });

    if (existingUser && existingUser.id !== userId) {
      throw new ConflictException('Phone number is already registered.');
    }
  }

  private toAdmin(admin: AdminRecord) {
    const fallbackName = this.splitFullName(admin.fullName);

    return {
      id: admin.id,
      firstName: admin.firstName ?? fallbackName.firstName,
      lastName: admin.lastName ?? fallbackName.lastName,
      fullName: admin.fullName,
      email: admin.email,
      phoneNumber: admin.phoneNumber,
      role: admin.role.name,
      isEmailVerified: admin.isEmailVerified,
      emailVerifiedAt: admin.emailVerifiedAt,
      isActive: admin.isActive,
      createdAt: admin.createdAt,
      updatedAt: admin.updatedAt,
    };
  }

  private splitFullName(fullName: string): {
    firstName: string;
    lastName: string | null;
  } {
    const [firstName, ...lastNameParts] = fullName.trim().split(/\s+/);

    return {
      firstName,
      lastName: lastNameParts.length > 0 ? lastNameParts.join(' ') : null,
    };
  }

  private hasProvidedFields(dto: object): boolean {
    return Object.values(dto).some((value) => value !== undefined);
  }

  private handleUniqueConstraintError(error: unknown): void {
    if (isPrismaUniqueConstraintError(error)) {
      const target = getPrismaUniqueConstraintFields(error).join(', ');

      if (target.includes('email')) {
        throw new ConflictException('Email is already registered.');
      }

      if (target.includes('phoneNumber')) {
        throw new ConflictException('Phone number is already registered.');
      }

      throw new ConflictException('Admin unique field already exists.');
    }
  }
}
