import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
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
import { Throttle } from '@nestjs/throttler';
import type { Request } from 'express';
import { AuditAction } from '../audit-logs/audit-action.decorator';
import {
  AuditActions,
  AuditEntityTypes,
} from '../audit-logs/audit-log.constants';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import {
  AuthAuditContext,
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

const AUTH_LOGIN_THROTTLE = { default: { limit: 10, ttl: 60_000 } } as const;
const AUTH_OTP_REQUEST_THROTTLE = {
  default: { limit: 3, ttl: 60_000 },
} as const;
const AUTH_OTP_VERIFY_THROTTLE = {
  default: { limit: 10, ttl: 60_000 },
} as const;

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
  @Throttle(AUTH_OTP_VERIFY_THROTTLE)
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
  @ApiTooManyRequestsResponse({
    description: 'Too many email verification attempts.',
  })
  verifyEmail(
    @Body() verifyEmailDto: VerifyEmailDto,
    @Req() request: Request,
  ): Promise<MessageResult> {
    return this.authService.verifyEmail(
      verifyEmailDto,
      this.getAuditContext(request),
    );
  }

  @Post('resend-email-verification')
  @Throttle(AUTH_OTP_REQUEST_THROTTLE)
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
  @Throttle(AUTH_LOGIN_THROTTLE)
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
  @ApiTooManyRequestsResponse({ description: 'Too many login attempts.' })
  login(
    @Body() loginDto: LoginDto,
    @Req() request: Request,
  ): Promise<LoginResult> {
    return this.authService.login(loginDto, this.getAuditContext(request));
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
  @AuditAction({
    action: AuditActions.UserLogout,
    entityType: AuditEntityTypes.User,
    entityIdFromActor: true,
    description: 'User logged out.',
    includeBody: false,
  })
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
  logout(@CurrentUser('id') userId: string): Promise<MessageResult> {
    return this.authService.logout(userId);
  }

  @Post('forgot-password')
  @Throttle(AUTH_OTP_REQUEST_THROTTLE)
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
    @Req() request: Request,
  ): Promise<MessageResult> {
    return this.authService.forgotPassword(
      forgotPasswordDto,
      this.getAuditContext(request),
    );
  }

  @Post('reset-password')
  @Throttle(AUTH_OTP_VERIFY_THROTTLE)
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
  @ApiTooManyRequestsResponse({
    description: 'Too many password reset attempts.',
  })
  resetPassword(
    @Body() resetPasswordDto: ResetPasswordDto,
    @Req() request: Request,
  ): Promise<MessageResult> {
    return this.authService.resetPassword(
      resetPasswordDto,
      this.getAuditContext(request),
    );
  }

  private getAuditContext(request: Request): AuthAuditContext {
    const forwardedFor = this.getHeaderValue(
      request.headers['x-forwarded-for'],
    );

    return {
      ipAddress: forwardedFor?.split(',')[0]?.trim() ?? request.ip,
      userAgent: this.getHeaderValue(request.headers['user-agent']),
    };
  }

  private getHeaderValue(value: string | string[] | undefined) {
    return Array.isArray(value) ? value[0] : value;
  }
}
