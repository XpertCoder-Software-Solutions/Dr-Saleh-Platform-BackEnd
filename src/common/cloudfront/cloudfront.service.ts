import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { getSignedUrl } from '@aws-sdk/cloudfront-signer';
import { BookFormatType, LessonType } from '@prisma/client';
import cloudFrontConfig from '../../config/cloudfront.config';
import type { CloudFrontConfig } from '../../config/cloudfront.config';
import { PrismaService } from '../../database/prisma.service';

export type CloudFrontSignedUrlResult = {
  url: string;
  expiresAt: Date;
};

export type CloudFrontSignedUrlOptions = {
  expiresInSeconds?: number;
};

type SignedContentKind = 'video' | 'pdf' | 'file';

@Injectable()
export class CloudFrontService {
  private readonly logger = new Logger(CloudFrontService.name);
  private readonly domain?: string;
  private readonly keyPairId?: string;
  private readonly privateKey?: string;
  private readonly defaultExpiresInSeconds: number;
  private readonly nodeEnv: string;

  constructor(
    @Inject(cloudFrontConfig.KEY)
    config: CloudFrontConfig,
    private readonly prisma: PrismaService,
  ) {
    this.nodeEnv = config.nodeEnv;
    this.domain = this.optionalConfigValue(config.domain);
    this.keyPairId = this.optionalConfigValue(config.keyPairId);
    this.privateKey = this.optionalConfigValue(config.privateKey);
    this.defaultExpiresInSeconds = config.defaultExpiresInSeconds;

    this.logger.log(
      `CloudFrontService initialized. domainConfigured=${Boolean(
        this.domain,
      )} keyPairIdConfigured=${Boolean(
        this.keyPairId,
      )} privateKeyConfigured=${Boolean(this.privateKey)}`,
    );

    if (
      this.nodeEnv === 'development' &&
      (!this.domain || !this.keyPairId || !this.privateKey)
    ) {
      this.logger.warn(
        'CloudFront signed URLs are disabled because signing keys are not configured.',
      );
    }
  }

  isSignedUrlConfigured(): boolean {
    return Boolean(
      this.domain &&
      this.keyPairId &&
      this.privateKey &&
      this.isPrivateKeyFormatValid(this.privateKey),
    );
  }

  generateSignedVideoUrl(
    key: string,
    options: CloudFrontSignedUrlOptions = {},
  ): CloudFrontSignedUrlResult {
    return this.generateSignedUrl(key, 'video', options);
  }

  generateSignedPdfUrl(
    key: string,
    options: CloudFrontSignedUrlOptions = {},
  ): CloudFrontSignedUrlResult {
    return this.generateSignedUrl(key, 'pdf', options);
  }

  generateSignedFileUrl(
    key: string,
    options: CloudFrontSignedUrlOptions = {},
  ): CloudFrontSignedUrlResult {
    return this.generateSignedUrl(key, 'file', options);
  }

  async generateSignedCourseVideoUrl(
    userId: string,
    courseId: string,
    lessonId: string,
  ): Promise<CloudFrontSignedUrlResult> {
    await this.ensureUserOwnsCourse(userId, courseId);

    const lesson = await this.findCourseLesson(courseId, lessonId);

    if (lesson.lessonType !== LessonType.VIDEO) {
      throw new BadRequestException('Lesson is not a video lesson.');
    }

    if (!lesson.videoKey) {
      throw new NotFoundException('Lesson video file is not configured.');
    }

    return this.generateSignedVideoUrl(lesson.videoKey);
  }

  async generateSignedCoursePdfUrl(
    userId: string,
    courseId: string,
    lessonId: string,
  ): Promise<CloudFrontSignedUrlResult> {
    await this.ensureUserOwnsCourse(userId, courseId);

    const lesson = await this.findCourseLesson(courseId, lessonId);

    if (lesson.lessonType !== LessonType.PDF) {
      throw new BadRequestException('Lesson is not a PDF lesson.');
    }

    if (!lesson.pdfKey) {
      throw new NotFoundException('Lesson PDF file is not configured.');
    }

    return this.generateSignedPdfUrl(lesson.pdfKey);
  }

  async generateSignedDigitalBookUrl(
    userId: string,
    bookFormatId: string,
  ): Promise<CloudFrontSignedUrlResult> {
    const bookFormat = await this.findOwnedBookFormat(userId, bookFormatId);

    if (bookFormat.formatType !== BookFormatType.Digital) {
      throw new BadRequestException('Book format is not digital.');
    }

    if (!bookFormat.readerFile) {
      throw new NotFoundException('Digital book file is not configured.');
    }

    return this.generateSignedPdfUrl(bookFormat.readerFile);
  }

