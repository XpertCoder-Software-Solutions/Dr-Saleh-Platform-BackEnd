import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Prisma, RoleName } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { BrevoEmailService } from '../email/brevo-email.service';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { RegisterDto } from './dto/register.dto';
import { ResendEmailVerificationDto } from './dto/resend-email-verification.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { OtpService } from './services/otp.service';
import { PasswordService } from './services/password.service';
declare const registeredUserSelect: {
    id: true;
    fullName: true;
    email: true;
    phoneNumber: true;
    referralCode: true;
    isEmailVerified: true;
};
type RegisteredUser = Prisma.UserGetPayload<{
    select: typeof registeredUserSelect;
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
export declare class AuthService {
    private readonly prisma;
    private readonly passwordService;
    private readonly otpService;
    private readonly brevoEmailService;
    private readonly configService;
    private readonly jwtService;
    private readonly jwtAccessSecret;
    private readonly jwtRefreshSecret;
    private readonly jwtAccessExpiresIn;
    private readonly jwtRefreshExpiresIn;
    constructor(prisma: PrismaService, passwordService: PasswordService, otpService: OtpService, brevoEmailService: BrevoEmailService, configService: ConfigService, jwtService: JwtService);
    register(registerDto: RegisterDto): Promise<RegisterResult>;
    verifyEmail(verifyEmailDto: VerifyEmailDto): Promise<MessageResult>;
    resendEmailVerification(resendEmailVerificationDto: ResendEmailVerificationDto): Promise<MessageResult>;
    login(loginDto: LoginDto): Promise<LoginResult>;
    refreshToken(refreshTokenDto: RefreshTokenDto): Promise<RefreshTokenResult>;
    logout(userId: string): Promise<MessageResult>;
    forgotPassword(forgotPasswordDto: ForgotPasswordDto): Promise<MessageResult>;
    resetPassword(resetPasswordDto: ResetPasswordDto): Promise<MessageResult>;
    private ensureEmailAndPhoneAreUnique;
    private createUserWithEmailOtp;
    private findReferrerByReferralCodeOrThrow;
    private generateUniqueReferralCode;
    private generateAuthTokens;
    private verifyRefreshToken;
    private toAuthResponseUser;
    private isEmailVerified;
    private ensureOtpCooldownHasElapsed;
    private handleUniqueConstraintError;
    private getRequiredConfig;
    private getConfig;
    private normalizeEmail;
    private splitFullName;
}
export {};
