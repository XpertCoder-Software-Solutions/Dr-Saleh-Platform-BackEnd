import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Prisma, RoleName } from '@prisma/client';
import { randomBytes } from 'crypto';
import type { StringValue } from 'ms';
import { PrismaService } from '../database/prisma.service';
import { BrevoEmailService } from '../email/brevo-email.service';
import {
  EMAIL_VERIFICATION_OTP_MAX_ATTEMPTS,
  EMAIL_VERIFICATION_OTP_RESEND_COOLDOWN_SECONDS,
  PASSWORD_RESET_OTP_MAX_ATTEMPTS,
  PASSWORD_RESET_OTP_RESEND_COOLDOWN_SECONDS,
} from './constants/email-verification.constants';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { RegisterDto } from './dto/register.dto';
import { ResendEmailVerificationDto } from './dto/resend-email-verification.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { OtpService } from './services/otp.service';
import { PasswordService } from './services/password.service';

const registeredUserSelect = {
  id: true,
  fullName: true,
  email: true,
  phoneNumber: true,
  referralCode: true,
  isEmailVerified: true,
} satisfies Prisma.UserSelect;

const authUserSelect = {
  id: true,
  fullName: true,
  email: true,
  phoneNumber: true,
  isActive: true,
  isEmailVerified: true,
  emailVerifiedAt: true,
  passwordHash: true,
  role: {
    select: {
      name: true,
    },
  },
} satisfies Prisma.UserSelect;

type RegisteredUser = Prisma.UserGetPayload<{
  select: typeof registeredUserSelect;
}>;

type AuthUser = Prisma.UserGetPayload<{
  select: typeof authUserSelect;
}>;

type EmptyData = Record<string, never>;

export type RegisterResult = {
  message: string;
  data: {
    user: RegisteredUser;
  };
};

export type MessageResult = {
  message: string;
  data: EmptyData;
};

export type LoginResult = {
  message: string;
  data: {
    accessToken: string;
    refreshToken: string;
    user: {
      id: string;
      name: string;
      email: string;
      phone: string;
      role: RoleName;
    };
  };
};

export type RefreshTokenResult = {
  message: string;
  data: {
    accessToken: string;
    refreshToken: string;
  };
};

export type JwtTokenPayload = {
  sub: string;
  email: string;
  role: RoleName;
  tokenType: 'access' | 'refresh';
};

@Injectable()
export class AuthService {
  private readonly jwtAccessSecret: string;
  private readonly jwtRefreshSecret: string;
  private readonly jwtAccessExpiresIn: StringValue;
  private readonly jwtRefreshExpiresIn: StringValue;

  constructor(
    private readonly prisma: PrismaService,
    private readonly passwordService: PasswordService,
    private readonly otpService: OtpService,
    private readonly brevoEmailService: BrevoEmailService,
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
  ) {
    this.jwtAccessSecret = this.getRequiredConfig(
      'JWT_ACCESS_SECRET',
      'JWT_SECRET',
    );
    this.jwtRefreshSecret = this.getRequiredConfig('JWT_REFRESH_SECRET');
    this.jwtAccessExpiresIn = this.getConfig(
      'JWT_ACCESS_EXPIRES_IN',
      '15m',
    ) as StringValue;
    this.jwtRefreshExpiresIn = this.getConfig(
      'JWT_REFRESH_EXPIRES_IN',
      '7d',
    ) as StringValue;
  }

