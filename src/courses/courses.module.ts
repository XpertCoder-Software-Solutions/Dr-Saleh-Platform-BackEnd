import { Module } from '@nestjs/common';
import { CloudFrontModule } from '../common/cloudfront/cloudfront.module';
import { PrismaModule } from '../database/prisma.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { AdminCourseCategoriesController } from './admin-course-categories.controller';
import { AdminCourseSectionsController } from './admin-course-sections.controller';
import { AdminCourseUploadsController } from './admin-course-uploads.controller';
import { AdminCoursesController } from './admin-courses.controller';
import { AdminLessonsController } from './admin-lessons.controller';
import { CertificatesController } from './certificates.controller';
import { AdminCourseReviewsController } from './admin-course-reviews.controller';
import { CourseReviewsController } from './course-reviews.controller';
import { FeaturedReviewsController } from './featured-reviews.controller';
import { CoursesController } from './courses.controller';
import { CoursesService } from './courses.service';
import { MyCertificatesController } from './my-certificates.controller';
import { MyCoursesController } from './my-courses.controller';

@Module({
  imports: [PrismaModule, CloudFrontModule, NotificationsModule],
  controllers: [
    AdminCourseCategoriesController,
    AdminCourseUploadsController,
    AdminCoursesController,
    AdminCourseSectionsController,
    AdminLessonsController,
    CoursesController,
    CourseReviewsController,
    FeaturedReviewsController,
    AdminCourseReviewsController,
    MyCoursesController,
    MyCertificatesController,
    CertificatesController,
  ],
  providers: [CoursesService],
})
export class CoursesModule {}
