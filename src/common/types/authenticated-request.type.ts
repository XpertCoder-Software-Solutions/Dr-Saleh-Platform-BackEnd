import type { Request } from 'express';
import type { AuthenticatedUser } from '../../auth/jwt.strategy';

export type AuthenticatedRequest = Request & {
  user: AuthenticatedUser;
};
