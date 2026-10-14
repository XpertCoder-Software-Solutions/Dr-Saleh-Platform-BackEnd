import {
  BadRequestException,
  Body,
  Controller,
  Param,
  ParseUUIDPipe,
  Post,
  UploadedFile,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  FileFieldsInterceptor,
  FileInterceptor,
} from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  OmitType,
  ApiBody,
  ApiConsumes,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { LessonType } from '@prisma/client';
import { IsNumberString, IsOptional } from 'class-validator';
import { randomUUID } from 'crypto';
import { mkdirSync } from 'fs';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { AuditAction } from '../audit-logs/audit-action.decorator';
import {
  AuditActions,
  AuditEntityTypes,
} from '../audit-logs/audit-log.constants';
import { AdminGuard } from '../auth/admin.guard';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CoursesService } from './courses.service';
import { CreateLessonDto } from './dto/create-lesson.dto';

const uploadsRoot = join(process.cwd(), 'uploads');
export const courseThumbnailsDirectory = join(
  uploadsRoot,
  'courses',
  'thumbnails',
);
// Videos and PDFs are protected: main.ts blocks direct access, and students get
// signed CloudFront URLs, like digital books.
export const courseVideosDirectory = join(uploadsRoot, 'courses', 'videos');
export const coursePdfsDirectory = join(uploadsRoot, 'courses', 'pdfs');

const IMAGE_TYPES: Record<string, string[]> = {
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/webp': ['.webp'],
};
const VIDEO_TYPES: Record<string, string[]> = {
  'video/mp4': ['.mp4'],
  'video/webm': ['.webm'],
  'video/quicktime': ['.mov'],
};
const PDF_TYPES: Record<string, string[]> = { 'application/pdf': ['.pdf'] };

type LessonMediaFiles = {
  video?: Express.Multer.File[];
  pdf?: Express.Multer.File[];
};

/** Lesson fields sent alongside the files; the type and keys come from the files. */
class LessonWithMediaBody extends OmitType(CreateLessonDto, [
  'lessonType',
  'videoKey',
  'pdfKey',
] as const) {}

class LessonMediaBody {
  /** Read from the file in the browser; optional. */
  @IsOptional()
  @IsNumberString()
  videoDurationSeconds?: string;
}

@ApiTags('Admin Course Uploads')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
@ApiForbiddenResponse({ description: 'Admin access is required.' })
@UseGuards(JwtAuthGuard, AdminGuard)
@Controller()
export class AdminCourseUploadsController {
  constructor(private readonly coursesService: CoursesService) {}

