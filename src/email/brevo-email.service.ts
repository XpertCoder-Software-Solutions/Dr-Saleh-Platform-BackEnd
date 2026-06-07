import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import SibApiV3Sdk, { type TransactionalEmailsApi } from 'sib-api-v3-sdk';
import {
  EMAIL_VERIFICATION_OTP_EXPIRY_MINUTES,
  PASSWORD_RESET_OTP_EXPIRY_MINUTES,
} from '../auth/constants/email-verification.constants';
import { buildConsultationConfirmationTemplate } from './templates/consultation-confirmation.template';
import { buildContactMessageConfirmationTemplate } from './templates/contact-message-confirmation.template';
import { buildEmailVerificationOtpTemplate } from './templates/email-verification-otp.template';
import { buildPasswordResetOtpTemplate } from './templates/password-reset-otp.template';

@Injectable()
export class BrevoEmailService {
  private readonly transactionalEmailsApi: TransactionalEmailsApi;
  private readonly senderName: string;
  private readonly senderEmail: string;
  private readonly brandName: string;
  private readonly logoUrl: string;
  private readonly platformUrl: string;
  private readonly supportEmail: string;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.getOrThrow<string>('BREVO_API_KEY');
    const defaultClient = SibApiV3Sdk.ApiClient.instance;
    const apiKeyAuth = defaultClient.authentications['api-key'];

    if (!apiKeyAuth) {
      throw new Error('Brevo API key authentication is not configured.');
    }

    apiKeyAuth.apiKey = apiKey;

