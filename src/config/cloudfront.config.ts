import { ConfigType, registerAs } from '@nestjs/config';

const cloudFrontConfig = registerAs('cloudfront', () => ({
  nodeEnv: process.env.NODE_ENV ?? 'development',
  domain: process.env.CLOUDFRONT_DOMAIN,
  keyPairId: process.env.CLOUDFRONT_KEY_PAIR_ID,
  privateKey: process.env.CLOUDFRONT_PRIVATE_KEY,
  defaultExpiresInSeconds: 15 * 60,
}));

export type CloudFrontConfig = ConfigType<typeof cloudFrontConfig>;

export default cloudFrontConfig;