  async register(registerDto: RegisterDto): Promise<RegisterResult> {
    const fullName = registerDto.fullName.trim();
    const { firstName, lastName } = this.splitFullName(fullName);
    const email = this.normalizeEmail(registerDto.email);
    const phoneNumber = registerDto.phoneNumber.trim();
    const referralCode = registerDto.referralCode;

    const userRole = await this.prisma.role.findUnique({
      where: { name: RoleName.User },
      select: { id: true },
    });

    if (!userRole) {
      throw new InternalServerErrorException(
        'Default user role is not configured. Please run the roles seed.',
      );
    }

    await this.ensureEmailAndPhoneAreUnique(email, phoneNumber);
    const referrer = referralCode
      ? await this.findReferrerByReferralCodeOrThrow(referralCode)
      : null;

    const otp = this.otpService.generateNumericOtp();
    const [passwordHash, codeHash] = await Promise.all([
      this.passwordService.hashPassword(registerDto.password),
      this.otpService.hashOtp(otp),
    ]);

    const user = await this.createUserWithEmailOtp({
      roleId: userRole.id,
      firstName,
      lastName,
      fullName,
      email,
      phoneNumber,
      passwordHash,
      codeHash,
      expiresAt: this.otpService.getEmailVerificationExpiryDate(),
      sentAt: new Date(),
      referralCode: await this.generateUniqueReferralCode(),
      referrer,
    });

    try {
      await this.brevoEmailService.sendEmailVerificationOtp(
        email,
        fullName,
        otp,
      );
    } catch {
      throw new ServiceUnavailableException(
        'Account created, but verification email could not be sent. Please try again later.',
      );
    }

    return {
      message:
        'Account created successfully. Verification code sent to your email.',
      data: {
        user,
      },
    };
  }

  async verifyEmail(verifyEmailDto: VerifyEmailDto): Promise<MessageResult> {
    const email = this.normalizeEmail(verifyEmailDto.email);
    const user = await this.prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        isEmailVerified: true,
        emailVerifiedAt: true,
        emailVerificationOtpHash: true,
        emailVerificationOtpExpiresAt: true,
        emailVerificationAttempts: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found.');
    }

    if (this.isEmailVerified(user)) {
      throw new BadRequestException('Email is already verified.');
    }

    if (!user.emailVerificationOtpHash) {
      throw new BadRequestException('Email verification OTP is missing.');
    }

    if (!user.emailVerificationOtpExpiresAt) {
      throw new BadRequestException(
        'Email verification OTP expiry is missing.',
      );
    }

    if (this.otpService.isExpired(user.emailVerificationOtpExpiresAt)) {
      throw new BadRequestException('Email verification OTP has expired.');
    }

    if (user.emailVerificationAttempts >= EMAIL_VERIFICATION_OTP_MAX_ATTEMPTS) {
      throw new BadRequestException(
        'Maximum email verification OTP attempts exceeded.',
      );
    }

    const isOtpValid = await this.otpService.compareOtp(
      verifyEmailDto.otp,
      user.emailVerificationOtpHash,
    );

