import { ConfigType, registerAs } from '@nestjs/config';

const paymobConfig = registerAs('paymob', () => ({
  baseUrl: process.env.PAYMOB_BASE_URL || 'https://accept.paymob.com',
  checkoutUrl:
    process.env.PAYMOB_CHECKOUT_URL ||
    'https://accept.paymob.com/unifiedcheckout/',
  secretKey: process.env.PAYMOB_SECRET_KEY,
  publicKey: process.env.PAYMOB_PUBLIC_KEY,
  hmacSecret: process.env.PAYMOB_HMAC_SECRET,
  integrationIdCard: process.env.PAYMOB_INTEGRATION_ID_CARD,
  integrationIdWallet: process.env.PAYMOB_INTEGRATION_ID_WALLET,
  integrationIdApplePay: process.env.PAYMOB_INTEGRATION_ID_APPLE_PAY,
  notificationUrl: process.env.PAYMOB_NOTIFICATION_URL,
  redirectionUrl: process.env.PAYMOB_REDIRECTION_URL,
}));

export type PaymobConfig = ConfigType<typeof paymobConfig>;

export default paymobConfig;
