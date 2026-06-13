import { ConfigType, registerAs } from '@nestjs/config';

const s3Config = registerAs('s3', () => ({
  region: process.env.AWS_REGION ?? process.env.S3_REGION,
  bucketName: process.env.AWS_S3_BUCKET_NAME ?? process.env.S3_BUCKET,
  accessKeyId: process.env.AWS_ACCESS_KEY_ID ?? process.env.S3_ACCESS_KEY_ID,
  secretAccessKey:
    process.env.AWS_SECRET_ACCESS_KEY ?? process.env.S3_SECRET_ACCESS_KEY,
  sessionToken: process.env.AWS_SESSION_TOKEN ?? process.env.S3_SESSION_TOKEN,
  endpoint: process.env.AWS_S3_ENDPOINT ?? process.env.S3_ENDPOINT,
  forcePathStyle:
    (process.env.AWS_S3_FORCE_PATH_STYLE ?? process.env.S3_FORCE_PATH_STYLE) ===
    'true',
}));

export type S3Config = ConfigType<typeof s3Config>;

export default s3Config;
