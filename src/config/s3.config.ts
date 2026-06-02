import { ConfigType, registerAs } from '@nestjs/config';

const s3Config = registerAs('s3', () => ({
  region: process.env.S3_REGION,
  bucket: process.env.S3_BUCKET,
  accessKeyId: process.env.S3_ACCESS_KEY_ID,
  secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
  endpoint: process.env.S3_ENDPOINT,
  forcePathStyle: process.env.S3_FORCE_PATH_STYLE === 'true',
}));

export type S3Config = ConfigType<typeof s3Config>;

export default s3Config;