    if (!isOtpValid) {
      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          emailVerificationAttempts: {
            increment: 1,
          },
        },
      });

      throw new BadRequestException('Invalid email verification OTP.');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        isEmailVerified: true,
        emailVerifiedAt: new Date(),
        emailVerificationOtpHash: null,
        emailVerificationOtpExpiresAt: null,
        emailVerificationOtpSentAt: null,
        emailVerificationAttempts: 0,
      },
    });

    return {
      message: 'Email verified successfully',
      data: {},
    };
  }

  async resendEmailVerification(
    resendEmailVerificationDto: ResendEmailVerificationDto,
  ): Promise<MessageResult> {
    const email = this.normalizeEmail(resendEmailVerificationDto.email);
    const user = await this.prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        fullName: true,
        email: true,
        isEmailVerified: true,
        emailVerifiedAt: true,
        emailVerificationOtpSentAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found.');
    }

    if (this.isEmailVerified(user)) {
      throw new BadRequestException('Email is already verified.');
    }

    this.ensureOtpCooldownHasElapsed(
      user.emailVerificationOtpSentAt,
      EMAIL_VERIFICATION_OTP_RESEND_COOLDOWN_SECONDS,
    );

    const otp = this.otpService.generateNumericOtp();
    const codeHash = await this.otpService.hashOtp(otp);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerificationOtpHash: codeHash,
        emailVerificationOtpExpiresAt:
          this.otpService.getEmailVerificationExpiryDate(),
        emailVerificationOtpSentAt: new Date(),
        emailVerificationAttempts: 0,
      },
    });

    try {
      await this.brevoEmailService.sendEmailVerificationOtp(
        user.email,
        user.fullName,
        otp,
      );
    } catch {
      throw new ServiceUnavailableException(
        'Verification email could not be sent. Please try again later.',
      );
    }

    return {
      message: 'Verification OTP sent successfully',
      data: {},
    };
  }

  async login(loginDto: LoginDto): Promise<LoginResult> {
    const email = this.normalizeEmail(loginDto.email);
    const user = await this.prisma.user.findUnique({
      where: { email },
      select: authUserSelect,
    });

    if (!user) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    const isPasswordValid = await this.passwordService.comparePassword(
      loginDto.password,
      user.passwordHash,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    if (!user.isActive) {
      throw new ForbiddenException('User account is inactive.');
    }

    if (!this.isEmailVerified(user)) {
      throw new ForbiddenException('Email must be verified before login.');
    }

    const tokens = await this.generateAuthTokens(user);
    const hashedRefreshToken = await this.passwordService.hashRefreshToken(
      tokens.refreshToken,
    );

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        lastLoginAt: new Date(),
        hashedRefreshToken,
      },
    });

    return {
      message: 'Login successful',
      data: {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        user: this.toAuthResponseUser(user),
      },
    };
  }

  async refreshToken(
    refreshTokenDto: RefreshTokenDto,
  ): Promise<RefreshTokenResult> {
    const payload = await this.verifyRefreshToken(refreshTokenDto.refreshToken);
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        ...authUserSelect,
        hashedRefreshToken: true,
      },
    });

    if (!user?.hashedRefreshToken) {
      throw new UnauthorizedException('Invalid refresh token.');
    }

    if (!user.isActive || !this.isEmailVerified(user)) {
      throw new UnauthorizedException('Invalid refresh token.');
    }

    const isRefreshTokenValid = await this.passwordService.compareRefreshToken(
      refreshTokenDto.refreshToken,
      user.hashedRefreshToken,
    );

    if (!isRefreshTokenValid) {
      throw new UnauthorizedException('Invalid refresh token.');
    }

    const tokens = await this.generateAuthTokens(user);
    const hashedRefreshToken = await this.passwordService.hashRefreshToken(
      tokens.refreshToken,
    );

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        hashedRefreshToken,
      },
    });

    return {
      message: 'Token refreshed successfully',
      data: {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      },
    };
  }

  async logout(userId: string): Promise<MessageResult> {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        hashedRefreshToken: null,
      },
    });

    return {
      message: 'Logged out successfully',
      data: {},
    };
  }

  async forgotPassword(
    forgotPasswordDto: ForgotPasswordDto,
  ): Promise<MessageResult> {
    const email = this.normalizeEmail(forgotPasswordDto.email);
    const genericResponse = {
      message: 'If this email exists, a password reset OTP has been sent',
      data: {},
    };
    const user = await this.prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        fullName: true,
        email: true,
        isActive: true,
        passwordResetOtpSentAt: true,
      },
    });

    if (!user || !user.isActive) {
      return genericResponse;
    }

    this.ensureOtpCooldownHasElapsed(
      user.passwordResetOtpSentAt,
      PASSWORD_RESET_OTP_RESEND_COOLDOWN_SECONDS,
    );

    const otp = this.otpService.generateNumericOtp();
    const codeHash = await this.otpService.hashOtp(otp);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordResetOtpHash: codeHash,
        passwordResetOtpExpiresAt: this.otpService.getPasswordResetExpiryDate(),
        passwordResetOtpSentAt: new Date(),
        passwordResetAttempts: 0,
      },
    });

    try {
      await this.brevoEmailService.sendPasswordResetOtp(
        user.email,
        user.fullName,
        otp,
      );
    } catch {
      throw new ServiceUnavailableException(
        'Password reset email could not be sent. Please try again later.',
      );
    }

    return genericResponse;
  }

  async resetPassword(
    resetPasswordDto: ResetPasswordDto,
  ): Promise<MessageResult> {
    const email = this.normalizeEmail(resetPasswordDto.email);
    const user = await this.prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        passwordResetOtpHash: true,
        passwordResetOtpExpiresAt: true,
        passwordResetAttempts: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found.');
    }

    if (!user.passwordResetOtpHash) {
      throw new BadRequestException('Password reset OTP is missing.');
    }

    if (!user.passwordResetOtpExpiresAt) {
      throw new BadRequestException('Password reset OTP expiry is missing.');
    }

    if (this.otpService.isExpired(user.passwordResetOtpExpiresAt)) {
      throw new BadRequestException('Password reset OTP has expired.');
    }

    if (user.passwordResetAttempts >= PASSWORD_RESET_OTP_MAX_ATTEMPTS) {
      throw new BadRequestException(
        'Maximum password reset OTP attempts exceeded.',
      );
    }

    const isOtpValid = await this.otpService.compareOtp(
      resetPasswordDto.otp,
      user.passwordResetOtpHash,
    );

    if (!isOtpValid) {
      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          passwordResetAttempts: {
            increment: 1,
          },
        },
      });

      throw new BadRequestException('Invalid password reset OTP.');
    }

    const passwordHash = await this.passwordService.hashPassword(
      resetPasswordDto.newPassword,
    );

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        passwordResetOtpHash: null,
        passwordResetOtpExpiresAt: null,
        passwordResetOtpSentAt: null,
        passwordResetAttempts: 0,
        hashedRefreshToken: null,
      },
    });

    return {
      message: 'Password reset successfully',
      data: {},
    };
  }

  private async ensureEmailAndPhoneAreUnique(
    email: string,
    phoneNumber: string,
  ): Promise<void> {
    const [existingEmailUser, existingPhoneUser] = await Promise.all([
      this.prisma.user.findUnique({
        where: { email },
        select: { id: true },
      }),
      this.prisma.user.findUnique({
        where: { phoneNumber },
        select: { id: true },
      }),
    ]);

    if (existingEmailUser) {
      throw new ConflictException('Email is already registered.');
    }

    if (existingPhoneUser) {
      throw new ConflictException('Phone number is already registered.');
    }
  }

  private async createUserWithEmailOtp({
    roleId,
    firstName,
    lastName,
    fullName,
    email,
    phoneNumber,
    passwordHash,
    codeHash,
    expiresAt,
    sentAt,
    referralCode,
    referrer,
  }: {
    roleId: string;
    firstName: string;
    lastName: string | null;
    fullName: string;
    email: string;
    phoneNumber: string;
    passwordHash: string;
    codeHash: string;
    expiresAt: Date;
    sentAt: Date;
    referralCode: string;
    referrer: { id: string; referralCode: string } | null;
  }): Promise<RegisteredUser> {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: {
            roleId,
            firstName,
            lastName,
            fullName,
            email,
            phoneNumber,
            passwordHash,
            referralCode,
            referredByUserId: referrer?.id,
            isEmailVerified: false,
            isPhoneVerified: false,
            isActive: true,
            emailVerificationOtpHash: codeHash,
            emailVerificationOtpExpiresAt: expiresAt,
            emailVerificationOtpSentAt: sentAt,
            emailVerificationAttempts: 0,
          },
          select: registeredUserSelect,
        });

        if (referrer) {
          await tx.referral.create({
            data: {
              referrerUserId: referrer.id,
              referredUserId: user.id,
              referralCode: referrer.referralCode,
            },
          });
        }

        return user;
      });
    } catch (error) {
      this.handleUniqueConstraintError(error);
    }
  }

  private async findReferrerByReferralCodeOrThrow(referralCode: string) {
    const referrer = await this.prisma.user.findUnique({
      where: { referralCode },
      select: {
        id: true,
        referralCode: true,
      },
    });

    if (!referrer || !referrer.referralCode) {
      throw new NotFoundException('Referral code not found.');
    }

    return {
      id: referrer.id,
      referralCode: referrer.referralCode,
    };
  }

  private async generateUniqueReferralCode(): Promise<string> {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const referralCode = randomBytes(4).toString('hex').toUpperCase();
      const existingUser = await this.prisma.user.findUnique({
        where: { referralCode },
        select: { id: true },
      });

      if (!existingUser) {
        return referralCode;
      }
    }

    throw new ConflictException('Could not generate a unique referral code.');
  }

  private async generateAuthTokens(
    user: Pick<AuthUser, 'id' | 'email' | 'role'>,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const basePayload = {
      sub: user.id,
      email: user.email,
      role: user.role.name,
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(
        {
          ...basePayload,
          tokenType: 'access',
        } satisfies JwtTokenPayload,
        {
          secret: this.jwtAccessSecret,
          expiresIn: this.jwtAccessExpiresIn,
        },
      ),
      this.jwtService.signAsync(
        {
          ...basePayload,
          tokenType: 'refresh',
        } satisfies JwtTokenPayload,
        {
          secret: this.jwtRefreshSecret,
          expiresIn: this.jwtRefreshExpiresIn,
        },
      ),
    ]);

    return { accessToken, refreshToken };
  }

  private async verifyRefreshToken(
    refreshToken: string,
  ): Promise<JwtTokenPayload> {
    let payload: JwtTokenPayload;

    try {
      payload = await this.jwtService.verifyAsync<JwtTokenPayload>(
        refreshToken,
        {
          secret: this.jwtRefreshSecret,
        },
      );
    } catch {
      throw new UnauthorizedException('Invalid refresh token.');
    }

    if (payload.tokenType !== 'refresh') {
      throw new UnauthorizedException('Invalid refresh token.');
    }

    return payload;
  }

  private toAuthResponseUser(user: AuthUser): LoginResult['data']['user'] {
    return {
      id: user.id,
      name: user.fullName,
      email: user.email,
      phone: user.phoneNumber,
      role: user.role.name,
    };
  }

  private isEmailVerified(user: {
    isEmailVerified: boolean;
    emailVerifiedAt: Date | null;
  }): boolean {
    return user.isEmailVerified || user.emailVerifiedAt !== null;
  }

  private ensureOtpCooldownHasElapsed(
    sentAt: Date | null,
    cooldownSeconds: number,
  ): void {
    if (!sentAt) {
      return;
    }

    const elapsedMs = Date.now() - sentAt.getTime();
    const cooldownMs = cooldownSeconds * 1000;

    if (elapsedMs >= cooldownMs) {
      return;
    }

    const retryAfterSeconds = Math.ceil((cooldownMs - elapsedMs) / 1000);

    throw new HttpException(
      `Please wait ${retryAfterSeconds} seconds before requesting another OTP.`,
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }

  private handleUniqueConstraintError(error: unknown): never {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      const target = this.getPrismaErrorTarget(error.meta?.target);

      if (target.includes('email')) {
        throw new ConflictException('Email is already registered.');
      }

      if (target.includes('phoneNumber')) {
        throw new ConflictException('Phone number is already registered.');
      }

      if (target.includes('referralCode')) {
        throw new ConflictException(
          'Could not generate a unique referral code.',
        );
      }

      throw new ConflictException(
        'Email or phone number is already registered.',
      );
    }

    throw error;
  }

  private getPrismaErrorTarget(target: unknown): string[] {
    return Array.isArray(target)
      ? target.filter((value): value is string => typeof value === 'string')
      : [];
  }

  private getRequiredConfig(name: string, fallbackName?: string): string {
    const value = this.configService.get<string>(name);
    const fallbackValue = fallbackName
      ? this.configService.get<string>(fallbackName)
      : undefined;
    const resolvedValue = value ?? fallbackValue;

    if (!resolvedValue) {
      throw new Error(`${name} is required.`);
    }

    return resolvedValue;
  }

  private getConfig(name: string, defaultValue: string): string {
    return this.configService.get<string>(name) ?? defaultValue;
  }

  private normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }

  private splitFullName(fullName: string): {
    firstName: string;
    lastName: string | null;
  } {
    const [firstName, ...lastNameParts] = fullName.split(/\s+/);

    return {
      firstName,
      lastName: lastNameParts.length > 0 ? lastNameParts.join(' ') : null,
    };
  }
}
