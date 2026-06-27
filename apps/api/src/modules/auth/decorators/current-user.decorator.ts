import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { AuthUser } from '@arborisis/shared';

type CurrentUserKey = keyof AuthUser | 'userId';

/** Injecte l'utilisateur authentifié (peuplé par la stratégie JWT). */
export const CurrentUser = createParamDecorator(
  (
    data: CurrentUserKey | undefined,
    ctx: ExecutionContext,
  ): AuthUser | AuthUser[keyof AuthUser] => {
    const request = ctx.switchToHttp().getRequest<{ user: AuthUser }>();
    const user = request.user;
    if (!data) return user;
    return data === 'userId' ? user.id : user[data];
  },
);
