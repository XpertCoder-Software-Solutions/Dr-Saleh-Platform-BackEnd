import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { LessonType, Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CoursesService } from './courses.service';

type MockPrismaClient = {
  $transaction: jest.Mock;
  lesson: {
    count: jest.Mock;
    findFirst: jest.Mock;
    findUnique: jest.Mock;
  };
  userCourse: {
    findUnique: jest.Mock;
    update: jest.Mock;
  };
  userLessonProgress: {
    count: jest.Mock;
    findUnique: jest.Mock;
    upsert: jest.Mock;
  };
};
type ProgressUpsertArgs = {
  create: {
    completionPercentage: number;
    isCompleted: boolean;
    watchedSeconds?: number;
  };
  update: {
    completionPercentage: number;
    isCompleted: boolean;
    watchedSeconds?: number;
  };
};
type UserCourseUpdateArgs = {
  data: {
    completedAt: Date | null;
    completionPercentage: number;
    startedAt: Date | null;
  };
};

const userId = 'f804cd9b-e18d-40ec-8b06-e8a5ce896207';
const courseId = '3f08f880-610b-4c2c-a18a-f72ea11e8139';
const lessonId = '6b76f2e3-f084-48a5-92d7-52dd5acf7cd3';

describe('CoursesService progress', () => {
  let prisma: MockPrismaClient;
  let notificationsService: Pick<NotificationsService, 'sendCourseCompleted'>;
  let service: CoursesService;

  beforeEach(() => {
    prisma = createPrismaMock();
    notificationsService = {
      sendCourseCompleted: jest.fn(),
    };
    service = new CoursesService(
      prisma as unknown as PrismaService,
      notificationsService as NotificationsService,
    );
  });

  it('prevents user from updating progress for an unowned course lesson', async () => {
    prisma.lesson.findUnique.mockResolvedValue(createLesson(LessonType.VIDEO));
    prisma.userCourse.findUnique.mockResolvedValue(null);

    await expect(
      service.updateLessonProgress(userId, lessonId, {
        completionPercentage: 50,
        watchedSeconds: 120,
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.userLessonProgress.upsert).not.toHaveBeenCalled();
  });

  it('rejects progress above 100', async () => {
    prisma.lesson.findUnique.mockResolvedValue(createLesson(LessonType.VIDEO));
    prisma.userCourse.findUnique.mockResolvedValue(createUserCourse());

    await expect(
      service.updateLessonProgress(userId, lessonId, {
        completionPercentage: 101,
        watchedSeconds: 120,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.userLessonProgress.upsert).not.toHaveBeenCalled();
  });

  it('marks a PDF lesson complete at 100 percent when user marks it completed', async () => {
    prepareSuccessfulProgressUpdate({
      completedLessons: 1,
      lessonType: LessonType.PDF,
      progressPercentage: 100,
      totalLessons: 2,
    });

    await service.updateLessonProgress(userId, lessonId, {
      completionPercentage: 20,
      isCompleted: true,
    });

    const upsertArgs = getFirstMockArg<ProgressUpsertArgs>(
      prisma.userLessonProgress.upsert,
    );

    expect(upsertArgs.create).toMatchObject({
      completionPercentage: 100,
      isCompleted: true,
      watchedSeconds: 0,
    });
    expect(upsertArgs.update).toMatchObject({
      completionPercentage: 100,
      isCompleted: true,
      watchedSeconds: undefined,
    });
  });

  it('marks a VIDEO lesson complete at 90 percent and preserves watched seconds', async () => {
    prepareSuccessfulProgressUpdate({
      completedLessons: 1,
      lessonType: LessonType.VIDEO,
      progressPercentage: 90,
      totalLessons: 2,
    });

    await service.updateLessonProgress(userId, lessonId, {
      completionPercentage: 90,
      watchedSeconds: 120,
    });

    const upsertArgs = getFirstMockArg<ProgressUpsertArgs>(
      prisma.userLessonProgress.upsert,
    );

    expect(upsertArgs.create).toMatchObject({
      completionPercentage: 90,
      isCompleted: true,
      watchedSeconds: 120,
    });
    expect(upsertArgs.update).toMatchObject({
      completionPercentage: 90,
      isCompleted: true,
      watchedSeconds: 120,
    });
  });

  it('marks the course complete when all active lessons are completed', async () => {
    prepareSuccessfulProgressUpdate({
      completedLessons: 2,
      lessonType: LessonType.VIDEO,
      progressPercentage: 90,
      totalLessons: 2,
    });

    const response = await service.updateLessonProgress(userId, lessonId, {
      completionPercentage: 90,
      watchedSeconds: 120,
    });

    const userCourseUpdateArgs = getFirstMockArg<UserCourseUpdateArgs>(
      prisma.userCourse.update,
    );

    expect(userCourseUpdateArgs.data.completedAt).toBeInstanceOf(Date);
    expect(userCourseUpdateArgs.data.completionPercentage).toBe(100);
    expect(userCourseUpdateArgs.data.startedAt).toBeInstanceOf(Date);
    expect(response.data.courseProgress).toEqual({
      completedLessons: 2,
      completionPercentage: 100,
      courseId,
      isCompleted: true,
      totalLessons: 2,
    });
    expect(notificationsService.sendCourseCompleted).toHaveBeenCalledWith({
      courseTitleAr: 'دورة اختبار',
      courseTitleEn: 'Test Course',
      email: 'student@example.com',
      fullName: 'Student Example',
      userId,
    });
  });

  it('does not expose raw protected lesson keys for owned lessons', async () => {
    prisma.userCourse.findUnique.mockResolvedValue(createUserCourse());
    prisma.lesson.findFirst.mockResolvedValue(createFullLesson());
    prisma.userLessonProgress.findUnique.mockResolvedValue(null);

    const lesson = await service.findMyCourseLesson(userId, courseId, lessonId);

    expect(lesson).not.toHaveProperty('videoKey');
    expect(lesson).not.toHaveProperty('pdfKey');
    expect(lesson).toMatchObject({
      hasPdf: true,
      hasVideo: true,
      lessonType: LessonType.VIDEO,
      videoDurationSeconds: 360,
    });
  });

  function prepareSuccessfulProgressUpdate({
    completedLessons,
    lessonType,
    progressPercentage,
    totalLessons,
  }: {
    completedLessons: number;
    lessonType: LessonType;
    progressPercentage: number;
    totalLessons: number;
  }): void {
    prisma.lesson.findUnique.mockResolvedValue(createLesson(lessonType));
    prisma.userCourse.findUnique
      .mockResolvedValueOnce(createUserCourse())
      .mockResolvedValueOnce(createUserCourse());

    if (completedLessons === totalLessons) {
      prisma.userCourse.findUnique.mockResolvedValueOnce(
        createCourseCompletionNotificationContext(),
      );
    }
    prisma.userLessonProgress.upsert.mockResolvedValue(
      createProgressRecord({
        completionPercentage: progressPercentage,
        isCompleted: progressPercentage >= 90,
      }),
    );
    prisma.lesson.count.mockResolvedValue(totalLessons);
    prisma.userLessonProgress.count.mockResolvedValue(completedLessons);
    prisma.userCourse.update.mockResolvedValue(createUserCourse());
  }
});

function createPrismaMock(): MockPrismaClient {
  const prisma: MockPrismaClient = {
    $transaction: jest.fn(),
    lesson: {
      count: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
    },
    userCourse: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    userLessonProgress: {
      count: jest.fn(),
      findUnique: jest.fn(),
      upsert: jest.fn(),
    },
  };

  prisma.$transaction.mockImplementation(
    async (
      callback: (transactionClient: MockPrismaClient) => Promise<unknown>,
    ) => callback(prisma),
  );

  return prisma;
}

function getFirstMockArg<T>(mock: jest.Mock): T {
  const calls = mock.mock.calls as readonly unknown[][];
  const firstCall = calls[0];

  if (!firstCall) {
    throw new Error('Expected mock to have been called.');
  }

  return firstCall[0] as T;
}

function createLesson(lessonType: LessonType) {
  return {
    id: lessonId,
    lessonType,
    section: {
      courseId,
    },
  };
}

function createFullLesson() {
  const timestamp = new Date('2026-06-12T00:00:00.000Z');

  return {
    createdAt: timestamp,
    displayOrder: 1,
    id: lessonId,
    isActive: true,
    isPreview: false,
    lessonType: LessonType.VIDEO,
    pdfKey: 'courses/pdfs/private.pdf',
    sectionId: 'd1bf4300-1f0e-46b0-bc52-e40138e047ab',
    titleAr: 'درس اختبار',
    titleEn: 'Test Lesson',
    updatedAt: timestamp,
    videoDurationSeconds: 360,
    videoKey: 'courses/videos/private.mp4',
  };
}

function createUserCourse() {
  return {
    completedAt: null,
    id: 'e3ec20a8-57c3-423a-8742-3a09e29400cc',
    startedAt: null,
  };
}

function createCourseCompletionNotificationContext() {
  return {
    course: {
      titleAr: 'دورة اختبار',
      titleEn: 'Test Course',
    },
    user: {
      email: 'student@example.com',
      fullName: 'Student Example',
      id: userId,
    },
  };
}

function createProgressRecord({
  completionPercentage,
  isCompleted,
}: {
  completionPercentage: number;
  isCompleted: boolean;
}) {
  const timestamp = new Date('2026-06-12T00:00:00.000Z');

  return {
    completionPercentage: new Prisma.Decimal(completionPercentage),
    createdAt: timestamp,
    id: 'a4eb65b5-a926-45e0-a8ac-7b12de095b96',
    isCompleted,
    lastWatchedAt: timestamp,
    lessonId,
    updatedAt: timestamp,
    userId,
    watchedSeconds: 120,
  };
}
