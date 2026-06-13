import {
  BadRequestException,
  ForbiddenException,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { LessonType } from '@prisma/client';
import { generateKeyPairSync } from 'crypto';
import type { CloudFrontConfig } from '../../config/cloudfront.config';
import type { PrismaService } from '../../database/prisma.service';
import { CloudFrontService } from './cloudfront.service';

describe('CloudFrontService', () => {
  let service: CloudFrontService;

  beforeEach(() => {
    service = createService();
  });

  it('generates signed video URLs with the default expiration', () => {
    const now = Date.now();
    const result = service.generateSignedVideoUrl(
      'courses/videos/lesson 1.mp4',
    );

    expect(result.url).toContain(
      'https://d27i48p63zrtq4.cloudfront.net/courses/videos/lesson%201.mp4',
    );
    expect(result.url).toContain('Key-Pair-Id=K123456789ABCDEFG');
    expect(result.expiresAt.getTime()).toBeGreaterThanOrEqual(
      now + 15 * 60 * 1000 - 1000,
    );
    expect(result.expiresAt.getTime()).toBeLessThanOrEqual(
      now + 15 * 60 * 1000 + 1000,
    );
  });

  it('supports private keys stored with escaped newline characters', () => {
    const { privateKey } = generateKeyPairSync('rsa', {
      modulusLength: 2048,
    });
    const escapedPrivateKey = (
      privateKey.export({
        format: 'pem',
        type: 'pkcs8',
      }) as string
    ).replace(/\n/g, '\\n');
    const escapedKeyService = createService({
      privateKey: escapedPrivateKey,
    });

    const result = escapedKeyService.generateSignedVideoUrl(
      'courses/videos/lesson-1.mp4',
    );

    expect(result.url).toContain('Key-Pair-Id=K123456789ABCDEFG');
  });

  it('supports pasted multiline keys that also contain escaped newlines', () => {
    const { privateKey } = generateKeyPairSync('rsa', {
      modulusLength: 2048,
    });
    const pastedPrivateKey = (
      privateKey.export({
        format: 'pem',
        type: 'pkcs8',
      }) as string
    ).replace(/\n/g, '\\n\n');
    const pastedKeyService = createService({
      privateKey: pastedPrivateKey,
    });

    const result = pastedKeyService.generateSignedVideoUrl(
      'courses/videos/lesson-1.mp4',
    );

    expect(result.url).toContain('Key-Pair-Id=K123456789ABCDEFG');
  });

  it('rejects non-PDF keys for PDF signed URLs', () => {
    expect(() =>
      service.generateSignedPdfUrl('courses/pdfs/lesson-1.txt'),
    ).toThrow(BadRequestException);
  });

  it('rejects unsafe object keys', () => {
    expect(() =>
      service.generateSignedFileUrl('../private/lesson-1.pdf'),
    ).toThrow(BadRequestException);
  });

  it('reports whether signed URLs are configured', () => {
    expect(service.isSignedUrlConfigured()).toBe(true);

    const incompleteService = createService({
      keyPairId: undefined,
      privateKey: undefined,
    });

    expect(incompleteService.isSignedUrlConfigured()).toBe(false);
  });

  it('does not fail startup when signing keys are missing', () => {
    expect(() =>
      createService({
        keyPairId: undefined,
        privateKey: undefined,
      }),
    ).not.toThrow();
  });

  it('throws a clear configuration error when signing is requested without keys', () => {
    const incompleteService = createService({
      keyPairId: undefined,
      privateKey: undefined,
    });

    expect(() =>
      incompleteService.generateSignedVideoUrl('courses/videos/lesson-1.mp4'),
    ).toThrow(ServiceUnavailableException);
  });

  it('throws a clear configuration error when the private key format is invalid', () => {
    const invalidKeyService = createService({
      privateKey: 'not-a-pem-private-key',
    });

    expect(invalidKeyService.isSignedUrlConfigured()).toBe(false);
    expect(() =>
      invalidKeyService.generateSignedVideoUrl('courses/videos/lesson-1.mp4'),
    ).toThrow(/Invalid CLOUDFRONT_PRIVATE_KEY format/);
  });

  it('throws a clear configuration error when the domain format is invalid', () => {
    const invalidDomainService = createService({
      domain: 'https://d27i48p63zrtq4.cloudfront.net/path',
    });

    expect(() =>
      invalidDomainService.generateSignedVideoUrl(
        'courses/videos/lesson-1.mp4',
      ),
    ).toThrow(/Invalid CLOUDFRONT_DOMAIN format/);
  });

  it('logs when development signing keys are missing', () => {
    const warnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation();

    createService({
      nodeEnv: 'development',
      keyPairId: undefined,
      privateKey: undefined,
    });

    expect(warnSpy).toHaveBeenCalledWith(
      'CloudFront signed URLs are disabled because signing keys are not configured.',
    );

    warnSpy.mockRestore();
  });

  it('generates signed course video URLs only after ownership is verified', async () => {
    const prisma = createPrismaMock({
      userCourse: { findUnique: jest.fn().mockResolvedValue({ id: 'owned' }) },
      lesson: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'lesson-id',
          lessonType: LessonType.VIDEO,
          pdfKey: null,
          videoKey: 'courses/videos/owned-lesson.mp4',
        }),
      },
    });
    const ownedService = createService({}, prisma);

    const result = await ownedService.generateSignedCourseVideoUrl(
      'user-id',
      'course-id',
      'lesson-id',
    );

    expect(result.url).toContain(
      'https://d27i48p63zrtq4.cloudfront.net/courses/videos/owned-lesson.mp4',
    );
  });

  it('rejects signed course URLs for unowned content', async () => {
    const lessonFindFirst = jest.fn();
    const prisma = createPrismaMock({
      userCourse: { findUnique: jest.fn().mockResolvedValue(null) },
      lesson: {
        findFirst: lessonFindFirst,
      },
    });
    const unownedService = createService({}, prisma);

    await expect(
      unownedService.generateSignedCourseVideoUrl(
        'user-id',
        'course-id',
        'lesson-id',
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(lessonFindFirst).not.toHaveBeenCalled();
  });
});

function createService(
  overrides: Partial<CloudFrontConfig> = {},
  prisma: PrismaService = {} as PrismaService,
): CloudFrontService {
  const { privateKey } = generateKeyPairSync('rsa', {
    modulusLength: 2048,
  });

  return new CloudFrontService(
    {
      nodeEnv: 'test',
      domain: 'd27i48p63zrtq4.cloudfront.net',
      keyPairId: 'K123456789ABCDEFG',
      privateKey: privateKey.export({
        format: 'pem',
        type: 'pkcs8',
      }) as string,
      defaultExpiresInSeconds: 15 * 60,
      ...overrides,
    },
    prisma,
  );
}

function createPrismaMock<T extends Partial<PrismaService>>(
  prisma: T,
): PrismaService & T {
  return prisma as PrismaService & T;
}
