import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { randomInt } from 'crypto';
import {
  EMAIL_VERIFICATION_OTP_EXPIRY_MINUTES,
  EMAIL_VERIFICATION_OTP_LENGTH,
  PASSWORD_RESET_OTP_EXPIRY_MINUTES,
} from '../constants/email-verification.constants';

const OTP_SALT_ROUNDS = 12;

@Injectable()
export class OtpService {
  generateNumericOtp(): string {
    const maximum = 10 ** EMAIL_VERIFICATION_OTP_LENGTH;
    return randomInt(0, maximum)
      .toString()
      .padStart(EMAIL_VERIFICATION_OTP_LENGTH, '0');
  }

  hashOtp(otp: string): Promise<string> {
    return bcrypt.hash(otp, OTP_SALT_ROUNDS);
  }

  compareOtp(otp: string, hash: string): Promise<boolean> {
    return bcrypt.compare(otp, hash);
  }

  getEmailVerificationExpiryDate(): Date {
    return this.getExpiryDate(EMAIL_VERIFICATION_OTP_EXPIRY_MINUTES);
  }

  getPasswordResetExpiryDate(): Date {
    return this.getExpiryDate(PASSWORD_RESET_OTP_EXPIRY_MINUTES);
  }

  isExpired(expiresAt: Date): boolean {
    return expiresAt.getTime() <= Date.now();
  }

  private getExpiryDate(expiresInMinutes: number): Date {
    return new Date(Date.now() + expiresInMinutes * 60 * 1000);
  }
}
