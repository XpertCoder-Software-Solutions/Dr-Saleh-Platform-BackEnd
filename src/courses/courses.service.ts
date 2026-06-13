import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  CartItemType,
  LessonType,
  OrderItemType,
  Prisma,
} from '@prisma/client';
import {
  buildPaginationMeta,
  getPaginationParams,
} from '../common/utils/pagination';
import { isPrismaUniqueConstraintError } from '../common/utils/prisma-errors';
import { PrismaService } from '../database/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AdminCourseQueryDto, CourseQueryDto } from './dto/course-query.dto';
import { CreateCourseCategoryDto } from './dto/create-course-category.dto';
import { CreateCourseReviewDto } from './dto/create-course-review.dto';
import { CreateCourseSectionDto } from './dto/create-course-section.dto';
import { CreateCourseDto } from './dto/create-course.dto';
import { CreateLessonDto } from './dto/create-lesson.dto';
import { UpdateCourseCategoryDto } from './dto/update-course-category.dto';
import { UpdateCourseSectionDto } from './dto/update-course-section.dto';
import { UpdateCourseDto } from './dto/update-course.dto';
import { UpdateLessonProgressDto } from './dto/update-lesson-progress.dto';
import { UpdateLessonDto } from './dto/update-lesson.dto';

const courseCategorySelect = {
  id: true,
  nameAr: true,
  nameEn: true,
  image: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.CourseCategorySelect;

const lessonSelect = {
  id: true,
  sectionId: true,
  titleAr: true,
  titleEn: true,
  lessonType: true,
  videoKey: true,
  videoDurationSeconds: true,
  pdfKey: true,
  isPreview: true,
  displayOrder: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.LessonSelect;

const courseSectionSelect = {
  id: true,
  courseId: true,
  titleAr: true,
  titleEn: true,
  displayOrder: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
  lessons: {
    select: lessonSelect,
    orderBy: {
      displayOrder: 'asc' as const,
    },
  },
} satisfies Prisma.CourseSectionSelect;

const courseSelect = {
  id: true,
  categoryId: true,
  titleAr: true,
  titleEn: true,
  shortDescriptionAr: true,
  shortDescriptionEn: true,
  descriptionAr: true,
  descriptionEn: true,
  thumbnailImage: true,
  promoVideoUrl: true,
  priceEGP: true,
  priceUSD: true,
  discountPriceEGP: true,
  discountPriceUSD: true,
  certificateEnabled: true,
  isFeatured: true,
  isHomeDisplay: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
  category: {
    select: courseCategorySelect,
  },
  sections: {
    select: courseSectionSelect,
    orderBy: {
      displayOrder: 'asc' as const,
    },
  },
} satisfies Prisma.CourseSelect;

const courseSummarySelect = {
  id: true,
  categoryId: true,
  titleAr: true,
  titleEn: true,
  shortDescriptionAr: true,
  shortDescriptionEn: true,
  thumbnailImage: true,
  promoVideoUrl: true,
  priceEGP: true,
  priceUSD: true,
  discountPriceEGP: true,
  discountPriceUSD: true,
  certificateEnabled: true,
  isFeatured: true,
  isHomeDisplay: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
  category: {
    select: courseCategorySelect,
  },
} satisfies Prisma.CourseSelect;

const userCourseSelect = {
  id: true,
  userId: true,
  courseId: true,
  purchasedAt: true,
  startedAt: true,
  completedAt: true,
  completionPercentage: true,
  createdAt: true,
  updatedAt: true,
  course: {
    select: courseSummarySelect,
  },
} satisfies Prisma.UserCourseSelect;

const userLessonProgressSelect = {
  id: true,
  userId: true,
  lessonId: true,
  watchedSeconds: true,
  completionPercentage: true,
  isCompleted: true,
  lastWatchedAt: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.UserLessonProgressSelect;

const courseReviewSelect = {
  id: true,
  userId: true,
  courseId: true,
  rating: true,
  title: true,
  comment: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
  user: {
    select: {
      id: true,
      fullName: true,
      profileImage: true,
    },
  },
} satisfies Prisma.CourseReviewSelect;

const certificateSelect = {
  id: true,
  userId: true,
  courseId: true,
  certificateNumber: true,
  issuedAt: true,
  createdAt: true,
  user: {
    select: {
      id: true,
      fullName: true,
      email: true,
    },
  },
  course: {
    select: courseSummarySelect,
  },
} satisfies Prisma.CertificateSelect;

type CourseCategoryRecord = Prisma.CourseCategoryGetPayload<{
  select: typeof courseCategorySelect;
}>;
type LessonRecord = Prisma.LessonGetPayload<{ select: typeof lessonSelect }>;
type CourseSectionRecord = Prisma.CourseSectionGetPayload<{
  select: typeof courseSectionSelect;
}>;
type CourseRecord = Prisma.CourseGetPayload<{ select: typeof courseSelect }>;
type CourseSummaryRecord = Prisma.CourseGetPayload<{
  select: typeof courseSummarySelect;
}>;
type UserCourseRecord = Prisma.UserCourseGetPayload<{
  select: typeof userCourseSelect;
}>;
type UserLessonProgressRecord = Prisma.UserLessonProgressGetPayload<{
  select: typeof userLessonProgressSelect;
}>;
type LessonProgressResponse = {
  id: string;
  userId: string;
  lessonId: string;
  watchedSeconds: number;
  completionPercentage: number;
  isCompleted: boolean;
  lastWatchedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};
type CertificateRecord = Prisma.CertificateGetPayload<{
  select: typeof certificateSelect;
}>;
type EmptyData = Record<string, never>;
type CourseProgressSummary = {
  courseId: string;
  totalLessons: number;
  completedLessons: number;
  completionPercentage: number;
  isCompleted: boolean;
};
type CourseCompletionSyncResult = {
  courseProgress: CourseProgressSummary;
  wasAlreadyCompleted: boolean;
};
type ContinueLessonResponse = {
  lessonId: string;
  sectionId: string;
  lessonType: LessonType;
  titleAr: string;
  titleEn: string;
  completionPercentage: number;
};
type CourseProgressClient = Pick<
  Prisma.TransactionClient,
  'lesson' | 'userCourse' | 'userLessonProgress'
>;

const LESSON_COMPLETION_THRESHOLD_PERCENTAGE = 90;

@Injectable()
export class CoursesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  adminFindCategories() {
    return this.prisma.courseCategory.findMany({
      select: courseCategorySelect,
      orderBy: { createdAt: 'desc' },
    });
  }

  async adminFindCategory(id: string) {
    return this.findCategoryOrThrow(id);
  }

  async adminCreateCategory(createDto: CreateCourseCategoryDto) {
    const category = await this.prisma.courseCategory.create({
      data: {
        nameAr: createDto.nameAr,
        nameEn: createDto.nameEn,
        image: createDto.image,
        isActive: createDto.isActive ?? true,
      },
      select: courseCategorySelect,
    });

    return {
      message: 'Course category created successfully',
      data: { category },
    };
  }

  async adminUpdateCategory(id: string, updateDto: UpdateCourseCategoryDto) {
    await this.findCategoryOrThrow(id);

    const category = await this.prisma.courseCategory.update({
      where: { id },
      data: {
        nameAr: updateDto.nameAr,
        nameEn: updateDto.nameEn,
        image: updateDto.image,
        isActive: updateDto.isActive,
      },
      select: courseCategorySelect,
    });

    return {
      message: 'Course category updated successfully',
      data: { category },
    };
  }

  async adminDeleteCategory(
    id: string,
  ): Promise<{ message: string; data: EmptyData }> {
    await this.findCategoryOrThrow(id);

    const coursesCount = await this.prisma.course.count({
      where: { categoryId: id },
    });

    if (coursesCount > 0) {
      throw new ConflictException(
        'Course category cannot be deleted while courses are assigned to it. Set isActive to false instead.',
      );
    }

    await this.prisma.courseCategory.delete({ where: { id } });

    return {
      message: 'Course category deleted successfully',
      data: {},
    };
  }

  async adminCreateCourse(createDto: CreateCourseDto) {
    await this.ensureCategoryExists(createDto.categoryId);
    this.validateDiscountPrices({
      priceEGP: createDto.priceEGP,
      discountPriceEGP: createDto.discountPriceEGP,
      priceUSD: createDto.priceUSD,
      discountPriceUSD: createDto.discountPriceUSD,
    });

    const course = await this.prisma.course.create({
      data: {
        categoryId: createDto.categoryId,
        titleAr: createDto.titleAr,
        titleEn: createDto.titleEn,
        shortDescriptionAr: createDto.shortDescriptionAr,
        shortDescriptionEn: createDto.shortDescriptionEn,
        descriptionAr: createDto.descriptionAr,
        descriptionEn: createDto.descriptionEn,
        thumbnailImage: createDto.thumbnailImage,
        promoVideoUrl: createDto.promoVideoUrl,
        priceEGP: createDto.priceEGP,
        priceUSD: createDto.priceUSD,
        discountPriceEGP: createDto.discountPriceEGP,
        discountPriceUSD: createDto.discountPriceUSD,
        certificateEnabled: createDto.certificateEnabled ?? false,
        isFeatured: createDto.isFeatured ?? false,
        isHomeDisplay: createDto.isHomeDisplay ?? false,
        isActive: createDto.isActive ?? true,
      },
      select: courseSelect,
    });

    return {
      message: 'Course created successfully',
      data: {
        course: this.toCourse(course, { includeProtectedLessonKeys: true }),
      },
    };
  }

  async adminFindCourses(query: AdminCourseQueryDto) {
    const { page, limit, skip } = getPaginationParams(query);
    const where = this.buildAdminCoursesWhere(query);

    const [total, courses] = await this.prisma.$transaction([
      this.prisma.course.count({ where }),
      this.prisma.course.findMany({
        where,
        select: courseSummarySelect,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    return {
      message: 'Courses returned successfully',
      data: {
        courses: courses.map((course) => this.toCourseSummary(course)),
        pagination: buildPaginationMeta(page, limit, total),
      },
    };
  }

  async adminFindCourse(id: string) {
    const course = await this.findCourseOrThrow(id);

    return this.toCourse(course, { includeProtectedLessonKeys: true });
  }

  async adminUpdateCourse(id: string, updateDto: UpdateCourseDto) {
    const currentCourse = await this.prisma.course.findUnique({
      where: { id },
      select: {
        id: true,
        priceEGP: true,
        priceUSD: true,
        discountPriceEGP: true,
        discountPriceUSD: true,
      },
    });

    if (!currentCourse) {
      throw new NotFoundException('Course not found.');
    }

    if (updateDto.categoryId !== undefined) {
      await this.ensureCategoryExists(updateDto.categoryId);
    }

    this.validateDiscountPrices({
      priceEGP:
        updateDto.priceEGP ?? this.toNumberFromDecimal(currentCourse.priceEGP),
      discountPriceEGP:
        updateDto.discountPriceEGP ??
        this.toOptionalNumberFromDecimal(currentCourse.discountPriceEGP),
      priceUSD:
        updateDto.priceUSD ?? this.toNumberFromDecimal(currentCourse.priceUSD),
      discountPriceUSD:
        updateDto.discountPriceUSD ??
        this.toOptionalNumberFromDecimal(currentCourse.discountPriceUSD),
    });

    const course = await this.prisma.course.update({
      where: { id },
      data: {
        categoryId: updateDto.categoryId,
        titleAr: updateDto.titleAr,
        titleEn: updateDto.titleEn,
        shortDescriptionAr: updateDto.shortDescriptionAr,
        shortDescriptionEn: updateDto.shortDescriptionEn,
        descriptionAr: updateDto.descriptionAr,
        descriptionEn: updateDto.descriptionEn,
        thumbnailImage: updateDto.thumbnailImage,
        promoVideoUrl: updateDto.promoVideoUrl,
        priceEGP: updateDto.priceEGP,
        priceUSD: updateDto.priceUSD,
        discountPriceEGP: updateDto.discountPriceEGP,
        discountPriceUSD: updateDto.discountPriceUSD,
        certificateEnabled: updateDto.certificateEnabled,
        isFeatured: updateDto.isFeatured,
        isHomeDisplay: updateDto.isHomeDisplay,
        isActive: updateDto.isActive,
      },
      select: courseSelect,
    });

    return {
      message: 'Course updated successfully',
      data: {
        course: this.toCourse(course, { includeProtectedLessonKeys: true }),
      },
    };
  }

  async adminDeleteCourse(
    id: string,
  ): Promise<{ message: string; data: EmptyData }> {
    await this.findCourseOrThrow(id);

    const dependenciesCount = await this.countCourseDependencies(id);

    if (dependenciesCount > 0) {
      throw new ConflictException(
        'Course cannot be deleted while it has sections, purchases, reviews, certificates, carts, or orders. Set isActive to false instead.',
      );
    }

    await this.prisma.course.delete({ where: { id } });

    return {
      message: 'Course deleted successfully',
      data: {},
    };
  }

  async adminCreateSection(
    courseId: string,
    createDto: CreateCourseSectionDto,
  ) {
    await this.ensureCourseExists(courseId);

    try {
      const section = await this.prisma.courseSection.create({
        data: {
          courseId,
          titleAr: createDto.titleAr,
          titleEn: createDto.titleEn,
          displayOrder: createDto.displayOrder,
          isActive: createDto.isActive ?? true,
        },
        select: courseSectionSelect,
      });

      return {
        message: 'Course section created successfully',
        data: {
          section: this.toSection(section, {
            includeProtectedLessonKeys: true,
          }),
        },
      };
    } catch (error) {
      this.handleUniqueConstraintError(
        error,
        'Section displayOrder already exists for this course.',
      );
    }
  }

  async adminFindSections(courseId: string) {
    await this.ensureCourseExists(courseId);

    const sections = await this.prisma.courseSection.findMany({
      where: { courseId },
      select: courseSectionSelect,
      orderBy: { displayOrder: 'asc' },
    });

    return sections.map((section) =>
      this.toSection(section, { includeProtectedLessonKeys: true }),
    );
  }

  async adminUpdateSection(id: string, updateDto: UpdateCourseSectionDto) {
    await this.findSectionOrThrow(id);

    try {
      const section = await this.prisma.courseSection.update({
        where: { id },
        data: {
          titleAr: updateDto.titleAr,
          titleEn: updateDto.titleEn,
          displayOrder: updateDto.displayOrder,
          isActive: updateDto.isActive,
        },
        select: courseSectionSelect,
      });

      return {
        message: 'Course section updated successfully',
        data: {
          section: this.toSection(section, {
            includeProtectedLessonKeys: true,
          }),
        },
      };
    } catch (error) {
      this.handleUniqueConstraintError(
        error,
        'Section displayOrder already exists for this course.',
      );
    }
  }

  async adminDeleteSection(
    id: string,
  ): Promise<{ message: string; data: EmptyData }> {
    await this.findSectionOrThrow(id);

    const lessonsCount = await this.prisma.lesson.count({
      where: { sectionId: id },
    });

    if (lessonsCount > 0) {
      throw new ConflictException(
        'Course section cannot be deleted while lessons are assigned to it. Set isActive to false instead.',
      );
    }

    await this.prisma.courseSection.delete({ where: { id } });

    return {
      message: 'Course section deleted successfully',
      data: {},
    };
  }

  async adminCreateLesson(sectionId: string, createDto: CreateLessonDto) {
    await this.ensureSectionExists(sectionId);
    this.validateLessonContent(createDto);

    try {
      const lessonData: Prisma.LessonUncheckedCreateInput = {
        sectionId,
        titleAr: createDto.titleAr,
        titleEn: createDto.titleEn,
        lessonType: createDto.lessonType,
        ...this.getLessonCreateContentData(createDto),
        isPreview: createDto.isPreview ?? false,
        displayOrder: createDto.displayOrder,
        isActive: createDto.isActive ?? true,
      };

      const lesson = await this.prisma.lesson.create({
        data: lessonData,
        select: lessonSelect,
      });

      return {
        message: 'Lesson created successfully',
        data: { lesson: this.toLesson(lesson) },
      };
    } catch (error) {
      this.handleUniqueConstraintError(
        error,
        'Lesson displayOrder already exists for this section.',
      );
    }
  }

  async adminFindLessons(sectionId: string) {
    await this.ensureSectionExists(sectionId);

    const lessons = await this.prisma.lesson.findMany({
      where: { sectionId },
      select: lessonSelect,
      orderBy: { displayOrder: 'asc' },
    });

    return lessons.map((lesson) => this.toLesson(lesson));
  }

  async adminUpdateLesson(id: string, updateDto: UpdateLessonDto) {
    const currentLesson = await this.findLessonOrThrow(id);
    const nextLesson = {
      lessonType: updateDto.lessonType ?? currentLesson.lessonType,
      videoKey: updateDto.videoKey ?? currentLesson.videoKey,
      videoDurationSeconds:
        updateDto.videoDurationSeconds ?? currentLesson.videoDurationSeconds,
      pdfKey: updateDto.pdfKey ?? currentLesson.pdfKey,
    };
    this.validateLessonContent(nextLesson);

    try {
      const lessonData = this.getLessonUpdateData(
        currentLesson,
        updateDto,
        nextLesson,
      );

      const lesson = await this.prisma.lesson.update({
        where: { id },
        data: lessonData,
        select: lessonSelect,
      });

      return {
        message: 'Lesson updated successfully',
        data: { lesson: this.toLesson(lesson) },
      };
    } catch (error) {
      this.handleUniqueConstraintError(
        error,
        'Lesson displayOrder already exists for this section.',
      );
    }
  }

  async adminDeleteLesson(
    id: string,
  ): Promise<{ message: string; data: EmptyData }> {
    await this.findLessonOrThrow(id);

    const dependenciesCount = await this.countLessonDependencies(id);

    if (dependenciesCount > 0) {
      throw new ConflictException(
        'Lesson cannot be deleted while progress or content sessions exist. Set isActive to false instead.',
      );
    }

    await this.prisma.lesson.delete({ where: { id } });

    return {
      message: 'Lesson deleted successfully',
      data: {},
    };
  }

  async findCourses(query: CourseQueryDto) {
    const { page, limit, skip } = getPaginationParams(query);
    const where = this.buildPublicCoursesWhere(query);

    const [total, courses] = await this.prisma.$transaction([
      this.prisma.course.count({ where }),
      this.prisma.course.findMany({
        where,
        select: courseSummarySelect,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    return {
      message: 'Courses returned successfully',
      data: {
        courses: courses.map((course) => this.toCourseSummary(course)),
        pagination: buildPaginationMeta(page, limit, total),
      },
    };
  }

  async findHomeCourses() {
    const courses = await this.prisma.course.findMany({
      where: {
        isActive: true,
        isHomeDisplay: true,
      },
      select: courseSummarySelect,
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    return courses.map((course) => this.toCourseSummary(course));
  }

  async findFeaturedCourses() {
    const courses = await this.prisma.course.findMany({
      where: {
        isActive: true,
        isFeatured: true,
      },
      select: courseSummarySelect,
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    return courses.map((course) => this.toCourseSummary(course));
  }

  async findCourseById(id: string) {
    const course = await this.prisma.course.findFirst({
      where: {
        id,
        isActive: true,
      },
      select: courseSelect,
    });

    if (!course) {
      throw new NotFoundException('Course not found.');
    }

    return this.toCourse(course, { includeProtectedLessonKeys: false });
  }

  async findMyCourses(userId: string) {
    const userCourses = await this.prisma.userCourse.findMany({
      where: { userId },
      select: userCourseSelect,
      orderBy: { purchasedAt: 'desc' },
    });

    return userCourses.map((userCourse) => this.toUserCourse(userCourse));
  }

  async findMyCourse(userId: string, courseId: string) {
    await this.ensureUserPurchasedCourse(userId, courseId);
    const course = await this.findCourseOrThrow(courseId);
    const progress = await this.loadCourseProgress(userId, courseId);

    return this.toCourse(course, {
      includeProtectedLessonKeys: false,
      progress,
    });
  }

  async findMyCourseLesson(userId: string, courseId: string, lessonId: string) {
    await this.ensureUserPurchasedCourse(userId, courseId);
    const lesson = await this.findLessonInCourseOrThrow(courseId, lessonId);
    const progress = await this.prisma.userLessonProgress.findUnique({
      where: {
        userId_lessonId: {
          userId,
          lessonId,
        },
      },
      select: userLessonProgressSelect,
    });

    return {
      ...this.toLesson(lesson),
      progress: progress ? this.toProgress(progress) : null,
    };
  }

  async getMyCourseProgress(
    userId: string,
    courseId: string,
  ): Promise<CourseProgressSummary> {
    await this.ensureUserPurchasedCourse(userId, courseId);
    await this.ensureCourseExists(courseId);

    return this.calculateCourseProgress(this.prisma, userId, courseId);
  }

  async getMyCourseContinueLesson(
    userId: string,
    courseId: string,
  ): Promise<ContinueLessonResponse> {
    await this.ensureUserPurchasedCourse(userId, courseId);
    await this.ensureCourseExists(courseId);

    const lessons = await this.prisma.lesson.findMany({
      where: {
        isActive: true,
        section: {
          courseId,
          isActive: true,
        },
      },
      select: {
        id: true,
        sectionId: true,
        lessonType: true,
        titleAr: true,
        titleEn: true,
        userProgress: {
          where: { userId },
          select: {
            completionPercentage: true,
            isCompleted: true,
          },
          take: 1,
        },
      },
      orderBy: [{ section: { displayOrder: 'asc' } }, { displayOrder: 'asc' }],
    });

    if (lessons.length === 0) {
      throw new NotFoundException('No active lessons found for this course.');
    }

    const continueLesson =
      lessons.find((lesson) => !lesson.userProgress[0]?.isCompleted) ??
      lessons[lessons.length - 1];
    const progress = continueLesson.userProgress[0];

    return {
      lessonId: continueLesson.id,
      sectionId: continueLesson.sectionId,
      lessonType: continueLesson.lessonType,
      titleAr: continueLesson.titleAr,
      titleEn: continueLesson.titleEn,
      completionPercentage: progress
        ? this.toNumberFromDecimal(progress.completionPercentage)
        : 0,
    };
  }

  async updateLessonProgress(
    userId: string,
    lessonId: string,
    updateDto: UpdateLessonProgressDto,
  ) {
    const lesson = await this.prisma.lesson.findUnique({
      where: { id: lessonId },
      select: {
        id: true,
        lessonType: true,
        section: {
          select: {
            courseId: true,
          },
        },
      },
    });

    if (!lesson) {
      throw new NotFoundException('Lesson not found.');
    }

    await this.ensureUserPurchasedCourse(userId, lesson.section.courseId);

    const normalizedProgress = this.resolveLessonProgressUpdate(
      lesson.lessonType,
      updateDto,
    );

    const result = await this.prisma.$transaction(async (tx) => {
      const progress = await tx.userLessonProgress.upsert({
        where: {
          userId_lessonId: {
            userId,
            lessonId,
          },
        },
        create: {
          userId,
          lessonId,
          watchedSeconds: normalizedProgress.watchedSeconds ?? 0,
          completionPercentage: normalizedProgress.completionPercentage,
          isCompleted: normalizedProgress.isCompleted,
          lastWatchedAt: normalizedProgress.lastWatchedAt,
        },
        update: {
          watchedSeconds: normalizedProgress.watchedSeconds,
          completionPercentage: normalizedProgress.completionPercentage,
          isCompleted: normalizedProgress.isCompleted,
          lastWatchedAt: normalizedProgress.lastWatchedAt,
        },
        select: userLessonProgressSelect,
      });
      const courseCompletion = await this.syncUserCourseCompletion(
        tx,
        userId,
        lesson.section.courseId,
        normalizedProgress.lastWatchedAt,
      );

      return {
        progress,
        courseProgress: courseCompletion.courseProgress,
        shouldNotifyCourseCompleted:
          courseCompletion.courseProgress.isCompleted &&
          !courseCompletion.wasAlreadyCompleted,
      };
    });

    if (result.shouldNotifyCourseCompleted) {
      await this.sendCourseCompletedNotification(
        userId,
        lesson.section.courseId,
      );
    }

    return {
      message: 'Lesson progress updated successfully',
      data: {
        progress: this.toProgress(result.progress),
        courseProgress: result.courseProgress,
      },
    };
  }

  async createReview(
    userId: string,
    courseId: string,
    createDto: CreateCourseReviewDto,
  ) {
    await this.ensureCourseExists(courseId);
    await this.ensureUserPurchasedCourse(userId, courseId);

    try {
      const review = await this.prisma.courseReview.create({
        data: {
          userId,
          courseId,
          rating: createDto.rating,
          title: createDto.title,
          comment: createDto.comment,
          isActive: true,
        },
        select: courseReviewSelect,
      });

      return {
        message: 'Course review created successfully',
        data: { review: this.toReview(review) },
      };
    } catch (error) {
      this.handleUniqueConstraintError(
        error,
        'You have already reviewed this course.',
      );
    }
  }

  async findReviews(courseId: string, page = 1, limit = 20) {
    await this.ensureCourseExists(courseId);
    const skip = (page - 1) * limit;

    const [total, reviews] = await this.prisma.$transaction([
      this.prisma.courseReview.count({
        where: {
          courseId,
          isActive: true,
        },
      }),
      this.prisma.courseReview.findMany({
        where: {
          courseId,
          isActive: true,
        },
        select: courseReviewSelect,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    return {
      message: 'Course reviews returned successfully',
      data: {
        reviews: reviews.map((review) => this.toReview(review)),
        pagination: buildPaginationMeta(page, limit, total),
      },
    };
  }

  async findMyCertificates(userId: string) {
    const certificates = await this.prisma.certificate.findMany({
      where: { userId },
      select: certificateSelect,
      orderBy: { issuedAt: 'desc' },
    });

    return certificates.map((certificate) => this.toCertificate(certificate));
  }

  async findMyCertificate(userId: string, courseId: string) {
    const certificate = await this.prisma.certificate.findUnique({
      where: {
        userId_courseId: {
          userId,
          courseId,
        },
      },
      select: certificateSelect,
    });

    if (!certificate) {
      throw new NotFoundException('Certificate not found.');
    }

    return this.toCertificate(certificate);
  }

  async verifyCertificate(certificateNumber: string) {
    const certificate = await this.prisma.certificate.findUnique({
      where: { certificateNumber },
      select: certificateSelect,
    });

    if (!certificate) {
      throw new NotFoundException('Certificate not found.');
    }

    return this.toCertificate(certificate);
  }

  private async findCategoryOrThrow(id: string): Promise<CourseCategoryRecord> {
    const category = await this.prisma.courseCategory.findUnique({
      where: { id },
      select: courseCategorySelect,
    });

    if (!category) {
      throw new NotFoundException('Course category not found.');
    }

    return category;
  }

  private async findCourseOrThrow(id: string): Promise<CourseRecord> {
    const course = await this.prisma.course.findUnique({
      where: { id },
      select: courseSelect,
    });

    if (!course) {
      throw new NotFoundException('Course not found.');
    }

    return course;
  }

  private async findSectionOrThrow(id: string): Promise<CourseSectionRecord> {
    const section = await this.prisma.courseSection.findUnique({
      where: { id },
      select: courseSectionSelect,
    });

    if (!section) {
      throw new NotFoundException('Course section not found.');
    }

    return section;
  }

  private async findLessonOrThrow(id: string): Promise<LessonRecord> {
    const lesson = await this.prisma.lesson.findUnique({
      where: { id },
      select: lessonSelect,
    });

    if (!lesson) {
      throw new NotFoundException('Lesson not found.');
    }

    return lesson;
  }

  private async findLessonInCourseOrThrow(
    courseId: string,
    lessonId: string,
  ): Promise<LessonRecord> {
    const lesson = await this.prisma.lesson.findFirst({
      where: {
        id: lessonId,
        section: {
          courseId,
        },
      },
      select: lessonSelect,
    });

    if (!lesson) {
      throw new NotFoundException('Lesson not found in this course.');
    }

    return lesson;
  }

  private async ensureCategoryExists(categoryId: string): Promise<void> {
    const category = await this.prisma.courseCategory.findUnique({
      where: { id: categoryId },
      select: { id: true },
    });

    if (!category) {
      throw new BadRequestException('Course category does not exist.');
    }
  }

  private async ensureCourseExists(courseId: string): Promise<void> {
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      select: { id: true },
    });

    if (!course) {
      throw new NotFoundException('Course not found.');
    }
  }

  private async ensureSectionExists(sectionId: string): Promise<void> {
    const section = await this.prisma.courseSection.findUnique({
      where: { id: sectionId },
      select: { id: true },
    });

    if (!section) {
      throw new NotFoundException('Course section not found.');
    }
  }

  private async ensureUserPurchasedCourse(
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

  private async calculateCourseProgress(
    client: CourseProgressClient,
    userId: string,
    courseId: string,
  ): Promise<CourseProgressSummary> {
    const activeLessonWhere: Prisma.LessonWhereInput = {
      isActive: true,
      section: {
        courseId,
        isActive: true,
      },
    };
    const [totalLessons, completedLessons] = await Promise.all([
      client.lesson.count({ where: activeLessonWhere }),
      client.userLessonProgress.count({
        where: {
          userId,
          isCompleted: true,
          lesson: activeLessonWhere,
        },
      }),
    ]);
    const completionPercentage =
      totalLessons === 0
        ? 0
        : this.roundPercentage((completedLessons / totalLessons) * 100);

    return {
      courseId,
      totalLessons,
      completedLessons,
      completionPercentage,
      isCompleted: totalLessons > 0 && completedLessons === totalLessons,
    };
  }

  private async syncUserCourseCompletion(
    client: CourseProgressClient,
    userId: string,
    courseId: string,
    timestamp: Date,
  ): Promise<CourseCompletionSyncResult> {
    const userCourse = await client.userCourse.findUnique({
      where: {
        userId_courseId: {
          userId,
          courseId,
        },
      },
      select: {
        completedAt: true,
        startedAt: true,
      },
    });

    if (!userCourse) {
      throw new ForbiddenException('Course purchase is required.');
    }

    const courseProgress = await this.calculateCourseProgress(
      client,
      userId,
      courseId,
    );

    await client.userCourse.update({
      where: {
        userId_courseId: {
          userId,
          courseId,
        },
      },
      data: {
        completionPercentage: courseProgress.completionPercentage,
        completedAt: courseProgress.isCompleted
          ? (userCourse.completedAt ?? timestamp)
          : null,
        startedAt: userCourse.startedAt ?? timestamp,
      },
    });

    return {
      courseProgress,
      wasAlreadyCompleted: userCourse.completedAt !== null,
    };
  }

  private async sendCourseCompletedNotification(
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
      select: {
        user: {
          select: {
            id: true,
            email: true,
            fullName: true,
          },
        },
        course: {
          select: {
            titleAr: true,
            titleEn: true,
          },
        },
      },
    });

    if (!userCourse) {
      return;
    }

    await this.notificationsService.sendCourseCompleted({
      userId: userCourse.user.id,
      email: userCourse.user.email,
      fullName: userCourse.user.fullName,
      courseTitleAr: userCourse.course.titleAr,
      courseTitleEn: userCourse.course.titleEn,
    });
  }

  private async countCourseDependencies(courseId: string): Promise<number> {
    const [sections, purchases, reviews, certificates, cartItems, orderItems] =
      await this.prisma.$transaction([
        this.prisma.courseSection.count({ where: { courseId } }),
        this.prisma.userCourse.count({ where: { courseId } }),
        this.prisma.courseReview.count({ where: { courseId } }),
        this.prisma.certificate.count({ where: { courseId } }),
        this.prisma.cartItem.count({
          where: { itemType: CartItemType.COURSE, itemId: courseId },
        }),
        this.prisma.orderItem.count({
          where: { itemType: OrderItemType.COURSE, itemId: courseId },
        }),
      ]);

    return (
      sections + purchases + reviews + certificates + cartItems + orderItems
    );
  }

  private async countLessonDependencies(lessonId: string): Promise<number> {
    const [progress, sessions] = await this.prisma.$transaction([
      this.prisma.userLessonProgress.count({ where: { lessonId } }),
      this.prisma.contentSession.count({ where: { lessonId } }),
    ]);

    return progress + sessions;
  }

  private async loadCourseProgress(
    userId: string,
    courseId: string,
  ): Promise<Map<string, LessonProgressResponse>> {
    const progress = await this.prisma.userLessonProgress.findMany({
      where: {
        userId,
        lesson: {
          section: {
            courseId,
          },
        },
      },
      select: userLessonProgressSelect,
    });

    return new Map(
      progress.map((progressItem) => [
        progressItem.lessonId,
        this.toProgress(progressItem),
      ]),
    );
  }

  private buildPublicCoursesWhere(
    query: CourseQueryDto,
  ): Prisma.CourseWhereInput {
    return {
      ...this.buildBaseCoursesWhere(query),
      isActive: true,
    };
  }

  private buildAdminCoursesWhere(
    query: AdminCourseQueryDto,
  ): Prisma.CourseWhereInput {
    const where = this.buildBaseCoursesWhere(query);

    if (query.isHomeDisplay !== undefined) {
      where.isHomeDisplay = query.isHomeDisplay;
    }

    if (query.isActive !== undefined) {
      where.isActive = query.isActive;
    }

    return where;
  }

  private buildBaseCoursesWhere(
    query: CourseQueryDto,
  ): Prisma.CourseWhereInput {
    const where: Prisma.CourseWhereInput = {};

    if (query.categoryId) {
      where.categoryId = query.categoryId;
    }

    if (query.isFeatured !== undefined) {
      where.isFeatured = query.isFeatured;
    }

    if (query.search) {
      where.OR = [
        { titleAr: { contains: query.search, mode: 'insensitive' } },
        { titleEn: { contains: query.search, mode: 'insensitive' } },
        {
          shortDescriptionAr: {
            contains: query.search,
            mode: 'insensitive',
          },
        },
        {
          shortDescriptionEn: {
            contains: query.search,
            mode: 'insensitive',
          },
        },
        { descriptionAr: { contains: query.search, mode: 'insensitive' } },
        { descriptionEn: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    return where;
  }

  private validateDiscountPrices({
    priceEGP,
    discountPriceEGP,
    priceUSD,
    discountPriceUSD,
  }: {
    priceEGP: number;
    discountPriceEGP?: number;
    priceUSD: number;
    discountPriceUSD?: number;
  }): void {
    if (discountPriceEGP !== undefined && discountPriceEGP >= priceEGP) {
      throw new BadRequestException(
        'discountPriceEGP must be less than priceEGP.',
      );
    }

    if (discountPriceUSD !== undefined && discountPriceUSD >= priceUSD) {
      throw new BadRequestException(
        'discountPriceUSD must be less than priceUSD.',
      );
    }
  }

  private getLessonCreateContentData(
    createDto: CreateLessonDto,
  ): Pick<
    Prisma.LessonUncheckedCreateInput,
    'videoKey' | 'videoDurationSeconds' | 'pdfKey'
  > {
    if (createDto.lessonType === LessonType.VIDEO) {
      return {
        videoKey: createDto.videoKey,
        videoDurationSeconds: createDto.videoDurationSeconds,
      };
    }

    return {
      pdfKey: createDto.pdfKey,
    };
  }

  private getLessonUpdateData(
    currentLesson: LessonRecord,
    updateDto: UpdateLessonDto,
    nextLesson: {
      lessonType: LessonType;
      videoKey?: string | null;
      videoDurationSeconds?: number | null;
      pdfKey?: string | null;
    },
  ): Prisma.LessonUncheckedUpdateInput {
    const lessonData: Prisma.LessonUncheckedUpdateInput = {};

    if (updateDto.titleAr !== undefined) {
      lessonData.titleAr = updateDto.titleAr;
    }

    if (updateDto.titleEn !== undefined) {
      lessonData.titleEn = updateDto.titleEn;
    }

    if (updateDto.lessonType !== undefined) {
      lessonData.lessonType = updateDto.lessonType;
    }

    if (updateDto.isPreview !== undefined) {
      lessonData.isPreview = updateDto.isPreview;
    }

    if (updateDto.displayOrder !== undefined) {
      lessonData.displayOrder = updateDto.displayOrder;
    }

    if (updateDto.isActive !== undefined) {
      lessonData.isActive = updateDto.isActive;
    }

    if (nextLesson.lessonType === LessonType.VIDEO) {
      if (
        updateDto.lessonType !== undefined ||
        updateDto.videoKey !== undefined
      ) {
        lessonData.videoKey = nextLesson.videoKey;
      }

      if (
        updateDto.lessonType !== undefined ||
        updateDto.videoDurationSeconds !== undefined
      ) {
        lessonData.videoDurationSeconds = nextLesson.videoDurationSeconds;
      }

      if (
        updateDto.lessonType === LessonType.VIDEO &&
        currentLesson.lessonType !== LessonType.VIDEO
      ) {
        lessonData.pdfKey = null;
      }

      return lessonData;
    }

    if (updateDto.lessonType !== undefined || updateDto.pdfKey !== undefined) {
      lessonData.pdfKey = nextLesson.pdfKey;
    }

    if (
      updateDto.lessonType === LessonType.PDF &&
      currentLesson.lessonType !== LessonType.PDF
    ) {
      lessonData.videoKey = null;
      lessonData.videoDurationSeconds = null;
    }

    return lessonData;
  }

  private resolveLessonProgressUpdate(
    lessonType: LessonType,
    updateDto: UpdateLessonProgressDto,
  ): {
    watchedSeconds?: number;
    completionPercentage: number;
    isCompleted: boolean;
    lastWatchedAt: Date;
  } {
    this.validateProgressInput(updateDto);

    const completionPercentage =
      lessonType === LessonType.PDF && updateDto.isCompleted === true
        ? 100
        : updateDto.completionPercentage;
    const isCompleted =
      completionPercentage >= LESSON_COMPLETION_THRESHOLD_PERCENTAGE;

    return {
      watchedSeconds:
        lessonType === LessonType.VIDEO ? updateDto.watchedSeconds : undefined,
      completionPercentage,
      isCompleted,
      lastWatchedAt: new Date(),
    };
  }

  private validateProgressInput(updateDto: UpdateLessonProgressDto): void {
    if (
      !Number.isFinite(updateDto.completionPercentage) ||
      updateDto.completionPercentage < 0 ||
      updateDto.completionPercentage > 100
    ) {
      throw new BadRequestException(
        'completionPercentage must be between 0 and 100.',
      );
    }

    if (
      updateDto.watchedSeconds !== undefined &&
      (!Number.isInteger(updateDto.watchedSeconds) ||
        updateDto.watchedSeconds < 0)
    ) {
      throw new BadRequestException(
        'watchedSeconds must be an integer greater than or equal to 0.',
      );
    }
  }

  private validateLessonContent(input: {
    lessonType: LessonType;
    videoKey?: string | null;
    videoDurationSeconds?: number | null;
    pdfKey?: string | null;
  }): void {
    if (input.lessonType === LessonType.VIDEO && !input.videoKey) {
      throw new BadRequestException('videoKey is required for VIDEO lessons.');
    }

    if (
      input.lessonType === LessonType.VIDEO &&
      input.videoDurationSeconds == null
    ) {
      throw new BadRequestException(
        'videoDurationSeconds is required for VIDEO lessons.',
      );
    }

    if (input.lessonType === LessonType.PDF && !input.pdfKey) {
      throw new BadRequestException('pdfKey is required for PDF lessons.');
    }
  }

  private roundPercentage(value: number): number {
    return Math.round(value * 100) / 100;
  }

  private toCourse(
    course: CourseRecord,
    options: {
      includeProtectedLessonKeys: boolean;
      progress?: Map<string, LessonProgressResponse>;
    },
  ) {
    return {
      ...this.toCourseSummary(course),
      descriptionAr: course.descriptionAr,
      descriptionEn: course.descriptionEn,
      sections: course.sections
        .filter(
          (section) => options.includeProtectedLessonKeys || section.isActive,
        )
        .map((section) =>
          this.toSection(section, {
            includeProtectedLessonKeys: options.includeProtectedLessonKeys,
            progress: options.progress,
          }),
        ),
    };
  }

  private toCourseSummary(course: CourseSummaryRecord) {
    return {
      id: course.id,
      categoryId: course.categoryId,
      titleAr: course.titleAr,
      titleEn: course.titleEn,
      shortDescriptionAr: course.shortDescriptionAr,
      shortDescriptionEn: course.shortDescriptionEn,
      thumbnailImage: course.thumbnailImage,
      promoVideoUrl: course.promoVideoUrl,
      priceEGP: this.toNumberFromDecimal(course.priceEGP),
      priceUSD: this.toNumberFromDecimal(course.priceUSD),
      discountPriceEGP: this.toOptionalNumberOrNull(course.discountPriceEGP),
      discountPriceUSD: this.toOptionalNumberOrNull(course.discountPriceUSD),
      certificateEnabled: course.certificateEnabled,
      isFeatured: course.isFeatured,
      isHomeDisplay: course.isHomeDisplay,
      isActive: course.isActive,
      createdAt: course.createdAt,
      updatedAt: course.updatedAt,
      category: course.category,
    };
  }

  private toSection(
    section: CourseSectionRecord,
    options: {
      includeProtectedLessonKeys: boolean;
      progress?: Map<string, LessonProgressResponse>;
    },
  ) {
    return {
      id: section.id,
      courseId: section.courseId,
      titleAr: section.titleAr,
      titleEn: section.titleEn,
      displayOrder: section.displayOrder,
      isActive: section.isActive,
      createdAt: section.createdAt,
      updatedAt: section.updatedAt,
      lessons: section.lessons
        .filter(
          (lesson) => options.includeProtectedLessonKeys || lesson.isActive,
        )
        .map((lesson) => ({
          ...this.toLesson(lesson),
          progress: options.progress?.get(lesson.id) ?? undefined,
        })),
    };
  }

  private toLesson(lesson: LessonRecord) {
    return {
      id: lesson.id,
      sectionId: lesson.sectionId,
      titleAr: lesson.titleAr,
      titleEn: lesson.titleEn,
      lessonType: lesson.lessonType,
      hasVideo: Boolean(lesson.videoKey),
      videoDurationSeconds: lesson.videoDurationSeconds,
      hasPdf: Boolean(lesson.pdfKey),
      isPreview: lesson.isPreview,
      displayOrder: lesson.displayOrder,
      isActive: lesson.isActive,
      createdAt: lesson.createdAt,
      updatedAt: lesson.updatedAt,
    };
  }

  private toUserCourse(userCourse: UserCourseRecord) {
    return {
      id: userCourse.id,
      userId: userCourse.userId,
      courseId: userCourse.courseId,
      purchasedAt: userCourse.purchasedAt,
      startedAt: userCourse.startedAt,
      completedAt: userCourse.completedAt,
      completionPercentage: this.toNumberFromDecimal(
        userCourse.completionPercentage,
      ),
      createdAt: userCourse.createdAt,
      updatedAt: userCourse.updatedAt,
      course: this.toCourseSummary(userCourse.course),
    };
  }

  private toProgress(
    progress: UserLessonProgressRecord,
  ): LessonProgressResponse {
    return {
      id: progress.id,
      userId: progress.userId,
      lessonId: progress.lessonId,
      watchedSeconds: progress.watchedSeconds,
      completionPercentage: this.toNumberFromDecimal(
        progress.completionPercentage,
      ),
      isCompleted: progress.isCompleted,
      lastWatchedAt: progress.lastWatchedAt,
      createdAt: progress.createdAt,
      updatedAt: progress.updatedAt,
    };
  }

  private toReview(
    review: Prisma.CourseReviewGetPayload<{
      select: typeof courseReviewSelect;
    }>,
  ) {
    return {
      id: review.id,
      userId: review.userId,
      courseId: review.courseId,
      rating: review.rating,
      title: review.title,
      comment: review.comment,
      isActive: review.isActive,
      createdAt: review.createdAt,
      updatedAt: review.updatedAt,
      user: review.user,
    };
  }

  private toCertificate(certificate: CertificateRecord) {
    return {
      id: certificate.id,
      userId: certificate.userId,
      courseId: certificate.courseId,
      certificateNumber: certificate.certificateNumber,
      issuedAt: certificate.issuedAt,
      createdAt: certificate.createdAt,
      user: certificate.user,
      course: this.toCourseSummary(certificate.course),
    };
  }

  private toNumberFromDecimal(decimal: Prisma.Decimal): number {
    return Number(decimal.toString());
  }

  private toOptionalNumberFromDecimal(
    decimal: Prisma.Decimal | null,
  ): number | undefined {
    return decimal === null ? undefined : this.toNumberFromDecimal(decimal);
  }

  private toOptionalNumberOrNull(
    decimal: Prisma.Decimal | null,
  ): number | null {
    return decimal === null ? null : this.toNumberFromDecimal(decimal);
  }

  private handleUniqueConstraintError(error: unknown, message: string): never {
    if (isPrismaUniqueConstraintError(error)) {
      throw new ConflictException(message);
    }

    throw error;
  }
}
