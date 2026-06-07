import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { RoleName } from '@prisma/client';
import type { Request } from 'express';
import type { AuthenticatedUser } from './jwt.strategy';

type AuthenticatedRequest = Request & {
  user?: AuthenticatedUser;
};

@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

    if (request.user?.role !== RoleName.Admin) {
      throw new ForbiddenException('Admin access is required.');
    }

    return true;
  }
}
