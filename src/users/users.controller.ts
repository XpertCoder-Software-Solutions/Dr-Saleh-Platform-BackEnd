import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  Request,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { Request as ExpressRequest } from 'express';
import { mkdirSync } from 'fs';
import { extname, join } from 'path';
import { randomUUID } from 'crypto';
import { diskStorage } from 'multer';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { AuthenticatedUser } from '../auth/jwt.strategy';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UsersService } from './users.service';

const profileImagesUploadDirectory = join(
  process.cwd(),
  'uploads',
  'users',
  'profile-images',
);
const allowedProfileImageExtensions = new Set([
  '.jpg',
  '.jpeg',
  '.png',
  '.webp',
]);
const allowedProfileImageMimeTypes = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
]);

type AuthenticatedRequest = ExpressRequest & {
  user: AuthenticatedUser;
};

@ApiTags('Users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('profile')
  @ApiOperation({ summary: 'Get the current authenticated user profile.' })
  @ApiOkResponse({ description: 'Current user profile returned.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  getProfile(@Request() request: AuthenticatedRequest) {
    return this.usersService.getProfile(request.user.id);
  }

  @Patch('profile')
  @ApiOperation({ summary: 'Update the current authenticated user profile.' })
  @ApiOkResponse({ description: 'Profile updated successfully.' })
  @ApiBadRequestResponse({ description: 'Invalid request body.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  updateProfile(
    @Request() request: AuthenticatedRequest,
    @Body() updateProfileDto: UpdateProfileDto,
  ) {
    return this.usersService.updateProfile(request.user.id, updateProfileDto);
  }

  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Change the current user password.' })
  @ApiOkResponse({ description: 'Password changed successfully.' })
  @ApiBadRequestResponse({ description: 'Invalid password change request.' })
  @ApiUnauthorizedResponse({ description: 'Missing token or wrong password.' })
  changePassword(
    @Request() request: AuthenticatedRequest,
    @Body() changePasswordDto: ChangePasswordDto,
  ) {
    return this.usersService.changePassword(request.user.id, changePasswordDto);
  }

  @Post('profile-image')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(
    FileInterceptor('profileImage', {
      storage: diskStorage({
        destination: (_request, _file, callback) => {
          mkdirSync(profileImagesUploadDirectory, { recursive: true });
          callback(null, profileImagesUploadDirectory);
        },
        filename: (_request, file, callback) => {
          const extension = extname(file.originalname).toLowerCase();
          callback(null, `${randomUUID()}${extension}`);
        },
      }),
      limits: {
        fileSize: 2 * 1024 * 1024,
      },
      fileFilter: (_request, file, callback) => {
        const extension = extname(file.originalname).toLowerCase();

        if (
          !allowedProfileImageExtensions.has(extension) ||
          !allowedProfileImageMimeTypes.has(file.mimetype)
        ) {
          callback(
            new BadRequestException(
              'Profile image must be a jpg, jpeg, png, or webp file.',
            ),
            false,
          );
          return;
        }

        callback(null, true);
      },
    }),
  )
  @ApiOperation({
    summary: 'Upload or replace the current user profile image.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        profileImage: {
          type: 'string',
          format: 'binary',
        },
      },
      required: ['profileImage'],
    },
  })
  @ApiOkResponse({ description: 'Profile image updated successfully.' })
  @ApiBadRequestResponse({ description: 'Invalid image upload.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  updateProfileImage(
    @Request() request: AuthenticatedRequest,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('profileImage file is required.');
    }

    return this.usersService.updateProfileImage(
      request.user.id,
      `/uploads/users/profile-images/${file.filename}`,
    );
  }

  @Delete('profile-image')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete the current user profile image.' })
  @ApiOkResponse({ description: 'Profile image deleted successfully.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  deleteProfileImage(@Request() request: AuthenticatedRequest) {
    return this.usersService.deleteProfileImage(request.user.id);
  }
}
