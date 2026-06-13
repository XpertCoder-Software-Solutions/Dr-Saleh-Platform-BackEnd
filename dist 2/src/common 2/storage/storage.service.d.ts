import type { S3Config } from '../../config/s3.config';
import { StorageFolder } from './storage.constants';
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
export declare class StorageService {
    private readonly config;
    private readonly logger;
    private readonly s3Client;
    private readonly bucketName;
    private readonly region;
    private readonly endpoint?;
    private readonly forcePathStyle;
    private readonly supportedFolders;
    constructor(config: S3Config);
    uploadFile(file: StorageUploadFile, options?: StorageUploadOptions): Promise<StorageUploadResult>;
    uploadImage(file: StorageUploadFile, options?: StorageUploadOptions): Promise<StorageUploadResult>;
    uploadVideo(file: StorageUploadFile, options?: StorageUploadOptions): Promise<StorageUploadResult>;
    deleteFile(key: string): Promise<void>;
    getPublicUrl(key: string): string;
    private upload;
    private validateFile;
    private validateOriginalName;
    private validateMimeType;
    private getFileBuffer;
    private validateFolder;
    private validateImage;
    private validateVideo;
    private buildObjectKey;
    private getFileExtension;
    private normalizeKey;
    private encodeKey;
    private getEndpointPublicUrl;
    private isJpeg;
    private isPng;
    private isWebp;
    private hasFtypBox;
    private isWebm;
    private requireConfigValue;
    private handleAwsError;
}
