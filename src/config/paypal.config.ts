import { ConfigType, registerAs } from '@nestjs/config';

const paypalConfig = registerAs('paypal', () => ({
  clientId: process.env.PAYPAL_CLIENT_ID,
  clientSecret: process.env.PAYPAL_CLIENT_SECRET,
  baseUrl: process.env.PAYPAL_BASE_URL,
  webhookId: process.env.PAYPAL_WEBHOOK_ID,
  returnUrl: process.env.PAYPAL_RETURN_URL,
  cancelUrl: process.env.PAYPAL_CANCEL_URL,
}));

export type PaypalConfig = ConfigType<typeof paypalConfig>;

export default paypalConfig;
