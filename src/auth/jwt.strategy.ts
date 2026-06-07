import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { RoleName } from '@prisma/client';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../database/prisma.service';
import type { JwtTokenPayload } from './auth.service';

export type AuthenticatedUser = {
  id: string;
  email: string;
  fullName: string;
  role: RoleName;
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: getAccessSecret(configService),
    });
  }

  async validate(payload: JwtTokenPayload): Promise<AuthenticatedUser> {
    if (payload.tokenType !== 'access' || !payload.sub) {
      throw new UnauthorizedException('Invalid access token.');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        fullName: true,
        isActive: true,
        isEmailVerified: true,
        emailVerifiedAt: true,
        role: {
          select: {
            name: true,
          },
        },
      },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid access token.');
    }

    if (!user.isEmailVerified && user.emailVerifiedAt === null) {
      throw new UnauthorizedException('Email must be verified.');
    }

    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role.name,
    };
  }
}

function getAccessSecret(configService: ConfigService): string {
  const secret =
    configService.get<string>('JWT_ACCESS_SECRET') ??
    configService.get<string>('JWT_SECRET');

  if (!secret) {
    throw new Error('JWT_ACCESS_SECRET is required.');
  }

  return secret;
}
