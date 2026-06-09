import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import s3Config from '../../config/s3.config';
import { StorageService } from './storage.service';

@Module({
  imports: [ConfigModule.forFeature(s3Config)],
  providers: [StorageService],
  exports: [StorageService],
})
export class StorageModule {}
