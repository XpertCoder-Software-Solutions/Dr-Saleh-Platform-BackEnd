import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiInternalServerErrorResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiServiceUnavailableResponse,
  ApiTags,
  ApiTooManyRequestsResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { Request as ExpressRequest } from 'express';
import {
  AuthService,
  LoginResult,
  MessageResult,
  RefreshTokenResult,
  RegisterResult,
} from './auth.service';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { RegisterDto } from './dto/register.dto';
import { ResendEmailVerificationDto } from './dto/resend-email-verification.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { JwtAuthGuard } from './jwt-auth.guard';
import type { AuthenticatedUser } from './jwt.strategy';

type AuthenticatedRequest = ExpressRequest & {
  user: AuthenticatedUser;
};

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register a user and send email verification OTP.' })
  @ApiCreatedResponse({
    description: 'Account created and verification code sent.',
    schema: {
      example: {
        message:
          'Account created successfully. Verification code sent to your email.',
        data: {
          user: {
            id: '6f893ec2-5c3a-4d39-bb89-66dd3d9ad179',
            fullName: 'Ahmed Saleh',
            email: 'ahmed@example.com',
            phoneNumber: '+201001234567',
            referralCode: 'ABC123',
            isEmailVerified: false,
          },
        },
      },
    },
  })
  @ApiBadRequestResponse({ description: 'Invalid request body.' })
  @ApiConflictResponse({
    description:
      'Email, phone number, or generated referral code already conflicts.',
  })
  @ApiNotFoundResponse({ description: 'Referral code not found.' })
  @ApiInternalServerErrorResponse({
    description: 'Default user role is not configured.',
  })
  @ApiServiceUnavailableResponse({
    description: 'Verification email could not be sent.',
  })
  register(@Body() registerDto: RegisterDto): Promise<RegisterResult> {
    return this.authService.register(registerDto);
  }

  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify a user email address using a 6-digit OTP.' })
  @ApiOkResponse({
    description: 'Email verified successfully.',
    schema: {
      example: {
        message: 'Email verified successfully',
      },
    },
  })
  @ApiBadRequestResponse({
    description:
      'OTP is missing, expired, invalid, exhausted, or email verified.',
  })
  @ApiNotFoundResponse({ description: 'User not found.' })
  verifyEmail(@Body() verifyEmailDto: VerifyEmailDto): Promise<MessageResult> {
    return this.authService.verifyEmail(verifyEmailDto);
  }

  @Post('resend-email-verification')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Resend email verification OTP.' })
  @ApiOkResponse({
    description: 'Verification OTP sent successfully.',
    schema: {
      example: {
        message: 'Verification OTP sent successfully',
      },
    },
  })
  @ApiBadRequestResponse({ description: 'Email is already verified.' })
  @ApiNotFoundResponse({ description: 'User not found.' })
  @ApiTooManyRequestsResponse({
    description: 'Verification OTP resend cooldown is still active.',
  })
  @ApiServiceUnavailableResponse({
    description: 'Verification email could not be sent.',
  })
  resendEmailVerification(
    @Body() resendEmailVerificationDto: ResendEmailVerificationDto,
  ): Promise<MessageResult> {
    return this.authService.resendEmailVerification(resendEmailVerificationDto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login with verified email and password.' })
  @ApiOkResponse({
    description: 'Login successful.',
    schema: {
      example: {
        message: 'Login successful',
        data: {
          accessToken: 'access.jwt.token',
          refreshToken: 'refresh.jwt.token',
          user: {
            id: '6f893ec2-5c3a-4d39-bb89-66dd3d9ad179',
            name: 'Ahmed Saleh',
            email: 'ahmed@example.com',
            phone: '+201001234567',
            role: 'User',
          },
        },
      },
    },
  })
  @ApiBadRequestResponse({ description: 'Invalid request body.' })
  @ApiUnauthorizedResponse({ description: 'Invalid email or password.' })
  @ApiForbiddenResponse({
    description: 'User is inactive or email is not verified.',
  })
  login(@Body() loginDto: LoginDto): Promise<LoginResult> {
    return this.authService.login(loginDto);
  }

  @Post('refresh-token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Rotate refresh token and issue a new access token.',
  })
  @ApiOkResponse({
    description: 'Token refreshed successfully.',
    schema: {
      example: {
        accessToken: 'new.access.jwt.token',
        refreshToken: 'new.refresh.jwt.token',
      },
    },
  })
  @ApiBadRequestResponse({ description: 'Invalid request body.' })
  @ApiUnauthorizedResponse({ description: 'Invalid refresh token.' })
  refreshToken(
    @Body() refreshTokenDto: RefreshTokenDto,
  ): Promise<RefreshTokenResult> {
    return this.authService.refreshToken(refreshTokenDto);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Logout the current authenticated user.' })
  @ApiOkResponse({
    description: 'Logged out successfully.',
    schema: {
      example: {
        message: 'Logged out successfully',
      },
    },
  })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  logout(@Request() request: AuthenticatedRequest): Promise<MessageResult> {
    return this.authService.logout(request.user.id);
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send a password reset OTP when the email exists.' })
  @ApiOkResponse({
    description: 'Generic password reset response.',
    schema: {
      example: {
        message: 'If this email exists, a password reset OTP has been sent',
      },
    },
  })
  @ApiBadRequestResponse({ description: 'Invalid request body.' })
  @ApiTooManyRequestsResponse({
    description: 'Password reset OTP resend cooldown is still active.',
  })
  @ApiServiceUnavailableResponse({
    description: 'Password reset email could not be sent.',
  })
  forgotPassword(
    @Body() forgotPasswordDto: ForgotPasswordDto,
  ): Promise<MessageResult> {
    return this.authService.forgotPassword(forgotPasswordDto);
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset password using a 6-digit email OTP.' })
  @ApiOkResponse({
    description: 'Password reset successfully.',
    schema: {
      example: {
        message: 'Password reset successfully',
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'OTP is missing, expired, invalid, or exhausted.',
  })
  @ApiNotFoundResponse({ description: 'User not found.' })
  resetPassword(
    @Body() resetPasswordDto: ResetPasswordDto,
  ): Promise<MessageResult> {
    return this.authService.resetPassword(resetPasswordDto);
  }
}
