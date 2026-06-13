import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { RoleName } from '@prisma/client';
import { AdminGuard } from './admin.guard';

describe('AdminGuard', () => {
  it('rejects normal users from admin-only routes', () => {
    const guard = new AdminGuard();
    const context = createExecutionContext({ role: RoleName.User });

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('allows admin users', () => {
    const guard = new AdminGuard();
    const context = createExecutionContext({ role: RoleName.Admin });

    expect(guard.canActivate(context)).toBe(true);
  });
});

function createExecutionContext(user: { role: RoleName }): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ user }),
    }),
  } as ExecutionContext;
}
