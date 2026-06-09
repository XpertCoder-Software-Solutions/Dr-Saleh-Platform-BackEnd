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
import { PrismaService } from '../database/prisma.service';
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
type CertificateRecord = Prisma.CertificateGetPayload<{
  select: typeof certificateSelect;
}>;
type EmptyData = Record<string, never>;

@Injectable()
export class CoursesService {
  constructor(private readonly prisma: PrismaService) {}

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
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;
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
        meta: this.toPaginationMeta(page, limit, total),
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
      const lesson = await this.prisma.lesson.create({
        data: {
          sectionId,
          titleAr: createDto.titleAr,
          titleEn: createDto.titleEn,
          lessonType: createDto.lessonType,
          videoKey:
            createDto.lessonType === LessonType.VIDEO
              ? createDto.videoKey
              : undefined,
          videoDurationSeconds:
            createDto.lessonType === LessonType.VIDEO
              ? createDto.videoDurationSeconds
              : undefined,
          pdfKey:
            createDto.lessonType === LessonType.PDF
              ? createDto.pdfKey
              : undefined,
          isPreview: createDto.isPreview ?? false,
          displayOrder: createDto.displayOrder,
          isActive: createDto.isActive ?? true,
        },
        select: lessonSelect,
      });

      return {
        message: 'Lesson created successfully',
        data: { lesson: this.toLesson(lesson, { includeProtectedKeys: true }) },
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

    return lessons.map((lesson) =>
      this.toLesson(lesson, { includeProtectedKeys: true }),
    );
  }

  async adminUpdateLesson(id: string, updateDto: UpdateLessonDto) {
    const currentLesson = await this.findLessonOrThrow(id);
    const nextLesson = {
      lessonType: updateDto.lessonType ?? currentLesson.lessonType,
      videoKey: updateDto.videoKey ?? currentLesson.videoKey ?? undefined,
      pdfKey: updateDto.pdfKey ?? currentLesson.pdfKey ?? undefined,
    };
    this.validateLessonContent(nextLesson);

    try {
      const lesson = await this.prisma.lesson.update({
        where: { id },
        data: {
          titleAr: updateDto.titleAr,
          titleEn: updateDto.titleEn,
          lessonType: updateDto.lessonType,
          videoKey:
            nextLesson.lessonType === LessonType.VIDEO
              ? nextLesson.videoKey
              : null,
          videoDurationSeconds:
            nextLesson.lessonType === LessonType.VIDEO
              ? updateDto.videoDurationSeconds
              : null,
          pdfKey:
            nextLesson.lessonType === LessonType.PDF ? nextLesson.pdfKey : null,
          isPreview: updateDto.isPreview,
          displayOrder: updateDto.displayOrder,
          isActive: updateDto.isActive,
        },
        select: lessonSelect,
      });

      return {
        message: 'Lesson updated successfully',
        data: { lesson: this.toLesson(lesson, { includeProtectedKeys: true }) },
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
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;
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
        meta: this.toPaginationMeta(page, limit, total),
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
      ...this.toLesson(lesson, { includeProtectedKeys: true }),
      progress: progress ? this.toProgress(progress) : null,
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

    const progress = await this.prisma.userLessonProgress.upsert({
      where: {
        userId_lessonId: {
          userId,
          lessonId,
        },
      },
      create: {
        userId,
        lessonId,
        watchedSeconds: updateDto.watchedSeconds,
        completionPercentage: updateDto.completionPercentage,
        isCompleted: updateDto.completionPercentage >= 100,
        lastWatchedAt: new Date(),
      },
      update: {
        watchedSeconds: updateDto.watchedSeconds,
        completionPercentage: updateDto.completionPercentage,
        isCompleted: updateDto.completionPercentage >= 100,
        lastWatchedAt: new Date(),
      },
      select: userLessonProgressSelect,
    });

    return {
      message: 'Lesson progress updated successfully',
      data: { progress: this.toProgress(progress) },
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
        meta: this.toPaginationMeta(page, limit, total),
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
  ): Promise<Map<string, ReturnType<typeof this.toProgress>>> {
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

  private validateLessonContent(input: {
    lessonType: LessonType;
    videoKey?: string | null;
    pdfKey?: string | null;
  }): void {
    if (input.lessonType === LessonType.VIDEO && !input.videoKey) {
      throw new BadRequestException('videoKey is required for VIDEO lessons.');
    }

    if (input.lessonType === LessonType.PDF && !input.pdfKey) {
      throw new BadRequestException('pdfKey is required for PDF lessons.');
    }
  }

  private toCourse(
    course: CourseRecord,
    options: {
      includeProtectedLessonKeys: boolean;
      progress?: Map<string, ReturnType<typeof this.toProgress>>;
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
      progress?: Map<string, ReturnType<typeof this.toProgress>>;
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
          ...this.toLesson(lesson, {
            includeProtectedKeys: options.includeProtectedLessonKeys,
          }),
          progress: options.progress?.get(lesson.id) ?? undefined,
        })),
    };
  }

  private toLesson(
    lesson: LessonRecord,
    options: { includeProtectedKeys: boolean },
  ) {
    return {
      id: lesson.id,
      sectionId: lesson.sectionId,
      titleAr: lesson.titleAr,
      titleEn: lesson.titleEn,
      lessonType: lesson.lessonType,
      videoKey: options.includeProtectedKeys ? lesson.videoKey : undefined,
      videoDurationSeconds: lesson.videoDurationSeconds,
      pdfKey: options.includeProtectedKeys ? lesson.pdfKey : undefined,
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
      createdAt: userCourse.createdAt,
      updatedAt: userCourse.updatedAt,
      course: this.toCourseSummary(userCourse.course),
    };
  }

  private toProgress(progress: UserLessonProgressRecord) {
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

  private toPaginationMeta(page: number, limit: number, total: number) {
    return {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
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
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new ConflictException(message);
    }

    throw error;
  }
}
