import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { RoleName } from '@prisma/client';
import { AuditLogService } from '../audit-logs/audit-log.service';
import { PrismaService } from '../database/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AuthService } from './auth.service';
import { OtpService } from './services/otp.service';
import { PasswordService } from './services/password.service';

type MockPrismaClient = {
  user: {
    findUnique: jest.Mock;
    update: jest.Mock;
  };
};

const userId = '38f6ade9-5f60-48ee-bd56-6ce904455bee';

describe('AuthService login smoke', () => {
  let prisma: MockPrismaClient;
  let passwordService: Pick<
    PasswordService,
    'comparePassword' | 'hashRefreshToken'
  >;
  let jwtService: Pick<JwtService, 'signAsync'>;
  let auditLogService: Pick<AuditLogService, 'logAction'>;
  let service: AuthService;

  beforeEach(() => {
    prisma = {
      user: {
        findUnique: jest.fn().mockResolvedValue(createAuthUser()),
        update: jest.fn(),
      },
    };
    passwordService = {
      comparePassword: jest.fn().mockResolvedValue(true),
      hashRefreshToken: jest.fn().mockResolvedValue('hashed-refresh-token'),
    };
    jwtService = {
      signAsync: jest
        .fn()
        .mockImplementation((payload: { tokenType: string }) =>
          Promise.resolve(`${payload.tokenType}-token`),
        ),
    };
    auditLogService = {
      logAction: jest.fn(),
    };

    service = new AuthService(
      prisma as unknown as PrismaService,
      passwordService as PasswordService,
      {} as OtpService,
      {} as NotificationsService,
      createConfigService(),
      jwtService as JwtService,
      auditLogService as AuditLogService,
    );
  });

  it('logs in a verified active user and stores a hashed refresh token', async () => {
    const response = await service.login({
      email: ' Student@Example.COM ',
      password: 'correct-password',
    });

    const findUniqueArgs = getFirstMockArg<{
      where: { email: string };
      select: object;
    }>(prisma.user.findUnique);

    expect(findUniqueArgs.where).toEqual({ email: 'student@example.com' });
    expect(findUniqueArgs.select).toBeDefined();
    expect(passwordService.comparePassword).toHaveBeenCalledWith(
      'correct-password',
      'stored-password-hash',
    );
    const updateArgs = getFirstMockArg<{
      where: { id: string };
      data: { hashedRefreshToken: string; lastLoginAt: Date };
    }>(prisma.user.update);

    expect(updateArgs.where).toEqual({ id: userId });
    expect(updateArgs.data.hashedRefreshToken).toBe('hashed-refresh-token');
    expect(updateArgs.data.lastLoginAt).toBeInstanceOf(Date);
    expect(response).toMatchObject({
      data: {
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        user: {
          email: 'student@example.com',
          id: userId,
          role: RoleName.User,
        },
      },
      message: 'Login successful',
    });
  });
});

function getFirstMockArg<T>(mock: jest.Mock): T {
  const calls = mock.mock.calls as readonly unknown[][];
  const firstCall = calls[0];

  if (!firstCall) {
    throw new Error('Expected mock to have been called.');
  }

  return firstCall[0] as T;
}

function createConfigService(): ConfigService {
  return {
    get: jest.fn((key: string) => {
      const values: Record<string, string> = {
        JWT_ACCESS_EXPIRES_IN: '15m',
        JWT_ACCESS_SECRET: 'test-access-secret',
        JWT_REFRESH_EXPIRES_IN: '7d',
        JWT_REFRESH_SECRET: 'test-refresh-secret',
      };

      return values[key];
    }),
  } as unknown as ConfigService;
}

function createAuthUser() {
  return {
    email: 'student@example.com',
    emailVerifiedAt: new Date('2026-06-14T00:00:00.000Z'),
    fullName: 'Student Example',
    id: userId,
    isActive: true,
    isEmailVerified: true,
    passwordHash: 'stored-password-hash',
    phoneNumber: '01000000000',
    role: {
      name: RoleName.User,
    },
  };
}
