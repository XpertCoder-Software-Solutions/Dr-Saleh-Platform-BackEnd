import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { PaymentStatus, Prisma, RoleName } from '@prisma/client';
import { randomBytes } from 'node:crypto';
import { PasswordService } from '../auth/services/password.service';
import {
  buildPaginationMeta,
  getPaginationParams,
} from '../common/utils/pagination';
import {
  getPrismaUniqueConstraintFields,
  isPrismaUniqueConstraintError,
} from '../common/utils/prisma-errors';
import { PrismaService } from '../database/prisma.service';
import { AdminStudentQueryDto } from './dto/admin-student-query.dto';
import { CreateStudentDto } from './dto/create-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';

const studentSelect = {
  id: true,
  firstName: true,
  lastName: true,
  fullName: true,
  email: true,
  phoneNumber: true,
  gender: true,
  profileImage: true,
  isActive: true,
  isEmailVerified: true,
  lastLoginAt: true,
  createdAt: true,
  _count: {
    select: {
      userCourses: true,
      orders: true,
    },
  },
} satisfies Prisma.UserSelect;

type StudentRecord = Prisma.UserGetPayload<{ select: typeof studentSelect }>;

/** Students (role User) as the admin sees them, with course/order counts and total paid. */
@Injectable()
export class AdminStudentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly passwordService: PasswordService,
  ) {}

  async findAll(query: AdminStudentQueryDto) {
    const { page, limit, skip } = getPaginationParams(query);
    const where = this.buildWhere(query);
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const [total, newThisMonth, students] = await this.prisma.$transaction([
      this.prisma.user.count({ where }),
      this.prisma.user.count({
        where: {
          role: { name: RoleName.User },
          createdAt: { gte: monthStart },
        },
      }),
      this.prisma.user.findMany({
        where,
        select: studentSelect,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
    ]);
    const paid = await this.totalPaidByUser(students.map((s) => s.id));

    return {
      message: 'Students returned successfully',
      data: {
        items: students.map((s) => this.toStudent(s, paid.get(s.id) ?? 0)),
        newThisMonth,
        pagination: buildPaginationMeta(page, limit, total),
      },
    };
  }

  async findOne(id: string) {
    const student = await this.findStudentOrThrow(id);
    const [paid, courses, orders] = await Promise.all([
      this.totalPaidByUser([id]),
      this.prisma.userCourse.findMany({
        where: { userId: id },
        orderBy: { purchasedAt: 'desc' },
        select: {
          courseId: true,
          purchasedAt: true,
          completionPercentage: true,
          completedAt: true,
          course: { select: { titleAr: true } },
        },
      }),
      this.prisma.order.findMany({
        where: { userId: id },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true,
          orderNumber: true,
          status: true,
          paymentStatus: true,
          totalAmount: true,
          currency: true,
          createdAt: true,
        },
      }),
    ]);

    return {
      message: 'Student returned successfully',
      data: {
        student: {
          ...this.toStudent(student, paid.get(id) ?? 0),
          courses: courses.map((c) => ({
            courseId: c.courseId,
            titleAr: c.course.titleAr,
            purchasedAt: c.purchasedAt,
            completedAt: c.completedAt,
            completionPercentage: Number(c.completionPercentage),
          })),
          recentOrders: orders.map((o) => ({
            ...o,
            totalAmount: Number(o.totalAmount),
          })),
        },
      },
    };
  }

  async create(dto: CreateStudentDto) {
    const fullName = dto.fullName.trim();
    const [firstName, ...rest] = fullName.split(/\s+/);
    const email = dto.email.trim().toLowerCase();
    const phoneNumber = dto.phoneNumber.trim();
    const temporaryPassword = dto.password ?? this.generatePassword();
    const role = await this.prisma.role.findUnique({
      where: { name: RoleName.User },
      select: { id: true },
    });

    if (!role) {
      throw new InternalServerErrorException(
        'Default user role is not configured. Please run the roles seed.',
      );
    }

    const courseIds = [...new Set(dto.courseIds ?? [])];
    await this.ensureCoursesExist(courseIds);
    const passwordHash =
      await this.passwordService.hashPassword(temporaryPassword);
    const now = new Date();

    try {
      const student = await this.prisma.$transaction(async (tx) => {
        const created = await tx.user.create({
          data: {
            roleId: role.id,
            firstName,
            lastName: rest.join(' ') || null,
            fullName,
            email,
            phoneNumber,
            passwordHash,
            gender: dto.gender,
            // Created by staff, so there's no email OTP step.
            isEmailVerified: true,
            emailVerifiedAt: now,
            isActive: true,
          },
          select: { id: true },
        });

        if (courseIds.length) {
          await tx.userCourse.createMany({
            data: courseIds.map((courseId) => ({
              userId: created.id,
              courseId,
            })),
            skipDuplicates: true,
          });
        }

        return tx.user.findUniqueOrThrow({
          where: { id: created.id },
          select: studentSelect,
        });
      });

      return {
        message: 'Student created successfully',
        data: {
          student: this.toStudent(student, 0),
          // Returned once so staff can hand it over; it is never stored in plain text.
          temporaryPassword,
        },
      };
    } catch (error) {
      if (isPrismaUniqueConstraintError(error)) {
        const fields = getPrismaUniqueConstraintFields(error);
        throw new ConflictException(
          fields.includes('phoneNumber')
            ? 'Phone number is already registered.'
            : 'Email is already registered.',
        );
      }
      throw error;
    }
  }

  async update(id: string, dto: UpdateStudentDto) {
    if (dto.isActive === undefined) {
      throw new BadRequestException('Provide at least one field to update.');
    }

    await this.findStudentOrThrow(id);
    const student = await this.prisma.$transaction(async (tx) => {
      if (dto.isActive === false) {
        // A suspended student is signed out on every device.
        await tx.refreshToken.updateMany({
          where: { userId: id, revokedAt: null },
          data: { revokedAt: new Date() },
        });
      }

      return tx.user.update({
        where: { id },
        data: {
          isActive: dto.isActive,
          ...(dto.isActive === false ? { hashedRefreshToken: null } : {}),
        },
        select: studentSelect,
      });
    });
    const paid = await this.totalPaidByUser([id]);

    return {
      message: 'Student updated successfully',
      data: { student: this.toStudent(student, paid.get(id) ?? 0) },
    };
  }

  /** Opens courses for a student without an order (gift, scholarship, paid offline). */
  async grantCourses(id: string, courseIds: string[]) {
    await this.findStudentOrThrow(id);
    const unique = [...new Set(courseIds)];
    await this.ensureCoursesExist(unique);

    const result = await this.prisma.userCourse.createMany({
      data: unique.map((courseId) => ({ userId: id, courseId })),
      skipDuplicates: true,
    });

    return {
      message: 'Courses granted successfully',
      data: {
        granted: result.count,
        alreadyOwned: unique.length - result.count,
      },
    };
  }

  private buildWhere(query: AdminStudentQueryDto): Prisma.UserWhereInput {
    const search = query.search?.trim();

    return {
      role: { name: RoleName.User },
      ...(query.isActive !== undefined ? { isActive: query.isActive } : {}),
      ...(search
        ? {
            OR: [
              { fullName: { contains: search, mode: 'insensitive' } },
              { email: { contains: search, mode: 'insensitive' } },
              { phoneNumber: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
  }

  private async findStudentOrThrow(id: string): Promise<StudentRecord> {
    const student = await this.prisma.user.findFirst({
      where: { id, role: { name: RoleName.User } },
      select: studentSelect,
    });

    if (!student) {
      throw new NotFoundException('Student not found.');
    }

    return student;
  }

  private async ensureCoursesExist(courseIds: string[]) {
    if (!courseIds.length) return;
    const found = await this.prisma.course.count({
      where: { id: { in: courseIds } },
    });

    if (found !== courseIds.length) {
      throw new BadRequestException('One or more courses were not found.');
    }
  }

  /** Sum of paid EGP orders per user. */
  private async totalPaidByUser(userIds: string[]) {
    if (!userIds.length) return new Map<string, number>();
    const rows = await this.prisma.order.groupBy({
      by: ['userId'],
      where: {
        userId: { in: userIds },
        paymentStatus: PaymentStatus.PAID,
        currency: 'EGP',
      },
      _sum: { totalAmount: true },
    });

    return new Map(
      rows.map((r) => [r.userId, Number(r._sum.totalAmount ?? 0)] as const),
    );
  }

  private generatePassword(): string {
    return `Saleh-${randomBytes(3).toString('hex')}`;
  }

  private toStudent(student: StudentRecord, totalPaidEGP: number) {
    const { _count, ...rest } = student;
    return {
      ...rest,
      coursesCount: _count.userCourses,
      ordersCount: _count.orders,
      totalPaidEGP,
    };
  }
}
