import {
  BadRequestException,
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import {
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
  S3ServiceException,
} from '@aws-sdk/client-s3';
import { randomUUID } from 'crypto';
import { readFile } from 'fs/promises';
import { extname } from 'path';
import s3Config from '../../config/s3.config';
import type { S3Config } from '../../config/s3.config';
import {
  STORAGE_FILE_MIME_TYPES,
  STORAGE_FOLDERS,
  STORAGE_IMAGE_MIME_TYPES,
  STORAGE_MAX_FILE_SIZE_BYTES,
  STORAGE_MAX_IMAGE_SIZE_BYTES,
  STORAGE_MAX_VIDEO_SIZE_BYTES,
  STORAGE_MIME_EXTENSION_MAP,
  STORAGE_VIDEO_MIME_TYPES,
  StorageFolder,
} from './storage.constants';

export type StorageUploadResult = {
  key: string;
  url: string;
};

export type StorageUploadFile = {
  buffer?: Buffer;
  mimetype: string;
  originalname: string;
  path?: string;
  size?: number;
};

export type StorageUploadOptions = {
  folder?: StorageFolder;
  allowedMimeTypes?: readonly string[];
  maxSizeBytes?: number;
};

type StorageUploadKind = 'file' | 'image' | 'video';

type ResolvedUploadOptions = {
  folder?: StorageFolder;
  allowedMimeTypes: readonly string[];
  maxSizeBytes: number;
  kind: StorageUploadKind;
};

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly s3Client: S3Client;
  private readonly bucketName: string;
  private readonly region: string;
  private readonly endpoint?: string;
  private readonly forcePathStyle: boolean;
  private readonly supportedFolders = new Set<string>(STORAGE_FOLDERS);

  constructor(@Inject(s3Config.KEY) private readonly config: S3Config) {
    this.region = this.requireConfigValue('AWS_REGION', config.region);
    this.bucketName = this.requireConfigValue(
      'AWS_S3_BUCKET_NAME',
      config.bucketName,
    );
    this.endpoint = config.endpoint;
    this.forcePathStyle = config.forcePathStyle;

    this.s3Client = new S3Client({
      region: this.region,
      credentials: {
        accessKeyId: this.requireConfigValue(
          'AWS_ACCESS_KEY_ID',
          config.accessKeyId,
        ),
        secretAccessKey: this.requireConfigValue(
          'AWS_SECRET_ACCESS_KEY',
          config.secretAccessKey,
        ),
      },
      endpoint: this.endpoint,
      forcePathStyle: this.forcePathStyle,
    });
  }

  async uploadFile(
    file: StorageUploadFile,
    options: StorageUploadOptions = {},
  ): Promise<StorageUploadResult> {
    return this.upload(file, {
      folder: options.folder,
      allowedMimeTypes: options.allowedMimeTypes ?? STORAGE_FILE_MIME_TYPES,
      maxSizeBytes: options.maxSizeBytes ?? STORAGE_MAX_FILE_SIZE_BYTES,
      kind: 'file',
    });
  }

  async uploadImage(
    file: StorageUploadFile,
    options: StorageUploadOptions = {},
  ): Promise<StorageUploadResult> {
    return this.upload(file, {
      folder: options.folder,
      allowedMimeTypes: options.allowedMimeTypes ?? STORAGE_IMAGE_MIME_TYPES,
      maxSizeBytes: options.maxSizeBytes ?? STORAGE_MAX_IMAGE_SIZE_BYTES,
      kind: 'image',
    });
  }

  async uploadVideo(
    file: StorageUploadFile,
    options: StorageUploadOptions = {},
  ): Promise<StorageUploadResult> {
    return this.upload(file, {
      folder: options.folder,
      allowedMimeTypes: options.allowedMimeTypes ?? STORAGE_VIDEO_MIME_TYPES,
      maxSizeBytes: options.maxSizeBytes ?? STORAGE_MAX_VIDEO_SIZE_BYTES,
      kind: 'video',
    });
  }

  async deleteFile(key: string): Promise<void> {
    const normalizedKey = this.normalizeKey(key);

    try {
      await this.s3Client.send(
        new DeleteObjectCommand({
          Bucket: this.bucketName,
          Key: normalizedKey,
        }),
      );
    } catch (error) {
      this.handleAwsError(error, 'delete');
    }
  }

  getPublicUrl(key: string): string {
    const normalizedKey = this.normalizeKey(key);
    const encodedKey = this.encodeKey(normalizedKey);

    if (this.endpoint) {
      return this.getEndpointPublicUrl(encodedKey);
    }

    return `https://${this.bucketName}.s3.${this.region}.amazonaws.com/${encodedKey}`;
  }

  private async upload(
    file: StorageUploadFile,
    options: ResolvedUploadOptions,
  ): Promise<StorageUploadResult> {
    const normalizedFile = await this.validateFile(file, options);
    const key = this.buildObjectKey(
      normalizedFile.originalname,
      normalizedFile.mimetype,
      options.folder,
    );

    try {
      await this.s3Client.send(
        new PutObjectCommand({
          Bucket: this.bucketName,
          Key: key,
          Body: normalizedFile.buffer,
          ContentType: normalizedFile.mimetype,
        }),
      );
    } catch (error) {
      this.handleAwsError(error, 'upload');
    }

    return {
      key,
      url: this.getPublicUrl(key),
    };
  }

  private async validateFile(
    file: StorageUploadFile,
    options: ResolvedUploadOptions,
  ): Promise<
    Required<Pick<StorageUploadFile, 'buffer' | 'mimetype' | 'originalname'>>
  > {
    if (!file || typeof file !== 'object') {
      throw new BadRequestException('File is required.');
    }

    const originalname = this.validateOriginalName(file.originalname);
    const mimetype = this.validateMimeType(
      file.mimetype,
      options.allowedMimeTypes,
    );
    const buffer = await this.getFileBuffer(file);
    const size = file.size ?? buffer.length;

    if (size <= 0 || buffer.length <= 0) {
      throw new BadRequestException('File is empty.');
    }

    if (size > options.maxSizeBytes || buffer.length > options.maxSizeBytes) {
      throw new BadRequestException(
        `File size must not exceed ${options.maxSizeBytes} bytes.`,
      );
    }

    if (options.kind === 'image') {
      this.validateImage(buffer, mimetype);
    }

    if (options.kind === 'video') {
      this.validateVideo(buffer, mimetype);
    }

    this.validateFolder(options.folder);

    return {
      buffer,
      mimetype,
      originalname,
    };
  }

  private validateOriginalName(originalname: string): string {
    if (typeof originalname !== 'string' || originalname.trim().length === 0) {
      throw new BadRequestException('File original name is required.');
    }

    return originalname.trim();
  }

  private validateMimeType(
    mimetype: string,
    allowedMimeTypes: readonly string[],
  ): string {
    if (typeof mimetype !== 'string' || mimetype.trim().length === 0) {
      throw new BadRequestException('File MIME type is required.');
    }

    const normalizedMimeType = mimetype.trim().toLowerCase();

    if (!allowedMimeTypes.includes(normalizedMimeType)) {
      throw new BadRequestException(
        `Unsupported file MIME type: ${normalizedMimeType}.`,
      );
    }

    return normalizedMimeType;
  }

  private async getFileBuffer(file: StorageUploadFile): Promise<Buffer> {
    if (Buffer.isBuffer(file.buffer)) {
      return file.buffer;
    }

    if (typeof file.path === 'string' && file.path.length > 0) {
      return readFile(file.path);
    }

    throw new BadRequestException('File buffer is required.');
  }

  private validateFolder(folder?: StorageFolder): void {
    if (folder === undefined) {
      return;
    }

    const normalizedFolder = folder.replace(/^\/+|\/+$/g, '');

    if (!this.supportedFolders.has(normalizedFolder)) {
      throw new BadRequestException(`Unsupported storage folder: ${folder}.`);
    }
  }

  private validateImage(buffer: Buffer, mimetype: string): void {
    const isValid =
      (mimetype === 'image/jpeg' && this.isJpeg(buffer)) ||
      (mimetype === 'image/png' && this.isPng(buffer)) ||
      (mimetype === 'image/webp' && this.isWebp(buffer));

    if (!isValid) {
      throw new BadRequestException('Invalid image file content.');
    }
  }

  private validateVideo(buffer: Buffer, mimetype: string): void {
    const isValid =
      ((mimetype === 'video/mp4' || mimetype === 'video/quicktime') &&
        this.hasFtypBox(buffer)) ||
      (mimetype === 'video/webm' && this.isWebm(buffer));

    if (!isValid) {
      throw new BadRequestException('Invalid video file content.');
    }
  }

  private buildObjectKey(
    originalname: string,
    mimetype: string,
    folder?: StorageFolder,
  ): string {
    const extension = this.getFileExtension(originalname, mimetype);
    const fileName = extension ? `${randomUUID()}.${extension}` : randomUUID();

    if (!folder) {
      return fileName;
    }

    return `${folder.replace(/^\/+|\/+$/g, '')}/${fileName}`;
  }

  private getFileExtension(originalname: string, mimetype: string): string {
    const mappedExtension = STORAGE_MIME_EXTENSION_MAP[mimetype];

    if (mappedExtension) {
      return mappedExtension;
    }

    const originalExtension = extname(originalname)
      .replace('.', '')
      .toLowerCase();

    if (!/^[a-z0-9]+$/.test(originalExtension)) {
      return '';
    }

    return originalExtension;
  }

  private normalizeKey(key: string): string {
    if (typeof key !== 'string' || key.trim().length === 0) {
      throw new BadRequestException('Storage key is required.');
    }

    const normalizedKey = key.trim().replace(/^\/+/, '');

    if (normalizedKey.length === 0 || normalizedKey.includes('..')) {
      throw new BadRequestException('Invalid storage key.');
    }

    return normalizedKey;
  }

  private encodeKey(key: string): string {
    return key.split('/').map(encodeURIComponent).join('/');
  }

  private getEndpointPublicUrl(encodedKey: string): string {
    if (!this.endpoint) {
      throw new InternalServerErrorException('S3 endpoint is not configured.');
    }

    const endpointUrl = new URL(this.endpoint);
    const basePath = endpointUrl.pathname.replace(/\/+$/g, '');
    const host = this.forcePathStyle
      ? endpointUrl.host
      : `${this.bucketName}.${endpointUrl.host}`;
    const pathPrefix = this.forcePathStyle
      ? `${basePath}/${this.bucketName}`
      : basePath;

    return `${endpointUrl.protocol}//${host}${pathPrefix}/${encodedKey}`;
  }

  private isJpeg(buffer: Buffer): boolean {
    return (
      buffer.length >= 3 &&
      buffer[0] === 0xff &&
      buffer[1] === 0xd8 &&
      buffer[2] === 0xff
    );
  }

  private isPng(buffer: Buffer): boolean {
    const pngSignature = Buffer.from([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
    ]);

    return (
      buffer.length >= pngSignature.length &&
      buffer.subarray(0, pngSignature.length).equals(pngSignature)
    );
  }

  private isWebp(buffer: Buffer): boolean {
    return (
      buffer.length >= 12 &&
      buffer.toString('ascii', 0, 4) === 'RIFF' &&
      buffer.toString('ascii', 8, 12) === 'WEBP'
    );
  }

  private hasFtypBox(buffer: Buffer): boolean {
    return buffer.length >= 12 && buffer.toString('ascii', 4, 8) === 'ftyp';
  }

  private isWebm(buffer: Buffer): boolean {
    return (
      buffer.length >= 4 &&
      buffer[0] === 0x1a &&
      buffer[1] === 0x45 &&
      buffer[2] === 0xdf &&
      buffer[3] === 0xa3
    );
  }

  private requireConfigValue(name: string, value?: string): string {
    if (typeof value !== 'string' || value.trim().length === 0) {
      throw new Error(`${name} is required to use StorageService.`);
    }

    return value.trim();
  }

  private handleAwsError(error: unknown, action: 'upload' | 'delete'): never {
    if (error instanceof S3ServiceException) {
      this.logger.error(
        `Failed to ${action} S3 object: ${error.name} ${error.message}`,
      );
    } else if (error instanceof Error) {
      this.logger.error(`Failed to ${action} S3 object: ${error.message}`);
    } else {
      this.logger.error(`Failed to ${action} S3 object.`);
    }

    throw new InternalServerErrorException(`Failed to ${action} file.`);
  }
}