  async generateSignedAudioBookUrl(
    userId: string,
    bookFormatId: string,
  ): Promise<CloudFrontSignedUrlResult> {
    const bookFormat = await this.findOwnedBookFormat(userId, bookFormatId);

    if (bookFormat.formatType !== BookFormatType.Audio) {
      throw new BadRequestException('Book format is not audio.');
    }

    if (!bookFormat.audioFile) {
      throw new NotFoundException('Audio book file is not configured.');
    }

    return this.generateSignedFileUrl(bookFormat.audioFile);
  }

  async generateSignedCertificateUrl(
    userId: string,
    courseId: string,
  ): Promise<CloudFrontSignedUrlResult> {
    const certificate = await this.prisma.certificate.findUnique({
      where: {
        userId_courseId: {
          userId,
          courseId,
        },
      },
      select: {
        id: true,
        certificateNumber: true,
      },
    });

    if (!certificate) {
      throw new NotFoundException('Certificate not found.');
    }

    return this.generateSignedPdfUrl(this.buildCertificateKey(certificate));
  }

  private generateSignedUrl(
    key: string,
    kind: SignedContentKind,
    options: CloudFrontSignedUrlOptions,
  ): CloudFrontSignedUrlResult {
    this.logger.log(`CloudFront signed URL generation requested. kind=${kind}`);

    const signingConfig = this.getSigningConfig();
    const normalizedKey = this.normalizeObjectKey(key);
    this.validateContentKind(normalizedKey, kind);

    const expiresAt = this.resolveExpiresAt(options.expiresInSeconds);
    const url = this.buildDistributionUrl(normalizedKey, signingConfig.domain);

    try {
      return {
        url: getSignedUrl({
          url,
          keyPairId: signingConfig.keyPairId,
          privateKey: signingConfig.privateKey,
          dateLessThan: expiresAt.toISOString(),
        }),
        expiresAt,
      };
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(
          `Failed to generate CloudFront signed URL: ${error.message}`,
        );
      } else {
        this.logger.error('Failed to generate CloudFront signed URL.');
      }

      throw new InternalServerErrorException(
        'Failed to generate signed content URL.',
      );
    }
  }

  private getSigningConfig(): {
    domain: string;
    keyPairId: string;
    privateKey: string;
  } {
    if (!this.domain) {
      throw new ServiceUnavailableException(
        'CloudFront signed URLs are not configured. Set CLOUDFRONT_DOMAIN.',
      );
    }

    if (!this.keyPairId) {
      throw new ServiceUnavailableException(
        'CloudFront signed URLs are not configured. Set CLOUDFRONT_KEY_PAIR_ID.',
      );
    }

    if (!this.privateKey) {
      throw new ServiceUnavailableException(
        'CloudFront signed URLs are not configured. Set CLOUDFRONT_PRIVATE_KEY.',
      );
    }

    const domain = this.normalizeDomain(this.domain);
    const privateKey = this.normalizePrivateKey(this.privateKey);

    this.validatePrivateKeyFormat(privateKey);

    return {
      domain,
      keyPairId: this.keyPairId,
      privateKey,
    };
  }

  private async ensureUserOwnsCourse(
    userId: string,
    courseId: string,
  ): Promise<void> {
    const userCourse = await this.prisma.userCourse.findUnique({
      where: {
        userId_courseId: {
          userId,
          courseId,
        },
      },
      select: { id: true },
    });

    if (!userCourse) {
      throw new ForbiddenException('Course purchase is required.');
    }
  }

  private async findCourseLesson(courseId: string, lessonId: string) {
    const lesson = await this.prisma.lesson.findFirst({
      where: {
        id: lessonId,
        isActive: true,
        section: {
          courseId,
          isActive: true,
          course: {
            isActive: true,
          },
        },
      },
      select: {
        id: true,
        lessonType: true,
        videoKey: true,
        pdfKey: true,
      },
    });

    if (!lesson) {
      throw new NotFoundException('Lesson not found in this course.');
    }

    return lesson;
  }

  private async findOwnedBookFormat(userId: string, bookFormatId: string) {
    const userBook = await this.prisma.userBook.findUnique({
      where: {
        userId_bookFormatId: {
          userId,
          bookFormatId,
        },
      },
      select: {
        bookFormat: {
          select: {
            id: true,
            formatType: true,
            readerFile: true,
            audioFile: true,
            isActive: true,
            book: {
              select: {
                isActive: true,
              },
            },
          },
        },
      },
    });

    if (!userBook) {
      throw new ForbiddenException('Book purchase is required.');
    }

    if (!userBook.bookFormat.isActive || !userBook.bookFormat.book.isActive) {
      throw new NotFoundException('Book format not found.');
    }

    return userBook.bookFormat;
  }

  private buildCertificateKey(certificate: {
    id: string;
    certificateNumber: string;
  }): string {
    const safeCertificateNumber = certificate.certificateNumber
      .trim()
      .replace(/[^a-zA-Z0-9._-]/g, '-');

    return `certificates/${safeCertificateNumber || certificate.id}.pdf`;
  }

  private resolveExpiresAt(expiresInSeconds?: number): Date {
    const seconds = expiresInSeconds ?? this.defaultExpiresInSeconds;

    if (!Number.isInteger(seconds) || seconds <= 0) {
      throw new BadRequestException(
        'CloudFront signed URL expiration must be a positive integer.',
      );
    }

    return new Date(Date.now() + seconds * 1000);
  }

  private buildDistributionUrl(key: string, domain: string): string {
    const encodedKey = key.split('/').map(encodeURIComponent).join('/');

    return `https://${domain}/${encodedKey}`;
  }

  private validateContentKind(key: string, kind: SignedContentKind): void {
    const extension = this.getLowercaseExtension(key);

    if (kind === 'video' && !['mp4', 'mov', 'webm'].includes(extension)) {
      throw new BadRequestException(
        'CloudFront video key must be a video file.',
      );
    }

    if (kind === 'pdf' && extension !== 'pdf') {
      throw new BadRequestException('CloudFront PDF key must be a PDF file.');
    }
  }

  private getLowercaseExtension(key: string): string {
    const fileName = key.split('/').pop() ?? '';
    const extension = fileName.includes('.')
      ? fileName.slice(fileName.lastIndexOf('.') + 1)
      : '';

    return extension.toLowerCase();
  }

  private normalizeObjectKey(key: string): string {
    if (typeof key !== 'string' || key.trim().length === 0) {
      throw new BadRequestException('CloudFront object key is required.');
    }

    const trimmedKey = key.trim();
    const keyFromUrl = this.tryExtractPathFromUrl(trimmedKey);
    const normalizedKey = (keyFromUrl ?? trimmedKey).replace(/^\/+/, '');

    if (
      normalizedKey.length === 0 ||
      normalizedKey.includes('..') ||
      normalizedKey.includes('\\')
    ) {
      throw new BadRequestException('Invalid CloudFront object key.');
    }

    return normalizedKey;
  }

  private tryExtractPathFromUrl(value: string): string | null {
    if (!/^https?:\/\//i.test(value)) {
      return null;
    }

    try {
      const url = new URL(value);

      return decodeURIComponent(url.pathname);
    } catch {
      throw new BadRequestException('Invalid CloudFront object URL.');
    }
  }

  private normalizeDomain(domain: string): string {
    const trimmedDomain = domain.trim().replace(/^https?:\/\//i, '');
    const normalizedDomain = trimmedDomain.replace(/\/+$/g, '');

    if (
      normalizedDomain.length === 0 ||
      normalizedDomain.includes('/') ||
      normalizedDomain.includes(' ')
    ) {
      throw new ServiceUnavailableException(
        'Invalid CLOUDFRONT_DOMAIN format. Expected a CloudFront domain name.',
      );
    }

    return normalizedDomain;
  }

  private normalizePrivateKey(configValue: string): string {
    const privateKey = configValue
      .replace(/\\n/g, '\n')
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .join('\n');

    return privateKey.trim();
  }

  private validatePrivateKeyFormat(privateKey: string): void {
    if (!this.isPrivateKeyFormatValid(privateKey)) {
      throw new ServiceUnavailableException(
        'Invalid CLOUDFRONT_PRIVATE_KEY format. Expected a PEM private key containing "BEGIN RSA PRIVATE KEY" or "BEGIN PRIVATE KEY". Escaped "\\n" newlines in .env are supported.',
      );
    }
  }

  private isPrivateKeyFormatValid(privateKey: string): boolean {
    return (
      privateKey.includes('BEGIN RSA PRIVATE KEY') ||
      privateKey.includes('BEGIN PRIVATE KEY')
    );
  }

  private optionalConfigValue(value?: string): string | undefined {
    const trimmedValue = typeof value === 'string' ? value.trim() : '';

    return trimmedValue.length > 0 ? trimmedValue : undefined;
  }
}
