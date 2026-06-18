import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { AuthUser } from '@arborisis/shared';

/** Injecte l'utilisateur authentifié (peuplé par la stratégie JWT). */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthUser => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