    this.senderName =
      this.configService.getOrThrow<string>('BREVO_SENDER_NAME');
    this.senderEmail =
      this.configService.getOrThrow<string>('BREVO_SENDER_EMAIL');
    this.brandName = this.configService.getOrThrow<string>('BRAND_NAME');
    this.logoUrl = this.buildPublicUrl(
      this.configService.getOrThrow<string>('APP_PUBLIC_URL'),
      this.configService.getOrThrow<string>('BRAND_LOGO_PATH'),
    );
    this.platformUrl =
      this.configService.getOrThrow<string>('APP_PLATFORM_URL');
    this.supportEmail = this.configService.getOrThrow<string>('SUPPORT_EMAIL');
    this.transactionalEmailsApi = new SibApiV3Sdk.TransactionalEmailsApi();
  }

  async sendEmailVerificationOtp(
    toEmail: string,
    fullName: string,
    otp: string,
  ): Promise<void> {
    const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();

    sendSmtpEmail.sender = {
      name: this.senderName,
      email: this.senderEmail,
    };
    sendSmtpEmail.to = [
      {
        email: toEmail,
        name: fullName,
      },
    ];
    sendSmtpEmail.subject = 'Verify your Dr. Saleh account';
    sendSmtpEmail.htmlContent = buildEmailVerificationOtpTemplate({
      brandName: this.brandName,
      fullName,
      otp,
      otpExpiresIn: EMAIL_VERIFICATION_OTP_EXPIRY_MINUTES,
      logoUrl: this.logoUrl,
      platformUrl: this.platformUrl,
      supportEmail: this.supportEmail,
    });
    sendSmtpEmail.textContent = this.buildEmailVerificationText(fullName, otp);

    try {
      await this.transactionalEmailsApi.sendTransacEmail(sendSmtpEmail);
    } catch {
      throw new ServiceUnavailableException(
        'Unable to send verification email. Please try again later.',
      );
    }
  }

  async sendPasswordResetOtp(
    toEmail: string,
    fullName: string,
    otp: string,
  ): Promise<void> {
    const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();

    sendSmtpEmail.sender = {
      name: this.senderName,
      email: this.senderEmail,
    };
    sendSmtpEmail.to = [
      {
        email: toEmail,
        name: fullName,
      },
    ];
    sendSmtpEmail.subject = 'Reset your Dr. Saleh password';
    sendSmtpEmail.htmlContent = buildPasswordResetOtpTemplate({
      brandName: this.brandName,
      fullName,
      otp,
      otpExpiresIn: PASSWORD_RESET_OTP_EXPIRY_MINUTES,
      logoUrl: this.logoUrl,
      platformUrl: this.platformUrl,
      supportEmail: this.supportEmail,
    });
    sendSmtpEmail.textContent = this.buildPasswordResetText(fullName, otp);

    try {
      await this.transactionalEmailsApi.sendTransacEmail(sendSmtpEmail);
    } catch {
      throw new ServiceUnavailableException(
        'Unable to send password reset email. Please try again later.',
      );
    }
  }

  async sendConsultationConfirmation(
    toEmail: string,
    fullName: string,
  ): Promise<void> {
    const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();

    sendSmtpEmail.sender = {
      name: this.senderName,
      email: this.senderEmail,
    };
    sendSmtpEmail.to = [
      {
        email: toEmail,
        name: fullName,
      },
    ];
    sendSmtpEmail.subject = 'تم استلام طلب الاستشارة';
    sendSmtpEmail.htmlContent = buildConsultationConfirmationTemplate({
      brandName: this.brandName,
      fullName,
      logoUrl: this.logoUrl,
      platformUrl: this.platformUrl,
      supportEmail: this.supportEmail,
    });
    sendSmtpEmail.textContent =
      this.buildConsultationConfirmationText(fullName);

    try {
      await this.transactionalEmailsApi.sendTransacEmail(sendSmtpEmail);
    } catch {
      throw new ServiceUnavailableException(
        'Unable to send consultation confirmation email.',
      );
    }
  }

  async sendContactMessageConfirmation(
    toEmail: string,
    name: string,
  ): Promise<void> {
    const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();

    sendSmtpEmail.sender = {
      name: this.senderName,
      email: this.senderEmail,
    };
    sendSmtpEmail.to = [
      {
        email: toEmail,
        name,
      },
    ];
    sendSmtpEmail.subject = 'تم استلام رسالتكم';
    sendSmtpEmail.htmlContent = buildContactMessageConfirmationTemplate({
      brandName: this.brandName,
      name,
      logoUrl: this.logoUrl,
      platformUrl: this.platformUrl,
      supportEmail: this.supportEmail,
    });
    sendSmtpEmail.textContent = this.buildContactMessageConfirmationText(name);

    try {
      await this.transactionalEmailsApi.sendTransacEmail(sendSmtpEmail);
    } catch {
      throw new ServiceUnavailableException(
        'Unable to send contact message confirmation email.',
      );
    }
  }

  private buildEmailVerificationText(fullName: string, otp: string): string {
    return [
      `Hello ${fullName},`,
      '',
      `Your Dr. Saleh Platform verification code is ${otp}.`,
      `This code expires in ${EMAIL_VERIFICATION_OTP_EXPIRY_MINUTES} minutes.`,
    ].join('\n');
  }

  private buildPasswordResetText(fullName: string, otp: string): string {
    return [
      `Hello ${fullName},`,
      '',
      `Your Dr. Saleh Platform password reset code is ${otp}.`,
      `This code expires in ${PASSWORD_RESET_OTP_EXPIRY_MINUTES} minutes.`,
      'If you did not request a password reset, you can ignore this email.',
    ].join('\n');
  }

  private buildConsultationConfirmationText(fullName: string): string {
    return [
      `مرحباً ${fullName}،`,
      '',
      'تم استلام طلب الاستشارة الخاص بكم بنجاح، وسيتم مراجعة الطلب والتواصل معكم في أقرب وقت ممكن.',
      '',
      'فريق منصة د. صالح',
    ].join('\n');
  }

  private buildContactMessageConfirmationText(name: string): string {
    return [
      `مرحباً ${name}`,
      '',
      'نشكر تواصلكم معنا.',
      '',
      'تم استلام رسالتكم بنجاح وسيتم مراجعتها من قبل فريقنا، وسيتم التواصل معكم في أقرب وقت ممكن.',
      '',
      'مع خالص التحية،',
      'فريق منصة د. صالح',
    ].join('\n');
  }

  private buildPublicUrl(appPublicUrl: string, brandLogoPath: string): string {
    const normalizedPublicUrl = appPublicUrl.replace(/\/$/, '');
    const normalizedLogoPath = brandLogoPath.startsWith('/')
      ? brandLogoPath
      : `/${brandLogoPath}`;

    return `${normalizedPublicUrl}${normalizedLogoPath}`;
  }
}
