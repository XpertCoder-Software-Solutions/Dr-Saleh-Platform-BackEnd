import { ConfigType, registerAs } from '@nestjs/config';

const fawryConfig = registerAs('fawry', () => ({
  baseUrl: process.env.FAWRY_BASE_URL,
  merchantCode: process.env.FAWRY_MERCHANT_CODE,
  securityKey: process.env.FAWRY_SECURITY_KEY,
  returnUrl: process.env.FAWRY_RETURN_URL,
  notificationUrl: process.env.FAWRY_NOTIFICATION_URL,
}));

export type FawryConfig = ConfigType<typeof fawryConfig>;

export default fawryConfig;
