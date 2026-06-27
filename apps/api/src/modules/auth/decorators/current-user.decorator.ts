import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { AuthUser } from '@arborisis/shared';

/** Injecte l'utilisateur authentifié (peuplé par la stratégie JWT). */
export const CurrentUser = createParamDecorator(
  (
    data: keyof AuthUser | 'userId' | undefined,
    ctx: ExecutionContext,
  ): AuthUser | AuthUser[keyof AuthUser] => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user as AuthUser;
    if (!data) return user;
    if (data === 'userId') return user.id;
    return user[data];
  },
);
