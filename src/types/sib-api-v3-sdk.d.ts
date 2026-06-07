declare module 'sib-api-v3-sdk' {
  export type ApiKeyAuth = {
    apiKey: string;
  };

  export type EmailIdentity = {
    name?: string;
    email: string;
  };

  export class ApiClient {
    static instance: ApiClient;
    authentications: Record<string, ApiKeyAuth>;
  }

  export class TransactionalEmailsApi {
    sendTransacEmail(sendSmtpEmail: SendSmtpEmail): Promise<unknown>;
  }

  export class SendSmtpEmail {
    sender?: EmailIdentity;
    to?: EmailIdentity[];
    subject?: string;
    htmlContent?: string;
    textContent?: string;
  }

  const SibApiV3Sdk: {
    ApiClient: typeof ApiClient;
    TransactionalEmailsApi: typeof TransactionalEmailsApi;
    SendSmtpEmail: typeof SendSmtpEmail;
  };

  export default SibApiV3Sdk;
}
