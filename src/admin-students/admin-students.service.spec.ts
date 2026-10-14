import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PasswordService } from '../auth/services/password.service';
import { PrismaService } from '../database/prisma.service';
import { AdminStudentsService } from './admin-students.service';

const studentId = '5eeff849-1eb3-4e19-b920-43815395e2dd';
const courseA = '857db8f4-1537-4239-98ac-85c3146e6651';
const courseB = 'b73512c9-31a5-4e54-8012-aa43aa2c5320';

function createPrismaMock() {
  const prisma = {
    $transaction: jest.fn(),
    role: { findUnique: jest.fn().mockResolvedValue({ id: 'role-user' }) },
    course: { count: jest.fn() },
    user: {
      create: jest.fn().mockResolvedValue({ id: studentId }),
      findUniqueOrThrow: jest.fn(),
      findFirst: jest.fn(),
    },
    userCourse: { createMany: jest.fn() },
  };
  prisma.$transaction.mockImplementation((cb: (tx: typeof prisma) => unknown) =>
    cb(prisma),
  );
  prisma.user.findUniqueOrThrow.mockResolvedValue({
    id: studentId,
    fullName: 'ياسمين فؤاد',
    _count: { userCourses: 1, orders: 0 },
  });
  return prisma;
}

describe('AdminStudentsService', () => {
  let prisma: ReturnType<typeof createPrismaMock>;
  let service: AdminStudentsService;
  const passwordService = {
    hashPassword: jest.fn().mockResolvedValue('hash'),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    prisma = createPrismaMock();
    service = new AdminStudentsService(
      prisma as unknown as PrismaService,
      passwordService as unknown as PasswordService,
    );
  });

  it('creates a verified student, opens the chosen courses and returns a temporary password', async () => {
    prisma.course.count.mockResolvedValue(1);

    const result = await service.create({
      fullName: 'ياسمين فؤاد',
      email: 'Yasmine@Example.com',
      phoneNumber: '+201000000777',
      courseIds: [courseA, courseA],
    });

    const createArgs = (
      prisma.user.create.mock.calls[0] as [{ data: Record<string, unknown> }]
    )[0];
    expect(createArgs.data).toMatchObject({
      email: 'yasmine@example.com',
      firstName: 'ياسمين',
      lastName: 'فؤاد',
      isEmailVerified: true,
      roleId: 'role-user',
    });
    expect(prisma.userCourse.createMany).toHaveBeenCalledWith({
      data: [{ userId: studentId, courseId: courseA }],
      skipDuplicates: true,
    });
    expect(result.data.temporaryPassword).toMatch(/^Saleh-[0-9a-f]{6}$/);
  });

  it('rejects unknown courses before creating anything', async () => {
    prisma.course.count.mockResolvedValue(1);

    await expect(
      service.create({
        fullName: 'Test User',
        email: 't@example.com',
        phoneNumber: '+2010',
        courseIds: [courseA, courseB],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.user.create).not.toHaveBeenCalled();
  });

  it('only grants courses to students', async () => {
    prisma.user.findFirst.mockResolvedValue(null);

    await expect(
      service.grantCourses(studentId, [courseA]),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
