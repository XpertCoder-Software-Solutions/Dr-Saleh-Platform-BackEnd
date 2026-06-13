import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import cloudFrontConfig from '../../config/cloudfront.config';
import { PrismaModule } from '../../database/prisma.module';
import { CloudFrontService } from './cloudfront.service';

@Module({
  imports: [ConfigModule.forFeature(cloudFrontConfig), PrismaModule],
  providers: [CloudFrontService],
  exports: [CloudFrontService],
})
export class CloudFrontModule {}
