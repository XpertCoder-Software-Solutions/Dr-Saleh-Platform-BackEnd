import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { unlink } from 'fs/promises';
import { join, resolve } from 'path';
import { PrismaService } from '../database/prisma.service';
import { PasswordService } from '../auth/services/password.service';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';

const profileUserSelect = {
  id: true,
  firstName: true,
  lastName: true,
  fullName: true,
  email: true,
  phoneNumber: true,
  profileImage: true,
  gender: true,
  dateOfBirth: true,
  emailVerifiedAt: true,
  phoneVerifiedAt: true,
  lastLoginAt: true,
  role: {
    select: {
      name: true,
    },
  },
  isActive: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.UserSelect;

type ProfileUser = Prisma.UserGetPayload<{
  select: typeof profileUserSelect;
}>;

@Injectable()
export class UsersService {
  private readonly uploadsRoot = resolve(process.cwd(), 'uploads');

  constructor(
    private readonly prisma: PrismaService,
    private readonly passwordService: PasswordService,
  ) {}

  async getProfile(userId: string): Promise<ReturnType<typeof this.toProfile>> {
    const user = await this.findProfileUserOrThrow(userId);

    return this.toProfile(user);
  }

  async updateProfile(
    userId: string,
    updateProfileDto: UpdateProfileDto,
  ): Promise<{
    message: string;
    data: { user: ReturnType<typeof this.toProfile> };
  }> {
    const currentUser = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        fullName: true,
        phoneNumber: true,
      },
    });

    if (!currentUser) {
      throw new NotFoundException('User not found.');
    }

    const data: Prisma.UserUpdateInput = {};

    if (updateProfileDto.firstName !== undefined) {
      data.firstName = updateProfileDto.firstName;
    }

    if (updateProfileDto.lastName !== undefined) {
      data.lastName = updateProfileDto.lastName;
    }

    if (
      updateProfileDto.firstName !== undefined ||
      updateProfileDto.lastName !== undefined
    ) {
      const fallbackName = this.splitFullName(currentUser.fullName);
      const firstName =
        updateProfileDto.firstName ??
        currentUser.firstName ??
        fallbackName.firstName;
      const lastName =
        updateProfileDto.lastName ??
        currentUser.lastName ??
        fallbackName.lastName;

      data.fullName = [firstName, lastName].filter(Boolean).join(' ');
    }

    if (updateProfileDto.phone !== undefined) {
      const phone = updateProfileDto.phone.trim();

      if (phone !== currentUser.phoneNumber) {
        await this.ensurePhoneIsUnique(phone, userId);
        data.phoneNumber = phone;
        data.phoneVerifiedAt = null;
        data.isPhoneVerified = false;
      }
    }

    if (updateProfileDto.gender !== undefined) {
      data.gender = updateProfileDto.gender;
    }

    if (updateProfileDto.dateOfBirth !== undefined) {
      data.dateOfBirth = new Date(updateProfileDto.dateOfBirth);
    }

    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data,
      select: profileUserSelect,
    });

    return {
      message: 'Profile updated successfully',
      data: {
        user: this.toProfile(updatedUser),
      },
    };
  }

  async changePassword(
    userId: string,
    changePasswordDto: ChangePasswordDto,
  ): Promise<{ message: string; data: Record<string, never> }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        passwordHash: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found.');
    }

    const isCurrentPasswordValid = await this.passwordService.comparePassword(
      changePasswordDto.currentPassword,
      user.passwordHash,
    );

    if (!isCurrentPasswordValid) {
      throw new UnauthorizedException('Current password is incorrect.');
    }

    const isSamePassword = await this.passwordService.comparePassword(
      changePasswordDto.newPassword,
      user.passwordHash,
    );

    if (isSamePassword) {
      throw new BadRequestException(
        'New password must be different from current password.',
      );
    }

    const passwordHash = await this.passwordService.hashPassword(
      changePasswordDto.newPassword,
    );

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash,
        hashedRefreshToken: null,
      },
    });

    return {
      message: 'Password changed successfully',
      data: {},
    };
  }

  async updateProfileImage(
    userId: string,
    profileImagePath: string,
  ): Promise<{
    message: string;
    data: { profileImage: string; user: ReturnType<typeof this.toProfile> };
  }> {
    const currentUser = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        profileImage: true,
      },
    });

    if (!currentUser) {
      await this.deleteLocalUpload(profileImagePath);
      throw new NotFoundException('User not found.');
    }

    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: {
        profileImage: profileImagePath,
      },
      select: profileUserSelect,
    });

    await this.deleteLocalUpload(currentUser.profileImage);

    return {
      message: 'Profile image updated successfully',
      data: {
        profileImage: profileImagePath,
        user: this.toProfile(updatedUser),
      },
    };
  }

  async deleteProfileImage(
    userId: string,
  ): Promise<{ message: string; data: Record<string, never> }> {
    const currentUser = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        profileImage: true,
      },
    });

    if (!currentUser) {
      throw new NotFoundException('User not found.');
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        profileImage: null,
      },
    });

    await this.deleteLocalUpload(currentUser.profileImage);

    return {
      message: 'Profile image deleted successfully',
      data: {},
    };
  }

  private async findProfileUserOrThrow(userId: string): Promise<ProfileUser> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: profileUserSelect,
    });

    if (!user) {
      throw new NotFoundException('User not found.');
    }

    return user;
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

  private toProfile(user: ProfileUser) {
    const fallbackName = this.splitFullName(user.fullName);

    return {
      id: user.id,
      firstName: user.firstName ?? fallbackName.firstName,
      lastName: user.lastName ?? fallbackName.lastName,
      email: user.email,
      phone: user.phoneNumber,
      profileImage: user.profileImage,
      gender: user.gender,
      dateOfBirth: user.dateOfBirth,
      emailVerifiedAt: user.emailVerifiedAt,
      phoneVerifiedAt: user.phoneVerifiedAt,
      lastLoginAt: user.lastLoginAt,
      role: user.role.name,
      isActive: user.isActive,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
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

  private async deleteLocalUpload(relativePath: string | null): Promise<void> {
    if (!relativePath?.startsWith('/uploads/')) {
      return;
    }

    const absolutePath = resolve(
      process.cwd(),
      relativePath.replace(/^\//, ''),
    );

    if (!absolutePath.startsWith(this.uploadsRoot)) {
      return;
    }

    try {
      await unlink(absolutePath);
    } catch {
      return;
    }
  }
}
