import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import SibApiV3Sdk, { type TransactionalEmailsApi } from 'sib-api-v3-sdk';

export type SendTransactionalEmailInput = {
  toEmail: string;
  toName?: string;
  subject: string;
  htmlContent: string;
  textContent: string;
};

@Injectable()
export class BrevoEmailService {
  private readonly transactionalEmailsApi: TransactionalEmailsApi;
  private readonly senderName: string;
  private readonly senderEmail: string;

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
    this.transactionalEmailsApi = new SibApiV3Sdk.TransactionalEmailsApi();
  }

  async sendTransactionalEmail({
    toEmail,
    toName,
    subject,
    htmlContent,
    textContent,
  }: SendTransactionalEmailInput): Promise<void> {
    const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();

    sendSmtpEmail.sender = {
      name: this.senderName,
      email: this.senderEmail,
    };
    sendSmtpEmail.to = [
      {
        email: toEmail,
        name: toName,
      },
    ];
    sendSmtpEmail.subject = subject;
    sendSmtpEmail.htmlContent = htmlContent;
    sendSmtpEmail.textContent = textContent;

    try {
      await this.transactionalEmailsApi.sendTransacEmail(sendSmtpEmail);
    } catch {
      throw new ServiceUnavailableException(
        'Unable to send notification email.',
      );
    }
  }
}
