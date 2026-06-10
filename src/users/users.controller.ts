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
import { mkdirSync } from 'fs';
import { extname, join } from 'path';
import { randomUUID } from 'crypto';
import { diskStorage } from 'multer';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
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
  getProfile(@CurrentUser('id') userId: string) {
    return this.usersService.getProfile(userId);
  }

  @Patch('profile')
  @ApiOperation({ summary: 'Update the current authenticated user profile.' })
  @ApiOkResponse({ description: 'Profile updated successfully.' })
  @ApiBadRequestResponse({ description: 'Invalid request body.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  updateProfile(
    @CurrentUser('id') userId: string,
    @Body() updateProfileDto: UpdateProfileDto,
  ) {
    return this.usersService.updateProfile(userId, updateProfileDto);
  }

  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Change the current user password.' })
  @ApiOkResponse({ description: 'Password changed successfully.' })
  @ApiBadRequestResponse({ description: 'Invalid password change request.' })
  @ApiUnauthorizedResponse({ description: 'Missing token or wrong password.' })
  changePassword(
    @CurrentUser('id') userId: string,
    @Body() changePasswordDto: ChangePasswordDto,
  ) {
    return this.usersService.changePassword(userId, changePasswordDto);
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
    @CurrentUser('id') userId: string,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('profileImage file is required.');
    }

    return this.usersService.updateProfileImage(
      userId,
      `/uploads/users/profile-images/${file.filename}`,
    );
  }

  @Delete('profile-image')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete the current user profile image.' })
  @ApiOkResponse({ description: 'Profile image deleted successfully.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  deleteProfileImage(@CurrentUser('id') userId: string) {
    return this.usersService.deleteProfileImage(userId);
  }
}