  @Post('admin/courses/:id/thumbnail')
  @AuditAction({
    action: AuditActions.CourseUpdated,
    entityType: AuditEntityTypes.Course,
    entityIdParam: 'id',
    description: 'Admin uploaded a course thumbnail.',
  })
  @UseInterceptors(
    FileInterceptor('thumbnailImage', {
      storage: diskTo(() => courseThumbnailsDirectory),
      limits: { fileSize: 5 * 1024 * 1024 },
      fileFilter: accept({ thumbnailImage: IMAGE_TYPES }),
    }),
  )
  @ApiOperation({
    summary: 'Admin: upload a course thumbnail (jpg, png, webp).',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { thumbnailImage: { type: 'string', format: 'binary' } },
      required: ['thumbnailImage'],
    },
  })
  @ApiOkResponse({ description: 'Course updated with the new thumbnail.' })
  uploadThumbnail(
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('thumbnailImage is required.');
    return this.coursesService.adminUpdateCourse(id, {
      thumbnailImage: `/uploads/courses/thumbnails/${file.filename}`,
    });
  }

  @Post('admin/lessons/:id/media')
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'video', maxCount: 1 },
        { name: 'pdf', maxCount: 1 },
      ],
      {
        storage: diskTo((field) =>
          field === 'video' ? courseVideosDirectory : coursePdfsDirectory,
        ),
        limits: { fileSize: 2 * 1024 * 1024 * 1024 },
        fileFilter: accept({ video: VIDEO_TYPES, pdf: PDF_TYPES }),
      },
    ),
  )
  @ApiOperation({
    summary: 'Admin: upload a lesson video and/or PDF.',
    description:
      'Sets videoKey (and makes it a VIDEO lesson) and/or pdfKey on the lesson.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        video: { type: 'string', format: 'binary' },
        pdf: { type: 'string', format: 'binary' },
        videoDurationSeconds: { type: 'integer' },
      },
    },
  })
  @ApiOkResponse({ description: 'Lesson updated with the uploaded media.' })
  uploadLessonMedia(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: LessonMediaBody,
    @UploadedFiles() files: LessonMediaFiles = {},
  ) {
    const video = files.video?.[0];
    const pdf = files.pdf?.[0];

    if (!video && !pdf) {
      throw new BadRequestException('Upload a video or a PDF.');
    }

    const duration = Number(body.videoDurationSeconds);

    return this.coursesService.adminUpdateLesson(id, {
      ...(video
        ? {
            lessonType: LessonType.VIDEO,
            videoKey: `/uploads/courses/videos/${video.filename}`,
            ...(Number.isFinite(duration) && duration > 0
              ? { videoDurationSeconds: Math.round(duration) }
              : {}),
          }
        : {}),
      ...(pdf ? { pdfKey: `/uploads/courses/pdfs/${pdf.filename}` } : {}),
    });
  }

  @Post('admin/sections/:sectionId/lessons/upload')
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'video', maxCount: 1 },
        { name: 'pdf', maxCount: 1 },
      ],
      {
        storage: diskTo((field) =>
          field === 'video' ? courseVideosDirectory : coursePdfsDirectory,
        ),
        limits: { fileSize: 2 * 1024 * 1024 * 1024 },
        fileFilter: accept({ video: VIDEO_TYPES, pdf: PDF_TYPES }),
      },
    ),
  )
  @ApiOperation({
    summary: 'Admin: create a lesson together with its video and/or PDF.',
    description:
      'With a video it is a VIDEO lesson (the PDF becomes an attachment); with only a PDF it is a PDF lesson.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiOkResponse({ description: 'Lesson created.' })
  createLessonWithMedia(
    @Param('sectionId', ParseUUIDPipe) sectionId: string,
    @Body() body: LessonWithMediaBody,
    @UploadedFiles() files: LessonMediaFiles = {},
  ) {
    const video = files.video?.[0];
    const pdf = files.pdf?.[0];

    if (!video && !pdf) {
      throw new BadRequestException('Upload a video or a PDF.');
    }

    return this.coursesService.adminCreateLesson(sectionId, {
      ...body,
      lessonType: video ? LessonType.VIDEO : LessonType.PDF,
      videoKey: video ? `/uploads/courses/videos/${video.filename}` : undefined,
      videoDurationSeconds: video
        ? (body.videoDurationSeconds ?? 0)
        : undefined,
      pdfKey: pdf ? `/uploads/courses/pdfs/${pdf.filename}` : undefined,
    });
  }
}

function diskTo(directoryFor: (field: string) => string) {
  return diskStorage({
    destination: (_request, file, callback) => {
      const directory = directoryFor(file.fieldname);
      mkdirSync(directory, { recursive: true });
      callback(null, directory);
    },
    filename: (_request, file, callback) => {
      callback(
        null,
        `${randomUUID()}${extname(file.originalname).toLowerCase()}`,
      );
    },
  });
}

/** Accepts each field only with the listed MIME types and matching extensions. */
function accept(byField: Record<string, Record<string, string[]>>) {
  return (
    _request: unknown,
    file: Express.Multer.File,
    callback: (error: Error | null, acceptFile: boolean) => void,
  ) => {
    const extensions = byField[file.fieldname]?.[file.mimetype];
    if (extensions?.includes(extname(file.originalname).toLowerCase())) {
      callback(null, true);
      return;
    }
    callback(
      new BadRequestException(`Unsupported file type for ${file.fieldname}.`),
      false,
    );
  };
}
